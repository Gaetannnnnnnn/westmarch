import { partyFeatureEnabled } from './settings.js';
import { pullUserToScene } from './socket.js';

export function ScenesHooks() {
    Hooks.on('getSceneContextOptions', (html, contextMenu) => {
        contextMenu.push({
            name: "Go With Party",
            icon: '<i class="fa-solid fa-people-arrows"></i>',
            callback: li => {
                // DEBUG TEMPORAIRE — à retirer une fois le bug identifié
                console.log("[westmarch] getSceneContextOptions li.dataset =", li?.dataset);
                var destination = game.scenes.get(li.dataset.entryId ?? li.dataset.sceneId ?? li.dataset.documentId);
                GoWithParty(destination);
            },
            condition: li => game.user.isGM && partyFeatureEnabled("enableGoWithPartyScenes")
        });
    });
    Hooks.on('getSceneDirectoryEntryContextOptions', (html, contextMenu) => {
        contextMenu.push({
            name: "Go With Party",
            icon: '<i class="fa-solid fa-people-arrows"></i>',
            callback: li => {
                // DEBUG TEMPORAIRE — à retirer une fois le bug identifié
                console.log("[westmarch] getSceneDirectoryEntryContextOptions li.dataset =", li?.dataset);
                var destination = game.scenes.get(li.dataset.sceneId ?? li.dataset.entryId ?? li.dataset.documentId);
                GoWithParty(destination);
            },
            condition: li => game.user.isGM && partyFeatureEnabled("enableGoWithPartyScenes")
        });
    });
}

function GoWithParty(destination){
    // DEBUG TEMPORAIRE — à retirer une fois le bug identifié
    console.log("[westmarch] GoWithParty destination =", destination);
    if (!destination) {
        ui.notifications.error("WestMarch (debug) : scène de destination introuvable — voir console.");
        return;
    }
    const myPartyId = game.user.getFlag("westmarch", "partyId");
    console.log("[westmarch] myPartyId =", myPartyId);
    let count = 0;
    game.users.forEach(user => {
        const theirPartyId = user.getFlag("westmarch", "partyId");
        console.log(`[westmarch] user ${user.name} partyId =`, theirPartyId);
        if (myPartyId && theirPartyId === myPartyId) {
            count++;
            pullUserToScene(destination.id, user.id);
        }
    });
    ui.notifications.info(`WestMarch (debug) : ${count} membre(s) ciblé(s) vers ${destination.name}.`);
}