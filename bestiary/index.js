import { registerSettings }                             from './modules/settings.js';
import { BestiaryHooks, buildTabHtml, wireTab, MODULE } from './modules/bestiary.js';

Hooks.on("init", () => {
    registerSettings();
    BestiaryHooks();
});

Hooks.on("setup", () => {
    const charSheets  = CONFIG.Actor.sheetClasses?.character ?? {};
    const dnd5eNative = dnd5e.applications.actor.CharacterActorSheet;

    // Trouver la fiche enregistrée par un module (ex: Relations)
    // = n'importe quelle fiche qui étend CharacterActorSheet sans être la native dnd5e
    let BaseSheet = dnd5eNative;
    for (const info of Object.values(charSheets)) {
        if (info?.cls && info.cls !== dnd5eNative
                      && info.cls.prototype instanceof dnd5eNative) {
            BaseSheet = info.cls;
            break;
        }
    }

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
        types:       ["character"],
        makeDefault: true,
        label:       "Ashara — Fiche personnage"
    });
});
