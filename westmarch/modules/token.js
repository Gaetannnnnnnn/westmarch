// ============================================================
// token.js — Apparences multiples pour le token (GM uniquement)
// Chaque apparence = une image + un anneau dynamique (Token Ring
// natif Foundry v13) optionnel, propre à cette apparence.
// ============================================================

// Normalise une entrée de la liste (compat avec l'ancien format
// où chaque entrée n'était qu'une simple chaîne de chemin).
function normalizeEntry(entry) {
    if (typeof entry === "string") {
        return { src: entry, ring: null };
    }
    return {
        src: entry.src,
        ring: entry.ring ?? null
    };
}

// Crée le popup d'import d'une apparence (image + anneau dynamique).
// Appelle onConfirm({src, ring}) si le GM valide.
function openImportPopup(onConfirm) {
    let chosenPath = null;

    const overlay = $(`
        <div class="westmarch-import-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; display:flex; align-items:center; justify-content:center;">
            <div class="westmarch-import-popup" style="background:#1f1f1f; border:1px solid #555; border-radius:6px; padding:16px; width:340px; color:#eee; font-size:13px;">
                <h3 style="margin:0 0 10px; font-size:15px;">Importer un token</h3>

                <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                    <div class="westmarch-import-preview" style="width:64px; height:64px; flex:0 0 auto; border:1px solid #555; border-radius:4px; background:#000 center/cover no-repeat; display:flex; align-items:center; justify-content:center; overflow:hidden;">
                        <i class="fas fa-image" style="opacity:0.4;"></i>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; flex:1;">
                        <button type="button" class="westmarch-import-browse"><i class="fas fa-folder-open"></i> Parcourir la base</button>
                        <button type="button" class="westmarch-import-upload"><i class="fas fa-upload"></i> Importer depuis mon PC</button>
                        <input type="file" class="westmarch-import-file-input" accept="image/*" style="display:none;">
                    </div>
                </div>

                <fieldset style="border:1px solid #555; border-radius:4px; padding:8px; margin-bottom:12px;">
                    <legend style="font-size:12px;">Anneau dynamique (token border)</legend>
                    <label style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
                        <input type="checkbox" class="westmarch-ring-enabled"> Activer l'anneau
                    </label>
                    <div class="westmarch-ring-options" style="display:flex; gap:14px; opacity:0.4; pointer-events:none;">
                        <label style="display:flex; flex-direction:column; gap:2px;">
                            Couleur anneau
                            <input type="color" class="westmarch-ring-color" value="#ffffff">
                        </label>
                        <label style="display:flex; flex-direction:column; gap:2px;">
                            Couleur de fond
                            <input type="color" class="westmarch-ring-bg" value="#000000">
                        </label>
                    </div>
                </fieldset>

                <div style="display:flex; gap:8px; justify-content:flex-end;">
                    <button type="button" class="westmarch-import-cancel">Annuler</button>
                    <button type="button" class="westmarch-import-confirm" disabled>Créer</button>
                </div>
            </div>
        </div>
    `);

    const setPreview = (path) => {
        chosenPath = path;
        overlay.find(".westmarch-import-preview").css("background-image", `url("${path}")`).find("i").hide();
        overlay.find(".westmarch-import-confirm").prop("disabled", false);
    };

    overlay.find(".westmarch-ring-enabled").on("change", (ev) => {
        overlay.find(".westmarch-ring-options").css({
            opacity: ev.target.checked ? 1 : 0.4,
            "pointer-events": ev.target.checked ? "auto" : "none"
        });
    });

    overlay.find(".westmarch-import-browse").on("click", () => {
        const fp = new FilePicker({
            type: "image",
            callback: (path) => setPreview(path)
        });
        fp.browse();
    });

    overlay.find(".westmarch-import-upload").on("click", () => {
        overlay.find(".westmarch-import-file-input").trigger("click");
    });

    overlay.find(".westmarch-import-file-input").on("change", async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        try {
            const folder = "westmarch-tokens";
            try {
                await FilePicker.createDirectory("data", folder);
            } catch (e) {
                // Le dossier existe déjà : on ignore l'erreur
            }
            const result = await FilePicker.upload("data", folder, file);
            if (result?.path) setPreview(result.path);
        } catch (err) {
            console.error("[WestMarch] Erreur upload token :", err);
            ui.notifications.error("Erreur lors de l'upload de l'image (voir console).");
        }
    });

    overlay.find(".westmarch-import-cancel").on("click", () => overlay.remove());
    overlay.on("click", (ev) => { if (ev.target === overlay[0]) overlay.remove(); });

    overlay.find(".westmarch-import-confirm").on("click", () => {
        if (!chosenPath) return;
        const ringEnabled = overlay.find(".westmarch-ring-enabled").prop("checked");
        const entry = {
            src: chosenPath,
            ring: ringEnabled ? {
                enabled: true,
                colors: {
                    ring: overlay.find(".westmarch-ring-color").val(),
                    background: overlay.find(".westmarch-ring-bg").val()
                }
            } : null
        };
        overlay.remove();
        onConfirm(entry);
    });

    $(document.body).append(overlay);
}

export function TokenHooks() {

    // ============================================================
    // SECTION : Bouton "Image suivante" dans le HUD du token
    // - Tout le monde peut cycler sur son propre token
    // - Les apparences sont stockées sur l'acteur (prototype token)
    // ============================================================
    Hooks.on("renderTokenHUD", (hud, html, data) => {
        if (!game.settings.get("westmarch", "enableTokenAppearance")) return;
        const token = hud.object;
        if (!token) return;

        const actor = token.actor;
        if (!actor) return;
        if (!game.user.isGM && !actor.isOwner) return;

        const rawImages = actor.getFlag("westmarch", "images");
        if (!rawImages || rawImages.length < 2) return;
        const entries = rawImages.map(normalizeEntry);

        const btn = $(`
            <div class="control-icon westmarch-next-image" title="Apparence suivante">
                <i class="fas fa-chevron-right"></i>
            </div>
        `);

        btn.click(async () => {
            const currentImg = token.document.texture.src;
            const currentIndex = entries.findIndex(e => e.src === currentImg);
            const nextIndex = (currentIndex + 1) % entries.length;
            const next = entries[nextIndex];

            const updateData = { "texture.src": next.src };
            if (next.ring?.enabled) {
                updateData["ring.enabled"] = true;
                updateData["ring.colors.ring"] = next.ring.colors?.ring ?? "#ffffff";
                updateData["ring.colors.background"] = next.ring.colors?.background ?? "#000000";
            } else {
                updateData["ring.enabled"] = false;
            }

            await token.document.update(updateData);
        });

        $(html).find(".col.right").append(btn);
    });

    // ============================================================
    // SECTION : Gestion de la liste d'apparences dans le prototype token
    // - GM uniquement
    // - Accessible via l'onglet "Jeton" de la fiche du personnage
    // - Les apparences sont stockées sur l'acteur, donc permanentes
    //   pour tous les tokens posés depuis cette fiche
    // ============================================================
    Hooks.on("renderPrototypeTokenConfig", (app, html, data) => {
        if (!game.settings.get("westmarch", "enableTokenAppearance")) return;
        if (!game.user.isGM) return;

        // En v13 l'acteur est accessible via app.document.parent
        const actor = app.document?.parent ?? app.object?.actor ?? app.actor;
        if (!actor) {
            console.warn("[WestMarch] renderPrototypeTokenConfig : acteur introuvable", app);
            return;
        }

        const rawImages = actor.getFlag("westmarch", "images") ?? [];

        const section = $(`
            <fieldset style="margin-top: 12px; border: 1px solid #555; padding: 8px 12px; border-radius: 4px;">
                <legend style="font-weight: bold; font-size: 13px;">Apparences (WestMarch)</legend>
                <div class="westmarch-image-list" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;"></div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="westmarch-add-image" style="flex:1;">
                        <i class="fas fa-plus"></i> Importer un token
                    </button>
                </div>
            </fieldset>
        `);

        const renderImages = (rawImgs) => {
            const list = section.find(".westmarch-image-list");
            list.empty();
            rawImgs.map(normalizeEntry).forEach((entry, index) => {
                const borderColor = entry.ring?.enabled ? (entry.ring.colors?.ring ?? "#ffffff") : "#555";
                const thumb = $(`
                    <div style="position:relative; width:48px; height:48px;">
                        <img src="${entry.src}" style="width:48px; height:48px; object-fit:cover; border-radius:4px; border:2px solid ${borderColor};" title="${entry.src}"/>
                        <div class="westmarch-remove-image" data-index="${index}" style="position:absolute;top:-4px;right:-4px;background:#c00;color:#fff;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;">✕</div>
                    </div>
                `);
                list.append(thumb);
            });
        };

        renderImages(rawImages);

        section.find(".westmarch-add-image").click(() => {
            openImportPopup(async (entry) => {
                const current = actor.getFlag("westmarch", "images") ?? [];
                if (current.some(e => normalizeEntry(e).src === entry.src)) {
                    ui.notifications.warn("Cette image est déjà dans la liste.");
                    return;
                }
                const updated = [...current, entry];
                await actor.setFlag("westmarch", "images", updated);
                renderImages(updated);
            });
        });

        section.on("click", ".westmarch-remove-image", async (ev) => {
            const index = parseInt($(ev.currentTarget).data("index"));
            const current = actor.getFlag("westmarch", "images") ?? [];
            current.splice(index, 1);
            await actor.setFlag("westmarch", "images", [...current]);
            renderImages(current);
        });

        const tab = $(html).find(".tab[data-tab='appearance']");
        (tab.length ? tab : $(html)).append(section);
    });
}
