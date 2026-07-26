// ============================================================
// export-dialog.js — Export d'acteur avec choix de fiche
//
// Intercepte l'option "Export Data" du menu contextuel des acteurs
// et affiche un dialog pour proposer :
//   - Fiche actuelle  : export complet tel quel
//   - Fiche originale : export sans données de modules, fiche dnd5e par défaut
// ============================================================

// ================================================================
// HOOK
// ================================================================

export function ExportDialogHooks() {
    console.log("[Toolkit Export] ExportDialogHooks() démarré");

    // toolkit lui-même stocke des flags acteur (partyId, restock…)
    CONFIG.asharaSheetsModules ??= [];
    if (!CONFIG.asharaSheetsModules.includes("toolkit"))
        CONFIG.asharaSheetsModules.push("toolkit");

    // Détection large de l'option export native
    const isExportOption = (o) =>
        o.name === "SIDEBAR.Export"
        || o.name === "DOCUMENT.Export"
        || o.name === "DOCUMENT.ExportData"
        || (typeof o.icon  === "string" && o.icon.includes("file-export"))
        || (typeof o.label === "string" && /export/i.test(o.label));

    const handler = (_html, options) => {
        console.log("[Toolkit Export] hook contextuel déclenché, options :",
            options.map(o => ({ name: o.name, label: o.label, icon: o.icon }))
        );

        const idx = options.findIndex(isExportOption);
        console.log("[Toolkit Export] idx export :", idx,
            idx !== -1 ? options[idx] : "(non trouvée)"
        );

        const entry = {
            name:      "SIDEBAR.Export",
            icon:      '<i class="fas fa-file-export"></i>',
            condition: (li) => {
                const actor = _getActor(li);
                return actor?.isOwner ?? false;
            },
            callback: async (li) => {
                console.log("[Toolkit Export] callback export déclenché");
                const actor = _getActor(li);
                console.log("[Toolkit Export] acteur :", actor?.name);
                if (!actor) return;
                await _exportWithChoice(actor);
            }
        };

        // Supprimer toutes les options qui ressemblent à un export
        for (let i = options.length - 1; i >= 0; i--) {
            if (isExportOption(options[i])) options.splice(i, 1);
        }

        // Insérer à la position originale (ou en fin)
        const insertAt = idx !== -1 ? Math.min(idx, options.length) : options.length;
        options.splice(insertAt, 0, entry);

        console.log("[Toolkit Export] menu final :", options.map(o => o.name ?? o.label));
    };

    // Foundry v13 ApplicationV2 : le hook fire au render de la sidebar, pas au clic droit.
    // Le nom est construit par #callHooks → `get${documentName}ContextOptions` = "getActorContextOptions".
    Hooks.on("getActorContextOptions", handler);
    // Foundry v12 / fallback (ignorés en v13 ApplicationV2 mais inoffensifs)
    Hooks.on("getActorDirectoryEntryContext", handler);
    Hooks.on("getActorEntryContext", handler);
}

// ================================================================
// LOGIQUE PRINCIPALE
// ================================================================

async function _exportWithChoice(actor) {
    console.log("[Toolkit Export] _exportWithChoice appelé pour", actor.name);
    const choice = await _showDialog(actor);
    console.log("[Toolkit Export] choix =", choice);
    if (choice === null) return;

    if (choice === "current") {
        actor.exportToJSON();
    } else {
        _exportOriginal(actor);
    }
}

// ================================================================
// DIALOG DE CHOIX
// ================================================================

async function _showDialog(actor) {
    return new Promise(resolve => {
        const content = `
        <form class="tko-export-form">
            <p class="tko-export-intro">
                <i class="fas fa-info-circle"></i>
                Cet acteur contient des données liées aux modules du serveur
                (expéditions, relations, bestiaire…).
                Choisissez le format d'export.
            </p>

            <label class="tko-export-opt">
                <input type="radio" name="export-mode" value="current" checked>
                <div class="tko-export-opt-body">
                    <span class="tko-export-opt-title">
                        <i class="fas fa-layer-group"></i> Fiche actuelle
                    </span>
                    <span class="tko-export-opt-desc">
                        Inclut toutes les données (expéditions, notes, flags modules).
                        À importer uniquement sur un serveur avec les mêmes modules installés.
                    </span>
                </div>
            </label>

            <label class="tko-export-opt">
                <input type="radio" name="export-mode" value="original">
                <div class="tko-export-opt-body">
                    <span class="tko-export-opt-title">
                        <i class="fas fa-d-and-d-beyond"></i> Fiche originale dnd5e
                    </span>
                    <span class="tko-export-opt-desc">
                        Réinitialise la fiche au format dnd5e standard et supprime
                        les données propres aux modules. Compatible avec n'importe
                        quel serveur Foundry.
                    </span>
                </div>
            </label>
        </form>`;

        new Dialog({
            title:   `Exporter — ${actor.name}`,
            content,
            buttons: {
                export: {
                    icon:  '<i class="fas fa-file-export"></i>',
                    label: "Exporter",
                    callback: (html) => {
                        const mode = html.find('[name="export-mode"]:checked').val();
                        resolve(mode ?? "current");
                    }
                },
                cancel: {
                    icon:  '<i class="fas fa-times"></i>',
                    label: "Annuler",
                    callback: () => resolve(null)
                }
            },
            default: "export"
        }, { width: 420, classes: ["dialog", "tko-export-dialog"] }).render(true);
    });
}

// ================================================================
// EXPORT "FICHE ORIGINALE"
// ================================================================

function _exportOriginal(actor) {
    const data = actor.toObject();

    for (const mod of (CONFIG.asharaSheetsModules ?? [])) {
        delete data.flags?.[mod];
    }

    if (data.flags?.core?.sheetClass) {
        delete data.flags.core.sheetClass;
    }

    data._id       = null;
    data.ownership = { default: 0 };

    data.flags ??= {};
    data.flags.exportSource = {
        world:         game.world.id,
        system:        game.system.id,
        coreVersion:   game.version,
        systemVersion: game.system.version
    };

    const slug     = actor.name.slugify?.() ?? actor.name.toLowerCase().replace(/\s+/g, "-");
    const filename = `fvtt-Actor-${slug}-${actor.id}.json`;
    saveDataToFile(JSON.stringify(data, null, 2), "text/json", filename);

    ui.notifications.info(
        `${actor.name} — exporté avec la fiche originale dnd5e (données modules supprimées).`
    );
}

// ================================================================
// UTILITAIRE
// ================================================================

function _getActor(li) {
    const el = (li instanceof Element) ? li : (li?.[0] instanceof Element ? li[0] : null);
    if (!el) return null;

    // Foundry v13 : data-uuid ("Actor.<id>")
    const uuid = el.dataset?.uuid ?? el.getAttribute?.("data-uuid");
    if (uuid?.startsWith("Actor.")) {
        const id = uuid.split(".")[1];
        if (id) return game.actors.get(id) ?? null;
    }

    // Foundry v12/v13 : data-document-id ou data-entity-id
    const docId = el.dataset?.documentId
        ?? el.getAttribute?.("data-document-id")
        ?? el.dataset?.entryId
        ?? el.getAttribute?.("data-entity-id");
    if (docId) return game.actors.get(docId) ?? null;

    // Fallback jQuery
    if (typeof li?.data === "function") {
        const jid = li.data("document-id") ?? li.data("entity-id");
        if (jid) return game.actors.get(jid) ?? null;
    }

    return null;
}
