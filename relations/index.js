import { registerSettings }  from './modules/settings.js';
import { RelationsHooks }    from './modules/relations.js';
import { AshCharacterSheet } from './modules/character-sheet.js';

Hooks.on("init", () => {
    // Déclare ce module pour le nettoyage lors de l'export "fiche originale"
    CONFIG.asharaSheetsModules ??= [];
    CONFIG.asharaSheetsModules.push("relations");

    registerSettings();
    RelationsHooks();

    // Expose la classe pour les modules dépendants (ex: ashara-bestiary, carnet)
    // Fait ici (init) pour être disponible dès le hook "setup" des autres modules.
    CONFIG.asharaSheets ??= {};
    CONFIG.asharaSheets.relations = AshCharacterSheet;
});

Hooks.on("setup", () => {
    // Si bestiary ou carnet est actif, ils enregistreront une fiche plus complète
    // qui étend déjà AshCharacterSheet — inutile de s'enregistrer séparément.
    // (Tous les modules utilisent la même clé "dnd5e.CharacterActorSheet" ;
    //  chaque Actors.registerSheet écrase le précédent dans le registre Foundry.)
    if (game.modules.get("ashara-bestiary")?.active) return;
    const carnetActive = game.modules.get("carnet")?.active
        && game.settings.get("carnet", "enabled");
    if (carnetActive) return;

    Actors.registerSheet("dnd5e", AshCharacterSheet, {
        types:       ["character"],
        makeDefault: true,
        label:       "Soruta — Fiche personnage"
    });
});
