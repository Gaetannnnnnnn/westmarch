// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Redistribution et modification interdites.
/**
 * midi-range-fix | range-fix.js
 * v1.0.7
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
 *   Bounding box rectangulaire dans tous les cas.
 *   Le cercle inscrit donnait des distances légèrement supérieures en approche
 *   diagonale d'un coin (ex. 5.6ft au lieu de 3.5ft pour un Brown Bear adjacent
 *   en diagonale), ce qui faisait arrondir à 6ft et bloquer l'attaque à tort.
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

        // Identifier l'attaquant : src est dans ses bounds.
        //
        // On utilise uniquement les bounds (pas token.center) car en Foundry v13
        // token.center renvoie le centre de la première case du token, pas le centre
        // géométrique du token entier — ce qui donne le mauvais point pour les
        // tokens Large+. Les bounds sont toujours corrects.
        const attacker = canvas.tokens.placeables.find(t => {
            if (!t.actor) return false;
            const b = t.bounds;
            return src.x >= b.x && src.x <= b.x + b.width
                && src.y >= b.y && src.y <= b.y + b.height;
        });
        if (!attacker) return original(waypoints, options);

        // Identifier la cible : tgt est dans ses bounds
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

        // Centre géométrique réel = milieu des bounds (pas token.center)
        const attackerCenter = _boundsCenter(attacker);

        // 1. Point le plus proche sur la bordure réelle de la cible
        const nearest = _nearestBorderPoint(attackerCenter, target);

        // 2. Distance centre attaquant → bord cible
        const result = original([attackerCenter, nearest], options);

        // 3. Soustraire le bonus de taille de l'attaquant
        //    Bonus = (nb cases - 1) × 2.5ft
        const gridDist = canvas.grid.distance;
        const attackerBonus = Math.max(0, (attackerWidth - 1) * (gridDist / 2));

        if (attackerBonus === 0) return result;

        const corrected = Math.max(0, (result.distance ?? 0) - attackerBonus);
        return Object.assign(Object.create(Object.getPrototypeOf(result)), result, { distance: corrected });
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
 * Retourne le point le plus proche sur la bordure du token depuis src.
 *
 * On utilise systématiquement la bounding box rectangulaire (coin le plus proche).
 * C'est équivalent au "nearest cell edge" de D&D 5e sur grille carrée, et évite
 * le sur-calcul du cercle inscrit qui renvoyait des distances trop grandes en
 * approche diagonale d'un coin (ex. Large token).
 */
function _nearestBorderPoint(src, token) {
    const b = token.bounds;
    return {
        x: Math.max(b.x, Math.min(src.x, b.x + b.width)),
        y: Math.max(b.y, Math.min(src.y, b.y + b.height))
    };
}
