import { registerSettings } from './modules/settings.js';
import { TmHooks }          from './modules/tm.js';

Hooks.on("init", () => {
    registerSettings();
    TmHooks();
});
