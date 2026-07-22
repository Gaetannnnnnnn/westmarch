import { registerSettings } from './modules/settings.js';
import { RangeFixHooks }    from './modules/range-fix.js';

Hooks.on("init", () => {
    registerSettings();
    RangeFixHooks();
});
