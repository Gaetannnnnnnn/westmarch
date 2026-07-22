import { registerSettings }   from './modules/settings.js';
import { createCarnetSheet }  from './modules/character-sheet.js';
import { CarnetToolbarHooks } from './modules/carnet.js';

Hooks.on("init", () => {
    // Déclare ce module pour le nettoyage lors de l'export "fiche originale"
    CONFIG.asharaSheetsModules ??= [];
    CONFIG.asharaSheetsModules.push("carnet");

    registerSettings();
    CarnetToolbarHooks();
});

Hooks.on("setup", () => {
    // "setup" est garanti d'arriver après tous les "init" des autres modules.
    // CONFIG.asharaSheets est donc peuplé par bestiary et relations si actifs.
    if (!game.settings.get("carnet", "enabled")) return;

    const BaseSheet = CONFIG.asharaSheets?.bestiary
        ?? CONFIG.asharaSheets?.relations
        ?? dnd5e.applications.actor.CharacterActorSheet;

    const CarnetSheet = createCarnetSheet(BaseSheet);

    Actors.registerSheet("dnd5e", CarnetSheet, {
        types:       ["character"],
        makeDefault: true,
        label:       "Soruta — Fiche personnage"
    });

    CONFIG.asharaSheets        = CONFIG.asharaSheets ?? {};
    CONFIG.asharaSheets.carnet = CarnetSheet;
});
