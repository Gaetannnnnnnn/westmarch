// ============================================================
// artbook.js — "Art Book" : galerie d'images personnelle par
// personnage.
// - Le propriétaire de la fiche (joueur ou GM) ajoute/retire ses
//   propres images via un bouton "Art Book" sur la fiche perso.
// - N'importe qui peut consulter l'Art Book d'un AUTRE joueur en
//   lecture seule (sans pouvoir ajouter/retirer d'image), via une
//   icône à côté de son pseudo dans la liste des joueurs.
// - Stockage : flag "artbook" sur l'acteur (tableau de chemins
//   d'images), entièrement séparé des apparences de token (token.js).
// ============================================================

const ART_FOLDER = "westmarch-artbook";

async function ensureUploadFolder() {
    try {
        await FilePicker.createDirectory("data", ART_FOLDER);
    } catch (e) {
        // Le dossier existe déjà : on ignore l'erreur
    }
}

function renderThumbs(grid, images, editable) {
    grid.empty();
    if (images.length === 0) {
        grid.append(`<div style="opacity:0.6; font-style:italic; padding:6px 0;">Aucune image pour le moment.</div>`);
        return;
    }
    images.forEach((src, index) => {
        const thumb = $(`
            <div style="position:relative; width:90px; height:90px;">
                <img class="westmarch-artbook-thumb" data-src="${src}" src="${src}" style="width:90px; height:90px; object-fit:cover; border-radius:4px; border:1px solid #555; cursor:pointer;" title="Cliquer pour voir en grand"/>
                ${editable ? `<div class="westmarch-artbook-remove" data-index="${index}" style="position:absolute;top:-4px;right:-4px;background:#c00;color:#fff;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:11px;">✕</div>` : ""}
            </div>
        `);
        grid.append(thumb);
    });
}

// Ouvre la popup Art Book pour un acteur donné.
// editable = true  -> propriétaire/GM : peut ajouter/retirer des images
// editable = false -> simple consultation (lecture seule)
export function openArtBook(actor, { editable }) {
    const overlay = $(`
        <div class="westmarch-artbook-overlay" style="position:fixed; inset:0; pointer-events:none; z-index:9999; display:flex; align-items:center; justify-content:center;">
            <div class="westmarch-artbook-popup" style="pointer-events:auto; background:#1f1f1f; border:1px solid #555; border-radius:6px; padding:16px; width:420px; max-height:70vh; overflow-y:auto; color:#eee; font-size:13px; box-shadow:0 4px 20px rgba(0,0,0,0.6);">
                <h3 style="margin:0 0 10px; font-size:15px;">Art Book — ${actor.name}</h3>

                <div class="westmarch-artbook-grid" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px;"></div>

                ${editable ? `
                <div style="display:flex; gap:6px; margin-bottom:10px;">
                    <button type="button" class="westmarch-artbook-browse" style="flex:1;"><i class="fas fa-folder-open"></i> Parcourir</button>
                    <button type="button" class="westmarch-artbook-upload" style="flex:1;"><i class="fas fa-upload"></i> Importer (PC)</button>
                    <input type="file" class="westmarch-artbook-file-input" accept="image/*" style="display:none;">
                </div>` : ""}

                <div style="display:flex; justify-content:flex-end;">
                    <button type="button" class="westmarch-artbook-close">Fermer</button>
                </div>
            </div>
        </div>
    `);

    const grid = overlay.find(".westmarch-artbook-grid");

    const refresh = () => {
        const images = actor.getFlag("westmarch", "artbook") ?? [];
        renderThumbs(grid, images, editable);
    };
    refresh();

    overlay.on("click", ".westmarch-artbook-thumb", (ev) => {
        const src = $(ev.currentTarget).data("src");
        if (src) new ImagePopout(src, { title: actor.name }).render(true);
    });

    if (editable) {
        overlay.find(".westmarch-artbook-browse").on("click", () => {
            const fp = new FilePicker({
                type: "image",
                callback: async (path) => {
                    const current = actor.getFlag("westmarch", "artbook") ?? [];
                    await actor.setFlag("westmarch", "artbook", [...current, path]);
                    refresh();
                }
            });
            fp.browse();
        });

        overlay.find(".westmarch-artbook-upload").on("click", () => overlay.find(".westmarch-artbook-file-input").trigger("click"));
        overlay.find(".westmarch-artbook-file-input").on("change", async (ev) => {
            const file = ev.target.files?.[0];
            if (!file) return;
            try {
                await ensureUploadFolder();
                const result = await FilePicker.upload("data", ART_FOLDER, file);
                if (result?.path) {
                    const current = actor.getFlag("westmarch", "artbook") ?? [];
                    await actor.setFlag("westmarch", "artbook", [...current, result.path]);
                    refresh();
                }
            } catch (err) {
                console.error("[WestMarch] Erreur upload Art Book :", err);
                ui.notifications.error("Erreur lors de l'upload de l'image (voir console).");
            }
        });

        overlay.on("click", ".westmarch-artbook-remove", async (ev) => {
            const index = parseInt($(ev.currentTarget).data("index"));
            const current = actor.getFlag("westmarch", "artbook") ?? [];
            current.splice(index, 1);
            await actor.setFlag("westmarch", "artbook", [...current]);
            refresh();
        });
    }

    overlay.find(".westmarch-artbook-close").on("click", () => overlay.remove());

    $(document.body).append(overlay);
}

export function ArtBookHooks() {

    // ============================================================
    // SECTION : Bouton "Art Book" sur la fiche personnage
    // - Visible uniquement par le propriétaire de la fiche (joueur
    //   concerné, ou GM) : ouverture en mode édition.
    // - Couvre les deux types de fiches (ancienne ActorSheet "v1" et
    //   ApplicationV2, comme pour le blocage XP dans xp.js).
    // ============================================================
    Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
        if (!game.settings.get("westmarch", "enableArtBook")) return;
        const actor = sheet.actor;
        if (!actor || actor.type !== "character") return;
        if (!actor.isOwner) return;

        buttons.unshift({
            label: "Art Book",
            class: "westmarch-artbook-btn",
            icon: "fas fa-images",
            onclick: () => openArtBook(actor, { editable: true })
        });
    });

    Hooks.on("renderActorSheetV2", (sheet, html, data) => {
        if (!game.settings.get("westmarch", "enableArtBook")) return;
        const actor = sheet.actor;
        if (!actor || actor.type !== "character") return;
        if (!actor.isOwner) return;

        const header = $(html).find(".window-header");
        if (!header.length) return;
        if (header.find(".westmarch-artbook-header-btn").length) return;

        const btn = $(`<button type="button" class="header-control icon fa-solid fa-images westmarch-artbook-header-btn" data-tooltip="Art Book" aria-label="Art Book"></button>`);
        btn.on("click", () => openArtBook(actor, { editable: true }));

        const closeBtn = header.find('[data-action="close"]');
        if (closeBtn.length) {
            closeBtn.first().before(btn);
        } else {
            header.append(btn);
        }
    });

    // ============================================================
    // SECTION : Menu contextuel (clic droit) sur un joueur
    // - Ouvre l'Art Book du personnage assigné à ce joueur, en lecture
    //   seule (jamais de bouton d'ajout/suppression depuis ce menu).
    // ============================================================
    Hooks.on("getUserContextOptions", (html, contextMenu) => {
        contextMenu.push({
            name: "Art Book",
            icon: '<i class="fa-solid fa-images"></i>',
            callback: li => {
                const targetUser = game.users.get(li.dataset.userId);
                const actor = targetUser?.character;
                if (actor) openArtBook(actor, { editable: false });
            },
            condition: li => {
                if (!game.settings.get("westmarch", "enableArtBook")) return false;
                const targetUser = game.users.get(li.dataset.userId);
                return !!targetUser?.character;
            }
        });
    });
}
