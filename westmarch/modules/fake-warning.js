// ============================================================
// fake-warning.js — Faux message de maintenance (farce GM)
// Ajoute un bouton dans la barre d'outils de gauche (icônes de
// contrôle de scène) qui permet au GM d'envoyer un faux message
// d'avertissement jaune ("mise à jour effectuée...") à un joueur
// précis, pour lui faire croire qu'un problème a été réglé.
// ============================================================

import { sendFakeWarning } from './socket.js';

const DEFAULT_MESSAGE = "Mise à jour effectuée — le problème devrait être résolu.";

export function FakeWarningHooks() {

    // Foundry v13 : "controls" est un objet (record) indexé par nom de
    // groupe, et non plus un tableau comme en v12. On crée notre propre
    // groupe "westmarch" plutôt que d'aller modifier un groupe natif
    // (ex. "tokens"), dont la clé exacte peut varier selon la version.
    Hooks.on("getSceneControlButtons", (controls) => {
        if (!game.user.isGM) return;

        controls.westmarch = {
            name: "westmarch",
            title: "WestMarch",
            icon: "fa-solid fa-hammer",
            layer: "tokens",
            tools: {
                fakeWarning: {
                    name: "fakeWarning",
                    title: "Faux message de maintenance",
                    icon: "fa-solid fa-triangle-exclamation",
                    button: true,
                    onClick: () => openFakeWarningDialog(),
                    visible: true
                }
            }
            // Pas d'"activeTool" ici : c'est un bouton ponctuel (button: true),
            // pas un outil à bascule. En définir un poussait Foundry à
            // "réactiver" cet outil (et donc rappeler onClick) chaque fois que
            // les contrôles de scène se re-rendaient — ce qui rouvrait la
            // fenêtre tout seul, sans clic, et empilait plusieurs dialogues.
        };
    });
}

function openFakeWarningDialog() {
    const players = game.users.filter(u => u.active && !u.isGM);
    if (players.length === 0) {
        ui.notifications.warn("Aucun joueur connecté.");
        return;
    }

    const options = players.map(u => `<option value="${u.id}">${u.name}</option>`).join("");

    new Dialog({
        title: "Faux message de maintenance",
        content: `
            <div style="display:flex; flex-direction:column; gap:8px; padding:4px 0;">
                <label><strong>Joueur visé :</strong></label>
                <select name="westmarch-fake-target" style="width:100%;">${options}</select>
                <label><strong>Message</strong> (affiché en jaune, façon avertissement Foundry) :</label>
                <textarea name="westmarch-fake-message" rows="3" style="width:100%; resize:vertical;">${DEFAULT_MESSAGE}</textarea>
            </div>
        `,
        buttons: {
            send: {
                icon: '<i class="fas fa-paper-plane"></i>',
                label: "Envoyer",
                callback: (html) => {
                    // En Foundry v13, jQuery est en cours de dépréciation : selon
                    // le contexte, "html" peut être un élément DOM brut plutôt
                    // qu'un objet jQuery. ".find" n'existe alors pas, l'erreur
                    // passe silencieusement (visible seulement dans la console
                    // du navigateur), et le message n'était jamais envoyé.
                    // On force le wrapping jQuery pour être sûr, comme ailleurs
                    // dans le module (voir settings.js).
                    const $html = $(html);
                    const userId = $html.find('[name="westmarch-fake-target"]').val();
                    const message = $html.find('[name="westmarch-fake-message"]').val()?.trim();
                    if (!userId || !message) return;
                    sendFakeWarning(userId, message);
                    ui.notifications.info(`Faux message envoyé à ${game.users.get(userId)?.name ?? "?"}.`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Annuler"
            }
        },
        default: "send"
    }).render(true);
}
