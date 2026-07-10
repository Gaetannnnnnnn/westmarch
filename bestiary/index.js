// ============================================================
// index.js — Point d'entrée du module ashara-bestiary
//
// Architecture multi-module :
//   Le hook "setup" (après "init") permet de détecter la fiche
//   actuellement enregistrée comme défaut (ex: AshCharacterSheet
//   du module ashara-relations) et de l'étendre, garantissant
//   la cohabitation des deux modules sans conflit.
// ============================================================

import { registerSettings }                    from './modules/settings.js';
import { BestiaryHooks, buildTabHtml, wireTab, MODULE } from './modules/bestiary.js';

Hooks.on("init", () => {
    registerSettings();
    BestiaryHooks();
});

// "setup" garantit que tous les hooks "init" (y compris Relations)
// ont déjà tourné → on peut lire la fiche par défaut et l'étendre.
Hooks.on("setup", () => {
    // Trouver la fiche par défaut actuelle des personnages
    const charSheets = CONFIG.Actor.sheetClasses?.character ?? {};
    let BaseSheet = dnd5e.applications.actor.CharacterActorSheet;
    for (const info of Object.values(charSheets)) {
        if (info.default) { BaseSheet = info.cls; break; }
    }

    class AshBestiarySheet extends BaseSheet {

        // Ajoute la part "bestiary" à celles existantes (incl. Relations si actif)
        static PARTS = {
            ...super.PARTS,
            bestiary: {
                container: { classes: ["tab-body"], id: "tabs" },
                template:  `modules/${MODULE}/templates/character-bestiary.hbs`,
                scrollable: [""]
            }
        };

        // Ajoute l'onglet Bestiaire à la suite des onglets existants
        static TABS = [
            ...super.TABS,
            { tab: "bestiary", group: "primary", label: "Bestiaire", icon: "fas fa-dragon" }
        ];

        // Même nom que la fiche Relations → remplace dans le registre Foundry
        // tout en héritant de tous ses PARTS/TABS via la chaîne d'héritage.
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

    Actors.registerSheet("dnd5e", AshBestiarySheet, {
        types: ["character"],
        makeDefault: true,
        label: "Ashara — Fiche personnage"
    });
});
