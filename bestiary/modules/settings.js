// ============================================================
// settings.js — Paramètres du module ashara-bestiary
// ============================================================

export function registerSettings() {
    game.settings.register("ashara-bestiary", "enabled", {
        name: "Activer le bestiaire",
        hint: "Active la détection automatique des créatures rencontrées sur les scènes (GM uniquement).",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });
}
