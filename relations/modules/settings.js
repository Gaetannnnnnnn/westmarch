export function registerSettings() {
    game.settings.register("ashara-relations", "enabled", {
        name: "Activer le système de relations",
        hint: "Ajoute un onglet 'Relations' sur chaque fiche acteur et détecte automatiquement les rencontres entre personnages sur les scènes.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    Hooks.on("renderSettingsConfig", (app, html) => {
        const root  = $(html);
        const group = root.find('[name="ashara-relations.enabled"]').closest(".form-group");
        if (!group.length) return;

        const mod     = game.modules.get("ashara-relations");
        const version = mod?.version ?? "?";
        const author  = mod?.authors?.[0]?.name ?? "Soruta";

        group.before($(`
            <div style="margin-bottom:12px;padding:10px 14px;
                        border:1px solid #e67e22;border-radius:4px;
                        background:rgba(230,126,34,0.08);">
                <p style="margin:0 0 4px 0;"><strong>Ashara - Relations</strong> — v${version}</p>
                <p style="margin:0 0 4px 0;font-size:0.9em;">Système de relations entre acteurs. Détection automatique des rencontres, onglet dédié sur la fiche acteur.</p>
                <p style="margin:0;font-size:0.9em;">Auteur : ${author}</p>
                <p style="margin:6px 0 0 0;font-size:0.85em;font-style:italic;color:#e67e22;">⚠️ Module propriétaire Ashara — ne pas redistribuer.</p>
            </div>
        `));
    });
}
