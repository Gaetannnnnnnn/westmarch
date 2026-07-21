export function registerSettings() {

    // ============================================================
    // SECTION : Enregistrement des paramètres du module westmarch-ashara
    // Accessibles via : Paramètres du jeu → Configuration des modules → Ashara — WestMarch Serveur
    // Tous les paramètres sont GM uniquement (scope: "world")
    // ============================================================

    // ---- Bandeau version dans la page de paramètres ----
    Hooks.on("renderSettingsConfig", (app, html, data) => {
        const root = $(html);
        const firstGroup = root.find('[name="westmarch-ashara.enableXpBlock"]').closest('.form-group');
        if (!firstGroup.length) return;

        const moduleData = game.modules.get("westmarch-ashara");
        const version = moduleData?.version ?? "?";
        const banner = $(`
            <div style="margin-bottom: 12px; padding: 10px 14px; border: 1px solid #e67e22; border-radius: 4px; background: rgba(230,126,34,0.08);">
                <p style="margin:0 0 4px 0;"><strong>Soruta — WestMarch Ashara</strong> — v${version}</p>
                <p style="margin:0; font-size: 0.9em;">Personnalisations spécifiques au serveur Ashara.</p>
                <p style="margin:6px 0 0 0; font-size: 0.85em; font-style: italic; color: #e67e22;">© 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Toute redistribution, modification ou usage commercial est strictement interdit sans autorisation écrite.</p>
            </div>
        `);
        firstGroup.before(banner);
    });

    game.settings.register("westmarch-ashara", "enableXpBlock", {
        name: "Blocage de l'XP et du Level Up",
        hint: "Empêche les joueurs de modifier manuellement leur XP et masque le bouton Level Up sur leur fiche personnage. Les GM ne sont pas affectés.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("westmarch-ashara", "enableDiscordLog", {
        name: "Log Discord (modifications)",
        hint: "Envoie un message dans un salon Discord à chaque ajout/suppression d'objet, changement de quantité, gain d'XP/niveau, et création/suppression de personnage.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        requiresReload: false
    });

    game.settings.register("westmarch-ashara", "discordLogWebhookUrl", {
        name: "URL du Webhook Discord (log modifications)",
        hint: "URL du webhook Discord vers lequel envoyer les logs de modifications. Laisser vide pour désactiver.",
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: false
    });

    game.settings.register("westmarch-ashara", "downtimeWebhookUrl", {
        name: "URL du Webhook Discord (changement de date)",
        hint: "Quand le GM avance la date dans Simple Calendar, envoie automatiquement un message sur ce webhook Discord avec la nouvelle date. Laisser vide pour désactiver.",
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: false
    });

    game.settings.register("westmarch-ashara", "tmWebhookUrl", {
        name: "URL du Webhook Discord (résultats temps morts)",
        hint: "Quand le GM applique les gains de temps morts, envoie le récapitulatif sur ce webhook Discord (salon staff/MJ). Laisser vide pour désactiver.",
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: false
    });
}
