// ============================================================
// foldermove.js — Déplacement et duplication via le clic droit
// du sidebar Foundry VTT.
//
// Ajoute dans le menu contextuel (clic droit) des documents et
// des dossiers :
//  - "Déplacer vers..." : déplace l'élément dans un autre dossier
//  - "Dupliquer vers..." : crée une copie dans un autre dossier
//
// Couvre : Scènes, Acteurs, Objets, Journaux.
// GM uniquement.
// © Soruta — module propriétaire Ashara, ne pas redistribuer.
// ============================================================

// Hooks sur les entrées (documents) — v13 : suffixe "Options"
const FM_ENTRY_HOOKS = [
    { hook: "getSceneDirectoryEntryContextOptions",   collection: () => game.scenes,  folderType: "Scene",        label: "Scènes"   },
    { hook: "getActorDirectoryEntryContextOptions",   collection: () => game.actors,  folderType: "Actor",        label: "Acteurs"  },
    { hook: "getItemDirectoryEntryContextOptions",    collection: () => game.items,   folderType: "Item",         label: "Objets"   },
    { hook: "getJournalEntryContextOptions",          collection: () => game.journal, folderType: "JournalEntry", label: "Journaux" },
];

// Hooks sur les dossiers — v13 : suffixe "Options"
const FM_FOLDER_HOOKS = [
    { hook: "getSceneDirectoryFolderContextOptions",   folderType: "Scene"        },
    { hook: "getActorDirectoryFolderContextOptions",   folderType: "Actor"        },
    { hook: "getItemDirectoryFolderContextOptions",    folderType: "Item"         },
    { hook: "getJournalDirectoryFolderContextOptions", folderType: "JournalEntry" },
];

// ============================================================
// SECTION : Sélecteur de dossier (DialogV2)
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

// Retourne : false = annulé, null = racine, string = folderId
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
// SECTION : Enregistrement des hooks
// ============================================================

export function FolderMoveHooks() {

    // ---- Menu clic droit sur les documents ----
    for (const { hook, collection, folderType, label } of FM_ENTRY_HOOKS) {
        Hooks.on(hook, (html, options) => {
            if (!game.settings.get("westmarch", "enableFolderMove")) return;
            if (!game.user.isGM) return;

            options.push(
                {
                    name: "Déplacer vers…",
                    icon: '<i class="fas fa-folder-open"></i>',
                    condition: () => true,
                    callback: async (li) => {
                        const docId = li.dataset?.entryId ?? li.dataset?.documentId ?? li.dataset?.sceneId;
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
                    condition: () => true,
                    callback: async (li) => {
                        const docId = li.dataset?.entryId ?? li.dataset?.documentId ?? li.dataset?.sceneId;
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

    // ---- Menu clic droit sur les dossiers (patch prototype v13) ----
    // En v13, les menus de dossiers n'ont pas de hook — on patche
    // _getFolderContextOptions directement sur chaque classe de directory.
    const FOLDER_PATCHES = [
        { uiKey: "scenes",  folderType: "Scene"        },
        { uiKey: "actors",  folderType: "Actor"        },
        { uiKey: "items",   folderType: "Item"         },
        { uiKey: "journal", folderType: "JournalEntry" },
    ];

    Hooks.on("ready", () => {
        for (const { uiKey, folderType } of FOLDER_PATCHES) {
            const dir = ui[uiKey];
            if (!dir) continue;
            const proto = dir.constructor.prototype;
            if (!proto._getFolderContextOptions) continue;
            // Évite de patcher deux fois si le module reload
            if (proto._getFolderContextOptions._wmPatched) continue;

            const _orig = proto._getFolderContextOptions;
            proto._getFolderContextOptions = function(...args) {
                const options = _orig.call(this, ...args);
                if (!game.user.isGM) return options;
                if (!game.settings.get("westmarch", "enableFolderMove")) return options;

                options.push({
                    name: "Déplacer vers…",
                    icon: '<i class="fas fa-folder-open"></i>',
                    callback: async (li) => {
                        const fId    = li.dataset?.folderId ?? li.dataset?.entryId;
                        const folder = game.folders.get(fId);
                        if (!folder) return;
                        const destId = await openFolderPicker(folderType, `Déplacer — ${folder.name}`, fId);
                        if (destId === false) return;
                        await folder.update({ folder: destId });
                    }
                });
                return options;
            };
            proto._getFolderContextOptions._wmPatched = true;
        }
    });
}
