import { partyFeatureEnabled } from './settings.js';

// ============================================================
// Correctifs pour les boutiques de Monk's Enhanced Journal (MEJ),
// module tiers — on ne touche jamais à ses fichiers, tout passe
// par des hooks de rendu côté westmarch.
// ============================================================
export function MejShopHooks() {

    // ------------------------------------------------------------
    // FIX 1 : bouton "Groupe uniquement" dans la fenêtre "Show to
    // Players" (fenêtre native de Foundry, juste patchée par MEJ
    // pour ajouter le menu "Show As"). Cette fenêtre n'a aucune
    // sélection rapide "ma party" — seulement Select All/Deselect
    // All — d'où la fenêtre énorme à décocher joueur par joueur.
    // Réutilise exactement la logique partyId déjà utilisée dans
    // image.js ("Show Party").
    // ------------------------------------------------------------
    Hooks.on("renderApplicationV2", (application, element) => {
        if (!game.user.isGM) return;
        if (!game.settings.get("westmarch", "enableMejShopFix")) return;

        const classes = application.options?.classes ?? [];
        const isShowDialog = classes.includes("journal-show-dialog")
            || element.classList?.contains("journal-show-dialog")
            || !!element.querySelector?.(".journal-show-dialog");
        if (!isShowDialog) return;

        if (element.querySelector(".party-only-show")) return;

        const checkboxes = element.querySelectorAll('[name="players"]');
        if (checkboxes.length === 0) return;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("party-only-show");
        btn.style.marginLeft = "4px";
        btn.textContent = "Groupe uniquement";
        btn.addEventListener("click", () => {
            const myPartyId = game.user.getFlag("westmarch", "partyId");
            let matched = 0;
            checkboxes.forEach(cb => {
                const user = game.users.get(cb.value);
                const inMyParty = !!(user && myPartyId && user.getFlag("westmarch", "partyId") === myPartyId);
                cb.checked = inMyParty;
                if (inMyParty) matched++;
            });
            if (matched === 0) {
                ui.notifications.warn("Aucun membre de la party connecté.");
            }
        });

        // On pose le bouton juste à côté du premier des deux boutons
        // natifs Select All/Deselect All s'ils existent, sinon juste
        // avant la liste des joueurs.
        const nativeBtn = element.querySelector('[data-action="selectAll"], [data-action="deselectAll"]');
        if (nativeBtn) {
            nativeBtn.after(btn);
        } else {
            const firstCheckboxContainer = checkboxes[0].closest("li, div, .form-group") ?? checkboxes[0];
            firstCheckboxContainer.before(btn);
        }
    });

    // ------------------------------------------------------------
    // FIX 2 : les objets marqués "cachés" dans une boutique MEJ
    // restent visibles aux joueurs. Bug confirmé dans le code
    // source actuel de MEJ (EnhancedJournalSheet.getItemGroups) :
    // il teste "item.hide" (jamais défini) au lieu de "item.hidden"
    // (le champ réellement utilisé par la coche "cacher l'objet"),
    // donc son propre filtre ne retire jamais rien. On corrige ça
    // uniquement côté affichage joueur, sans toucher à MEJ.
    // ------------------------------------------------------------
    Hooks.on("renderApplicationV2", (application, element) => {
        if (game.user.isGM) return;
        if (!game.settings.get("westmarch", "enableMejShopFix")) return;

        const doc = application.document;
        if (!doc) return;
        if (doc.isOwner) return;

        const mejType = foundry.utils.getProperty(doc, "flags.monks-enhanced-journal.type");
        if (mejType !== "shop") return;

        const items = doc.getFlag("monks-enhanced-journal", "items") || {};

        element.querySelectorAll("[data-id]").forEach(row => {
            const item = items[row.dataset.id];
            if (item?.hidden) row.remove();
        });
    });
}
