import { registerSettings } from './modules/settings.js';
import { ChatHooks } from './modules/chat.js';
import { ImageHooks } from './modules/image.js';
import { PlayerHooks } from './modules/player.js';
import { ScenesHooks } from './modules/scenes.js';
import { DocumentHooks } from './modules/document.js';
import { JournalHooks } from './modules/journal.js';
import { SessionHooks } from './modules/session.js';
import { AntiCheatHooks } from './modules/anticheat.js';
import { SocketHooks } from './modules/socket.js';
import { CombatHooks } from './modules/combat.js';
import { AudioHooks } from './modules/audio.js';
import { registerSiteSettings, SiteHooks } from './modules/site.js';
import { tl, registerLangueSetting } from './modules/i18n.js';
import { AccessibilityHooks } from './modules/accessibility.js';
import { registerAboutMenu } from './modules/about.js';

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

    // Texte traduit dans les gabarits Handlebars : {{wmTl "texte français"}}.
    Handlebars.registerHelper("wmTl", (fr) => tl(String(fr)));

    // Réglages visibles par tous (joueurs et MJ) : langue, accessibilité, à propos.
    registerLangueSetting();
    AccessibilityHooks();
    registerAboutMenu();

    registerSettings();
    registerSiteSettings();
    ChatHooks();
    ImageHooks();
    PlayerHooks();
    ScenesHooks();
    DocumentHooks();
    JournalHooks();
    SessionHooks();
    AntiCheatHooks();
    SocketHooks();
    CombatHooks();
    AudioHooks();
});

// Message aux MJ (une fois par version) : où suivre les mises à jour et
// découvrir la version complète, sur le site d'Althéia.
SiteHooks();
