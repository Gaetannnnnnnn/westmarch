// ============================================================
// relations.js — Système de relations entre acteurs
//
// Stockage  : flag scope "ashara-relations" → "list" sur chaque acteur
//             [ { id, targetId, targetName, targetImg,
//                 type, level(-3→+3), note, lastPosition, secret } ]
// Interface : onglet "Relations" injecté dans la fiche acteur
// Auto-det. : canvasReady / createToken / updateToken (GM only)
// © Soruta — module propriétaire Ashara, ne pas redistribuer.
// ============================================================

const MODULE = "ashara-relations";

// ---- État de session ---------------------------------------

const _expanded   = new Set();  // IDs de relations dont les notes sont ouvertes
const _activeActs = new Set();  // IDs d'acteurs avec le tab Relations actif
let   _noteTimer  = null;       // Debounce auto-save notes
let   _scanning   = false;      // Guard anti-doublon scan

// ---- Icônes de niveau (-3 → +3) ----------------------------

const LEVEL_CFG = {
    "-3": { icon: "fa-skull",       color: "#8b0000", label: "Haine totale" },
    "-2": { icon: "fa-fire",        color: "#e74c3c", label: "Hostilité"    },
    "-1": { icon: "fa-thumbs-down", color: "#e67e22", label: "Méfiance"     },
     "0": { icon: "fa-minus",       color: "#888888", label: "Neutre"       },
     "1": { icon: "fa-thumbs-up",   color: "#a8d5a2", label: "Sympathie"    },
     "2": { icon: "fa-star",        color: "#27ae60", label: "Amitié"       },
     "3": { icon: "fa-heart",       color: "#e91e8c", label: "Loyauté"      },
};

function levelIcon(level) {
    const cfg = LEVEL_CFG[String(level ?? 0)] ?? LEVEL_CFG["0"];
    return `<i class="fas ${cfg.icon} rel-level-icon" style="color:${cfg.color};" title="${cfg.label} (${level > 0 ? "+" : ""}${level ?? 0})"></i>`;
}

function levelSelector(currentLevel, canEdit) {
    const cur = LEVEL_CFG[String(currentLevel ?? 0)] ?? LEVEL_CFG["0"];
    if (!canEdit) return `<div class="rel-level">${levelIcon(currentLevel)}</div>`;
    const btns = Object.entries(LEVEL_CFG).map(([lvl, cfg]) => {
        const active  = parseInt(lvl) === (currentLevel ?? 0);
        const color   = active ? `style="color:${cfg.color};"` : "";
        const classes = `rel-level-btn${active ? " active" : ""}`;
        return `<a class="${classes}" data-level="${lvl}" title="${cfg.label}">
            <i class="fas ${cfg.icon}" ${color}></i>
        </a>`;
    }).join("");
    return `<div class="rel-level-selector">
        <span class="rel-level-label" style="color:${cur.color};">${cur.label}</span>
        ${btns}
    </div>`;
}

// ---- CRUD --------------------------------------------------

function relList(actor) {
    return actor.getFlag(MODULE, "list") ?? [];
}

async function relSave(actor, list) {
    await actor.setFlag(MODULE, "list", list);
}

async function relAdd(actor, data) {
    const list = relList(actor);
    if (list.some(r => r.targetId === data.targetId)) return; // doublon
    list.push({ id: foundry.utils.randomID(12), note: "", lastPosition: "", secret: false, ...data });
    await relSave(actor, list);
}

async function relUpdate(actor, id, patch) {
    await relSave(actor, relList(actor).map(r => r.id === id ? { ...r, ...patch } : r));
}

async function relDelete(actor, id) {
    await relSave(actor, relList(actor).filter(r => r.id !== id));
}

// ---- Helpers acteurs ---------------------------------------

function isInPJFolder(actor) {
    const pjFolder = game.folders.find(f => f.type === "Actor" && f.name === "PJ");
    return !!pjFolder && actor.folder?.id === pjFolder.id;
}

// Acteurs character disponibles pour une nouvelle relation
// (type character uniquement, excluant soi-même et les déjà-liés)
function availableActors(actor) {
    const existing = new Set(relList(actor).map(r => r.targetId));
    return game.actors
        .filter(a => a.type === "character" && a.id !== actor.id && !existing.has(a.id))
        .sort((a, b) => a.name.localeCompare(b.name));
}

// ---- HTML onglet -------------------------------------------

function buildTabHtml(actor) {
    const isGM    = game.user.isGM;
    const canEdit = isGM || actor.isOwner;
    const rels    = relList(actor).filter(r => !r.secret || isGM);

    const rows = rels.map(r => {
        const target = game.actors.get(r.targetId);
        const img    = target?.img  ?? r.targetImg  ?? "icons/svg/mystery-man.svg";
        const name   = target?.name ?? r.targetName ?? "Inconnu";
        const open   = _expanded.has(r.id);

        return `
        <div class="rel-row" data-rel-id="${r.id}">
            <div class="rel-header">
                <img class="rel-avatar" src="${img}" alt="${name}">
                <span class="rel-name">${name}</span>
                <span class="rel-type">${r.type ?? ""}</span>
                ${levelSelector(r.level ?? 0, canEdit)}
                ${r.secret ? '<i class="fas fa-eye-slash rel-secret" title="GM uniquement"></i>' : ""}
                <div class="rel-btns">
                    <a class="rel-toggle" title="Notes"><i class="fas fa-chevron-${open ? "up" : "down"}"></i></a>
                    ${canEdit ? `<a class="rel-delete" title="Supprimer"><i class="fas fa-trash"></i></a>` : ""}
                </div>
            </div>
            <div class="rel-notes"${open ? "" : ' style="display:none;"'}>
                ${canEdit ? `
                <div class="rel-lastpos-row">
                    <label class="rel-field-label"><i class="fas fa-map-marker-alt"></i> Dernière position</label>
                    <input class="rel-lastpos-input" type="text" data-rel-id="${r.id}"
                        value="${r.lastPosition ?? ""}" placeholder="Scène, lieu…">
                </div>
                <textarea class="rel-note-input" data-rel-id="${r.id}"
                    placeholder="Notes sur cette relation…">${r.note ?? ""}</textarea>
                ` : `
                <div class="rel-lastpos-row rel-readonly">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${r.lastPosition || "<em>Position inconnue</em>"}</span>
                </div>
                <p class="rel-note-ro">${r.note || "<em>Aucune note.</em>"}</p>
                `}
            </div>
        </div>`;
    }).join("");

    const emptyState = `
        <div class="rel-empty">
            <i class="fas fa-heart-broken"></i>
            <span>Aucune relation enregistrée.</span>
            ${canEdit ? `<a class="rel-add-btn" style="margin-top:4px;">
                <i class="fas fa-plus"></i> Ajouter une relation
            </a>` : ""}
        </div>`;

    return `
    <div class="rel-tab" data-actor-id="${actor.id}">
        ${canEdit ? `
        <div class="rel-header-bar">
            <h3><i class="fas fa-heart" style="color:#e91e8c;margin-right:6px;"></i>Relations</h3>
            <a class="rel-add-btn"><i class="fas fa-plus"></i> Ajouter</a>
        </div>` : `
        <div class="rel-header-bar">
            <h3><i class="fas fa-heart" style="color:#e91e8c;margin-right:6px;"></i>Relations</h3>
        </div>`}
        <div class="rel-list">
            ${rows || emptyState}
        </div>
    </div>`;
}

// ---- Picker acteur (dialog ajout) --------------------------

function buildPickerHtml(pj, uid) {
    const actors = availableActors(pj);
    const joueurs = actors.filter(a => isInPJFolder(a));
    const pnjs    = actors.filter(a => !isInPJFolder(a));

    function actorRow(a) {
        return `<div class="rel-picker-actor" data-actor-id="${a.id}" data-name="${a.name.toLowerCase()}">
            <img src="${a.img ?? "icons/svg/mystery-man.svg"}" alt="${a.name}">
            <span>${a.name}</span>
        </div>`;
    }

    function section(title, list, key) {
        if (!list.length) return "";
        return `
        <div class="rel-picker-section">
            <div class="rel-picker-section-hdr" data-key="${key}">
                <i class="fas fa-chevron-down"></i>
                <span>${title}</span>
                <small>(${list.length})</small>
            </div>
            <div class="rel-picker-section-body" data-key="${key}">
                ${list.map(actorRow).join("")}
            </div>
        </div>`;
    }

    return `
    <div id="${uid}" style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">
        <input class="rel-picker-search" type="text" placeholder="🔍 Rechercher un personnage…"
            style="width:100%;box-sizing:border-box;padding:5px 8px;
                   border:1px solid #555;border-radius:4px;background:#111;color:#ddd;font-size:12px;">
        <div class="rel-picker-list">
            ${section("Joueurs", joueurs, "pj")}
            ${section("PNJ",     pnjs,    "pnj")}
            ${!joueurs.length && !pnjs.length
                ? '<p style="color:#666;font-style:italic;font-size:12px;text-align:center;padding:12px 0;">Aucun personnage disponible.</p>'
                : ""}
        </div>
        <hr style="border-color:#333;margin:0;">
        <label style="font-size:12px;color:#aaa;">Type de relation
            <input id="${uid}-type" type="text" placeholder="Allié, Ennemi, Famille…"
                style="margin-top:4px;display:block;width:100%;box-sizing:border-box;
                    background:#1a1a1a;color:#ddd;border:1px solid #555;
                    border-radius:4px;padding:5px 8px;font-size:12px;">
        </label>
        <label style="font-size:12px;color:#aaa;">Niveau d'affinité
            <div style="display:flex;align-items:center;gap:10px;margin-top:6px;">
                <span style="font-size:11px;color:#e74c3c;flex-shrink:0;">Hostile</span>
                <input id="${uid}-level" type="range" min="-3" max="3" step="1" value="0" style="flex:1;">
                <span style="font-size:11px;color:#4caf50;flex-shrink:0;">Allié</span>
                <span id="${uid}-lvlval" style="min-width:28px;text-align:center;
                    font-size:14px;font-weight:bold;color:#ddd;">0</span>
            </div>
        </label>
        <label style="font-size:12px;color:#aaa;display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input id="${uid}-secret" type="checkbox"> Secret (GM uniquement)
        </label>
    </div>`;
}

async function openAddDialog(actor) {
    const uid = `rel-add-${Date.now()}`;
    let selectedActorId = null;
    let result = null;

    await foundry.applications.api.DialogV2.wait({
        window: { title: "Nouvelle relation" },
        position: { width: 400 },
        rejectClose: false,
        content: buildPickerHtml(actor, uid),
        render: () => {
            const d = document.getElementById(uid);
            if (!d) return;

            // Sélection d'un acteur
            d.querySelectorAll(".rel-picker-actor").forEach(el => {
                el.addEventListener("click", () => {
                    d.querySelectorAll(".rel-picker-actor").forEach(e => e.classList.remove("selected"));
                    el.classList.add("selected");
                    selectedActorId = el.dataset.actorId;
                });
            });

            // Déplier / replier sections
            d.querySelectorAll(".rel-picker-section-hdr").forEach(hdr => {
                hdr.addEventListener("click", () => {
                    const key  = hdr.dataset.key;
                    const body = d.querySelector(`.rel-picker-section-body[data-key="${key}"]`);
                    const icon = hdr.querySelector("i");
                    const open = body.style.display !== "none";
                    body.style.display = open ? "none" : "";
                    icon.classList.toggle("fa-chevron-down", open);
                    icon.classList.toggle("fa-chevron-up",  !open);
                });
            });

            // Recherche
            d.querySelector(".rel-picker-search").addEventListener("input", function () {
                const q = this.value.trim().toLowerCase();
                d.querySelectorAll(".rel-picker-actor").forEach(el => {
                    const match = !q || el.dataset.name.includes(q);
                    el.style.display = match ? "" : "none";
                });
                // Afficher les sections qui ont encore des résultats visibles
                d.querySelectorAll(".rel-picker-section").forEach(sec => {
                    const anyVisible = [...sec.querySelectorAll(".rel-picker-actor")]
                        .some(e => e.style.display !== "none");
                    sec.style.display = anyVisible ? "" : "none";
                });
            });

            // Slider niveau
            const slider = d.querySelector(`#${uid}-level`);
            const lvlVal = d.querySelector(`#${uid}-lvlval`);
            slider.addEventListener("input", () => {
                const v = parseInt(slider.value);
                lvlVal.textContent = (v > 0 ? "+" : "") + v;
            });

            setTimeout(() => d.querySelector(".rel-picker-search")?.focus(), 60);
        },
        buttons: [
            {
                action: "confirm", default: true,
                label: "Ajouter", icon: '<i class="fas fa-check"></i>',
                callback: () => {
                    if (!selectedActorId) return;
                    const d = document.getElementById(uid);
                    if (!d) return;
                    const target = game.actors.get(selectedActorId);
                    result = {
                        targetId:   selectedActorId,
                        targetName: target?.name ?? "Inconnu",
                        targetImg:  target?.img  ?? "",
                        type:   d.querySelector(`#${uid}-type`).value.trim(),
                        level:  parseInt(d.querySelector(`#${uid}-level`).value) || 0,
                        secret: d.querySelector(`#${uid}-secret`).checked,
                        lastPosition: game.scenes.current?.name ?? "",
                    };
                }
            },
            { action: "cancel", label: "Annuler", icon: '<i class="fas fa-times"></i>', callback: () => {} }
        ]
    });

    return result;
}

// ---- Dialog modification -----------------------------------

async function openEditDialog(actor, rel) {
    const uid = `rel-edit-${Date.now()}`;
    let result = null;

    await foundry.applications.api.DialogV2.wait({
        window: { title: `Modifier — ${rel.targetName}` },
        position: { width: 360 },
        rejectClose: false,
        content: `
        <div id="${uid}" style="display:flex;flex-direction:column;gap:12px;padding:4px 0;">
            <div style="display:flex;align-items:center;gap:10px;padding:6px 8px;
                background:#1a1a1a;border-radius:6px;border:1px solid #333;">
                <img src="${rel.targetImg || "icons/svg/mystery-man.svg"}"
                    style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #444;">
                <strong style="font-size:13px;">${rel.targetName}</strong>
            </div>
            <label style="font-size:12px;color:#aaa;">Type de relation
                <input id="${uid}-type" type="text" value="${rel.type ?? ""}"
                    placeholder="Allié, Ennemi, Famille…"
                    style="margin-top:4px;display:block;width:100%;box-sizing:border-box;
                        background:#1a1a1a;color:#ddd;border:1px solid #555;
                        border-radius:4px;padding:5px 8px;font-size:12px;">
            </label>
            <label style="font-size:12px;color:#aaa;">Niveau d'affinité
                <div style="display:flex;align-items:center;gap:10px;margin-top:6px;">
                    <span style="font-size:11px;color:#e74c3c;flex-shrink:0;">Hostile</span>
                    <input id="${uid}-level" type="range" min="-3" max="3" step="1"
                        value="${rel.level ?? 0}" style="flex:1;">
                    <span style="font-size:11px;color:#4caf50;flex-shrink:0;">Allié</span>
                    <span id="${uid}-lvlval" style="min-width:28px;text-align:center;
                        font-size:14px;font-weight:bold;color:#ddd;">
                        ${(rel.level ?? 0) > 0 ? "+" : ""}${rel.level ?? 0}
                    </span>
                </div>
            </label>
            <label style="font-size:12px;color:#aaa;display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input id="${uid}-secret" type="checkbox"${rel.secret ? " checked" : ""}> Secret (GM uniquement)
            </label>
        </div>`,
        render: () => {
            const d = document.getElementById(uid);
            if (!d) return;
            d.querySelector(`#${uid}-level`).addEventListener("input", function () {
                const v = parseInt(this.value);
                d.querySelector(`#${uid}-lvlval`).textContent = (v > 0 ? "+" : "") + v;
            });
        },
        buttons: [
            {
                action: "confirm", default: true,
                label: "Modifier", icon: '<i class="fas fa-check"></i>',
                callback: () => {
                    const d = document.getElementById(uid);
                    if (!d) return;
                    result = {
                        type:   d.querySelector(`#${uid}-type`).value.trim(),
                        level:  parseInt(d.querySelector(`#${uid}-level`).value) || 0,
                        secret: d.querySelector(`#${uid}-secret`).checked,
                    };
                }
            },
            { action: "cancel", label: "Annuler", icon: '<i class="fas fa-times"></i>', callback: () => {} }
        ]
    });

    return result;
}

// ---- Événements de l'onglet --------------------------------

function wireTab(actor, $html) {
    const $tab = $html.find(".rel-tab");
    if (!$tab.length) return;

    // Ajouter
    $tab.on("click", ".rel-add-btn", async () => {
        const data = await openAddDialog(actor);
        if (!data) return;
        await relAdd(actor, data);
    });

    // Déplier / replier notes
    $tab.on("click", ".rel-toggle", function () {
        const $row   = $(this).closest(".rel-row");
        const relId  = String($row.data("rel-id"));
        const $notes = $row.find(".rel-notes");
        const $icon  = $(this).find("i");
        if ($notes.is(":visible")) {
            _expanded.delete(relId);
            $notes.slideUp(150);
            $icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
        } else {
            _expanded.add(relId);
            $notes.slideDown(150);
            $icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
        }
    });

    // Changer le niveau directement depuis les icônes inline
    $tab.on("click", ".rel-level-btn", async function () {
        const $btn  = $(this);
        const relId = String($btn.closest(".rel-row").data("rel-id"));
        const level = parseInt($btn.data("level"));
        const cfg   = LEVEL_CFG[String(level)];
        // Mise à jour optimiste du DOM (évite le flash avant re-render)
        const $sel  = $btn.closest(".rel-level-selector");
        $sel.find(".rel-level-btn").removeClass("active").find("i").css("color", "");
        $btn.addClass("active").find("i").css("color", cfg.color);
        $sel.find(".rel-level-label").text(cfg.label).css("color", cfg.color);
        await relUpdate(actor, relId, { level });
    });

    // Supprimer
    $tab.on("click", ".rel-delete", async function () {
        const relId = String($(this).closest(".rel-row").data("rel-id"));
        const rel   = relList(actor).find(r => r.id === relId);
        if (!rel) return;
        const ok = await foundry.applications.api.DialogV2.confirm({
            window: { title: "Supprimer la relation" },
            content: `<p>Supprimer la relation avec <strong>${rel.targetName}</strong> ?<br>
                      <small style="color:#999;">Cette action est irréversible.</small></p>`,
        });
        if (!ok) return;
        _expanded.delete(relId);
        await relDelete(actor, relId);
    });

    // Auto-save dernière position
    $tab.on("blur", ".rel-lastpos-input", async function () {
        const relId = String($(this).data("rel-id"));
        await relUpdate(actor, relId, { lastPosition: this.value.trim() });
    });

    // Auto-save note (debounce + blur immédiat)
    $tab.on("input", ".rel-note-input", function () {
        clearTimeout(_noteTimer);
        const relId = String($(this).data("rel-id"));
        const val   = this.value;
        _noteTimer  = setTimeout(() => relUpdate(actor, relId, { note: val }), 1200);
    });

    $tab.on("blur", ".rel-note-input", async function () {
        clearTimeout(_noteTimer);
        const relId = String($(this).data("rel-id"));
        await relUpdate(actor, relId, { note: this.value });
    });
}

// ---- Injection de l'onglet ---------------------------------

function injectTab(app, html) {
    // En dnd5e v3 / Foundry v13 : l'acteur est dans app.document ou app.object
    const actor = app.actor ?? app.document ?? app.object;
    if (!actor || actor.documentName !== "Actor") return;
    if (!game.settings.get(MODULE, "enabled")) return;
    if (actor.type !== "character") return;

    const $html = $(html);
    if ($html.find('[data-tab="ashara-relations"]').length) return;

    const $nav  = $html.find("nav.tabs, nav.sheet-navigation, .tabs[data-group]").first();
    const $body = $html.find(".tab-body, section.tab-body, .sheet-body, section.sheet-body").first();
    if (!$nav.length || !$body.length) return;

    const wasActive = _activeActs.has(actor.id);

    // --- Helper : activer notre panneau (réutilisé au clic ET au re-render) ---
    const activateOurs = () => {
        $body.find('.tab[data-group="primary"]:not([data-tab="ashara-relations"])')
             .css("display", "none");
        $nav.find(".item").removeClass("active");
        $panel.css("display", "flex");
        $nav.find('.item[data-tab="ashara-relations"]').addClass("active");
    };

    // --- Bouton nav ---
    $nav.append(`
        <a class="item control${wasActive ? " active" : ""}" role="tab"
           data-group="primary" data-tab="ashara-relations"
           data-tooltip="Relations" aria-label="Relations">
            <i class="fas fa-heart"></i>
        </a>`);

    // --- Panneau de contenu ---
    const $panel = $(`<div class="tab" data-group="primary" data-tab="ashara-relations"
        style="display:none;flex-direction:column;height:100%;overflow:hidden;box-sizing:border-box;">
        ${buildTabHtml(actor)}
    </div>`);

    // Insérer après le dernier tab existant (même container)
    const $last = $body.find('.tab[data-group="primary"]').last();
    if ($last.length) $last.after($panel);
    else              $body.append($panel);

    // --- Si Relations était actif, restaurer après l'init des tabs dnd5e ---
    if (wasActive) {
        setTimeout(activateOurs, 0);
    }

    // --- Clic sur notre tab ---
    $html.find('.item[data-tab="ashara-relations"]').on("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        _activeActs.add(actor.id);
        activateOurs();
    });

    // --- Clic sur un autre tab — cacher le nôtre et libérer les autres ---
    $nav.find(".item:not([data-tab='ashara-relations'])").on("click", function () {
        _activeActs.delete(actor.id);
        $panel.css("display", "none");
        $body.find('.tab[data-group="primary"]:not([data-tab="ashara-relations"])')
             .css("display", "");
        // dnd5e gère le reste
    });

    wireTab(actor, $html);
}

// ---- Détection automatique (GM only) -----------------------

async function scanVisibleTokens() {
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE, "enabled")) return;
    if (_scanning) return;
    _scanning = true;

    try {
        const tokens = canvas.tokens?.placeables ?? [];

        // Tous les personnages visibles et non-cachés sur la scène
        const visibleChars = tokens
            .filter(t => !t.hidden && t.actor?.type === "character" && t.actor.id)
            .map(t => t.actor)
            .filter((a, i, arr) => arr.findIndex(b => b.id === a.id) === i); // dédupe

        const sceneName = game.scenes.current?.name ?? "";

        for (const actor of visibleChars) {
            const existing  = new Set(relList(actor).map(r => r.targetId));
            const toAdd     = visibleChars.filter(other =>
                other.id !== actor.id && !existing.has(other.id)
            );
            if (!toAdd.length) continue;

            const newRels = toAdd.map(other => ({
                id:           foundry.utils.randomID(12),
                targetId:     other.id,
                targetName:   other.name,
                targetImg:    other.img ?? "",
                type:         "",
                level:        0,
                note:         "",
                lastPosition: sceneName,
                secret:       false,
            }));

            const list = relList(actor);
            await actor.setFlag(MODULE, "list", [...list, ...newRels]);
        }
    } finally {
        _scanning = false;
    }
}

// ---- Export ------------------------------------------------

export function RelationsHooks() {
    // Injection de l'onglet (ApplicationV2 en v13 + fallback v1)
    Hooks.on("renderApplicationV2", injectTab);
    Hooks.on("renderApplication",   injectTab);

    // Détection automatique — chargement de scène
    Hooks.on("canvasReady", () => scanVisibleTokens());

    // Détection — nouveau token posé (non caché)
    Hooks.on("createToken", (tokenDoc) => {
        if (!tokenDoc.hidden) scanVisibleTokens();
    });

    // Détection — token devient visible (hidden false → true inversé)
    Hooks.on("updateToken", (tokenDoc, diff) => {
        if (Object.hasOwn(diff, "hidden") && diff.hidden === false) {
            scanVisibleTokens();
        }
    });
}
