// ============================================================
// character-sheet.js — Factory de fiche PJ avec onglets Carnet + Temps morts
// Même pattern que bestiary/character-sheet.js (PARTS + TABS dnd5e v3).
// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
// ============================================================

import {
    buildJournalHtml,
    buildDowntimeHtml,
    wireJournalTab,
    wireDowntimeTab
} from './carnet.js';

const MODULE = "carnet";

/**
 * Factory — appelée depuis index.js dans le hook "setup",
 * après que relations et bestiary ont exposé leurs feuilles.
 *
 * @param {class} BaseSheet  AshBestiarySheet, AshCharacterSheet ou CharacterActorSheet
 * @returns {class} CarnetSheet
 */
export function createCarnetSheet(BaseSheet) {

    class CarnetSheet extends BaseSheet {

        static PARTS = {
            ...super.PARTS,
            "carnet-journal": {
                container:  { classes: ["tab-body"], id: "tabs" },
                template:   `modules/${MODULE}/templates/character-journal.hbs`,
                scrollable: [""]
            },
            "carnet-downtime": {
                container:  { classes: ["tab-body"], id: "tabs" },
                template:   `modules/${MODULE}/templates/character-downtime.hbs`,
                scrollable: [""]
            }
        };

        static TABS = [
            ...super.TABS,
            { tab: "carnet-journal",  group: "primary", label: "Carnet",       icon: "fas fa-book-open" },
            { tab: "carnet-downtime", group: "primary", label: "Expéditions",   icon: "fas fa-hourglass-half" }
        ];

        // Même nom pour ne pas multiplier les entrées dans le sélecteur de fiche
        static get name() { return "CharacterActorSheet"; }

        async _prepareContext(options = {}) {
            const ctx = await super._prepareContext(options);
            ctx.journalHtml  = buildJournalHtml(this.actor);
            ctx.downtimeHtml = buildDowntimeHtml(this.actor);
            return ctx;
        }

        _attachPartListeners(partId, htmlElement, options) {
            super._attachPartListeners(partId, htmlElement, options);
            if (partId === "carnet-journal")  wireJournalTab(this.actor, htmlElement, this);
            if (partId === "carnet-downtime") wireDowntimeTab(this.actor, htmlElement, this);
        }

        // Re-applique le changeTab après insertion de toutes les parts dans le DOM
        async _onRender(context, options) {
            await super._onRender(context, options);
            for (const tab of ["carnet-journal", "carnet-downtime"]) {
                if (this.tabGroups?.primary === tab) {
                    delete this.tabGroups.primary;
                    this.changeTab(tab, "primary", { updatePosition: false });
                    break;
                }
            }
        }
    }

    return CarnetSheet;
}
