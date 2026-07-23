// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Redistribution et modification interdites.
/**
 * midi-range-fix | range-fix.js
 * v1.1.1
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
 * Application : le patch est appliqué à chaque chargement de scène (canvasReady)
 * car canvas.grid est recréé à chaque changement de scène — un patch appliqué
 * dans "ready" ne survit pas au premier chargement de scène.
 */

export function RangeFixHooks() {
    // canvasReady est déclenché à chaque chargement de scène.
    // canvas.grid est une nouvelle instance à chaque fois → pas de double-patch.
    Hooks.on("canvasReady", () => {
        if (!game.modules.get("midi-qol")?.active) return;
        if (!game.settings.get("midi-range-fix", "enabled")) return;

        // setTimeout(0) : repousse l'application du patch après tous les handlers
        // synchrones du même canvasReady (y compris le patch éventuel de midi-qol).
        // Garantit que notre version est bien la dernière appliquée.
        setTimeout(() => {
            _patchMeasurePath();
            console.log("[midi-range-fix] Patch bord→bord actif.");
        }, 0);
    });
}

function _patchMeasurePath() {
    const original = canvas.grid.measurePath.bind(canvas.grid);

    canvas.grid.measurePath = function(waypoints, options) {
        if (!waypoints || waypoints.length !== 2) {
            return original(waypoints, options);
        }

        const [src, tgt] = waypoints;

        // Identifier l'attaquant : src est dans ses bounds.
        const attacker = canvas.tokens.placeables.find(t => {
            if (!t.actor) return false;
            const b = t.bounds;
            return src.x >= b.x && src.x <= b.x + b.width
                && src.y >= b.y && src.y <= b.y + b.height;
        });
        if (!attacker) return original(waypoints, options);

        // Identifier la cible : tgt est dans ses bounds.
        const target = canvas.tokens.placeables.find(t => {
            if (!t.actor || t === attacker) return false;
            const b = t.bounds;
            return tgt.x >= b.x && tgt.x <= b.x + b.width
                && tgt.y >= b.y && tgt.y <= b.y + b.height;
        });
        if (!target) return original(waypoints, options);

        // Aucune correction pour Medium vs Medium : la mesure native midi-qol
        // (centre vers coin) est correcte pour des tokens bien alignés sur la grille.
        const attackerWidth = attacker.document.width;
        const targetWidth   = target.document.width;
        if (attackerWidth <= 1 && targetWidth <= 1) return original(waypoints, options);

        // Mesure bord→bord :
        //   1. Point le plus proche sur la bounding box de l'attaquant depuis
        //      le centre de la cible → bord de l'attaquant tourné vers la cible
        //   2. Point le plus proche sur la bounding box de la cible depuis
        //      le centre de l'attaquant → bord de la cible tourné vers l'attaquant
        // La distance entre ces deux points = portée effective D&D 5e.
        const attackerCenter = _boundsCenter(attacker);
        const targetCenter   = _boundsCenter(target);

        const attackerBorder = _nearestBorderPoint(targetCenter,   attacker);
        const targetBorder   = _nearestBorderPoint(attackerCenter, target);

        return original([attackerBorder, targetBorder], options);
    };
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
