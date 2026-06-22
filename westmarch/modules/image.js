import { partyFeatureEnabled } from './settings.js';

export function ImageHooks() {
    // En v13, getImagePopoutHeaderButtons n'est plus déclenché
    // On utilise renderApplicationV2 pour détecter les ImagePopout
    Hooks.on("renderApplicationV2", (application, element, context, options) => {
        // On cible uniquement les ImagePopout
        if (application.constructor.name !== "ImagePopout") return;
        // GM uniquement
        if (!game.user.isGM) return;
        if (!partyFeatureEnabled("enableShowParty")) return;

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

    // Fallback : tant qu'ImagePopout n'est pas migré vers ApplicationV2
    // dans cette version de Foundry, renderApplicationV2 ci-dessus ne se
    // déclenche jamais pour lui. On couvre donc aussi l'ancien hook v1.
    Hooks.on("renderImagePopout", (application, html, data) => {
        if (!game.user.isGM) return;
        if (!partyFeatureEnabled("enableShowParty")) return;

        const header = $(html).find(".window-header .window-controls");
        if (!header.length) return;
        if (header.find(".share-image-party").length) return;

        const btn = $(`<button type="button" class="share-image-party" title="Show Party"><i class="fas fa-user"></i></button>`);
        btn.on("click", () => {
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