// ============================================================
// map-settings.js — Copie de test du setting, namespace
// "carte-expeditions" au lieu de "westmarch" (le module de test a
// son propre id). À renommer en "westmarch" lors de la fusion.
// ============================================================

export function registerMapSettings() {
    game.settings.register("carte-expeditions", "enableExpeditionMap", {
        name: "Carte des expéditions",
        hint: "Synchronise automatiquement la permission Owner sur l'acteur Groupe d'une party avec les joueurs dont le personnage est membre de ce groupe, afin que son token sur la carte du monde serve de source de vision / brouillard de guerre pour eux.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("carte-expeditions", "expeditionMapSceneId", {
        name: "Scène : carte des expéditions",
        hint: "Scène sur laquelle le brouillard de guerre est suivi par personnage plutôt que par compte joueur (chaque joueur retrouve les zones explorées par le personnage qu'il a actuellement assigné, même après un changement de personnage).",
        scope: "world",
        config: true,
        type: String,
        choices: Object.fromEntries(
            [["", "— Aucune —"], ...game.scenes.contents.map(s => [s.id, s.name])]
        ),
        default: "",
        requiresReload: false
    });
}
