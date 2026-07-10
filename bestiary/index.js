import { registerSettings }          from './modules/settings.js';
import { BestiaryHooks }             from './modules/bestiary.js';
import { createBestiarySheet }       from './modules/character-sheet.js';

Hooks.on("init", () => {
    registerSettings();
    BestiaryHooks();
});

Hooks.on("setup", () => {
    // Relations expose sa fiche via CONFIG.asharaSheets.relations pendant son init.
    // Le hook "setup" est garanti d'arriver après tous les "init" → lecture sûre.
    const BaseSheet = CONFIG.asharaSheets?.relations
        ?? dnd5e.applications.actor.CharacterActorSheet;

    const AshBestiarySheet = createBestiarySheet(BaseSheet);

    Actors.registerSheet("dnd5e", AshBestiarySheet, {
        types:       ["character"],
        makeDefault: true,
        label:       "Ashara — Fiche personnage"
    });
});
