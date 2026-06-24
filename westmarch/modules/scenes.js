import { partyFeatureEnabled } from './settings.js';
import { pullUserToScene } from './socket.js';

export function ScenesHooks() {
    Hooks.on('getSceneContextOptions', (html, contextMenu) => {
        contextMenu.push({
            name: "Go With Party",
            icon: '<i class="fa-solid fa-people-arrows"></i>',
            callback: li => {
                var destination = game.scenes.get(li.dataset.entryId ?? li.dataset.sceneId);
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
                var destination = game.scenes.get(li.dataset.sceneId);
                GoWithParty(destination);
            },
            condition: li => game.user.isGM && partyFeatureEnabled("enableGoWithPartyScenes")
        });
    });
}

function GoWithParty(destination){
    game.users.forEach(user => { 
        if (user.getFlag("westmarch", "partyId") == game.user.getFlag("westmarch", "partyId")) {
            pullUserToScene(destination.id, user.id);
        }
    });
}