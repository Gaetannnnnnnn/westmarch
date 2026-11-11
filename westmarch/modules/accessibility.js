// ============================================================
// accessibility.js — Accessibilité (Soruta — WestMarch Système)
//
// Réglages PERSONNELS (scope client) : chaque joueur règle les siens dans
// la fenêtre « Accessibilité » des réglages du module (visible par tous).
//
//   1. Daltonisme — filtre de CORRECTION des couleurs (daltonisation) sur la
//      carte (filtre PIXI) et sur l'interface (filtre SVG) : protanopie,
//      deutéranopie, tritanopie.
//   2. Fort contraste — texte, bordures et fonds renforcés, avec une couleur
//      de contour au choix (jaune par défaut).
//   3. Contrôles compacts — icônes de la barre d'outils de gauche réduites.
//
// Mêmes réglages que dans Soruta — Completed Westmarch (classes CSS propres
// à ce module : wm-a11y-…).
// © 2026 Soruta.
// ============================================================

import { tl } from "./i18n.js";

const MOD = "westmarch";
const K_DALTON      = "a11yDaltonism";       // "none" | "protan" | "deutan" | "tritan"
const K_CONTRAST    = "a11yContrast";        // Boolean
const K_CONTRASTCOL = "a11yContrastColor";   // String (couleur des contours)
const K_COMPACT     = "a11yCompactControls"; // Boolean
const DEFAULT_BORDER = "#ffd54a";

const choixDalton = () => ({
    none:   tl("Aucun (couleurs normales)"),
    protan: tl("Protanopie (rouge)"),
    deutan: tl("Deutéranopie (vert)"),
    tritan: tl("Tritanopie (bleu)")
});
const _get = (k) => { try { return game.settings.get(MOD, k); } catch { return undefined; } };

// ── Réglages ────────────────────────────────────────────────
function registerA11ySettings() {
    game.settings.register(MOD, K_DALTON, {
        name: tl("Mode daltonisme"), scope: "client", config: false,
        type: String, choices: choixDalton(), default: "none", onChange: applyAccessibility
    });
    game.settings.register(MOD, K_CONTRAST, {
        name: tl("Fort contraste"), scope: "client", config: false,
        type: Boolean, default: false, onChange: applyAccessibility
    });
    game.settings.register(MOD, K_CONTRASTCOL, {
        name: tl("Couleur des contours"), scope: "client", config: false,
        type: String, default: DEFAULT_BORDER, onChange: applyAccessibility
    });
    game.settings.register(MOD, K_COMPACT, {
        name: tl("Contrôles de gauche compacts"), scope: "client", config: false,
        type: Boolean, default: false, onChange: applyAccessibility
    });
}

// ── Menu « Accessibilité » (visible par tous) ───────────────
function registerA11yMenu() {
    game.settings.registerMenu(MOD, "menu-accessibility", {
        name:  tl("Accessibilité"),
        label: tl("Ouvrir"),
        hint:  tl("Options personnelles : daltonisme, fort contraste et couleur des contours, contrôles compacts. Chaque joueur règle les siennes."),
        icon:  "fas fa-universal-access",
        type:  class extends foundry.applications.api.ApplicationV2 {
            static DEFAULT_OPTIONS = { id: "wm-menu-accessibility", window: { title: tl("Accessibilité") } };
            async render() { openA11yDialog(); return this; }
            async close()  { return this; }
        },
        restricted: false
    });
}

export async function openA11yDialog() {
    const uid = "wm-a11y-form";
    if (document.getElementById(uid)) return;
    const dalton = _get(K_DALTON) ?? "none";
    const opts = Object.entries(choixDalton())
        .map(([v, lbl]) => `<option value="${v}" ${dalton === v ? "selected" : ""}>${lbl}</option>`).join("");
    const ligne = (key, label, hint) => `
        <div style="padding:8px 4px;border-bottom:1px solid rgba(255,255,255,0.07);">
            <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;font-weight:600;margin:0;">
                <span>${label}</span>
                <input type="checkbox" name="${key}" ${_get(key) ? "checked" : ""} style="width:18px;height:18px;flex-shrink:0;">
            </label>
            <p style="margin:3px 0 0;font-size:.8em;color:#999;">${hint}</p>
        </div>`;
    const content = `
    <div id="${uid}" style="display:flex;flex-direction:column;">
        <p style="margin:0 0 8px;padding:7px 10px;border:1px solid rgba(230,126,34,.5);border-radius:5px;background:rgba(230,126,34,.08);font-size:.85em;">
            <i class="fa-solid fa-universal-access" style="color:#e67e22;"></i>
            ${tl("<strong>Options d'accessibilité</strong> : personnelles à ton compte, elles n'affectent que ton affichage.")}
        </p>
        <div style="padding:8px 4px;border-bottom:1px solid rgba(255,255,255,0.07);">
            <label style="display:block;font-weight:600;margin:0 0 4px;">${tl("Mode daltonisme")}</label>
            <select name="${K_DALTON}" style="width:100%;">${opts}</select>
            <p style="margin:4px 0 0;font-size:.8em;color:#999;">${tl("Filtre de correction des couleurs sur l'interface et la carte, pour mieux distinguer les teintes selon ton type de vision.")}</p>
        </div>
        ${ligne(K_CONTRAST, tl("Fort contraste"), tl("Renforce le contraste du texte, des bordures et des fonds de l'interface."))}
        <div style="padding:8px 4px;border-bottom:1px solid rgba(255,255,255,0.07);">
            <label style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0;font-weight:600;">
                <span>${tl("Couleur des contours")}</span>
                <span style="display:inline-flex;align-items:center;gap:6px;">
                    <input type="color" name="${K_CONTRASTCOL}" value="${_get(K_CONTRASTCOL) || DEFAULT_BORDER}"
                           style="width:42px;height:26px;padding:0;border:none;background:none;cursor:pointer;">
                    <a class="wm-a11y-col-reset" style="font-size:.8em;color:#e67e22;cursor:pointer;">${tl("réinit.")}</a>
                </span>
            </label>
            <p style="margin:3px 0 0;font-size:.8em;color:#999;">${tl("Couleur des bordures et du contour de focus en mode fort contraste (jaune par défaut).")}</p>
        </div>
        ${ligne(K_COMPACT, tl("Contrôles de gauche compacts"), tl("Réduit la taille des icônes de la barre d'outils de gauche."))}
    </div>`;

    await foundry.applications.api.DialogV2.wait({
        window: { title: tl("Accessibilité"), icon: "fas fa-universal-access" },
        position: { width: 480 },
        rejectClose: false,
        content,
        render: () => {
            document.querySelector(`#${uid} .wm-a11y-col-reset`)?.addEventListener("click", (e) => {
                e.preventDefault();
                const inp = document.querySelector(`#${uid} [name="${K_CONTRASTCOL}"]`);
                if (inp) inp.value = DEFAULT_BORDER;
            });
        },
        buttons: [
            {
                action: "save", default: true, label: tl("Enregistrer"), icon: '<i class="fa-solid fa-save"></i>',
                callback: async (ev, btn) => {
                    const root = btn.form ?? document.getElementById(uid);
                    if (!root) return;
                    await game.settings.set(MOD, K_DALTON, root.querySelector(`[name="${K_DALTON}"]`)?.value ?? "none");
                    await game.settings.set(MOD, K_CONTRASTCOL, root.querySelector(`[name="${K_CONTRASTCOL}"]`)?.value || DEFAULT_BORDER);
                    for (const k of [K_CONTRAST, K_COMPACT]) await game.settings.set(MOD, k, !!root.querySelector(`[name="${k}"]`)?.checked);
                    applyAccessibility();
                }
            },
            { action: "close", label: tl("Fermer"), icon: '<i class="fa-solid fa-xmark"></i>' }
        ]
    });
}

// ── Daltonisation de la carte (filtre PIXI) ─────────────────
// Matrice de daltonisation précalculée : M = I + Shift·(I − Sim). Format PIXI :
// 4 lignes (R, G, B, A) × 5 colonnes (r, g, b, a, décalage).
const DALTON_MATRIX = {
    protan: [1, 0, 0, 0, 0,  -0.2549, 1.2549, 0, 0, 0,  0.3031, -0.5451, 1.242, 0, 0,  0, 0, 0, 1, 0],
    deutan: [1, 0, 0, 0, 0,  -0.4375, 1.4375, 0, 0, 0,  0.2625, -0.5625, 1.3, 0, 0,  0, 0, 0, 1, 0],
    tritan: [1.05, -0.3825, 0.3325, 0, 0,  0, 1.2345, -0.2345, 0, 0,  0, 0, 1, 0, 0,  0, 0, 0, 1, 0]
};

function applyCanvasDaltonism() {
    const stage = canvas?.stage, app = canvas?.app;
    if (!stage || !app) return;
    const autres = (stage.filters ?? []).filter(f => !f?._wmDalton);
    const matrix = DALTON_MATRIX[_get(K_DALTON) ?? "none"];
    if (!matrix) { stage.filters = autres.length ? autres : null; return; }
    const CMF = globalThis.PIXI?.filters?.ColorMatrixFilter ?? globalThis.PIXI?.ColorMatrixFilter;
    if (!CMF) return;
    try {
        const f = new CMF();
        f.matrix = matrix.slice();
        f._wmDalton = true;
        stage.filters = [...autres, f];
        stage.filterArea = app.renderer.screen;
    } catch (e) { console.warn(`[${MOD}] daltonisme :`, e); }
}

// ── Daltonisation de l'interface (filtre SVG) ───────────────
const DALTON_UI_SEL = "#sidebar, #ui-left, #ui-right, #ui-top, #ui-bottom, #players, #hotbar, #controls, #navigation, #hud, #chat-notifications, #camera-views, .application, .app, #tooltip, #context-menu, aside.notifications, .notifications, #pause";
function ensureDaltonUi() {
    if (!document.getElementById("wm-dalton-svg")) {
        const filt = (id, m) => `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${m.join(" ")}"/></filter>`;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = "wm-dalton-svg";
        svg.setAttribute("aria-hidden", "true");
        svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
        svg.innerHTML = `<defs>${Object.entries(DALTON_MATRIX).map(([k, m]) => filt(`wm-dalton-${k}`, m)).join("")}</defs>`;
        document.body.appendChild(svg);
    }
    if (!document.getElementById("wm-dalton-ui-style")) {
        const st = document.createElement("style");
        st.id = "wm-dalton-ui-style";
        st.textContent = Object.keys(DALTON_MATRIX)
            .map(k => `body.wm-a11y-dalton-${k} :is(${DALTON_UI_SEL}) { filter: url(#wm-dalton-${k}); }`).join("\n");
        document.head.appendChild(st);
    }
}

export function applyAccessibility() {
    const body = document.body;
    if (!body) return;
    applyCanvasDaltonism();
    ensureDaltonUi();
    const mode = _get(K_DALTON) ?? "none";
    for (const m of Object.keys(DALTON_MATRIX)) body.classList.toggle(`wm-a11y-dalton-${m}`, mode === m);
    body.classList.toggle("wm-a11y-contrast", !!_get(K_CONTRAST));
    body.classList.toggle("wm-a11y-compact", !!_get(K_COMPACT));
    body.style.setProperty("--wm-a11y-border", _get(K_CONTRASTCOL) || DEFAULT_BORDER);
}

// ── Hooks ───────────────────────────────────────────────────
export function AccessibilityHooks() {
    registerA11ySettings();
    registerA11yMenu();
    Hooks.once("ready", () => applyAccessibility());
    // Le stage du canvas est reconstruit à chaque scène : on réapplique le filtre.
    Hooks.on("canvasReady", () => applyCanvasDaltonism());
}
