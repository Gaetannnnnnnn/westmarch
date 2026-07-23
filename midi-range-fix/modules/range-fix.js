// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Redistribution et modification interdites.
/**
 * midi-range-fix | range-fix.js
 * v1.1.3
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
 * Persistance du patch :
 *   canvas.grid est recréé à chaque chargement de scène → on re-patche via
 *   canvasReady. Sur la même scène, midi-qol réécrit canvas.grid.measurePath
 *   pendant son workflow d'attaque. Pour contrer ça, on utilise
 *   Object.defineProperty avec un getter/setter : le getter renvoie toujours
 *   notre fonction ; le setter intercepte les réécritures de midi-qol et met
 *   à jour notre fallback interne sans jamais exposer la version de midi-qol.
 */

// Référence à la version "original" que notre patch doit appeler en fallback.
// Mise à jour par le setter si midi-qol réécrit canvas.grid.measurePath.
let _trueOriginal = null;

export function RangeFixHooks() {
    // canvasReady est déclenché à chaque chargement de scène.
    // canvas.grid est une nouvelle instance à chaque fois → on réinstalle le patch.
    Hooks.on("canvasReady", () => {
        if (!game.modules.get("midi-qol")?.active) return;
        if (!game.settings.get("midi-range-fix", "enabled")) return;

        // setTimeout(0) : repousse l'application du patch après tous les handlers
        // synchrones du même canvasReady (y compris le patch éventuel de midi-qol).
        // Garantit que _trueOriginal capture bien la version finale de midi-qol.
        setTimeout(() => {
            _patchMeasurePath();
            console.log("[midi-range-fix] Patch bord→bord actif (sticky).");
        }, 0);
    });
}

function _patchMeasurePath() {
    // Si notre getter est déjà en place sur cette instance de canvas.grid, rien à faire.
    // (Object.getOwnPropertyDescriptor renvoie un descripteur avec get si on a déjà patchéé.)
    const existing = Object.getOwnPropertyDescriptor(canvas.grid, "measurePath");
    if (existing?.get) return;

    // Capture la version actuelle comme fallback (celle de midi-qol après son propre patch).
    _trueOriginal = canvas.grid.measurePath.bind(canvas.grid);

    // Notre fonction de mesure bord→bord.
    function _ourPatch(waypoints, options) {
        try {
            if (!waypoints || waypoints.length !== 2) {
                return _trueOriginal(waypoints, options);
            }

            const [src, tgt] = waypoints;

            // Identifier l'attaquant : src est dans ses bounds.
            const attacker = canvas.tokens.placeables.find(t => {
                if (!t.actor || !t.bounds) return false;
                const b = t.bounds;
                return src.x >= b.x && src.x <= b.x + b.width
                    && src.y >= b.y && src.y <= b.y + b.height;
            });
            if (!attacker) return _trueOriginal(waypoints, options);

            // Identifier la cible : tgt est dans ses bounds.
            const target = canvas.tokens.placeables.find(t => {
                if (!t.actor || t === attacker || !t.bounds) return false;
                const b = t.bounds;
                return tgt.x >= b.x && tgt.x <= b.x + b.width
                    && tgt.y >= b.y && tgt.y <= b.y + b.height;
            });
            if (!target) return _trueOriginal(waypoints, options);

            // Aucune correction pour Medium vs Medium : la mesure native midi-qol
            // (centre vers coin) est correcte pour des tokens bien alignés sur la grille.
            const attackerWidth = attacker.document?.width ?? 1;
            const targetWidth   = target.document?.width ?? 1;
            if (attackerWidth <= 1 && targetWidth <= 1) return _trueOriginal(waypoints, options);

            // Mesure bord→bord.
            const attackerCenter = _boundsCenter(attacker);
            const targetCenter   = _boundsCenter(target);
            const attackerBorder = _nearestBorderPoint(targetCenter,   attacker);
            const targetBorder   = _nearestBorderPoint(attackerCenter, target);

            return _trueOriginal([attackerBorder, targetBorder], options);

        } catch(err) {
            // Fallback silencieux : on ne laisse jamais l'erreur remonter vers midi-qol.
            console.warn("[midi-range-fix] Erreur dans measurePath, fallback midi-qol :", err);
            return _trueOriginal(waypoints, options);
        }
    }

    // Pose un getter/setter sur canvas.grid.measurePath.
    // → getter  : renvoie toujours _ourPatch, peu importe ce que midi-qol a écrit.
    // → setter  : intercepte les réécritures de midi-qol, met à jour _trueOriginal
    //             (pour que notre fallback reste correct) sans exposer sa version.
    Object.defineProperty(canvas.grid, "measurePath", {
        get: () => _ourPatch,
        set: (newFn) => {
            if (typeof newFn === "function" && newFn !== _ourPatch) {
                _trueOriginal = newFn.bind(canvas.grid);
                console.log("[midi-range-fix] midi-qol a réécrit measurePath → fallback mis à jour, wrapper toujours actif.");
            }
        },
        configurable: true,
        enumerable:   true,
    });
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
