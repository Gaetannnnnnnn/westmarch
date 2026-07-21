// ============================================================
// settings.js — Paramètres du module ashara-bestiary
// ============================================================

export function registerSettings() {
    game.settings.register("ashara-bestiary", "enabled", {
        name: "Activer le bestiaire",
        hint: "Active la détection automatique des créatures rencontrées sur les scènes.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register("ashara-bestiary", "anonymization", {
        name: "Activer l'anonymisation",
        hint: "Ajoute les boutons 'Révéler' et 'Masquer' dans l'en-tête des fiches acteurs (GM uniquement). Utilisé uniquement si ashara-relations n'est pas actif (sinon c'est lui qui injecte les boutons).",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register("ashara-bestiary", "folderPJ", {
        name: "Dossier des personnages joueurs (PJ)",
        hint: "Sélectionner le dossier acteur qui contient les fiches des joueurs. Les tokens de ce dossier sur une scène sont considérés comme les propriétaires du bestiaire — chaque joueur voit uniquement les créatures rencontrées par son personnage.",
        scope: "world",
        config: true,
        type: String,
        default: "",
    });

    game.settings.register("ashara-bestiary", "folderCreatures", {
        name: "Dossier des créatures",
        hint: "Sélectionner le dossier acteur qui contient les monstres et créatures. Quand un token de ce dossier apparaît sur une scène avec un PJ, il est automatiquement ajouté au bestiaire de ce joueur.",
        scope: "world",
        config: true,
        type: String,
        default: "",
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
                <p style="margin:0 0 4px 0;"><strong>Soruta — Bestiaire</strong> — v${version}</p>
                <p style="margin:0 0 4px 0;font-size:0.9em;">Bestiaire personnel par personnage. Répertorie automatiquement les créatures rencontrées sur les scènes.</p>
                <p style="margin:0;font-size:0.9em;">Auteur : ${author}</p>
                <p style="margin:6px 0 0 0;font-size:0.85em;font-style:italic;color:#e67e22;">© 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Toute redistribution, modification ou usage commercial est strictement interdit sans autorisation écrite.</p>
            </div>
        `));

        // Remplacer les champs texte des dossiers par des <select> dynamiques
        for (const key of ["folderPJ", "folderCreatures"]) {
            const input = root.find(`[name="ashara-bestiary.${key}"]`);
            if (!input.length) continue;
            const currentVal = game.settings.get("ashara-bestiary", key);
            const folders = game.folders
                .filter(f => f.type === "Actor")
                .sort((a, b) => a.name.localeCompare(b.name));
            const options = [`<option value="">— aucun —</option>`]
                .concat(folders.map(f =>
                    `<option value="${f.name}" ${f.name === currentVal ? "selected" : ""}>${f.name}</option>`
                )).join("");
            input.replaceWith(`<select name="ashara-bestiary.${key}" style="width:100%">${options}</select>`);
        }
    });
}
