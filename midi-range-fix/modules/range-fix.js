/**
 * @file        modules/range-fix.js
 * @module      midi-range-fix
 * @version     1.3.6
 * @author      Soruta (Discord : s0ruta)
 * @license     © 2026 Soruta — Tous droits réservés.
 *              Usage personnel autorisé. Toute redistribution, modification
 *              ou usage commercial est strictement interdit sans autorisation écrite.
 *
 * @description Patch de canvas.grid.measurePath pour corriger les portées midi-qol.
 *
 *   PROBLÈME
 *   --------
 *   Midi-qol mesure la portée depuis plusieurs coins de l'attaquant vers plusieurs
 *   coins de la cible, puis prend la distance minimale. Cette approche surestime
 *   la distance pour les tokens Large+ hors-grille : ex. PJ Medium vs Brown Bear
 *   Large donnait 6.9 ft au lieu de ~0 ft bord→bord, bloquant des attaques valides.
 *
 *   SOLUTION : mesure bord→bord
 *   ---------------------------
 *   1. Calculer le centre géométrique de chaque token (_boundsCenter).
 *   2. Trouver le point le plus proche sur la bounding box de l'attaquant depuis
 *      le centre de la cible (_nearestBorderPoint) → "bord attaquant".
 *   3. Trouver le point le plus proche sur la bounding box de la cible depuis
 *      le centre de l'attaquant (_nearestBorderPoint) → "bord cible".
 *   4. Mesurer la distance entre ces deux points via le prototype Foundry
 *      (_protoCall) sans passer par le getter de l'instance (évite la récursion).
 *   5. Ajouter rangeAdjust (défaut 2.5 ft) à cette distance bord→bord.
 *      Midi-qol compare ensuite result.distance ≤ weapon_range, ce qui revient à :
 *        bord→bord ≤ weapon_range − rangeAdjust
 *      Exemple (adjust = 2.5) :
 *        arme  5 ft → portée depuis bord ≤  2.5 ft (demi-case Medium)
 *        arme 10 ft → portée depuis bord ≤  7.5 ft
 *        arme 15 ft → portée depuis bord ≤ 12.5 ft
 *
 *   DÉTECTION DES TOKENS
 *   ---------------------
 *   Double méthode, dans l'ordre :
 *   1. Bounds-check avec PAD 8 px sur les waypoints passés par midi-qol.
 *   2. Fallback : token contrôlé (canvas.tokens.controlled[0]) + cible désignée
 *      (game.user.targets) — couvre les cas où midi-qol passe des coordonnées
 *      hors-bounds (coin de token, unités de grille vs pixels, token hors-grille).
 *
 *   PERSISTANCE DU PATCH — triple couche
 *   --------------------------------------
 *   Midi-qol ou libWrapper peut appeler Object.defineProperty(canvas.grid,
 *   'measurePath', { value: fn }) pendant le workflow d'attaque, détruisant
 *   notre getter/setter. Trois couches de défense :
 *   1. _ourPatch en portée MODULE (référence stable, marquée par Symbol _PATCH_MARK).
 *   2. Object.defineProperty getter/setter (résiste aux assignments simples =).
 *   3. Hook dnd5e.preUseItem : réinstalle avant chaque attaque.
 *   4. Polling setInterval 2s : détecte et réinstalle si le descripteur est écrasé.
 *
 *   ANTI-RÉCURSION
 *   --------------
 *   _trueOriginal (midi-qol) rappelle canvas.grid.measurePath en interne → notre
 *   getter → _ourPatch → boucle infinie. Garde _reentering + _protoCall (prototype
 *   direct) court-circuitent immédiatement tout appel rentrant.
 */

const _MODULE     = "midi-range-fix";
const _PATCH_MARK = Symbol("midiRangeFix"); // identifie _ourPatch sans comparer le code


// Référence stable à la version "originale" (midi-qol) à appeler en fallback.
let _trueOriginal = null;
let _pollInterval = null;

// Garde de ré-entrance : _trueOriginal (midi-qol) appelle canvas.grid.measurePath
// en interne, ce qui déclenche à nouveau notre getter → récursion infinie.
// Quand _reentering = true, on court-circuite vers le prototype directement
// (qui ne passe PAS par le getter de l'instance).
let _reentering = false;

function _protoCall(waypoints, options) {
    return Object.getPrototypeOf(canvas.grid)?.measurePath?.call(canvas.grid, waypoints, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// _ourPatch : portée MODULE obligatoire pour que la référence soit stable.
// Ne pas déplacer à l'intérieur d'une fonction — les comparaisons === en dépendent.
// ─────────────────────────────────────────────────────────────────────────────
function _ourPatch(waypoints, options) {
    // Garde de ré-entrance : si _protoCall déclenche canvas.grid.measurePath en interne,
    // on court-circuite immédiatement vers le prototype pour éviter toute boucle.
    if (_reentering) return _protoCall(waypoints, options);

    try {
        if (!waypoints || waypoints.length !== 2) {
            return _protoCall(waypoints, options);
        }

        const [src, tgt] = waypoints;

        // Méthode 1 : identifier les tokens depuis les coordonnées des waypoints.
        // PAD = 8 px de tolérance pour les points de bord ou les systèmes de
        // coordonnées légèrement décalés (ex. midi-qol passant le coin du token).
        const PAD = 8;
        function _tokenAtPt(pt, exclude) {
            return canvas.tokens.placeables.find(t => {
                if (!t.actor || !t.bounds || t === exclude) return false;
                const b = t.bounds;
                return pt.x >= b.x - PAD && pt.x <= b.x + b.width  + PAD
                    && pt.y >= b.y - PAD && pt.y <= b.y + b.height + PAD;
            }) ?? null;
        }

        let attacker = _tokenAtPt(src, null);
        let target   = attacker ? _tokenAtPt(tgt, attacker) : null;

        // Méthode 2 : fallback sur le token contrôlé + la cible désignée.
        // Couvre les cas où midi-qol passe des coordonnées hors-bounds
        // (ex. coin du token, système de coordonnées différent, token hors-grille).
        if (!attacker || !target) {
            attacker = canvas.tokens.controlled[0] ?? null;
            target   = [...(game.user?.targets ?? [])][0] ?? null;
            if (!attacker || !target || attacker === target) {
                return _protoCall(waypoints, options);
            }
        }

        // Mesure bord→bord via le PROTOTYPE (stable, sans re-call midi-qol).
        // On n'utilise pas _trueOriginal ici : midi-qol rappelle canvas.grid.measurePath
        // en interne avec ses propres points (coins), ce qui produisait des distances
        // incohérentes (6/10/11 ft en se déplaçant légèrement).
        const attackerCenter = _boundsCenter(attacker);
        const targetCenter   = _boundsCenter(target);
        const attackerBorder = _nearestBorderPoint(targetCenter,   attacker);
        const targetBorder   = _nearestBorderPoint(attackerCenter, target);

        _reentering = true;
        let result;
        try {
            // Options vides : identique à _patchRulerLabel, pour que les deux
            // calculs donnent exactement la même distance (évite les modificateurs
            // de coût midi-qol qui pourraient décaler la valeur).
            result = _protoCall([attackerBorder, targetBorder], {});
        } finally {
            _reentering = false;
        }

        // On ajoute l'ajustement à la distance bord→bord.
        // Midi-qol compare result.distance ≤ weapon_range, soit :
        //   bord→bord ≤ weapon_range − adjust
        // Ex. (adjust=2.5) : arme 5ft → portée depuis bord ≤ 2.5ft
        //                     arme 10ft → portée depuis bord ≤ 7.5ft
        if (result && typeof result.distance === "number") {
            const adjust = game.settings.get(_MODULE, "rangeAdjust") ?? 2.5;
            const grid   = canvas.grid.distance ?? 5;
            const raw    = result.distance + adjust;
            // Snap à la case Foundry supérieure : évite que midi-qol arrondit 5.26 → 5 ft.
            // Ex. 5.26 → ceil(5.26/5 − ε)×5 = 10 ft → bloqué.
            //     2.50 → ceil(2.50/5 − ε)×5 =  5 ft → autorisé.
            result.distance = Math.ceil(raw / grid - 1e-9) * grid;
            console.log(`[midi-range-fix] bord→bord=${(raw - adjust).toFixed(2)} + ${adjust} = ${raw.toFixed(2)} ft → snap ${result.distance} ft`);
        }
        return result;

    } catch(err) {
        _reentering = false;
        console.warn("[midi-range-fix] Erreur dans measurePath, fallback proto :", err);
        return _protoCall(waypoints, options);
    }
}
_ourPatch[_PATCH_MARK] = true; // marque pour identification fiable

// ─────────────────────────────────────────────────────────────────────────────
// Patch de l'affichage de la règle (ruler label)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patche Ruler.prototype._getWaypointLabelContext pour afficher
 * bord→bord + rangeAdjust dans l'étiquette de la règle.
 *
 * La règle calcule waypoint.measurement.distance indépendamment de measurePath.
 * Le patch s'applique uniquement quand un token est contrôlé ET une cible est
 * désignée — pour ne pas altérer les mesures génériques sur la carte.
 *
 * Ce patch est posé sur le PROTOTYPE (une seule fois par session), pas sur
 * l'instance : pas besoin de le réinstaller après un changement de scène.
 */
function _patchRulerLabel() {
    const ruler = canvas.controls?.ruler;
    if (!ruler) return;
    const RulerClass = ruler.constructor;
    if (!RulerClass?.prototype?._getWaypointLabelContext) return;
    // Éviter le double-patch (canvasReady peut se déclencher plusieurs fois).
    if (RulerClass.prototype._getWaypointLabelContext[_PATCH_MARK]) return;

    const orig = RulerClass.prototype._getWaypointLabelContext;
    RulerClass.prototype._getWaypointLabelContext = function(waypoint, state) {
        const context = orig.call(this, waypoint, state);
        if (!context?.distance) return context;

        // Vérifier que les deux extrémités du ray tombent dans les bounds d'un token.
        // Tolérance 8 px pour les points de bord.
        const ray = waypoint.ray;
        if (!ray?.A || !ray?.B) return context;

        const PAD = 8;
        function _tokenAt(pt) {
            return (canvas.tokens?.placeables ?? []).find(t => {
                if (!t.actor || !t.bounds) return false;
                const b = t.bounds;
                return pt.x >= b.x - PAD && pt.x <= b.x + b.width  + PAD
                    && pt.y >= b.y - PAD && pt.y <= b.y + b.height + PAD;
            }) ?? null;
        }

        const srcToken = _tokenAt(ray.A);
        if (!srcToken) return context;
        const tgtToken = _tokenAt(ray.B);
        if (!tgtToken || tgtToken === srcToken) return context;

        // Recalculer bord→bord exactement comme _ourPatch le fait pour midi-qol,
        // indépendamment de l'endroit où l'utilisateur a commencé à tirer la règle
        // (centre, bord, n'importe où dans le token).
        const srcCenter = _boundsCenter(srcToken);
        const tgtCenter = _boundsCenter(tgtToken);
        const srcBorder = _nearestBorderPoint(tgtCenter, srcToken);
        const tgtBorder = _nearestBorderPoint(srcCenter, tgtToken);

        // _reentering = true pour court-circuiter _ourPatch si le prototype
        // rappelle canvas.grid.measurePath en interne.
        _reentering = true;
        let bordResult;
        try {
            bordResult = _protoCall([srcBorder, tgtBorder], {});
        } finally {
            _reentering = false;
        }
        if (!bordResult || typeof bordResult.distance !== "number") return context;

        const adjust   = game.settings.get(_MODULE, "rangeAdjust") ?? 2.5;
        const adjusted = bordResult.distance + adjust;
        // toNearest est une extension Number de Foundry (toujours présente en v13).
        context.distance.total = (typeof adjusted.toNearest === "function")
            ? adjusted.toNearest(0.01).toLocaleString(game.i18n.lang)
            : adjusted.toFixed(2);

        return context;
    };
    RulerClass.prototype._getWaypointLabelContext[_PATCH_MARK] = true;
    console.log("[midi-range-fix] Patch ruler label actif.");
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks publics
// ─────────────────────────────────────────────────────────────────────────────
export function RangeFixHooks() {
    // canvasReady : patch initial après chaque chargement de scène.
    // setTimeout(0) : laisse les handlers canvasReady de midi-qol s'exécuter en premier.
    Hooks.on("canvasReady", () => {
        if (!game.modules.get("midi-qol")?.active) return;
        if (!game.settings.get(_MODULE, "enabled")) return;
        _stopPoll();
        setTimeout(() => {
            _installPatch();
            _startPoll();
            _patchRulerLabel(); // prototype patch, idempotent grâce au _PATCH_MARK
        }, 0);
    });

    // dnd5e.preUseItem : réinstalle juste avant chaque utilisation d'item.
    // Couvre le cas où midi-qol/libWrapper a écrasé le patch entre deux attaques
    // via Object.defineProperty (value descriptor), contournant notre setter.
    Hooks.on("dnd5e.preUseItem", () => {
        if (!canvas?.grid) return;
        if (!game.modules.get("midi-qol")?.active) return;
        if (!game.settings.get(_MODULE, "enabled")) return;
        _ensurePatch();
    });

    // canvasInit : arrête le polling (canvas en cours de démontage).
    Hooks.on("canvasInit", _stopPoll);
}

// ─────────────────────────────────────────────────────────────────────────────
// Gestion du patch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Installe le getter/setter sur canvas.grid.measurePath.
 * Capture la fonction actuelle (midi-qol) comme _trueOriginal si nécessaire.
 */
function _installPatch() {
    if (!canvas?.grid) return;

    // Lire la valeur actuelle via le descripteur (pas via le getter s'il est déjà le nôtre).
    const current = _readCurrentFn();

    // Mettre à jour _trueOriginal uniquement si la valeur courante n'est pas notre patch.
    if (current && !current[_PATCH_MARK]) {
        _trueOriginal = typeof current.bind === "function" ? current.bind(canvas.grid) : current;
    }

    if (!_trueOriginal || _trueOriginal[_PATCH_MARK]) {
        console.warn("[midi-range-fix] Impossible de trouver un fallback valide — patch annulé.");
        return;
    }

    try {
        Object.defineProperty(canvas.grid, "measurePath", {
            get: () => _ourPatch,
            set: (newFn) => {
                // Ignorer les réassignations à notre propre fonction (restauration circulaire).
                if (typeof newFn === "function" && !newFn[_PATCH_MARK]) {
                    _trueOriginal = newFn.bind(canvas.grid);
                }
            },
            configurable: true,
            enumerable:   true,
        });
        console.log("[midi-range-fix] Patch bord→bord actif.");
    } catch(e) {
        console.warn("[midi-range-fix] Object.defineProperty échoué, assignment direct :", e);
        try { canvas.grid.measurePath = _ourPatch; } catch {}
    }
}

/**
 * Vérifie si notre patch est toujours actif. Réinstalle si le descripteur est
 * devenu un value descriptor (remplacement via Object.defineProperty tiers).
 */
function _ensurePatch() {
    if (!canvas?.grid) return;
    if (_isPatchActive()) return;
    // Patch perdu → mettre à jour _trueOriginal et réinstaller.
    const current = _readCurrentFn();
    if (current && !current[_PATCH_MARK]) {
        _trueOriginal = typeof current.bind === "function" ? current.bind(canvas.grid) : current;
    }
    _installPatch();
    console.log("[midi-range-fix] Patch réinstallé (écrasement détecté).");
}

/**
 * Notre patch est actif si le descripteur de propriété est un accessor (get)
 * dont le getter retourne une fonction marquée _PATCH_MARK, ou si la valeur
 * directe est marquée _PATCH_MARK.
 */
function _isPatchActive() {
    const desc = Object.getOwnPropertyDescriptor(canvas.grid, "measurePath");
    if (!desc) return false;
    if (desc.get)   return desc.get()[_PATCH_MARK] === true;
    if (desc.value) return desc.value[_PATCH_MARK] === true;
    return false;
}

/**
 * Lit la fonction réellement assignée à canvas.grid.measurePath sans passer
 * par notre getter (on utilise le descripteur brut ou le prototype).
 */
function _readCurrentFn() {
    if (!canvas?.grid) return null;
    const desc = Object.getOwnPropertyDescriptor(canvas.grid, "measurePath");
    if (desc?.value) return desc.value;
    // Descripteur accessor : si c'est notre getter, on lit le prototype à la place.
    if (desc?.get) {
        const fromGetter = desc.get();
        if (fromGetter?.[_PATCH_MARK]) {
            // Notre getter est déjà là → lire le prototype pour le fallback d'origine.
            return Object.getPrototypeOf(canvas.grid)?.measurePath ?? null;
        }
        return fromGetter;
    }
    // Pas de propriété propre → lire le prototype.
    return Object.getPrototypeOf(canvas.grid)?.measurePath ?? null;
}

function _startPoll() {
    _pollInterval = setInterval(() => {
        if (!canvas?.grid) return;
        _ensurePatch();
    }, 2000);
}

function _stopPoll() {
    if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
}

/**
 * Centre géométrique d'un token basé sur ses bounds pixel.
 * Contrairement à token.center qui renvoie le centre de la première case,
 * cette fonction renvoie le vrai centre de l'ensemble du token.
 */
function _boundsCenter(token) {
    const b = token.bounds;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/**
 * Retourne le point le plus proche sur la bounding box du token depuis src.
 * Équivalent au "nearest cell edge" de D&D 5e sur grille carrée.
 */
function _nearestBorderPoint(src, token) {
    const b = token.bounds;
    return {
        x: Math.max(b.x, Math.min(src.x, b.x + b.width)),
        y: Math.max(b.y, Math.min(src.y, b.y + b.height))
    };
}
