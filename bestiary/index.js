import { registerSettings }          from './modules/settings.js';
import { BestiaryHooks }             from './modules/bestiary.js';
import { createBestiarySheet }       from './modules/character-sheet.js';

Hooks.on("init", () => {
    // Déclare ce module pour le nettoyage lors de l'export "fiche originale"
    CONFIG.asharaSheetsModules ??= [];
    CONFIG.asharaSheetsModules.push("bestiary");

    registerSettings();
    BestiaryHooks();
});

Hooks.on("setup", () => {
    // Relations expose sa fiche via CONFIG.asharaSheets.relations pendant son init.
    // Le hook "setup" est garanti d'arriver après tous les "init" → lecture sûre.
    const BaseSheet = CONFIG.asharaSheets?.relations
        ?? dnd5e.applications.actor.CharacterActorSheet;

    const AshBestiarySheet = createBestiarySheet(BaseSheet);

    // Expose la fiche pour les modules dépendants (ex: carnet) — toujours fait,
    // même si on ne l'enregistre pas comme fiche active.
    CONFIG.asharaSheets        ??= {};
    CONFIG.asharaSheets.bestiary = AshBestiarySheet;

    // Si carnet est actif et activé, il enregistrera une fiche encore plus complète
    // (CarnetSheet extends AshBestiarySheet). On évite ainsi que deux modules
    // s'enregistrent sous la même clé "dnd5e.CharacterActorSheet" et s'écrasent.
    const carnetActive = game.modules.get("carnet")?.active
        && game.settings.get("carnet", "enabled");
    if (carnetActive) return;

    Actors.registerSheet("dnd5e", AshBestiarySheet, {
        types:       ["character"],
        makeDefault: true,
        label:       "Soruta — Fiche personnage"
    });
});
