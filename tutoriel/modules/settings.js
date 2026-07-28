// ============================================================
// settings.js — Enregistrement des paramètres du tutoriel
// ============================================================

import { isSectionAvailable } from './tutorial.js';

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

    // Afficher la fenêtre de bienvenue au login — contrôle GM (scope world)
    game.settings.register(MODULE, "showWelcome", {
        name:   "Afficher la fenêtre de bienvenue au login",
        hint:   "Si activé, la fenêtre d'accueil s'affiche pour tous les joueurs à chaque connexion (sauf s'ils ont cliqué « Ne plus afficher »).",
        scope:  "world",
        config: true,
        type:   Boolean,
        default: false
    });

    // Préférence par client — mis à true quand l'utilisateur clique "Ne plus afficher".
    // Non visible dans la config (config: false). Réinitialisé si le GM désactive puis réactive showWelcome.
    game.settings.register(MODULE, "hideWelcome", {
        scope:   "client",
        config:  false,
        type:    Boolean,
        default: false
    });

    // ---- Bandeau + masquer les toggles des modules absents ----
    Hooks.on("renderSettingsConfig", (app, html) => {
        const $html = $(html);

        // Bandeau version / auteur avant le premier setting du module
        // Sélecteur robuste v12/v13 : data-setting-id (v12) ou name sur l'input (v13).
        let allTutSettings = $html.find(`[data-setting-id^="${MODULE}."]`);
        if (!allTutSettings.length) {
            allTutSettings = $html.find(`[name^="${MODULE}."]`).map(function() {
                return $(this).closest(".form-group")[0];
            });
        }
        const firstSetting = allTutSettings.length ? $(allTutSettings[0]).closest(".form-group") : null;
        if (firstSetting?.length) {
            const version = game.modules.get(MODULE)?.version ?? "?";
            firstSetting.before(`
                <div style="margin-bottom:12px;padding:10px 14px;border:1px solid #2ecc71;border-radius:4px;background:rgba(46,204,113,0.08);">
                    <p style="margin:0 0 4px 0;"><strong>Soruta — Tutoriel</strong> — v${version}</p>
                    <p style="margin:0;font-size:0.9em;">Fenêtre de bienvenue et tutoriel interactif configurable par module.</p>
                    <p style="margin:4px 0 0 0;font-size:0.8em;font-style:italic;color:#27ae60;">© 2026 Soruta — Tous droits réservés. Usage personnel autorisé.</p>
                </div>
            `);
        }

        // Masquer les toggles des modules absents
        for (const { key } of MODULE_TOGGLES) {
            if (isSectionAvailable(key)) continue;
            $html.find(`[name="tutoriel.${key}"]`).closest(".form-group").hide();
        }
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
