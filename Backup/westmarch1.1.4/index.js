(() => {
})();

import { ChatHooks } from './modules/chat.js';
import { ImageHooks } from './modules/image.js';
import { PlayerHooks } from './modules/player.js';
import { ScenesHooks } from './modules/scenes.js';
import { DocumentHooks } from './modules/document.js';
import { JournalHooks } from './modules/journal.js';
import { PartyHooks } from './modules/party.js';

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

    ChatHooks();
    ImageHooks();
    PlayerHooks();
    ScenesHooks();
    DocumentHooks();
    JournalHooks();
    PartyHooks();
});