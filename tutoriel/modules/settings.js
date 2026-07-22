// ============================================================
// settings.js — Enregistrement des paramètres du tutoriel
// ============================================================

const MODULE = "tutoriel";

export const MODULE_TOGGLES = [
    { key: "modWestmarch",       label: "WestMarch — Barre latérale, scènes, party" },
    { key: "modBestiary",        label: "Bestiaire — Onglet Bestiaire sur la fiche PJ" },
    { key: "modRelations",       label: "Relations — Onglet Relations sur la fiche PJ" },
    { key: "modCarnet",          label: "Carnet d'Expéditions — Onglets Carnet + Expéditions" },
    { key: "modToolkit",         label: "Toolkit — Boutiques MEJ, fonctions avancées" },
    { key: "modWestmarchAshara", label: "WestMarch Ashara — Fonctions propres au serveur" },
];

export function registerSettings() {
    // ---- Paramètres GM ----

    game.settings.register(MODULE, "serverName", {
        name: "Nom affiché dans le message de bienvenue",
        hint: "Ce texte apparaît comme titre dans la fenêtre d'accueil des joueurs.",
        scope:  "world",
        config: true,
        type:   String,
        default: "Bienvenue sur le serveur Ashara !"
    });

    for (const { key, label } of MODULE_TOGGLES) {
        game.settings.register(MODULE, key, {
            name:   label,
            hint:   "Inclure les étapes de tutoriel liées à ce module.",
            scope:  "world",
            config: true,
            type:   Boolean,
            default: true
        });
    }

    // ---- Préférence utilisateur (par client) ----

    // "Ne plus afficher la fenêtre de bienvenue au login"
    game.settings.register(MODULE, "hideWelcome", {
        scope:  "client",
        config: false,
        type:   Boolean,
        default: false
    });
}
