// Settings dont l'utilité dépend entièrement du système de party.
// Utilisé pour la cascade fonctionnelle et le regroupement visuel dans le menu.
export const PARTY_DEPENDENT_SETTINGS = [
    "enableJoinScene",
    "enableShowParty",
    "enableChatFilter",
    "enablePlayerGrouping",
    "enableGoWithPartyScenes",
    "enableGoWithPartyJournal",
    "enableSessionLog",
    "enableCombatParty"
];

// ============================================================
// Vérifie qu'un setting dépendant de la party est bien actif
// ET que le système de party lui-même est activé.
// ============================================================
export function partyFeatureEnabled(key) {
    if (!game.settings.get("westmarch", "enableParty")) return false;
    return game.settings.get("westmarch", key);
}

export function registerSettings() {

    // ============================================================
    // SECTION : Enregistrement des paramètres du module westmarch (core)
    // Accessibles via : Paramètres du jeu → Configuration des modules → WestMarch Système
    // Tous les paramètres sont GM uniquement (scope: "world")
    // ============================================================

    game.settings.register("westmarch", "enableParty", {
        name: "Système de Party",
        hint: "Active le système de party (Create/Join/Leave/Kick/Invite Party). Si désactivé, le GM ne peut plus créer ou gérer de party, et toutes les options qui en dépendent sont automatiquement désactivées.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enableJoinScene", {
        name: "Join Scene",
        hint: "Ajoute une option 'Join Scene' dans le menu contextuel de la liste des joueurs. Permet à n'importe quel membre d'une party de se téléporter vers la scène d'un autre membre.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enableShowParty", {
        name: "Show Party (partage d'image)",
        hint: "Ajoute un bouton 'Show Party' dans la barre de titre des fenêtres d'image. Permet au GM de partager une image directement à tous les membres de sa party.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enablePlayerGrouping", {
        name: "Regroupement visuel des joueurs par party",
        hint: "Réorganise la liste des joueurs pour regrouper visuellement les membres d'une même party, séparés par des lignes colorées.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enableGoWithPartyScenes", {
        name: "Go With Party (répertoire de scènes)",
        hint: "Ajoute une option 'Go With Party' dans le menu contextuel du répertoire de scènes. Téléporte tous les membres de la party vers la scène sélectionnée.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enableGoWithPartyJournal", {
        name: "Go With Party (liens de journaux)",
        hint: "Ajoute un menu contextuel sur les liens de scène dans les journaux avec les options 'Go Alone' et 'Go With Party'.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enableChatFilter", {
        name: "Filtrage du chat par party",
        hint: "Les joueurs ne voient dans le chat que les messages envoyés par les membres de leur propre party. Sans party assignée, tous les messages sont visibles.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enableWebhook", {
        name: "Webhook Discord",
        hint: "Permet de configurer un webhook Discord sur chaque scène. Les messages IC envoyés dans le chat sont automatiquement relayés vers le webhook de la scène active.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enableSessionLog", {
        name: "Journal de session",
        hint: "Active le bouton 'Clore la session' sous la liste des joueurs. Génère automatiquement un journal de session avec les joueurs présents, l'XP avant/après, les ennemis rencontrés, les PNJ et les objets récupérés.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enableCombatParty", {
        name: "Combat lié à la party (plutôt qu'à la scène)",
        hint: "Les combats créés par un GM sont automatiquement détachés de leur scène et marqués comme appartenant à sa party. Chaque joueur ne voit que le combat de sa propre party.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch", "enableAntiCheat", {
        name: "Anti-Cheat (combat)",
        hint: "Pendant un combat actif, avertit les GM (en privé) lorsqu'un joueur modifie ses sorts préparés, son attunement, ou équipe/déséquipe une arme/armure sur un personnage engagé dans le combat.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    // ============================================================
    // SECTION : Mise en forme visuelle — regroupe les options
    // dépendantes du système de Party sous "Système de Party" avec
    // indentation, et ajoute un symbole d'avertissement (tooltip)
    // ============================================================
    Hooks.on("renderSettingsConfig", (app, html, data) => {
        const root = $(html);
        const partyGroup = root.find('[name="westmarch.enableParty"]').closest('.form-group');
        if (!partyGroup.length) return;

        // ---- Bandeau d'info en haut de la section WestMarch ----
        const moduleData = game.modules.get("westmarch");
        const version = moduleData?.version ?? "?";
        const description = moduleData?.description
            ?? "Module de gestion de campagnes West March : parties, téléportation de groupe, journal de session, filtrage du chat et plus.";
        const author = moduleData?.authors?.[0]?.name ?? "Soruta";

        const banner = $(`
            <div class="westmarch-settings-banner" style="margin-bottom: 12px; padding: 10px 14px; border: 1px solid #e67e22; border-radius: 4px; background: rgba(230,126,34,0.08);">
                <p style="margin:0 0 4px 0;"><strong>Soruta — WestMarch Système</strong> — v${version}</p>
                <p style="margin:0 0 4px 0; font-size: 0.9em;">${description}</p>
                <p style="margin:0 0 4px 0; font-size: 0.9em;">Auteur : ${author}</p>
                <p style="margin:0; font-size: 0.85em; font-style: italic; color: #aaa;">© 2026 Soruta — Logiciel open source. Redistribution et modification autorisées avec attribution.</p>
            </div>
        `);
        partyGroup.before(banner);

        const subNames = PARTY_DEPENDENT_SETTINGS
            .map(key => game.settings.settings.get(`westmarch.${key}`)?.name)
            .filter(Boolean);

        partyGroup.find('label').first().append(
            ` <i class="fa-solid fa-triangle-exclamation westmarch-party-warning" ` +
            `title="Si désactivé, ces options n'ont plus aucun effet, même si elles sont cochées : ${subNames.join(', ')}" ` +
            `style="color:#e67e22; cursor: help; margin-left: 4px;"></i>`
        );

        let anchor = partyGroup;
        const subCheckboxes = [];
        PARTY_DEPENDENT_SETTINGS.forEach(key => {
            const group = root.find(`[name="westmarch.${key}"]`).closest('.form-group');
            if (!group.length) return;
            group.css({
                marginLeft: "24px",
                borderLeft: "2px solid #e67e22",
                paddingLeft: "8px"
            });
            group.insertAfter(anchor);
            anchor = group;

            const checkbox = group.find(`[name="westmarch.${key}"]`);
            if (checkbox.length) subCheckboxes.push(checkbox);
        });

        const masterCheckbox = partyGroup.find('[name="westmarch.enableParty"]');
        const savedStates = subCheckboxes.map(cb => cb.prop('checked'));

        function applyMasterState() {
            const on = masterCheckbox.prop('checked');
            subCheckboxes.forEach((cb, i) => {
                if (!on) {
                    savedStates[i] = cb.prop('checked');
                    cb.prop('checked', false);
                    cb.prop('disabled', true);
                } else {
                    cb.prop('disabled', false);
                    cb.prop('checked', savedStates[i]);
                }
            });
        }

        masterCheckbox.on('change', applyMasterState);
        applyMasterState();
    });
}
