// ============================================================
// fm-delete — Clic droit → Supprimer dans le FilePicker
//
// Module propriétaire — ne pas redistribuer.
// Auteur : Soruta (Discord : s0ruta)
//
// Ajoute un menu contextuel (clic droit) sur les fichiers du
// FilePicker Foundry. Visible uniquement par les GMs.
// Compatible Foundry v13 (ApplicationV2 + DialogV2).
// ============================================================

Hooks.once("init", () => {
    console.log("fm-delete | Chargé");
});

// ---- Hook rendu FilePicker ----
// renderFilePicker  : compatibilité v12 / début v13
// renderApplicationV2 : v13 complet (FilePicker étend ApplicationV2)
Hooks.on("renderFilePicker", (app, html) => _wire(app, html));

Hooks.on("renderApplicationV2", (app, html) => {
    if (app instanceof FilePicker) _wire(app, html);
});

// ============================================================
// Câblage du clic droit
// ============================================================

function _wire(app, html) {
    if (!game.user.isGM) return;

    // Normaliser en HTMLElement
    const root = html instanceof HTMLElement ? html : (html[0] ?? html);
    if (!root) return;

    // Éviter le double-câblage si les deux hooks déclenchent
    if (root._fmDeleteWired) return;
    root._fmDeleteWired = true;

    root.addEventListener("contextmenu", (e) => {
        // Trouver l'élément le plus proche avec data-path
        const fileEl = e.target.closest("[data-path]");
        if (!fileEl) return;

        const path = fileEl.dataset.path;
        if (!path) return;

        // Ignorer les dossiers (pas d'extension ou chemin terminant par "/")
        if (path.endsWith("/") || !path.match(/\.[^/]+$/)) return;

        e.preventDefault();
        e.stopPropagation();

        _showMenu(e, app, path);
    }, true); // capture pour intercepter avant les handlers Foundry
}

// ============================================================
// Menu contextuel
// ============================================================

function _showMenu(event, app, path) {
    // Fermer tout menu existant
    document.querySelectorAll(".fm-delete-menu").forEach(el => el.remove());

    const filename = path.split("/").pop();

    const menu = document.createElement("div");
    menu.className = "fm-delete-menu";
    menu.style.cssText = `
        position: fixed;
        z-index: 99999;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        background: #1a1a1a;
        border: 1px solid #444;
        border-radius: 4px;
        padding: 4px 0;
        min-width: 160px;
        box-shadow: 2px 4px 12px rgba(0,0,0,0.6);
        font-family: inherit;
        font-size: 0.9em;
    `;

    const item = document.createElement("div");
    item.className = "fm-delete-item";
    item.style.cssText = `
        padding: 7px 14px;
        cursor: pointer;
        color: #e74c3c;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    item.innerHTML = `<i class="fas fa-trash-alt" style="width:14px;"></i> Supprimer`;

    item.addEventListener("mouseenter", () => item.style.background = "rgba(231,76,60,0.18)");
    item.addEventListener("mouseleave", () => item.style.background = "");

    item.addEventListener("click", async () => {
        menu.remove();
        _cleanup();
        await _deleteFile(app, path, filename);
    });

    menu.appendChild(item);
    document.body.appendChild(menu);

    // Fermeture sur clic extérieur ou Escape
    function onOutsideClick(e) {
        if (!menu.contains(e.target)) { menu.remove(); _cleanup(); }
    }
    function onEsc(e) {
        if (e.key === "Escape") { menu.remove(); _cleanup(); }
    }
    function _cleanup() {
        document.removeEventListener("click", onOutsideClick, true);
        document.removeEventListener("keydown", onEsc);
    }

    // Délai pour éviter que le mouseup du clic droit ferme immédiatement
    setTimeout(() => {
        document.addEventListener("click", onOutsideClick, true);
        document.addEventListener("keydown", onEsc);
    }, 50);
}

// ============================================================
// Suppression
// ============================================================

async function _deleteFile(app, path, filename) {
    // Confirmation via DialogV2 (v13)
    const DlgV2 = foundry.applications?.api?.DialogV2 ?? DialogV2;
    const result = await DlgV2.wait({
        window: { title: "Supprimer le fichier" },
        content: `
            <p>Supprimer <strong>${filename}</strong> ?</p>
            <p style="color:#e74c3c; font-size:0.85em; margin-top:4px;">
                ⚠️ Cette action est irréversible.
            </p>`,
        rejectClose: false,
        buttons: [
            {
                action: "confirm",
                label: "Supprimer",
                icon: '<i class="fas fa-trash-alt"></i>',
                default: false
            },
            {
                action: "cancel",
                label: "Annuler",
                icon: '<i class="fas fa-times"></i>',
                default: true
            }
        ]
    });

    if (result !== "confirm") return;

    try {
        // FilePicker.delete(source, path, options) — API Foundry v10+
        const source = app.activeSource ?? app.source ?? "data";
        const bucket = app.request?.bucket ?? app.options?.bucket ?? null;
        await FilePicker.delete(source, path, { bucket });

        ui.notifications.info(`fm-delete | Supprimé : ${filename}`);

        // Rafraîchir le FilePicker
        const target = app.result?.target ?? app.request?.target ?? app.options?.current ?? "";
        if (typeof app.browse === "function") await app.browse(target);
        else app.render(true);

    } catch (err) {
        console.error("fm-delete |", err);
        ui.notifications.error(`fm-delete | Erreur : ${err.message ?? String(err)}`);
    }
}
