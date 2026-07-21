import { registerSettings } from './modules/settings.js';
import { SocketHooks } from './modules/socket.js';
import { XpHooks } from './modules/xp.js';
import { CalDateHooks } from './modules/caldate.js';
import { DiscordLogHooks } from './modules/discordlog.js';
import { FakeWarningHooks } from './modules/fake-warning.js';
import { TmHooks } from './modules/tm.js';

Hooks.on("init", async () => {
    registerSettings();
    SocketHooks();
    XpHooks();
    CalDateHooks();
    DiscordLogHooks();
    FakeWarningHooks();
    TmHooks();
});
