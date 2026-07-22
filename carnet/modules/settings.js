// ============================================================
// settings.js — Paramètres du module carnet
// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
// ============================================================

const MODULE = "carnet";

export function registerSettings() {

    Hooks.on("renderSettingsConfig", (app, html) => {
        const root  = $(html);
        const group = root.find(`[name="${MODULE}.enabled"]`).closest(".form-group");
        if (!group.length) return;

        const mod     = game.modules.get(MODULE);
        const version = mod?.version ?? "?";

        group.before($(`
            <div style="margin-bottom:12px;padding:10px 14px;
                        border:1px solid #9b59b6;border-radius:4px;
                        background:rgba(155,89,182,0.08);">
                <p style="margin:0 0 4px 0;"><strong>Soruta — Carnet d'Expéditions</strong> — v${version}</p>
                <p style="margin:0 0 4px 0;font-size:0.9em;">Onglets Carnet et Temps morts sur la fiche PJ. Notes ProseMirror par expédition, dates via Simple Calendar.</p>
                <p style="margin:6px 0 0 0;font-size:0.85em;font-style:italic;color:#9b59b6;">© 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Toute redistribution, modification ou usage commercial est strictement interdit sans autorisation écrite.</p>
            </div>
        `));
    });

    game.settings.register(MODULE, "enabled", {
        name: "Activer le Carnet d'Expéditions",
        hint: "Ajoute les onglets Carnet et Temps morts sur les fiches de personnage joueur. Nécessite un rechargement.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: true
    });
}
