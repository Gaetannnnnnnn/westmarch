export function TokenHooks() {

    // ============================================================
    // SECTION : Bouton "Image suivante" dans le HUD du token
    // - Tout le monde peut cycler sur son propre token
    // - Nécessite que des images aient été configurées par un GM
    // ============================================================
    Hooks.on("renderTokenHUD", (hud, html, data) => {
        if (!game.settings.get("westmarch", "enableTokenAppearance")) return;
        const token = hud.object;
        if (!token) return;

        // Vérifier que l'utilisateur contrôle ce token
        const actor = token.actor;
        if (!actor) return;
        if (!game.user.isGM && !actor.isOwner) return;

        // Récupérer la liste d'images stockée sur le token
        const images = token.document.getFlag("westmarch", "images");
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
    // SECTION : Gestion de la liste d'images dans la config du token
    // - GM uniquement
    // - Accessible via clic droit sur le token → Configuration
    // ============================================================
    Hooks.on("renderTokenConfig", (app, html, data) => {
        if (!game.settings.get("westmarch", "enableTokenAppearance")) return;
        if (!game.user.isGM) return;

        const token = app.object;
        const images = token.getFlag("westmarch", "images") ?? [];

        // Construire l'UI de gestion des images
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

        // Afficher les images existantes
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

        // Bouton ajouter une image
        section.find(".westmarch-add-image").click(() => {
            const fp = new FilePicker({
                type: "image",
                callback: async (path) => {
                    const current = token.getFlag("westmarch", "images") ?? [];
                    if (current.includes(path)) {
                        ui.notifications.warn("Cette image est déjà dans la liste.");
                        return;
                    }
                    const updated = [...current, path];
                    await token.setFlag("westmarch", "images", updated);
                    renderImages(updated);
                }
            });
            fp.browse();
        });

        // Bouton supprimer une image
        section.on("click", ".westmarch-remove-image", async (ev) => {
            const index = parseInt($(ev.currentTarget).data("index"));
            const current = token.getFlag("westmarch", "images") ?? [];
            current.splice(index, 1);
            await token.setFlag("westmarch", "images", [...current]);
            renderImages(current);
        });

        // Injecter dans la config du token
        $(html).find(".tab[data-tab='appearance']").append(section);
    });
}