// ============================================================
// foldermove.js — Déplacement et duplication via le clic droit
// du sidebar Foundry VTT.
//
// Hooks corrects (v13, découverts par inspection de
// DocumentDirectory._createContextMenus) :
//  - Entrées : get${documentName}ContextOptions
//      → getSceneContextOptions, getActorContextOptions,
//        getItemContextOptions, getJournalEntryContextOptions
//  - Dossiers : getFolderContextOptions (tous types confondus,
//    on filtre par folder.type dans le callback)
//
// Ajoute "Déplacer vers…" et "Dupliquer vers…" sur les
// documents, et "Déplacer vers…" sur les dossiers. GM only.
// © Soruta — module propriétaire Ashara, ne pas redistribuer.
// ============================================================

const FM_ENTRIES = [
    { hook: "getSceneContextOptions",        collection: () => game.scenes,  folderType: "Scene",        label: "Scènes"   },
    { hook: "getActorContextOptions",        collection: () => game.actors,  folderType: "Actor",        label: "Acteurs"  },
    { hook: "getItemContextOptions",         collection: () => game.items,   folderType: "Item",         label: "Objets"   },
    { hook: "getJournalEntryContextOptions", collection: () => game.journal, folderType: "JournalEntry", label: "Journaux" },
];

// ============================================================
// SECTION : Sélecteur de dossier
// ============================================================

function buildFolderTreeHtml(folderType, excludeFolderId = null) {
    const all = game.folders
        .filter(f => f.type === folderType && f.id !== excludeFolderId)
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

async function openFolderPicker(folderType, title, excludeFolderId = null) {
    const uid = `wm-fm-pick-${Date.now()}`;
    let chosen = false;

    await (foundry.applications.api.DialogV2 ?? DialogV2).wait({
        window: { title, resizable: false },
        position: { width: 320 },
        content: `<div id="${uid}">
            <p style="margin:0 0 8px; font-size:12px; color:#aaa;">
                Cliquez sur un dossier de destination :
            </p>
            ${buildFolderTreeHtml(folderType, excludeFolderId)}
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
                    $(container).closest(".application, form")
                        .find("[data-action='confirm']").trigger("click");
                });
        },
        buttons: [
            { action: "confirm", label: "OK",      icon: '<i class="fas fa-check"></i>', default: true, callback: () => {} },
            { action: "cancel",  label: "Annuler", icon: '<i class="fas fa-times"></i>', callback: () => { chosen = false; } },
        ]
    });

    return chosen;
}

// ============================================================
// SECTION : Hooks
// ============================================================

export function FolderMoveHooks() {

    // ---- Entrées (documents) ----
    for (const { hook, collection, folderType, label } of FM_ENTRIES) {
        Hooks.on(hook, (app, options) => {
            if (!game.settings.get("westmarch", "enableFolderMove")) return;
            if (!game.user.isGM) return;

            options.push(
                {
                    name: "Déplacer vers…",
                    icon: '<i class="fas fa-folder-open"></i>',
                    callback: async (li) => {
                        const docId = li.dataset?.entryId ?? li.dataset?.documentId;
                        const doc   = collection().get(docId);
                        if (!doc) return;
                        const folderId = await openFolderPicker(folderType, `Déplacer — ${doc.name}`);
                        if (folderId === false) return;
                        await doc.update({ folder: folderId });
                    }
                },
                {
                    name: "Dupliquer vers…",
                    icon: '<i class="fas fa-copy"></i>',
                    callback: async (li) => {
                        const docId = li.dataset?.entryId ?? li.dataset?.documentId;
                        const doc   = collection().get(docId);
                        if (!doc) return;
                        const folderId = await openFolderPicker(folderType, `Dupliquer — ${doc.name}`);
                        if (folderId === false) return;
                        await doc.clone({ folder: folderId }, { save: true });
                    }
                }
            );
        });
    }

    // ---- Dossiers (hook commun à tous les types) ----
    Hooks.on("getFolderContextOptions", (app, options) => {
        if (!game.settings.get("westmarch", "enableFolderMove")) return;
        if (!game.user.isGM) return;

        options.push({
            name: "Déplacer vers…",
            icon: '<i class="fas fa-folder-open"></i>',
            callback: async (li) => {
                const fId    = li.dataset?.folderId ?? li.dataset?.entryId;
                const folder = game.folders.get(fId);
                if (!folder) return;
                const destId = await openFolderPicker(folder.type, `Déplacer — ${folder.name}`, fId);
                if (destId === false) return;
                await folder.update({ folder: destId });
            }
        });
    });
}
