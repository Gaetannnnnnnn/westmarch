export function registerSettings() {
    game.settings.register("ashara-relations", "enabled", {
        name: "Activer le système de relations",
        hint: "Ajoute un onglet 'Relations' sur chaque fiche acteur et détecte automatiquement les rencontres entre personnages sur les scènes.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });
}
