export function XpHooks() {

    // ============================================================
    // SECTION : Blocage de la modification de l'XP par les joueurs
    // - Les joueurs ne peuvent pas modifier leur XP manuellement
    // - Les GM peuvent toujours modifier l'XP librement
    // ============================================================
    Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
        // On laisse passer les GM
        if (game.user.isGM) return true;
        if (!game.settings.get("westmarch", "enableXpBlock")) return;

        // Si la mise à jour touche à l'XP
        if (changes?.system?.details?.xp !== undefined) {
            ui.notifications.warn("Vous n'êtes pas autorisé à modifier votre XP.");
            return false;
        }
    });

    // ============================================================
    // SECTION : Masquage du bouton Level Up et verrouillage du
    // champ XP sur la fiche personnage (joueurs uniquement)
    // ============================================================
    const hideLevelUpAndXp = (html) => {
        if (game.user.isGM) return;
        if (!game.settings.get("westmarch", "enableXpBlock")) return;

        const $html = $(html);

        // Bouton/badge Level Up : plusieurs variantes de markup possibles
        // selon la version de la fiche (dnd5e v3/v4, sheets custom, etc.)
        $html.find('[data-action]').filter(
            (i, el) => /level.?up/i.test(el.dataset.action ?? "")
        ).hide();
        $html.find('.level-up, .level-up-badge, .level-badge').hide();

        // Champ XP : ciblé en priorité par le name du data-binding
        // (stable d'une version à l'autre), classes connues en fallback
        $html.find('input[name$="xp.value"], input[name$="xp.max"]').prop('disabled', true);
        $html.find('.experience input, .xp input').prop('disabled', true);
    };

    Hooks.on("renderActorSheet", (sheet, html, data) => hideLevelUpAndXp(html));

    // Pour les fiches V2 (ApplicationV2 / Tidy5e etc.)
    Hooks.on("renderActorSheetV2", (sheet, html, data) => hideLevelUpAndXp(html));
}