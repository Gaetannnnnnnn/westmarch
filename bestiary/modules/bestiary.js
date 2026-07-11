// ============================================================
// bestiary.js — Bestiaire personnel par personnage
//
// Stockage : flag scope "ashara-bestiary" → "list" sur chaque acteur PJ
//            [ { id, targetId, targetName, targetImg,
//                hostility(-2→+2), note, firstScene } ]
// Interface : onglet "Bestiaire" sur la fiche personnage (PJ uniquement)
// Auto-det. : canvasReady / createToken / updateToken (GM only)
//             → acteurs du dossier "Creatures" (et sous-dossiers)
// © Soruta — module propriétaire Ashara, ne pas redistribuer.
// ============================================================

export const MODULE = "ashara-bestiary";

// ---- État de session ---------------------------------------

const _expanded  = new Set();   // IDs d'entrées dont les notes sont ouvertes
let   _noteTimer = null;        // Debounce auto-save notes
let   _scanning  = false;       // Guard anti-doublon scan

// ---- Niveaux d'hostilité (-2 → +2) -------------------------

const HOSTILITY_CFG = {
    "-2": { icon: "fa-skull",              color: "#8b0000", label: "Très hostile" },
    "-1": { icon: "fa-fire",               color: "#e74c3c", label: "Hostile"      },
     "0": { icon: "fa-question",           color: "#888888", label: "Inconnue"     },
     "1": { icon: "fa-eye",                color: "#a8d5a2", label: "Observée"     },
     "2": { icon: "fa-handshake",          color: "#27ae60", label: "Amicale"      },
};

function hostilityIcon(h) {
    const cfg = HOSTILITY_CFG[String(h ?? 0)] ?? HOSTILITY_CFG["0"];
    return `<i class="fas ${cfg.icon}" style="color:${cfg.color};" title="${cfg.label}"></i>`;
}

function hostilitySelector(current, canEdit) {
    const cur = HOSTILITY_CFG[String(current ?? 0)] ?? HOSTILITY_CFG["0"];
    if (!canEdit) return `<div class="bst-hostility">${hostilityIcon(current)}</div>`;
    const btns = Object.entries(HOSTILITY_CFG)
        .sort(([a],[b]) => parseInt(a) - parseInt(b))
        .map(([h, cfg]) => {
            const active = parseInt(h) === (current ?? 0);
            const col    = active ? `style="color:${cfg.color};"` : "";
            return `<a class="bst-h-btn${active ? " active" : ""}" data-hostility="${h}" title="${cfg.label}">
                <i class="fas ${cfg.icon}" ${col}></i>
            </a>`;
        }).join("");
    return `<div class="bst-hostility-selector">
        <span class="bst-h-label" style="color:${cur.color};">${cur.label}</span>
        ${btns}
    </div>`;
}

// ---- CRUD --------------------------------------------------

function beastList(actor) {
    return actor.getFlag(MODULE, "list") ?? [];
}

async function beastSave(actor, list) {
    await actor.update({ [`flags.${MODULE}.list`]: list }, { render: false });
}

async function beastUpdate(actor, id, patch) {
    await beastSave(actor, beastList(actor).map(e => e.id === id ? { ...e, ...patch } : e));
}

async function beastDelete(actor, id) {
    await beastSave(actor, beastList(actor).filter(e => e.id !== id));
}

// ---- Helpers dossiers --------------------------------------

function isInFolder(actor, folderName) {
    const root = game.folders.find(f => f.type === "Actor" && f.name === folderName);
    if (!root) return false;
    let f = actor.folder;
    while (f) {
        if (f.id === root.id) return true;
        f = f.folder;
    }
    return false;
}

// ---- HTML onglet -------------------------------------------

function emptyStateHtml() {
    return `<div class="bst-empty">
        <i class="fas fa-dragon"></i>
        <span>Aucune créature répertoriée.</span>
    </div>`;
}

function buildRowHtml(entry, actor, canEdit) {
    const target = game.actors.get(entry.targetId);
    const img    = target?.img  ?? entry.targetImg  ?? "icons/svg/mystery-man.svg";
    const name   = target?.name ?? entry.targetName ?? "Inconnue";
    const open   = _expanded.has(entry.id);

    return `
    <div class="bst-row" data-bst-id="${entry.id}">
        <div class="bst-row-header">
            <img class="bst-avatar" src="${img}" alt="${name}">
            <span class="bst-name">${name}</span>
            ${hostilitySelector(entry.hostility ?? 0, canEdit)}
            <div class="bst-btns">
                <a class="bst-toggle" title="Notes"><i class="fas fa-chevron-${open ? "up" : "down"}"></i></a>
                ${canEdit ? `<a class="bst-delete" title="Retirer du bestiaire"><i class="fas fa-trash"></i></a>` : ""}
            </div>
        </div>
        <div class="bst-notes"${open ? "" : ' style="display:none;"'}>
            <div class="bst-scene-row">
                <i class="fas fa-map-marker-alt"></i>
                <span class="bst-field-label">Première rencontre :</span>
                <span class="bst-scene-value">${entry.firstScene || "<em>Inconnue</em>"}</span>
            </div>
            ${canEdit ? `
            <textarea class="bst-note-input" data-bst-id="${entry.id}"
                placeholder="Notes sur cette créature…">${entry.note ?? ""}</textarea>
            ` : `
            <p class="bst-note-ro">${entry.note || "<em>Aucune note.</em>"}</p>
            `}
        </div>
    </div>`;
}

export function buildTabHtml(actor) {
    const isGM    = game.user.isGM;
    const canEdit = isGM || actor.isOwner;

    // Tri : plus hostile en premier, puis alphabétique
    const list = beastList(actor).slice().sort((a, b) => {
        const hDiff = (a.hostility ?? 0) - (b.hostility ?? 0);
        return hDiff !== 0 ? hDiff : (a.targetName ?? "").localeCompare(b.targetName ?? "");
    });

    // Styles inline — contournement cache CSS Foundry
    const S = {
        titleBar:  `display:flex;align-items:center;padding:8px 12px 6px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.07);`,
        title:     `display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#ccc;`,
        searchBar: `display:flex;align-items:center;gap:6px;padding:5px 10px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.06);`,
        wrap:      `flex:1;display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:4px;padding:4px 8px;`,
        srchIcon:  `color:#555;font-size:11px;flex-shrink:0;`,
        srchInput: `flex:1;background:transparent;border:none;box-shadow:none;outline:none;color:#bbb;font-size:11px;padding:0;min-width:0;font-family:inherit;`,
        clear:     `display:none;color:#444;font-size:10px;cursor:pointer;padding:2px 3px;`,
    };

    const rows = list.map(e => buildRowHtml(e, actor, canEdit)).join("");

    return `
    <div class="bst-tab" data-actor-id="${actor.id}">
        <div style="${S.titleBar}">
            <span style="${S.title}">
                <i class="fas fa-dragon" style="color:#e07b39;font-size:11px;"></i>
                Bestiaire
            </span>
        </div>
        <div style="${S.searchBar}">
            <div class="bst-search-wrap" style="${S.wrap}">
                <i class="fas fa-search" style="${S.srchIcon}"></i>
                <input class="bst-search-input" type="text"
                    placeholder="Rechercher une créature…" style="${S.srchInput}">
                <a class="bst-search-clear" style="${S.clear}" title="Effacer">
                    <i class="fas fa-times"></i>
                </a>
            </div>
        </div>
        <div class="bst-list">
            ${rows || emptyStateHtml()}
        </div>
    </div>`;
}

// ---- Événements de l'onglet --------------------------------

export function wireTab(actor, $html) {
    const $tab = $html.find(".bst-tab");
    if (!$tab.length) return;

    // Déplier / replier notes
    $tab.on("click", ".bst-toggle", function () {
        const $row   = $(this).closest(".bst-row");
        const id     = String($row.data("bst-id"));
        const $notes = $row.find(".bst-notes");
        const $icon  = $(this).find("i");
        if ($notes.is(":visible")) {
            _expanded.delete(id);
            $notes.slideUp(150);
            $icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
        } else {
            _expanded.add(id);
            $notes.slideDown(150);
            $icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
        }
    });

    // Changer l'hostilité (optimiste)
    $tab.on("click", ".bst-h-btn", async function () {
        const $btn = $(this);
        const id   = String($btn.closest(".bst-row").data("bst-id"));
        const h    = parseInt($btn.data("hostility"));
        const cfg  = HOSTILITY_CFG[String(h)];
        const $sel = $btn.closest(".bst-hostility-selector");
        $sel.find(".bst-h-btn").removeClass("active").find("i").css("color", "");
        $btn.addClass("active").find("i").css("color", cfg.color);
        $sel.find(".bst-h-label").text(cfg.label).css("color", cfg.color);
        await beastUpdate(actor, id, { hostility: h });
    });

    // Supprimer avec confirmation
    $tab.on("click", ".bst-delete", async function () {
        const $row  = $(this).closest(".bst-row");
        const id    = String($row.data("bst-id"));
        const entry = beastList(actor).find(e => e.id === id);
        if (!entry) return;
        const ok = await foundry.applications.api.DialogV2.confirm({
            window: { title: "Retirer du bestiaire" },
            content: `<p>Retirer <strong>${entry.targetName}</strong> du bestiaire ?<br>
                      <small style="color:#999;">Cette action est irréversible.</small></p>`,
        });
        if (!ok) return;
        _expanded.delete(id);
        $row.remove();
        await beastDelete(actor, id);
        if (!$tab.find(".bst-row").length) {
            $tab.find(".bst-list").html(emptyStateHtml());
        }
    });

    // Auto-save note (debounce + blur immédiat)
    $tab.on("input", ".bst-note-input", function () {
        clearTimeout(_noteTimer);
        const id  = String($(this).data("bst-id"));
        const val = this.value;
        _noteTimer = setTimeout(() => beastUpdate(actor, id, { note: val }), 1200);
    });
    $tab.on("blur", ".bst-note-input", async function () {
        clearTimeout(_noteTimer);
        await beastUpdate(actor, String($(this).data("bst-id")), { note: this.value });
    });

    // Recherche en temps réel
    $tab.on("input", ".bst-search-input", function () {
        const q = this.value.trim().toLowerCase();
        $tab.find(".bst-search-clear").toggle(!!q);
        let visible = 0;
        $tab.find(".bst-row").each(function () {
            const match = !q || $(this).find(".bst-name").text().toLowerCase().includes(q);
            $(this).toggle(match);
            if (match) visible++;
        });
        $tab.find(".bst-no-results").remove();
        if (q && $tab.find(".bst-row").length && !visible) {
            $tab.find(".bst-list").append(
                `<div class="bst-no-results bst-empty">
                    <i class="fas fa-search"></i>
                    <span>Aucune créature trouvée.</span>
                </div>`
            );
        }
    });

    $tab.on("click", ".bst-search-clear", function (e) {
        e.stopPropagation();
        $tab.find(".bst-search-input").val("").trigger("input");
    });
}

// ---- Détection automatique (GM only) -----------------------

async function scanVisibleTokens() {
    if (!game.user.isGM) return;
    if (!game.settings.get(MODULE, "enabled")) return;
    if (_scanning) return;
    _scanning = true;

    try {
        const tokens    = canvas.tokens?.placeables ?? [];
        const sceneName = game.scenes.current?.name ?? "";

        // PJ visibles (dans le dossier "PJ" et sous-dossiers)
        const pjActors = tokens
            .filter(t => !t.hidden && t.actor?.type === "character" && isInFolder(t.actor, "PJ"))
            .map(t => t.actor)
            .filter((a, i, arr) => arr.findIndex(b => b.id === a.id) === i);

        // Creatures visibles (dans le dossier "Creatures" et sous-dossiers)
        const creatures = tokens
            .filter(t => !t.hidden && t.actor && isInFolder(t.actor, "Creatures"))
            .map(t => t.actor)
            .filter((a, i, arr) => arr.findIndex(b => b.id === a.id) === i);

        if (!pjActors.length || !creatures.length) return;

        for (const pj of pjActors) {
            const existing = new Set(beastList(pj).map(e => e.targetId));
            const toAdd    = creatures.filter(c => !existing.has(c.id));
            if (!toAdd.length) continue;

            const newEntries = toAdd.map(c => ({
                id:         foundry.utils.randomID(12),
                targetId:   c.id,
                targetName: c.name,
                targetImg:  c.img ?? "",
                hostility:  0,
                note:       "",
                firstScene: sceneName,
            }));

            await pj.update(
                { [`flags.${MODULE}.list`]: [...beastList(pj), ...newEntries] },
                { render: false }
            );
        }
    } finally {
        _scanning = false;
    }
}

export function BestiaryHooks() {
    Hooks.on("canvasReady", () => scanVisibleTokens());
    Hooks.on("createToken", (tokenDoc) => { if (!tokenDoc.hidden) scanVisibleTokens(); });
    Hooks.on("updateToken", (tokenDoc, diff) => {
        if (Object.hasOwn(diff, "hidden") && diff.hidden === false) scanVisibleTokens();
    });
}
