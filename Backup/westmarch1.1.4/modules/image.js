export function ImageHooks() {
    Hooks.on("getImagePopoutHeaderButtons", (application, buttons) => getImagePopoutHeaderButtons(application, buttons));
}

function getImagePopoutHeaderButtons(application, buttons) {
    if (!game.user.isGM)
        return;
    buttons.unshift({
        label: "Show Party",
        class: "share-image-party",
        icon: "fas fa-user",
        onclick: () => {
            let users = game.users.filter(user => user.id != game.user.id && user.getFlag("westmarch", "partyId") == game.user.getFlag("westmarch", "partyId"));
            if(users.length > 0) {
                application.shareImage({users: users.map(user => user.id)});
            }
        },
        condition: li => game.user.isGM
    });
}
