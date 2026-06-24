// ============================================================
// socket.js — Canal socket dédié au module, pour déplacer un
// utilisateur précis vers une scène.
//
// Le socket core "pullToScene" de Foundry v13 a changé de
// comportement : son handler ne lit plus que le sceneId (le
// userId envoyé en second argument est ignoré), et le serveur
// ne relaie jamais l'événement à l'émetteur lui-même. Résultat :
// il devient impossible de cibler un joueur précis avec ce socket
// — il déplace tous les AUTRES clients connectés, et jamais soi-même.
//
// On utilise donc notre propre canal "module.westmarch", relayé
// par le serveur à tous les clients, où chaque client filtre
// lui-même selon le userId visé.
// ============================================================

export function SocketHooks() {
    game.socket.on("module.westmarch", (data) => {
        // DEBUG TEMPORAIRE — à retirer une fois le bug identifié
        console.log("[westmarch] socket reçu :", data, "| mon id =", game.user.id);

        if (!data || data.userId !== game.user.id) return;

        if (data.action === "pullToScene") {
            const scene = game.scenes.get(data.sceneId);
            if (scene) scene.view();
        } else if (data.action === "fakeWarning") {
            ui.notifications.warn(data.message);
        }
    });
}

// Déplace l'utilisateur "userId" vers la scène "sceneId". Si c'est
// nous-mêmes, on change directement notre scène (pas besoin de socket).
export function pullUserToScene(sceneId, userId) {
    if (userId === game.user.id) {
        const scene = game.scenes.get(sceneId);
        if (scene) scene.view();
        return;
    }
    game.socket.emit("module.westmarch", { action: "pullToScene", sceneId, userId });
}

// Affiche un faux message d'avertissement (notification jaune) chez
// l'utilisateur "userId" — utilisé par le bouton "farce" (fake-warning.js).
export function sendFakeWarning(userId, message) {
    game.socket.emit("module.westmarch", { action: "fakeWarning", userId, message });
}
