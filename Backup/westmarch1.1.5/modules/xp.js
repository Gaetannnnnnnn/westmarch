export function XpHooks() {

    // ============================================================
    // SECTION : Blocage de la modification de l'XP par les joueurs
    // - Les joueurs ne peuvent pas modifier leur XP manuellement
    // - Les GM peuvent toujours modifier l'XP librement
    // ============================================================
    Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
        // On laisse passer les GM
        if (game.user.isGM) return true;

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
    Hooks.on("renderActorSheet", (sheet, html, data) => {
        if (game.user.isGM) return;

        // Masquer le bouton Level Up
        $(html).find('.level-up').hide();
        $(html).find('[data-action="levelUp"]').hide();

        // Rendre le champ XP non éditable
        $(html).find('.experience input').prop('disabled', true);
        $(html).find('.xp input').prop('disabled', true);
    });

    // Pour les fiches V2 (ApplicationV2 / Tidy5e etc.)
    Hooks.on("renderActorSheetV2", (sheet, html, data) => {
        if (game.user.isGM) return;

        $(html).find('.level-up').hide();
        $(html).find('[data-action="levelUp"]').hide();

        $(html).find('.experience input').prop('disabled', true);
        $(html).find('.xp input').prop('disabled', true);
    });
}