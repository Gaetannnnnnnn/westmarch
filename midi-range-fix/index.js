/**
 * @module      midi-range-fix
 * @version     1.3.6
 * @author      Soruta (Discord : s0ruta)
 * @license     © 2026 Soruta — Tous droits réservés.
 *              Usage personnel autorisé. Toute redistribution, modification
 *              ou usage commercial est strictement interdit sans autorisation écrite.
 * @description Corrige le calcul de portée midi-qol pour les tokens Large/Huge/Gargantuan.
 *              Remplace la mesure native (centre→coin) par une mesure bord→bord,
 *              puis ajoute un buffer configurable pour aligner la règle Foundry
 *              et les décisions d'attaque midi-qol.
 * @requires    midi-qol (module Foundry VTT)
 * @compatible  Foundry VTT v13+ | D&D 5e v3+
 */

import { registerSettings } from './modules/settings.js';
import { RangeFixHooks }    from './modules/range-fix.js';

Hooks.on("init", () => {
    registerSettings();
});

// RangeFixHooks enregistre un listener canvasReady.
// On le fait dans "ready" (pas "init") pour s'assurer que notre listener
// est enregistré APRÈS celui de midi-qol (qui s'inscrit lui-même dans "ready").
// Ordre alphabétique : midi-qol < midi-range-fix → notre ready s'exécute
// en second → notre canvasReady handler est enregistré en dernier
// → on applique le patch après midi-qol, pas avant.
Hooks.on("ready", () => {
    RangeFixHooks();
});
