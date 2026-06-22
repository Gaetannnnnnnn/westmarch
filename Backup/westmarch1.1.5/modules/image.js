export function ImageHooks() {
    // En v13, getImagePopoutHeaderButtons n'est plus déclenché
    // On utilise renderApplicationV2 pour détecter les ImagePopout
    Hooks.on("renderApplicationV2", (application, element, context, options) => {
        // On cible uniquement les ImagePopout
        if (application.constructor.name !== "ImagePopout") return;
        // GM uniquement
        if (!game.user.isGM) return;

        // Cherche la barre de contrôles header
        const header = element.querySelector(".window-header .window-controls");
        if (!header) return;

        // Evite de dupliquer le bouton si déjà présent
        if (header.querySelector(".share-image-party")) return;

        const btn = document.createElement("button");
        btn.classList.add("share-image-party");
        btn.innerHTML = '<i class="fas fa-user"></i>';
        btn.title = "Show Party";
        btn.addEventListener("click", () => {
            const myPartyId = game.user.getFlag("westmarch", "partyId");
            const users = game.users.filter(user => 
                user.id !== game.user.id && 
                user.getFlag("westmarch", "partyId") === myPartyId
            );
            if (users.length > 0) {
                application.shareImage({ users: users.map(u => u.id) });
            } else {
                ui.notifications.warn("Aucun membre de la party connecté.");
            }
        });

        header.prepend(btn);
    });
}