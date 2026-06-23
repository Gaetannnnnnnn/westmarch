export function TokenHooks() {

    // ============================================================
    // SECTION : Bouton "Image suivante" dans le HUD du token
    // - Tout le monde peut cycler sur son propre token
    // - Les images sont stockées sur l'acteur (prototype token)
    // ============================================================
    Hooks.on("renderTokenHUD", (hud, html, data) => {
        if (!game.settings.get("westmarch", "enableTokenAppearance")) return;
        const token = hud.object;
        if (!token) return;

        const actor = token.actor;
        if (!actor) return;
        if (!game.user.isGM && !actor.isOwner) return;

        // Les images sont toujours sur l'acteur
        const images = actor.getFlag("westmarch", "images");
        if (!images || images.length < 2) return;

        // Ajouter le bouton ▶ dans le HUD
        const btn = $(`
            <div class="control-icon westmarch-next-image" title="Apparence suivante">
                <i class="fas fa-chevron-right"></i>
            </div>
        `);

        btn.click(async () => {
            const currentImg = token.document.texture.src;
            const currentIndex = images.indexOf(currentImg);
            const nextIndex = (currentIndex + 1) % images.length;
            await token.document.update({ "texture.src": images[nextIndex] });
        });

        $(html).find(".col.right").append(btn);
    });

    // ============================================================
    // SECTION : Gestion de la liste d'images dans le prototype token
    // - GM uniquement
    // - Accessible via l'onglet "Jeton" de la fiche du personnage
    // - Les images sont stockées sur l'acteur, donc permanentes
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

        const images = actor.getFlag("westmarch", "images") ?? [];

        const section = $(`
            <fieldset style="margin-top: 12px; border: 1px solid #555; padding: 8px 12px; border-radius: 4px;">
                <legend style="font-weight: bold; font-size: 13px;">Apparences (WestMarch)</legend>
                <div class="westmarch-image-list" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;"></div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="westmarch-add-image" style="flex:1;">
                        <i class="fas fa-plus"></i> Ajouter une image
                    </button>
                </div>
            </fieldset>
        `);

        const renderImages = (imgs) => {
            const list = section.find(".westmarch-image-list");
            list.empty();
            imgs.forEach((src, index) => {
                const thumb = $(`
                    <div style="position:relative; width:48px; height:48px;">
                        <img src="${src}" style="width:48px; height:48px; object-fit:cover; border-radius:4px; border:1px solid #555;" title="${src}"/>
                        <div class="westmarch-remove-image" data-index="${index}" style="position:absolute;top:-4px;right:-4px;background:#c00;color:#fff;border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:10px;">✕</div>
                    </div>
                `);
                list.append(thumb);
            });
        };

        renderImages(images);

        section.find(".westmarch-add-image").click(() => {
            const fp = new FilePicker({
                type: "image",
                callback: async (path) => {
                    const current = actor.getFlag("westmarch", "images") ?? [];
                    if (current.includes(path)) {
                        ui.notifications.warn("Cette image est déjà dans la liste.");
                        return;
                    }
                    const updated = [...current, path];
                    await actor.setFlag("westmarch", "images", updated);
                    renderImages(updated);
                }
            });
            fp.browse();
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