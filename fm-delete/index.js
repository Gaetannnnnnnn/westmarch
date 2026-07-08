// ============================================================
// fm-delete — Clic droit → Supprimer dans le FilePicker
//
// Module propriétaire — ne pas redistribuer.
// Auteur : Soruta (Discord : s0ruta)
//
// Ajoute un menu contextuel (clic droit) sur les fichiers du
// FilePicker Foundry. Visible uniquement par les GMs.
// Compatible Foundry v13 (ApplicationV2 + DialogV2).
//
// Note v13 : FilePicker est maintenant sous
//   foundry.applications.apps.FilePicker
// La suppression n'a pas de méthode statique dédiée → on appelle
// directement l'endpoint serveur /files/.
// ============================================================

Hooks.once("init", () => {
    console.log("fm-delete | Chargé");
});

// Raccourci v13 — évite d'accéder au global déprécié FilePicker
function _getFP() {
    return foundry.applications?.apps?.FilePicker ?? window.FilePicker;
}

// ---- Hook rendu FilePicker ----
// renderFilePicker  : compatibilité v12 / début v13
// renderApplicationV2 : v13 complet (FilePicker étend ApplicationV2)
Hooks.on("renderFilePicker", (app, html) => _wire(app, html));

Hooks.on("renderApplicationV2", (app, html) => {
    const FP = _getFP();
    if (FP && app instanceof FP) _wire(app, html);
});

// ============================================================
// Câblage du clic droit
// ============================================================

function _wire(app, html) {
    if (!game.user.isGM) return;

    const root = html instanceof HTMLElement ? html : (html[0] ?? html);
    if (!root) return;

    if (root._fmDeleteWired) return;
    root._fmDeleteWired = true;

    root.addEventListener("contextmenu", (e) => {
        const fileEl = e.target.closest("[data-path]");
        if (!fileEl) return;

        const path = fileEl.dataset.path;
        if (!path) return;

        // Ignorer les dossiers
        if (path.endsWith("/") || !path.match(/\.[^/]+$/)) return;

        e.preventDefault();
        e.stopPropagation();

        _showMenu(e, app, path);
    }, true);
}

// ============================================================
// Menu contextuel
// ============================================================

function _showMenu(event, app, path) {
    document.querySelectorAll(".fm-delete-menu").forEach(el => el.remove());

    const filename = path.split("/").pop();

    const menu = document.createElement("div");
    menu.className = "fm-delete-menu";
    Object.assign(menu.style, {
        position:  "fixed",
        zIndex:    "99999",
        left:      `${event.clientX}px`,
        top:       `${event.clientY}px`,
        background:"#1a1a1a",
        border:    "1px solid #444",
        borderRadius: "4px",
        padding:   "4px 0",
        minWidth:  "160px",
        boxShadow: "2px 4px 12px rgba(0,0,0,0.6)",
        fontFamily:"inherit",
        fontSize:  "0.9em"
    });

    const item = document.createElement("div");
    item.className = "fm-delete-item";
    Object.assign(item.style, {
        padding:    "7px 14px",
        cursor:     "pointer",
        color:      "#e74c3c",
        display:    "flex",
        alignItems: "center",
        gap:        "8px"
    });
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

    function onOutside(e) { if (!menu.contains(e.target)) { menu.remove(); _cleanup(); } }
    function onEsc(e)     { if (e.key === "Escape")        { menu.remove(); _cleanup(); } }
    function _cleanup() {
        document.removeEventListener("click", onOutside, true);
        document.removeEventListener("keydown", onEsc);
    }

    setTimeout(() => {
        document.addEventListener("click", onOutside, true);
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
        content: `<p>Supprimer <strong>${filename}</strong> ?</p>
                  <p style="color:#e74c3c; font-size:0.85em; margin-top:4px;">
                      ⚠️ Cette action est irréversible.
                  </p>`,
        rejectClose: false,
        buttons: [
            {
                action:  "confirm",
                label:   "Supprimer",
                icon:    '<i class="fas fa-trash-alt"></i>',
                default: false
            },
            {
                action:  "cancel",
                label:   "Annuler",
                icon:    '<i class="fas fa-times"></i>',
                default: true
            }
        ]
    });

    if (result !== "confirm") return;

    try {
        const source = app.activeSource ?? app.source ?? "data";
        const bucket = app.request?.bucket ?? app.options?.bucket ?? null;

        await _serverDelete(source, path, bucket);

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

// ============================================================
// Appel serveur Foundry pour la suppression
//
// v13 ne fournit pas FilePicker.delete() → on appelle directement
// l'endpoint /files/ avec l'action "deleteFile".
// Fondry's server Express handler accepte ce format.
// ============================================================

async function _serverDelete(source, path, bucket) {
    // Méthode 1 : API statique si elle existe sur la classe v13
    const FP = _getFP();
    if (FP && typeof FP.delete === "function") {
        return FP.delete(source, path, { bucket });
    }

    // Méthode 2 : endpoint serveur /files/ via FormData
    const filesUrl = foundry.utils?.getRoute?.("files") ?? "/files/";

    const fd = new FormData();
    fd.set("action", "deleteFile");
    fd.set("source", source);
    fd.set("target", path);
    if (bucket) fd.set("bucket", bucket);

    const resp = await fetch(filesUrl, { method: "POST", body: fd });

    if (!resp.ok) {
        let msg = `HTTP ${resp.status}`;
        try { const j = await resp.json(); msg = j.message ?? j.error ?? msg; } catch(_) {}
        throw new Error(msg);
    }

    // Méthode 3 : si le serveur répond avec une erreur dans le JSON
    let json = {};
    try { json = await resp.json(); } catch(_) {}
    if (json.error) throw new Error(json.error);
}
