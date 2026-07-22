import { registerSettings } from './modules/settings.js';
import { SocketHooks } from './modules/socket.js';
import { XpHooks } from './modules/xp.js';
import { CalDateHooks } from './modules/caldate.js';
import { DiscordLogHooks } from './modules/discordlog.js';
import { FakeWarningHooks } from './modules/fake-warning.js';
import { TmHooks } from './modules/tm.js';

Hooks.on("init", async () => {
    // Déclare ce module pour le nettoyage lors de l'export "fiche originale"
    CONFIG.asharaSheetsModules ??= [];
    CONFIG.asharaSheetsModules.push("westmarch-ashara");

    registerSettings();
    SocketHooks();
    XpHooks();
    CalDateHooks();
    DiscordLogHooks();
    FakeWarningHooks();
    TmHooks();
});
