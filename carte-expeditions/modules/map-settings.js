// ============================================================
// map-settings.js — Réglages du module autonome "carte-expeditions",
// indépendant de westmarch.
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

    // Pas de "choices" ici : au moment du hook "init", game.scenes n'est pas
    // encore chargé (la liste serait vide ou ferait planter l'enregistrement
    // du setting). Le réglage est donc déclaré comme simple champ texte, et
    // converti en menu déroulant à l'affichage (voir renderSettingsConfig
    // plus bas), au moment où game.scenes est disponible.
    game.settings.register("carte-expeditions", "expeditionMapSceneId", {
        name: "Scène : carte des expéditions",
        hint: "Scène sur laquelle le brouillard de guerre est suivi par personnage plutôt que par compte joueur (chaque joueur retrouve les zones explorées par le personnage qu'il a actuellement assigné, même après un changement de personnage).",
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: false
    });

    // ============================================================
    // SECTION : Mise en forme visuelle — bandeau d'info en haut de la
    // section Carte des expéditions : version, description et auteur
    // (lus depuis module.json via game.modules, jamais modifié
    // directement — même principe que le bandeau de westmarch).
    // ============================================================
    Hooks.on("renderSettingsConfig", (app, html, data) => {
        const root = $(html);
        const firstGroup = root.find('[name="carte-expeditions.enableExpeditionMap"]').closest('.form-group');
        if (!firstGroup.length) return;

        // ---- Conversion du champ texte "expeditionMapSceneId" en menu
        // déroulant, peuplé ici car game.scenes est désormais disponible. ----
        const sceneInput = root.find('[name="carte-expeditions.expeditionMapSceneId"]');
        if (sceneInput.length && sceneInput.is('input')) {
            const currentValue = game.settings.get("carte-expeditions", "expeditionMapSceneId");
            const select = $('<select name="carte-expeditions.expeditionMapSceneId"></select>');
            select.append(`<option value="">— Aucune —</option>`);
            game.scenes.contents.forEach(s => {
                select.append(`<option value="${s.id}">${s.name}</option>`);
            });
            select.val(currentValue || "");
            sceneInput.replaceWith(select);
        }

        const moduleData = game.modules.get("carte-expeditions");
        const version = moduleData?.version ?? "?";
        const description = moduleData?.description
            ?? "Carte des expéditions : fog of war par party et par personnage sur une scène dédiée.";
        const author = moduleData?.authors?.[0]?.name ?? "Soruta";

        const banner = $(`
            <div class="carte-expeditions-settings-banner" style="margin-bottom: 12px; padding: 10px 14px; border: 1px solid #e67e22; border-radius: 4px; background: rgba(230,126,34,0.08);">
                <p style="margin:0 0 4px 0;"><strong>${moduleData?.title ?? "Ashara - Map Ouvert Systèmes"}</strong> — v${version}</p>
                <p style="margin:0 0 4px 0; font-size: 0.9em;">${description}</p>
                <p style="margin:0; font-size: 0.9em;">Auteur : ${author}</p>
                <p style="margin:6px 0 0 0; font-size: 0.85em; font-style: italic; color: #e67e22;">⚠️ Module propriétaire Ashara — ne pas redistribuer.</p>
            </div>
        `);
        firstGroup.before(banner);
    });
}
