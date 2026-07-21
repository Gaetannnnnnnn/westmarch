// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Redistribution et modification interdites.
/**
 * midi-range-fix | range-fix.js
 * v1.0.2
 *
 * Corrige le calcul de portée midi-qol pour les tokens Large/Huge/Gargantuan.
 *
 * Règle : chaque token a un rayon naturel (2.5ft par case au-delà de Medium).
 * La portée effective d'une attaque est mesurée du CENTRE de l'attaquant
 * jusqu'au BORD de la cible (centre → bord).
 *
 * Portée effective = portée_arme + (taille_attaquant - 1) × 2.5ft
 *   - Attaquant Medium (1 case) : 5ft → 5ft
 *   - Attaquant Large  (2 cases) : 5ft → 7.5ft
 *   - Attaquant Huge   (3 cases) : 5ft → 10ft
 *
 * Implémentation :
 *   1. On remplace le point cible par le bord le plus proche du token cible.
 *   2. On soustrait du résultat le bonus de taille de l'attaquant.
 *   3. midi-qol compare au weapon_range habituel → résultat correct.
 *
 * Forme du bord cible :
 *   - Token carré (width = height) → cercle inscrit (évite biais diagonal).
 *   - Token non-carré (width ≠ height) → bounding box rectangulaire.
 */

export function RangeFixHooks() {
    Hooks.once("ready", () => {
        if (!game.modules.get("midi-qol")?.active) {
            console.log("[midi-range-fix] midi-qol non actif — module désactivé.");
            return;
        }

        _patchMeasurePath();
        console.log("[midi-range-fix] Patch centre→bord actif.");
    });
}

function _patchMeasurePath() {
    const original = canvas.grid.measurePath.bind(canvas.grid);

    canvas.grid.measurePath = function(waypoints, options) {
        if (!waypoints || waypoints.length !== 2) {
            return original(waypoints, options);
        }

        const [src, tgt] = waypoints;

        // Identifier l'attaquant (centre ≈ src, tolérance 2px)
        const attacker = canvas.tokens.placeables.find(t => {
            if (!t.actor) return false;
            const c = t.center;
            return Math.abs(c.x - src.x) < 2 && Math.abs(c.y - src.y) < 2;
        });
        if (!attacker) return original(waypoints, options);

        // Identifier la cible (tgt est dans ses bounds)
        const target = canvas.tokens.placeables.find(t => {
            if (!t.actor || t === attacker) return false;
            const b = t.bounds;
            return tgt.x >= b.x && tgt.x <= b.x + b.width
                && tgt.y >= b.y && tgt.y <= b.y + b.height;
        });
        if (!target) return original(waypoints, options);

        // Aucune correction nécessaire si les deux tokens sont Medium
        const attackerWidth = attacker.document.width;
        const targetWidth   = target.document.width;
        if (attackerWidth <= 1 && targetWidth <= 1) return original(waypoints, options);

        // 1. Point le plus proche sur la bordure réelle de la cible
        const nearest = _nearestBorderPoint(src, target);

        // 2. Distance centre attaquant → bord cible
        const result = original([src, nearest], options);

        // 3. Soustraire le bonus de taille de l'attaquant (en feet)
        //    Bonus = (nb cases - 1) × 2.5ft
        const gridDist = canvas.grid.distance; // feet par case
        const attackerBonus = Math.max(0, (attackerWidth - 1) * (gridDist / 2));

        if (attackerBonus === 0) return result;

        const corrected = Math.max(0, (result.distance ?? 0) - attackerBonus);
        return Object.assign(Object.create(Object.getPrototypeOf(result)), result, { distance: corrected });
    };
}

/**
 * Retourne le point le plus proche sur la bordure du token depuis src.
 *
 * - Token carré (width = height) : cercle inscrit.
 * - Token non-carré : bounding box rectangulaire.
 */
function _nearestBorderPoint(src, token) {
    const w = token.document.width;
    const h = token.document.height;

    if (w === h) {
        const center = token.center;
        const radius  = (w * canvas.grid.size) / 2;
        const dx = src.x - center.x;
        const dy = src.y - center.y;
        const dist = Math.hypot(dx, dy);
        if (dist === 0) return { x: center.x + radius, y: center.y };
        return {
            x: center.x + (dx / dist) * radius,
            y: center.y + (dy / dist) * radius
        };
    }

    const b = token.bounds;
    return {
        x: Math.max(b.x, Math.min(src.x, b.x + b.width)),
        y: Math.max(b.y, Math.min(src.y, b.y + b.height))
    };
}
