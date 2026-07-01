import { registerSettings } from './modules/settings.js';
import { ChatHooks } from './modules/chat.js';
import { ImageHooks } from './modules/image.js';
import { PlayerHooks } from './modules/player.js';
import { ScenesHooks } from './modules/scenes.js';
import { DocumentHooks } from './modules/document.js';
import { JournalHooks } from './modules/journal.js';
import { XpHooks } from './modules/xp.js';
import { TokenHooks } from './modules/token.js';
import { SessionHooks } from './modules/session.js';
import { AntiCheatHooks } from './modules/anticheat.js';
import { DiscordLogHooks } from './modules/discordlog.js';
import { SocketHooks } from './modules/socket.js';
import { FakeWarningHooks } from './modules/fake-warning.js';
import { CombatHooks } from './modules/combat.js';
import { ItemHooks } from './modules/items.js';
import { AudioHooks } from './modules/audio.js';
import { RageHooks } from './modules/rage.js';
import { MejShopHooks } from './modules/mejshop.js';
import { CalDateHooks } from './modules/caldate.js';
import { TmHooks } from './modules/tm.js';

Hooks.on("init", async () => {
    Handlebars.registerHelper('for', function(from, to, incr, block) {
        var accum = '';
        for(var i = from; i < to; i += incr)
            accum += block.fn(i);
        return accum;
    });

    Handlebars.registerHelper("lte", function(a, b) {
        return a <= b;
      });

    registerSettings();
    ChatHooks();
    ImageHooks();
    PlayerHooks();
    ScenesHooks();
    DocumentHooks();
    JournalHooks();
    XpHooks();
    TokenHooks();
    SessionHooks();
    AntiCheatHooks();
    DiscordLogHooks();
    SocketHooks();
    FakeWarningHooks();
    CombatHooks();
    ItemHooks();
    AudioHooks();
    RageHooks();
    MejShopHooks();
    CalDateHooks();
    TmHooks();
});