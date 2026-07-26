// ============================================================
// export-dialog.js — Export d'acteur avec choix de fiche
//
// Intercepte l'option "Export Data" du menu contextuel des acteurs
// et affiche un dialog si l'acteur contient des données propres
// aux modules Ashara, pour proposer :
//   - Fiche actuelle  : export complet tel quel
//   - Fiche originale : export sans données de modules, fiche dnd5e par défaut
// ============================================================

// ================================================================
// HOOK
// ================================================================

export function ExportDialogHooks() {
    // toolkit lui-même stocke des flags acteur (partyId, restock…)
    CONFIG.asharaSheetsModules ??= [];
    if (!CONFIG.asharaSheetsModules.includes("toolkit"))
        CONFIG.asharaSheetsModules.push("toolkit");

    Hooks.on("getActorDirectoryEntryContext", (_html, options) => {
        // Foundry v13 peut utiliser une clé différente selon la version ;
        // on cherche aussi par icône en fallback.
        const idx = options.findIndex(o =>
            o.name === "SIDEBAR.Export"
            || o.name === "DOCUMENT.Export"
            || (typeof o.icon === "string" && o.icon.includes("file-export"))
        );

        const entry = {
            name:      "SIDEBAR.Export",
            icon:      '<i class="fas fa-file-export"></i>',
            condition: (li) => {
                const actor = _getActor(li);
                return actor?.isOwner ?? false;
            },
            callback: async (li) => {
                const actor = _getActor(li);
                if (!actor) return;
                await _exportWithChoice(actor);
            }
        };

        if (idx !== -1) {
            options.splice(idx, 1, entry);
        } else {
            // Option export absente du menu — on l'ajoute quand même
            options.push(entry);
        }
    });
}

// ================================================================
// LOGIQUE PRINCIPALE
// ================================================================

async function _exportWithChoice(actor) {
    const choice = await _showDialog(actor);
    if (choice === null) return;   // annulé

    if (choice === "current") {
        actor.exportToJSON();
    } else {
        _exportOriginal(actor);
    }
}

// ================================================================
// DÉTECTION DES DONNÉES CUSTOM
// ================================================================

function _hasCustomData(actor) {
    const flags = actor.flags ?? {};

    // Données de modules Ashara dans les flags
    for (const mod of (CONFIG.asharaSheetsModules ?? [])) {
        if (flags[mod] && Object.keys(flags[mod]).length > 0) return true;
    }

    // Fiche custom pointant vers un module Ashara
    const sheetClass = flags.core?.sheetClass ?? "";
    if (sheetClass && (CONFIG.asharaSheetsModules ?? []).some(m => sheetClass.startsWith(m + "."))) return true;

    return false;
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
    // Partir des données brutes de l'acteur
    const data = actor.toObject();

    // Supprimer tous les flags des modules Ashara
    for (const mod of (CONFIG.asharaSheetsModules ?? [])) {
        delete data.flags?.[mod];
    }

    // Réinitialiser la préférence de fiche → dnd5e par défaut
    if (data.flags?.core?.sheetClass) {
        delete data.flags.core.sheetClass;
    }

    // Nettoyer ownership et _id comme le fait Foundry en export compendium
    data._id        = null;
    data.ownership  = { default: 0 };

    // Métadonnées d'export (identique à Document#exportToJSON)
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
    // Normalise : jQuery element → native HTMLElement
    const el = (li instanceof Element) ? li : (li?.[0] instanceof Element ? li[0] : null);
    if (!el) return null;

    // 1. Foundry v13 : data-uuid (ex : "Actor.aBcD1234")
    const uuid = el.dataset?.uuid ?? el.getAttribute?.("data-uuid");
    if (uuid?.startsWith("Actor.")) {
        const id = uuid.split(".")[1];
        if (id) return game.actors.get(id) ?? null;
    }

    // 2. Foundry v12/v13 : data-document-id ou data-entity-id
    const docId = el.dataset?.documentId
        ?? el.getAttribute?.("data-document-id")
        ?? el.dataset?.entryId
        ?? el.getAttribute?.("data-entity-id");
    if (docId) return game.actors.get(docId) ?? null;

    // 3. Fallback jQuery .data()
    if (typeof li?.data === "function") {
        const jid = li.data("document-id") ?? li.data("entity-id");
        if (jid) return game.actors.get(jid) ?? null;
    }

    return null;
}
