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

    game.settings.register("ashara-relations", "anonymization", {
        name: "Activer l'anonymisation",
        hint: "Ajoute les boutons 'Révéler' et 'Masquer' dans l'en-tête des fiches acteurs (GM uniquement). Permet de contrôler si un acteur apparaît comme 'Inconnu' dans les onglets Relations des joueurs.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    game.settings.register("ashara-relations", "folderPJ", {
        name: "Dossier des personnages joueurs (PJ)",
        hint: "Sélectionner le dossier acteur qui contient les fiches des joueurs. Ces acteurs apparaissent dans l'onglet Relations sous la catégorie 'Joueurs', et leur présence sur une scène déclenche la détection automatique de rencontres.",
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: false
    });

    game.settings.register("ashara-relations", "folderPNJ", {
        name: "Dossier des personnages non-joueurs (PNJ)",
        hint: "Sélectionner le dossier acteur qui contient les PNJs récurrents (alliés, marchands, figures importantes). Ces acteurs apparaissent dans l'onglet Relations sous la catégorie 'PNJ' et peuvent être liés aux personnages joueurs.",
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: false
    });

    game.settings.register("ashara-relations", "folderCreatures", {
        name: "Dossier des créatures",
        hint: "Sélectionner le dossier acteur qui contient les monstres et créatures. Les tokens de ce dossier sur une scène déclenchent la détection automatique de rencontres avec les PJs présents.",
        scope: "world",
        config: true,
        type: String,
        default: "",
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
                <p style="margin:0 0 4px 0;"><strong>Soruta — Relations</strong> — v${version}</p>
                <p style="margin:0 0 4px 0;font-size:0.9em;">Système de relations entre acteurs. Détection automatique des rencontres, onglet dédié sur la fiche acteur.</p>
                <p style="margin:0;font-size:0.9em;">Auteur : ${author}</p>
                <p style="margin:6px 0 0 0;font-size:0.85em;font-style:italic;color:#e67e22;">© 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Toute redistribution, modification ou usage commercial est strictement interdit sans autorisation écrite.</p>
            </div>
        `));

        // Remplacer les champs texte des dossiers par des <select> en arbre
        // Les valeurs stockées sont des folder.id (pas des noms) pour éviter
        // les conflits quand plusieurs dossiers portent le même nom.
        function buildFolderOptions(currentVal) {
            const all = game.folders.filter(f => f.type === "Actor");
            function walk(parentId, depth) {
                return all
                    .filter(f => (f.folder?.id ?? null) === parentId)
                    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name))
                    .flatMap(f => [
                        `<option value="${f.id}" ${f.id === currentVal ? "selected" : ""}>${"  ".repeat(depth * 2)}${depth > 0 ? "└ " : ""}${f.name}</option>`,
                        ...walk(f.id, depth + 1)
                    ]);
            }
            return [`<option value="">— aucun —</option>`, ...walk(null, 0)].join("");
        }

        for (const key of ["folderPJ", "folderPNJ", "folderCreatures"]) {
            const input = root.find(`[name="ashara-relations.${key}"]`);
            if (!input.length) continue;
            const currentVal = game.settings.get("ashara-relations", key);
            input.replaceWith(`<select name="ashara-relations.${key}" style="width:100%">${buildFolderOptions(currentVal)}</select>`);
        }
    });
}
