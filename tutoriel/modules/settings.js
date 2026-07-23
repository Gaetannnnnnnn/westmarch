// ============================================================
// settings.js — Enregistrement des paramètres du tutoriel
// ============================================================

const MODULE = "tutoriel";

export const MODULE_TOGGLES = [
    { key: "barreWestmarch",    label: "Barre WestMarch (navigation & groupe)" },
    { key: "bestiary",          label: "Bestiaire (onglet fiche)" },
    { key: "relations",         label: "Relations (onglet fiche)" },
    { key: "carnet",            label: "Carnet & Expéditions (onglet fiche)" },
    { key: "boutiques",         label: "Boutiques Monk's Enhanced Journal" },
    { key: "tempsMorts",        label: "Temps morts (déclaration & validation)" },
    { key: "apparenceTokens",   label: "Apparence des tokens (portrait, polymorph, cycle)" },
    { key: "outilsGm",          label: "Outils GM (TGCM, XP, Discord, Fake Warning)" },
];

// Classe minimale pour déclencher showWelcome depuis le bouton registerMenu.
// Foundry appelle new Type().render(true) quand le bouton est cliqué ;
// on détourne render() pour lancer le dialog sans jamais rendre d'Application.
const _WelcomeLauncher = class {
    render() {
        import('./welcome.js').then(({ showWelcome }) => showWelcome());
        return this;
    }
    close()          { return this; }
    get element()    { return null; }
    set element(_)   {}
    get rendered()   { return false; }
};

export function registerSettings() {
    // ---- Paramètres GM (enregistrés en premier — registerMenu en dernier
    //      pour qu'une éventuelle erreur n'empêche pas les settings d'apparaître) ----

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
            hint:   "Inclure les étapes de tutoriel pour cette fonctionnalité.",
            scope:  "world",
            config: true,
            type:   Boolean,
            default: true
        });
    }

    // ---- Préférence utilisateur (par client) ----

    // Afficher la fenêtre de bienvenue au login (par défaut : non)
    game.settings.register(MODULE, "showWelcome", {
        name:   "Afficher la fenêtre de bienvenue au login",
        hint:   "Si activé, la fenêtre d'accueil s'affiche automatiquement à chaque connexion.",
        scope:  "client",
        config: true,
        type:   Boolean,
        default: false
    });

    // ---- Bouton lancement manuel (en dernier : si registerMenu échoue en v13,
    //      les settings ci-dessus sont déjà enregistrés et visibles) ----
    try {
        game.settings.registerMenu(MODULE, "launchWelcome", {
            name:       "Tutoriel de démarrage",
            hint:       "Afficher à nouveau la fenêtre de bienvenue et de lancement du tutoriel.",
            label:      "Lancer le tutoriel",
            icon:       "fas fa-circle-question",
            restricted: false,
            type:       _WelcomeLauncher
        });
    } catch(e) {
        console.warn("[tutoriel] registerMenu non disponible :", e.message);
    }
}
