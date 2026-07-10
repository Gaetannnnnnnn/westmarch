import { registerSettings } from './modules/settings.js';
import { RelationsHooks } from './modules/relations.js';

Hooks.on("init", () => {
    registerSettings();
    RelationsHooks();
});
