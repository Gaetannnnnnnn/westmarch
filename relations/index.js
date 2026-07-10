import { registerSettings }  from './modules/settings.js';
import { RelationsHooks }    from './modules/relations.js';
import { AshCharacterSheet } from './modules/character-sheet.js';

Hooks.on("init", () => {
    registerSettings();
    RelationsHooks();

    // Remplace la fiche personnage dnd5e par défaut
    Actors.registerSheet("dnd5e", AshCharacterSheet, {
        types:       ["character"],
        makeDefault: true,
        label:       "Ashara — Fiche personnage"
    });
});
