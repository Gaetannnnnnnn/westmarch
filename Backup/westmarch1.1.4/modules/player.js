import { ReloadChat } from './chat.js';

var appPlayerList = undefined;

export function PlayerHooks() {
    Hooks.on("renderPlayers", (app, html, data) => {
        appPlayerList = app;
        $(html).find('.players-list').addClass('scrollable');
        $(html).find('.players-mode').after(`<i class="fa-solid fa-arrows-rotate" style="float: right;"></i>`);
        $(html).find('.fa-arrows-rotate').click((event) => { 
            event.stopPropagation();
            appPlayerList.render();
        });
        $(html).find('.player.gm').each((index, gmElement) => {
            var user = game.users.get(gmElement.dataset.userId);
            if(user.getFlag('westmarch', 'partyId') === user.id) { 
                gmElement.insertAdjacentHTML('beforebegin', '<hr style="margin: 0px; border: 1px solid '+ getComputedStyle(gmElement).getPropertyValue("--player-color").trim()+'"/>');

                var firstElement = gmElement;
                $(html).find('.player').each((index, playerElement) => {
                    if(playerElement.dataset.userId !== gmElement.dataset.userId 
                        && game.users.get(gmElement.dataset.userId).getFlag('westmarch', 'partyId') == game.users.get(playerElement.dataset.userId).getFlag('westmarch', 'partyId')
                    ) {
                        let clone = playerElement.cloneNode(true);
                        if(firstElement == gmElement)
                            firstElement = clone;
                        gmElement.insertAdjacentElement('afterend', clone);
                        playerElement.remove();
                    }
                });
                firstElement.insertAdjacentHTML('afterend', '<hr style="margin: 0px; border: 1px solid '+getComputedStyle(gmElement).getPropertyValue("--player-color").trim()+'"/>');
            }
        });
    });
    Hooks.on('getUserContextOptions', (html, contextMenu) => {
        contextMenu.push({
            name: "Create Party",
            icon: '<i class="fa-solid fa-users"></i>',
            callback: li => {
                game.user.setFlag("westmarch", "partyId",  game.user.id).then(() => { 
                    ReloadChat();
                    appPlayerList.render();
                });
            },
            condition: li => game.users.get(li.dataset.userId).isGM && game.user.id == li.dataset.userId && game.user.id != game.user.getFlag('westmarch', 'partyId')
        });
        contextMenu.push({
            name: "Join Party",
            icon: '<i class="fa-solid fa-user-plus"></i>',
            callback: li => {
                game.user.setFlag("westmarch", "partyId",  li.dataset.userId).then(() => { 
                    ReloadChat();
                    appPlayerList.render();
                });
            },
            condition: li => game.users.get(li.dataset.userId).isGM && game.users.get(li.dataset.userId).getFlag('westmarch', 'partyId') == li.dataset.userId && game.user.id != li.dataset.userId
        });
        contextMenu.push({
            name: "Leave Party",
            icon: '<i class="fa-solid fa-user-minus"></i>',
            callback: li => {
                if(game.user.isGM && game.user.id == game.user.getFlag('westmarch', 'partyId')) {
                    game.users.forEach(user => { 
                        if(user.getFlag("westmarch", "partyId") == game.user.id) {
                            user.unsetFlag("westmarch", "partyId");
                        }
                    });
                }
                game.user.unsetFlag("westmarch", "partyId").then(() => {
                    ReloadChat();
                    appPlayerList.render();
                });
            },
            condition: li => game.user.id == li.dataset.userId && game.users.get(li.dataset.userId).getFlag('westmarch', 'partyId')
        });
        contextMenu.push({
            name: "Kick Party",
            icon: '<i class="fa-solid fa-users-slash"></i>',
            callback: li => {
                game.users.get(li.dataset.userId).unsetFlag("westmarch", "partyId").then(() => { 
                    ReloadChat();
                    appPlayerList.render();
                });
            },
            condition: li => game.user.isGM && game.users.get(li.dataset.userId).getFlag('westmarch', 'partyId') && game.user.id != li.dataset.userId
        });
        contextMenu.push({
            name: "Invite Party",
            icon: '<i class="fa-solid fa-user-tag"></i>',
            callback: li => {
                game.users.get(li.dataset.userId).setFlag("westmarch", "partyId", game.user.getFlag('westmarch', 'partyId')).then(() => { 
                    ReloadChat();
                    appPlayerList.render();
                });
            },
            condition: li => game.user.isGM && game.users.get(li.dataset.userId).getFlag('westmarch', 'partyId') != game.user.getFlag('westmarch', 'partyId') && game.user.id != li.dataset.userId
        });
    });
}
