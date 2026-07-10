// ============================================================
// character-sheet.js — Sous-classe de CharacterActorSheet dnd5e v3
// Ajoute l'onglet Relations nativement via PARTS / TABS.
// © Soruta — module propriétaire Ashara, ne pas redistribuer.
// ============================================================

import { MODULE, buildTabHtml, wireTab } from './relations.js';

export class AshCharacterSheet extends dnd5e.applications.actor.CharacterActorSheet {

    // Ajoute la "part" relations dans le système de rendu d'ApplicationV2
    static PARTS = {
        ...super.PARTS,
        relations: {
            container: { classes: ["tab-body"], id: "tabs" },
            template:  `modules/${MODULE}/templates/character-relations.hbs`,
            scrollable: [""]
        }
    };

    // Ajoute l'onglet dans la barre de navigation dnd5e
    static TABS = [
        ...super.TABS,
        { tab: "relations", label: "Relations", icon: "fas fa-heart" }
    ];

    // Garde le même nom pour remplacer la fiche par défaut sans conflits
    static get name() { return "CharacterActorSheet"; }

    // Injecte le HTML de l'onglet dans le contexte du template
    async _prepareContext(options = {}) {
        const ctx = await super._prepareContext(options);
        ctx.relationsHtml = buildTabHtml(this.actor);
        return ctx;
    }

    // Branche les événements après chaque rendu de la part "relations"
    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        if (partId !== "relations") return;
        // htmlElement peut être le .rel-tab lui-même ou son parent
        const $root = $(htmlElement);
        wireTab(this.actor, $root.hasClass("rel-tab") ? $root.parent() : $root);
    }
}
