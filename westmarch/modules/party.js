import { partyFeatureEnabled } from './settings.js';

export function JournalHooks() {
    Hooks.on("renderJournalEntrySheet", (sheet, html, data) => renderJournalEntrySheet(sheet, html, data));
}

function renderJournalEntrySheet(sheet, html, data) {
    if (!partyFeatureEnabled("enableGoWithPartyJournal")) return;
    const sceneLinks = $(html).find(".content-link[data-type='Scene']");
    if (sceneLinks.length === 0) return;

    const menuItems = [
        {
            name: "Go Alone",
            icon: '<i class="fa-solid fa-person-walking"></i>',
            callback: async (el) => {
                const uuid = el.data("uuid");
                const scene = await fromUuid(uuid);
                game.socket.emit("pullToScene", scene.id, game.user.id);
            }
        },
        {
            name: "Go With Party",
            icon: '<i class="fa-solid fa-people-arrows"></i>',
            callback: async (el) => {
                const uuid = el.data("uuid");
                const scene = await fromUuid(uuid);
                const partyId = game.user.getFlag("westmarch", "partyId");
                game.users.forEach(user => {
                    if (user.getFlag("westmarch", "partyId") === partyId) {
                        game.socket.emit("pullToScene", scene.id, user.id);
                    }
                });
                ui.notifications.info(`Groupe téléporté vers ${scene.name}`);
            }
        }
    ];

    new ContextMenu($(html), ".content-link[data-type='Scene']", menuItems);
}