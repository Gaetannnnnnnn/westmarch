// ============================================================
// foldermove.js — Multi-sélection et déplacement/duplication
// de documents dans le sidebar Foundry VTT.
//
// Ajoute un bouton ☑ dans l'en-tête de chaque onglet concerné
// (Scènes, Acteurs, Objets, Journaux). En mode sélection,
// cliquer sur un document le coche/décoche. Une barre en bas
// expose "Déplacer vers" et "Dupliquer vers" + sélecteur de
// dossier avec arbre complet.
//
// GM uniquement.
// © Soruta — module propriétaire Ashara, ne pas redistribuer.
// ============================================================

const FM_TABS = {
    scenes:  { collection: () => game.scenes,  folderType: "Scene",        label: "Scènes"   },
    actors:  { collection: () => game.actors,  folderType: "Actor",        label: "Acteurs"  },
    items:   { collection: () => game.items,   folderType: "Item",         label: "Objets"   },
    journal: { collection: () => game.journal, folderType: "JournalEntry", label: "Journaux" },
};

// État par onglet (persistant entre les re-renders)
const _fmActive   = {};   // { [tabId]: boolean }
const _fmSelected = {};   // { [tabId]: Set<documentId> }

function fmGetSel(tabId) {
    if (!_fmSelected[tabId]) _fmSelected[tabId] = new Set();
    return _fmSelected[tabId];
}

// ============================================================
// SECTION : Sélecteur de dossier
// ============================================================

function buildFolderTreeHtml(folderType) {
    const all = game.folders
        .filter(f => f.type === folderType)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));

    function renderNode(folder, depth) {
        const children = all
            .filter(f => f.folder?.id === folder.id)
            .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));
        return `
            <li class="wm-fm-folder-item" data-folder-id="${folder.id}" style="
                padding:5px 8px 5px ${8 + depth * 16}px; cursor:pointer;
                list-style:none; border-radius:3px;
                display:flex; align-items:center; gap:6px;">
                <i class="fas fa-folder" style="color:#c9a84c; font-size:11px; flex-shrink:0;"></i>
                <span style="font-size:12px;">${folder.name}</span>
            </li>
            ${children.map(c => renderNode(c, depth + 1)).join("")}
        `;
    }

    const roots = all
        .filter(f => !f.folder)
        .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.name.localeCompare(b.name));

    return `
        <ul style="margin:0; padding:0; max-height:300px; overflow-y:auto;
                   border:1px solid #444; border-radius:4px; background:#1a1a1a;">
            <li class="wm-fm-folder-item" data-folder-id="" style="
                padding:5px 8px; cursor:pointer; list-style:none; border-radius:3px;
                display:flex; align-items:center; gap:6px; border-bottom:1px solid #333;">
                <i class="fas fa-layer-group" style="color:#888; font-size:11px; flex-shrink:0;"></i>
                <span style="font-size:12px; color:#aaa; font-style:italic;">Racine (sans dossier)</span>
            </li>
            ${roots.map(f => renderNode(f, 0)).join("")}
        </ul>
    `;
}

// Ouvre le sélecteur de dossier. Retourne :
//   false  → annulé
//   null   → racine (sans dossier)
//   string → folderId
async function openFolderPicker(folderType, tabLabel) {
    const uid = `wm-fm-pick-${Date.now()}`;
    let chosen = false;

    await (foundry.applications.api.DialogV2 ?? DialogV2).wait({
        window: { title: `Destination — ${tabLabel}`, resizable: false },
        position: { width: 320 },
        content: `<div id="${uid}">
            <p style="margin:0 0 8px; font-size:12px; color:#aaa;">
                Cliquez sur un dossier de destination :
            </p>
            ${buildFolderTreeHtml(folderType)}
        </div>`,
        rejectClose: false,
        render: () => {
            const container = document.getElementById(uid);
            if (!container) return;
            $(container).find(".wm-fm-folder-item")
                .on("mouseenter", function() { $(this).css("background", "rgba(255,255,255,0.07)"); })
                .on("mouseleave", function() { $(this).css("background", ""); })
                .on("click", function() {
                    const raw = $(this).data("folder-id");
                    chosen = (raw === "" || raw === undefined) ? null : raw;
                    // Auto-submit via le bouton confirm
                    $(container).closest(".application, form")
                        .find("[data-action='confirm']").trigger("click");
                });
        },
        buttons: [
            {
                action: "confirm", label: "OK",
                icon: '<i class="fas fa-check"></i>',
                default: true, callback: () => {}
            },
            {
                action: "cancel", label: "Annuler",
                icon: '<i class="fas fa-times"></i>',
                callback: () => { chosen = false; }
            },
        ]
    });

    return chosen;
}

// ============================================================
// SECTION : Injection dans le sidebar
// ============================================================

function injectFm(tabId, html) {
    if (!game.user.isGM) return;
    const tabInfo = FM_TABS[tabId];
    if (!tabInfo) return;

    const $html    = $(html);
    const isActive = !!_fmActive[tabId];
    const selected = fmGetSel(tabId);

    // ---- Bouton toggle dans l'en-tête ----
    const $headerActions = $html.find(".header-actions").first();
    if (!$headerActions.length) return;

    const $btn = $(`
        <a class="wm-fm-toggle" title="Mode sélection (déplacer / dupliquer en lot)"
           style="cursor:pointer; ${isActive ? "color:#4caf50;" : ""}">
            <i class="fas fa-check-square"></i>
        </a>
    `);
    $headerActions.append($btn);

    $btn.on("click", () => {
        _fmActive[tabId] = !_fmActive[tabId];
        if (!_fmActive[tabId]) selected.clear();
        ui[tabId]?.render();
    });

    if (!isActive) return;

    // ---- Mode actif : coche/décoche au clic ----

    $html.find(".directory-item[data-document-id]").each(function() {
        const $item = $(this);
        const docId = $item.attr("data-document-id");
        if (!docId) return;

        // Indicateur visuel pour les items déjà sélectionnés
        if (selected.has(docId)) {
            $item.css({
                outline: "2px solid #4caf50",
                background: "rgba(76,175,80,0.1)",
                borderRadius: "3px"
            });
        }

        // Listener en capture pour intercepter avant Foundry
        $item[0].addEventListener("click", function(ev) {
            // Laisser passer les clics sur les contrôles du document
            if ($(ev.target).closest(".document-controls, .folder-controls, .control-buttons").length) return;
            ev.stopImmediatePropagation();
            ev.preventDefault();

            if (selected.has(docId)) {
                selected.delete(docId);
                $(this).css({ outline: "", background: "", borderRadius: "" });
            } else {
                selected.add(docId);
                $(this).css({
                    outline: "2px solid #4caf50",
                    background: "rgba(76,175,80,0.1)",
                    borderRadius: "3px"
                });
            }
            updateBar();
        }, true /* capture */);
    });

    // ---- Barre d'actions en bas ----

    const $bar = $(`
        <div class="wm-fm-bar" style="
            background:#1a1a2e; border-top:1px solid #444;
            padding:6px 10px; display:flex; align-items:center;
            gap:8px; flex-wrap:wrap; flex-shrink:0;
        ">
            <span class="wm-fm-count" style="font-size:12px; color:#aaa; flex:1; min-width:70px;">
                0 sélectionné
            </span>
            <div class="wm-fm-actions" style="display:flex; gap:5px; opacity:0.35; pointer-events:none;">
                <button type="button" class="wm-fm-move" style="
                    font-size:11px; padding:3px 8px; background:#2c5f8a; color:#fff;
                    border:none; border-radius:3px; cursor:pointer; white-space:nowrap;">
                    <i class="fas fa-folder-open"></i> Déplacer
                </button>
                <button type="button" class="wm-fm-dupe" style="
                    font-size:11px; padding:3px 8px; background:#5a3e8a; color:#fff;
                    border:none; border-radius:3px; cursor:pointer; white-space:nowrap;">
                    <i class="fas fa-copy"></i> Dupliquer
                </button>
                <button type="button" class="wm-fm-clear"
                    title="Tout désélectionner" style="
                    font-size:11px; padding:3px 8px; background:#555; color:#fff;
                    border:none; border-radius:3px; cursor:pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `);

    $html.append($bar);

    function updateBar() {
        const n = selected.size;
        $bar.find(".wm-fm-count").text(`${n} sélectionné${n > 1 ? "s" : ""}`);
        const $actions = $bar.find(".wm-fm-actions");
        $actions.css(n > 0
            ? { opacity: "1",    pointerEvents: "auto" }
            : { opacity: "0.35", pointerEvents: "none" }
        );
    }
    updateBar();

    // Désélectionner tout
    $bar.find(".wm-fm-clear").on("click", () => {
        selected.clear();
        ui[tabId]?.render();
    });

    // Déplacer vers un dossier
    $bar.find(".wm-fm-move").on("click", async () => {
        if (!selected.size) return;
        const folderId = await openFolderPicker(tabInfo.folderType, tabInfo.label);
        if (folderId === false) return;
        const count = selected.size;
        const coll  = tabInfo.collection();
        for (const docId of [...selected]) {
            const doc = coll.get(docId);
            if (doc) await doc.update({ folder: folderId });
        }
        selected.clear();
        _fmActive[tabId] = false;
        ui[tabId]?.render();
        ui.notifications.info(`[WestMarch] ${count} document(s) déplacé(s).`);
    });

    // Dupliquer vers un dossier
    $bar.find(".wm-fm-dupe").on("click", async () => {
        if (!selected.size) return;
        const folderId = await openFolderPicker(tabInfo.folderType, tabInfo.label);
        if (folderId === false) return;
        const count = selected.size;
        const coll  = tabInfo.collection();
        for (const docId of [...selected]) {
            const doc = coll.get(docId);
            if (doc) await doc.clone({ folder: folderId }, { save: true });
        }
        selected.clear();
        _fmActive[tabId] = false;
        ui[tabId]?.render();
        ui.notifications.info(`[WestMarch] ${count} document(s) dupliqué(s).`);
    });
}

// ============================================================
// SECTION : Enregistrement des hooks
// ============================================================

export function FolderMoveHooks() {
    const DIRECTIVES = [
        ["renderSceneDirectory",   "scenes"],
        ["renderActorDirectory",   "actors"],
        ["renderItemDirectory",    "items"],
        ["renderJournalDirectory", "journal"],
    ];

    for (const [hookName, tabId] of DIRECTIVES) {
        Hooks.on(hookName, (app, html) => {
            if (!game.settings.get("westmarch", "enableFolderMove")) return;
            injectFm(tabId, html);
        });
    }
}
