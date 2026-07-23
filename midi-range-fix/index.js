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
