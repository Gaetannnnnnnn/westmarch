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

    Hooks.on("renderSettingsConfig", (app, html) => {
        const root  = $(html);
        const group = root.find('[name="ashara-bestiary.enabled"]').closest(".form-group");
        if (!group.length) return;

        const mod     = game.modules.get("ashara-bestiary");
        const version = mod?.version ?? "?";
        const author  = mod?.authors?.[0]?.name ?? "Soruta";

        group.before($(`
            <div style="margin-bottom:12px;padding:10px 14px;
                        border:1px solid #e67e22;border-radius:4px;
                        background:rgba(230,126,34,0.08);">
                <p style="margin:0 0 4px 0;"><strong>Ashara - Bestiaire</strong> — v${version}</p>
                <p style="margin:0 0 4px 0;font-size:0.9em;">Bestiaire personnel par personnage. Répertorie automatiquement les créatures rencontrées sur les scènes.</p>
                <p style="margin:0;font-size:0.9em;">Auteur : ${author}</p>
                <p style="margin:6px 0 0 0;font-size:0.85em;font-style:italic;color:#e67e22;">⚠️ Module propriétaire Ashara — ne pas redistribuer.</p>
            </div>
        `));
    });
}
