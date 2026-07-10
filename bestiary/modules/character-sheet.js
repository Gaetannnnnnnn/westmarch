import { MODULE, buildTabHtml, wireTab } from './bestiary.js';

/**
 * Factory — appelée depuis index.js dans le hook "setup",
 * une fois que Relations a eu le temps d'enregistrer sa fiche
 * (et de l'exposer dans CONFIG.asharaSheets.relations).
 *
 * @param {class} BaseSheet  AshCharacterSheet (Relations) ou CharacterActorSheet (dnd5e natif)
 * @returns {class} AshBestiarySheet
 */
export function createBestiarySheet(BaseSheet) {

    class AshBestiarySheet extends BaseSheet {

        static PARTS = {
            ...super.PARTS,
            bestiary: {
                container:  { classes: ["tab-body"], id: "tabs" },
                template:   `modules/${MODULE}/templates/character-bestiary.hbs`,
                scrollable: [""]
            }
        };

        static TABS = [
            ...super.TABS,
            { tab: "bestiary", group: "primary", label: "Bestiaire", icon: "fas fa-dragon" }
        ];

        // Même nom que la fiche native pour ne pas multiplier les entrées de sélection
        static get name() { return "CharacterActorSheet"; }

        async _prepareContext(options = {}) {
            const ctx = await super._prepareContext(options);
            ctx.bestiaryHtml = buildTabHtml(this.actor);
            return ctx;
        }

        _attachPartListeners(partId, htmlElement, options) {
            super._attachPartListeners(partId, htmlElement, options);
            if (partId !== "bestiary") return;
            wireTab(this.actor, $(htmlElement));
        }

        async _onRender(context, options) {
            await super._onRender(context, options);
            if (this.tabGroups?.primary === "bestiary") {
                this.changeTab("bestiary", "primary", { updatePosition: false });
            }
        }
    }

    return AshBestiarySheet;
}
