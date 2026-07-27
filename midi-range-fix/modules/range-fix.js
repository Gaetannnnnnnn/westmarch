// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Redistribution et modification interdites.
/**
 * midi-range-fix | range-fix.js
 * v1.2.0
 *
 * Corrige le calcul de portée midi-qol pour les tokens Large/Huge/Gargantuan.
 *
 * Problème : midi-qol mesure de plusieurs coins de l'attaquant vers plusieurs
 * coins du token cible, puis prend la distance minimale. Cette approche donne
 * des distances trop grandes pour les tokens Large+ positionnés hors-grille,
 * ou pour des combinaisons Medium attaquant vs Large cible (le demi-espace de
 * l'attaquant n'est pas pris en compte — ex. PJ Medium vs Brown Bear Large
 * donnait 6.9ft au lieu de 1.6ft, bloquant l'attaque à tort).
 *
 * Correction : mesure bord→bord.
 *   - On trouve le point le plus proche sur la bounding box de l'ATTAQUANT
 *     depuis le centre de la CIBLE.
 *   - On trouve le point le plus proche sur la bounding box de la CIBLE
 *     depuis le centre de l'ATTAQUANT.
 *   - La distance entre ces deux points de bord est la portée effective D&D 5e.
 *
 * La correction n'est appliquée que si l'un des deux tokens est Large+ (≥ 2 cases).
 * Pour Medium vs Medium, la mesure native midi-qol est conservée (elle est correcte
 * pour les tokens alignés sur la grille).
 *
 * Persistance du patch — triple couche (v1.2.0) :
 *
 *   Problème v1.1.3 : midi-qol (ou libWrapper) peut appeler Object.defineProperty
 *   sur canvas.grid.measurePath PENDANT le workflow d'attaque. Cela remplace notre
 *   getter/setter par un value descriptor — notre setter n'est jamais déclenché,
 *   notre getter est détruit. L'attaque 1 fonctionnait (getter encore en place) ;
 *   l'attaque 2 échouait (le getter avait été écrasé).
 *
 *   Solution :
 *     1. _ourPatch est en portée MODULE (référence stable, identifiable par ===
 *        et par le Symbol _PATCH_MARK).
 *     2. Object.defineProperty getter/setter (résiste aux assignments simples).
 *     3. Hook dnd5e.preUseItem : réinstalle le getter/setter avant chaque item use,
 *        avant que midi-qol ne fasse quoi que ce soit.
 *     4. Polling 250ms : détecte si le descripteur est devenu un value descriptor
 *        (Object.defineProperty tiers) et réinstalle.
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

        // Identifier l'attaquant : src est dans ses bounds.
        const attacker = canvas.tokens.placeables.find(t => {
            if (!t.actor || !t.bounds) return false;
            const b = t.bounds;
            return src.x >= b.x && src.x <= b.x + b.width
                && src.y >= b.y && src.y <= b.y + b.height;
        });
        if (!attacker) return _protoCall(waypoints, options);

        // Identifier la cible : tgt est dans ses bounds.
        const target = canvas.tokens.placeables.find(t => {
            if (!t.actor || t === attacker || !t.bounds) return false;
            const b = t.bounds;
            return tgt.x >= b.x && tgt.x <= b.x + b.width
                && tgt.y >= b.y && tgt.y <= b.y + b.height;
        });
        if (!target) return _protoCall(waypoints, options);

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
            result = _protoCall([attackerBorder, targetBorder], options);
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
            result.distance = result.distance + adjust;
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
