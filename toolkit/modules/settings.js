export function registerSettings() {

    // ============================================================
    // SECTION : Enregistrement des paramètres du module Toolkit
    // Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Toolkit
    // Tous les paramètres sont GM uniquement (scope: "world")
    // ============================================================

    // ---- Bandeau version dans la page de paramètres ----
    Hooks.on("renderSettingsConfig", (app, html, data) => {
        const root = $(html);
        const firstGroup = root.find('[name="toolkit.enableTokenAppearance"]').closest('.form-group');
        if (!firstGroup.length) return;

        const moduleData = game.modules.get("toolkit");
        const version = moduleData?.version ?? "?";
        const banner = $(`
            <div style="margin-bottom: 12px; padding: 10px 14px; border: 1px solid #4db6ac; border-radius: 4px; background: rgba(77,182,172,0.08);">
                <p style="margin:0 0 4px 0;"><strong>Soruta — Toolkit</strong> — v${version}</p>
                <p style="margin:0; font-size: 0.9em;">Features génériques : tokens, transformations, sous-classes, outils MEJ.</p>
                <p style="margin:6px 0 0 0; font-size: 0.85em; font-style: italic; color: #4db6ac;">© 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Toute redistribution, modification ou usage commercial est strictement interdit sans autorisation écrite.</p>
            </div>
        `);
        firstGroup.before(banner);
    });

    game.settings.register("toolkit", "enableTokenAppearance", {
        name: "Changement d'apparence des tokens",
        hint: "Permet aux GM de configurer plusieurs images sur un token. Les joueurs peuvent cycler entre les images via un bouton dans le HUD du token.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "enableTokenPortraitButton", {
        name: "Bouton 'Voir le portrait' (HUD du token)",
        hint: "Ajoute un bouton dans le HUD du token (clic droit) qui affiche en grand l'image de la fiche du personnage.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "enableRageSize", {
        name: "Taille Large pendant la Rage (Voie du Géant)",
        hint: "Pour les barbares possédant la feature 'Giant's Havoc' (Voie du Géant, palier 3) : dès qu'ils reçoivent l'effet actif 'Rage', leurs tokens passent automatiquement en taille 2x2 (Large) s'ils sont plus petits, et reviennent à leur taille d'origine dès que la rage se termine.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "enableLargeForm", {
        name: "Taille Large — Goliath (Large Form)",
        hint: "Pour les Goliaths possédant la feature 'Large Form' : utiliser la feature depuis la fiche bascule le token en 2x2 (Large) et inversement. La feature doit avoir au moins une activité configurée dans dnd5e.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "enablePolymorph", {
        name: "Transformation de token (Wild Shape / Polymorph)",
        hint: "Permet de configurer des formes polymorphes sur un acteur (onglet Apparence du prototype token). Un bouton dans le HUD du token permet au GM et aux propriétaires de transformer le token et de le rétablir.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "enableTgcm", {
        name: "Protégé TGCM (token immunisé à la mort)",
        hint: "Ajoute un bouton bouclier dans le HUD du token (GM uniquement). Un token protégé TGCM ne peut jamais tomber à 0 PV : tout dégât qui l'y amènerait le laisse à 1 PV.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "enableFolderMove", {
        name: "Déplacer/Dupliquer vers… (sidebar)",
        hint: "Ajoute 'Déplacer vers…' et 'Dupliquer vers…' dans le menu contextuel des scènes, acteurs, objets et journaux, et 'Déplacer vers…' sur les dossiers. Ouvre un sélecteur de dossier arborescent avec recherche.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "enableToolAbilityFix", {
        name: "Correction de la stat des outils (tools)",
        hint: "À la création d'un item 'outil' sans stat définie (ou avec 'Intelligence' par défaut), corrige automatiquement vers la stat canonique de cet outil selon le système dnd5e. Utile notamment pour les outils importés via Plutonium.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "enableTemplateSnap", {
        name: "Snap des templates AoE au dixième de pied",
        hint: "Pendant le placement d'un template (cercle, cône, rayon…), la taille s'incrémente par paliers de 0,1 ft au lieu de suivre la souris en continu. L'étiquette n'affiche jamais plus d'un chiffre après la virgule. Nécessite lib-wrapper pour le snap live ; le snap à la création reste actif sans lui.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "enableMejShopFix", {
        name: "Correctifs boutiques Monk's Enhanced Journal",
        hint: "Ajoute un bouton 'Groupe uniquement' dans la fenêtre 'Show to Players' de MEJ, et corrige côté joueur un bug qui rendait les objets cachés toujours visibles.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    // ---- Réapprovisionnement automatique des boutiques ----

    game.settings.register("toolkit", "enableMejRestock", {
        name: "Réapprovisionnement automatique des boutiques",
        hint: "Active ou désactive entièrement le système de réapprovisionnement. Quand désactivé, aucun timer n'est lancé et le bouton de réapprovisionnement n'apparaît pas dans les boutiques.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("toolkit", "shopRestockDays", {
        name: "Réapprovisionnement boutiques — Délai par défaut (jours)",
        hint: "Délai utilisé si aucune valeur par rareté n'est définie pour un article. 0 = pas de fallback (seules les rarétés avec une valeur > 0 seront réapprovisionnées).",
        scope: "world",
        config: true,
        type: Number,
        default: 7,
        requiresReload: false
    });

    game.settings.register("toolkit", "shopRestockDaysCommon", {
        name: "Réapprovisionnement boutiques — Commun (jours)",
        hint: "Délai pour les articles de rareté Commun. 0 = désactivé pour cette rareté.",
        scope: "world",
        config: true,
        type: Number,
        default: 0,
        requiresReload: false
    });

    game.settings.register("toolkit", "shopRestockDaysUncommon", {
        name: "Réapprovisionnement boutiques — Peu commun (jours)",
        hint: "Délai pour les articles de rareté Peu commun. 0 = désactivé pour cette rareté.",
        scope: "world",
        config: true,
        type: Number,
        default: 0,
        requiresReload: false
    });

    game.settings.register("toolkit", "shopRestockDaysRare", {
        name: "Réapprovisionnement boutiques — Rare (jours)",
        hint: "Délai pour les articles de rareté Rare. 0 = désactivé pour cette rareté.",
        scope: "world",
        config: true,
        type: Number,
        default: 0,
        requiresReload: false
    });

    game.settings.register("toolkit", "shopRestockDaysVeryRare", {
        name: "Réapprovisionnement boutiques — Très rare (jours)",
        hint: "Délai pour les articles de rareté Très rare. 0 = désactivé pour cette rareté.",
        scope: "world",
        config: true,
        type: Number,
        default: 0,
        requiresReload: false
    });

    game.settings.register("toolkit", "shopRestockDaysLegendary", {
        name: "Réapprovisionnement boutiques — Légendaire (jours)",
        hint: "Délai pour les articles de rareté Légendaire. 0 = désactivé pour cette rareté.",
        scope: "world",
        config: true,
        type: Number,
        default: 0,
        requiresReload: false
    });

    // ---- Groupement visuel des sections dans la page de settings ----
    Hooks.on("renderSettingsConfig", (app, html) => {
        const root = $(html);

        // Séparateur "Templates AoE"
        const templateGroup = root.find('[name="toolkit.enableTemplateSnap"]').closest('.form-group');
        if (templateGroup.length) {
            templateGroup.before(`<h3 style="border-bottom:1px solid #4db6ac; padding-bottom:4px; margin:16px 0 8px; color:#4db6ac; font-size:0.95em; text-transform:uppercase; letter-spacing:0.06em;">Templates AoE</h3>`);
        }

        // Séparateur "Boutiques MEJ"
        const mejShopGroup = root.find('[name="toolkit.enableMejShopFix"]').closest('.form-group');
        if (mejShopGroup.length) {
            mejShopGroup.before(`<h3 style="border-bottom:1px solid #4db6ac; padding-bottom:4px; margin:16px 0 8px; color:#4db6ac; font-size:0.95em; text-transform:uppercase; letter-spacing:0.06em;">Boutiques MEJ</h3>`);
        }

        // Séparateur "Réapprovisionnement automatique"
        const restockGroup = root.find('[name="toolkit.enableMejRestock"]').closest('.form-group');
        if (restockGroup.length) {
            restockGroup.before(`<h3 style="border-bottom:1px solid #4db6ac; padding-bottom:4px; margin:16px 0 8px; color:#4db6ac; font-size:0.95em; text-transform:uppercase; letter-spacing:0.06em;">Réapprovisionnement automatique</h3>`);
        }
    });
}
