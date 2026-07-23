// ============================================================
// tutorial.js — Moteur de tutoriel (bulles step-by-step)
//
// Architecture :
//   - SECTION_LABELS / ICONS / SETTING_KEYS : métadonnées par fonctionnalité
//   - STEPS_BY_FEATURE  : étapes groupées par fonctionnalité (pas par module)
//   - startTutorial()   : construit la liste filtrée (gmOnly/playerOnly), lance l'affichage
//   - closeTutorial()   : nettoie le DOM + retire le listener Echap
//   - _showStep()       : rendu async (beforeShow → spotlight → bulle)
//   - _positionBubble() : positionnement auto avec flip si débordement
// ============================================================

const MODULE = "tutoriel";

// ================================================================
// SECTIONS : labels, icônes et clés de settings (par fonctionnalité)
// ================================================================

export const SECTION_LABELS = {
    barreWestmarch:  "Barre WestMarch",
    bestiary:        "Bestiaire",
    relations:       "Relations",
    carnet:          "Carnet & Expéditions",
    boutiques:       "Boutiques (MEJ)",
    tempsMorts:      "Temps morts",
    apparenceTokens: "Apparence des tokens",
    outilsGm:        "Outils GM",
};

export const SECTION_ICONS = {
    barreWestmarch:  "fa-compass",
    bestiary:        "fa-dragon",
    relations:       "fa-users",
    carnet:          "fa-book-open",
    boutiques:       "fa-store",
    tempsMorts:      "fa-hourglass-half",
    apparenceTokens: "fa-masks-theater",
    outilsGm:        "fa-shield-halved",
};

export const SETTING_KEYS = {
    barreWestmarch:  "barreWestmarch",
    bestiary:        "bestiary",
    relations:       "relations",
    carnet:          "carnet",
    boutiques:       "boutiques",
    tempsMorts:      "tempsMorts",
    apparenceTokens: "apparenceTokens",
    outilsGm:        "outilsGm",
};

// ================================================================
// ÉTAT GLOBAL
// ================================================================

let _steps      = [];
let _current    = 0;
let _wrapEl     = null;
let _escHandler = null;

// ================================================================
// NAVIGATION : ouvrir la fiche PJ et naviguer vers un onglet
// ================================================================

async function _openActorSheetTab(tabName) {
    // Acteur du joueur connecté, ou premier PJ disponible pour un GM sans personnage
    const actor = game.user.character
        ?? (game.user.isGM ? game.actors.find(a => a.type === "character" && a.hasPlayerOwner) : null);
    if (!actor) return;

    actor.sheet.render(true);
    await new Promise(r => setTimeout(r, 500));

    // App v1 : element est jQuery ; App v2 : element est un HTMLElement direct
    const appId   = actor.sheet.appId;
    const sheetEl = document.querySelector(`[data-appid="${appId}"]`)
        ?? (actor.sheet.element instanceof HTMLElement
            ? actor.sheet.element
            : actor.sheet.element?.[0]);
    if (!sheetEl) return;

    const tabBtn = sheetEl.querySelector(`[data-tab="${tabName}"]`);
    if (tabBtn) {
        tabBtn.click();
        await new Promise(r => setTimeout(r, 300));
    }
}

// Raccourci : renvoie un beforeShow qui navigue vers l'onglet donné
const _toSheet = tab => () => _openActorSheetTab(tab);

// ================================================================
// DÉFINITION DES ÉTAPES PAR FONCTIONNALITÉ
// ================================================================

const STEPS_BY_FEATURE = {

    // ---- Barre WestMarch ----
    barreWestmarch: [
        {
            target:   "#controls, #scene-controls, nav.scene-controls",
            title:    "La barre de contrôles",
            text:     "La barre latérale gauche contient les outils de la table. Le groupe <strong>WestMarch</strong>, propre à ce serveur, y ajoute des fonctions spéciales accessibles à tous.",
            textGM:   "La barre latérale gauche contient les outils de la table. Le groupe <strong>WestMarch</strong> regroupe vos outils de gestion : expéditions, temps morts, boutiques et plus.",
            position: "right"
        },
        {
            target:   "[data-control='westmarch'], [data-group='westmarch']",
            title:    "Groupe WestMarch",
            text:     "Cliquez ici pour déplier les outils WestMarch. Vous y trouverez le bouton tutoriel et les fonctions spéciales de ce serveur.",
            textGM:   "Cliquez ici pour déplier les outils WestMarch. En tant que GM, vous avez accès à des boutons supplémentaires : gestion des expéditions, temps morts, et faux message de maintenance.",
            position: "right"
        },
        {
            target:   "[data-control='westmarch'] [data-tool='tutoriel'], [data-group='westmarch'] [data-tool='tutoriel']",
            title:    "Bouton Tutoriel",
            text:     "Ce bouton <i class='fas fa-circle-question'></i> relance ce tutoriel à tout moment. Accessible à <strong>tous les joueurs</strong>. Appuyez sur <kbd>Echap</kbd> pour fermer à tout moment.",
            position: "right"
        },
    ],

    // ---- Bestiaire ----
    bestiary: [
        {
            beforeShow: _toSheet("bestiary"),
            target:     "nav.tabs [data-tab='bestiary'], .tabs .item[data-tab='bestiary']",
            title:      "Onglet Bestiaire",
            text:       "L'onglet <strong>Bestiaire</strong> liste les créatures que vous avez rencontrées ou identifiées. Le GM y ajoute des entrées après chaque session — vous ne pouvez pas en créer vous-même.",
            textGM:     "Vos joueurs ont un onglet <strong>Bestiaire</strong> sur leur fiche. Ouvrez la fiche d'un joueur → onglet Bestiaire → bouton Ajouter pour créer une entrée après une rencontre.",
            position:   "bottom"
        },
        {
            beforeShow: _toSheet("bestiary"),
            target:     ".tab[data-tab='bestiary']",
            title:      "Consulter une entrée",
            text:       "Cliquez sur une entrée pour voir sa description, son image et les informations enregistrées par le GM.",
            textGM:     "Cliquez sur une entrée pour la modifier. Vous pouvez y ajouter une description, une image et toute information utile au joueur.",
            position:   "right"
        },
    ],

    // ---- Relations ----
    relations: [
        {
            beforeShow: _toSheet("relations"),
            target:     "nav.tabs [data-tab='relations'], .tabs .item[data-tab='relations']",
            title:      "Onglet Relations",
            text:       "L'onglet <strong>Relations</strong> liste vos liens avec les PJ, PNJ et factions. Cliquez <strong>+</strong> pour ajouter un lien, ou glissez un acteur depuis le panneau Acteurs.",
            textGM:     "Vos joueurs peuvent noter leurs liens avec PJ, PNJ et factions dans l'onglet <strong>Relations</strong> de leur fiche. Vous pouvez aussi y ajouter ou modifier des entrées depuis la fiche d'un joueur.",
            position:   "bottom"
        },
        {
            beforeShow: _toSheet("relations"),
            target:     ".tab[data-tab='relations']",
            title:      "Gérer ses relations",
            text:       "Chaque relation a un type (allié, ennemi, neutre…) et un espace de notes libre. Elle n'est visible que par vous et le GM.",
            textGM:     "Chaque relation a un type et un espace de notes. Elle est visible par le joueur et par vous. Vous pouvez modifier ou supprimer n'importe quelle entrée.",
            position:   "right"
        },
    ],

    // ---- Carnet & Expéditions ----
    carnet: [
        {
            beforeShow: _toSheet("carnet-journal"),
            target:     "nav.tabs [data-tab='carnet-journal'], .tabs .item[data-tab='carnet-journal']",
            title:      "Onglet Carnet",
            text:       "L'onglet <strong>Carnet</strong> permet de prendre des notes par expédition avec un éditeur enrichi (gras, italique, listes…). Cliquez <strong>Modifier</strong> pour ouvrir l'éditeur sur une expédition.",
            position:   "bottom"
        },
        {
            beforeShow: _toSheet("carnet-downtime"),
            target:     "nav.tabs [data-tab='carnet-downtime'], .tabs .item[data-tab='carnet-downtime']",
            title:      "Onglet Expéditions",
            text:       "L'onglet <strong>Expéditions</strong> liste vos sessions avec leurs dates de début et de fin. La durée est calculée automatiquement. Cliquez sur le nom d'une expédition pour retrouver ses notes dans le Carnet.",
            textGM:     "L'onglet <strong>Expéditions</strong> liste les sessions avec dates et durée. Les dates sont posées via le bouton <i class='fas fa-calendar-plus'></i> dans la barre WestMarch — il ouvre ou clôt une expédition pour toute la party en un clic.",
            position:   "bottom"
        },
        {
            target:   "[data-control='westmarch'] [data-tool='carnetDate'], [data-group='westmarch'] [data-tool='carnetDate']",
            title:    "Bouton Date Expédition (GM)",
            text:     "Ce bouton enregistre la date actuelle (Simple Calendar) pour toute la party : il ouvre une nouvelle expédition si aucune n'est en cours, ou clôt celle qui est active.",
            position: "right",
            gmOnly:   true
        },
    ],

    // ---- Boutiques ----
    boutiques: [
        {
            target:   null,
            title:    "Boutiques — Afficher aux joueurs",
            text:     "Les boutiques fonctionnent via <strong>Monk's Enhanced Journal</strong>. Ouvrez un journal de type Boutique, ajoutez vos articles, puis cliquez <strong>Afficher aux joueurs</strong> pour ouvrir la boutique à votre groupe. Les joueurs peuvent y acheter directement, même sans accès à la fiche de la party.",
            position: "center",
            gmOnly:   true
        },
        {
            target:   null,
            title:    "Réapprovisionnement automatique",
            text:     "Quand un article tombe à 0, il se remet à 1 automatiquement après un délai. Les délais par rareté (Commun, Peu commun, Rare, Très rare, Légendaire) sont configurables dans les <strong>paramètres du module Toolkit</strong>.",
            position: "center",
            gmOnly:   true
        },
    ],

    // ---- Temps morts ----
    tempsMorts: [
        {
            beforeShow: async () => {
                const actor = game.user.character;
                if (!actor) return;
                actor.sheet.render(true);
                await new Promise(r => setTimeout(r, 500));
            },
            target:     null,
            title:      "Déclarer un temps mort",
            text:       "Un bouton <i class='fas fa-hourglass-half'></i> apparaît dans l'en-tête de votre fiche. Cliquez-le pour déclarer votre activité : choisissez une compétence ou maîtrise, renseignez les dates de début et de fin, et soumettez. Le GM valide ensuite.",
            position:   "center",
            playerOnly: true
        },
        {
            target:   "[data-control='westmarch'] [data-tool='downtime'], [data-group='westmarch'] [data-tool='downtime']",
            title:    "Valider les temps morts (GM)",
            text:     "Ce bouton ouvre la liste de toutes les déclarations en attente. Vérifiez les gains calculés pour chaque joueur et cliquez <strong>Valider</strong> pour appliquer les bonus directement sur leur fiche.",
            position: "right",
            gmOnly:   true
        },
    ],

    // ---- Apparence des tokens ----
    apparenceTokens: [
        {
            target:   null,
            title:    "Voir le portrait",
            text:     "<strong>Clic droit</strong> sur un token → HUD → bouton portrait <i class='fas fa-image'></i> : affiche en grand l'image de la fiche du personnage.",
            position: "center"
        },
        {
            target:   null,
            title:    "Wild Shape / Polymorph",
            text:     "Configurez des formes de transformation dans le prototype du token (onglet Apparence). Le bouton <i class='fas fa-dragon'></i> dans le HUD permet au GM et aux propriétaires de transformer le token et de le rétablir en un clic.",
            position: "center"
        },
        {
            target:   null,
            title:    "Cycle d'apparences",
            text:     "Si plusieurs images sont configurées sur un token, un bouton cycle dans le HUD permet de changer son apparence — utile pour les tenues ou états alternatifs d'un même personnage.",
            position: "center"
        },
    ],

    // ---- Outils GM ----
    outilsGm: [
        {
            target:   "[data-control='westmarch'] [data-tool='fakeWarning'], [data-group='westmarch'] [data-tool='fakeWarning']",
            title:    "Faux message de maintenance",
            text:     "Ce bouton <i class='fas fa-triangle-exclamation'></i> envoie une fausse notification jaune à un joueur précis — pour lui faire croire qu'un problème technique a été résolu.",
            position: "right",
            gmOnly:   true
        },
        {
            target:   null,
            title:    "Protection TGCM",
            text:     "Le bouton <i class='fas fa-shield-halved'></i> dans le HUD d'un token (GM uniquement) le protège de la mort. Un token TGCM ne peut jamais tomber à 0 PV — tout dégât fatal le laisse à 1 PV.",
            position: "center",
            gmOnly:   true
        },
        {
            target:   null,
            title:    "Blocage XP et Level Up",
            text:     "Activez le <strong>blocage XP</strong> dans les paramètres de <em>WestMarch Ashara</em> pour empêcher les joueurs de modifier leur XP ou monter de niveau eux-mêmes. Seul le GM peut le faire.",
            position: "center",
            gmOnly:   true
        },
        {
            target:   null,
            title:    "Logs Discord",
            text:     "Configurez des URLs <strong>webhook</strong> dans les paramètres de <em>WestMarch Ashara</em> pour recevoir des notifications automatiques sur Discord : modifications d'objets, changements de date de jeu, et résultats des temps morts.",
            position: "center",
            gmOnly:   true
        },
    ],
};

// ================================================================
// API PUBLIQUE
// ================================================================

/**
 * Lance le tutoriel.
 * @param {string[]|null} selectedSections  Sections à inclure, ou null pour les settings.
 */
export function startTutorial(selectedSections = null) {
    _steps = [];
    for (const [section, settingKey] of Object.entries(SETTING_KEYS)) {
        const include = selectedSections !== null
            ? selectedSections.includes(section)
            : game.settings.get(MODULE, settingKey);
        if (!include) continue;

        const sectionSteps = (STEPS_BY_FEATURE[section] ?? []).filter(s => {
            if (s.gmOnly     && !game.user.isGM) return false;
            if (s.playerOnly &&  game.user.isGM) return false;
            return true;
        });
        _steps.push(...sectionSteps);
    }

    if (!_steps.length) {
        ui.notifications.warn("[Tutoriel] Aucun contenu activé. Activez des fonctionnalités dans les paramètres du tutoriel.");
        return;
    }

    _current = 0;
    _buildWrap();
    _showStep(0);
}

export function closeTutorial() {
    if (_escHandler) {
        document.removeEventListener("keydown", _escHandler);
        _escHandler = null;
    }
    _wrapEl?.remove();
    _wrapEl = null;
}

// ================================================================
// CONSTRUCTION DU WRAPPER
// ================================================================

function _buildWrap() {
    closeTutorial();
    _wrapEl = document.createElement("div");
    _wrapEl.id = "tuto-wrap";
    _wrapEl.style.cssText = "position:fixed;inset:0;z-index:9900;pointer-events:none;";
    document.body.appendChild(_wrapEl);

    // Fermeture via Echap
    _escHandler = e => { if (e.key === "Escape") closeTutorial(); };
    document.addEventListener("keydown", _escHandler);
}

// ================================================================
// AFFICHAGE D'UNE ÉTAPE (async pour supporter beforeShow)
// ================================================================

async function _showStep(idx) {
    if (!_wrapEl) return;
    const step = _steps[idx];
    if (!step) return;

    // Navigation préalable (ouvrir fiche/onglet si nécessaire)
    if (step.beforeShow) {
        await step.beforeShow();
    }
    // Le tutoriel a peut-être été fermé pendant l'attente du beforeShow
    if (!_wrapEl) return;

    _wrapEl.innerHTML = "";

    // Texte spécifique GM si défini
    const text = (step.textGM && game.user.isGM) ? step.textGM : step.text;

    const targetEl = step.target ? document.querySelector(step.target) : null;

    // ---- SPOTLIGHT : 4 panneaux autour de la cible, ou plein écran ----
    if (targetEl) {
        const r   = targetEl.getBoundingClientRect();
        const pad = 7;
        const T   = Math.max(0, r.top    - pad);
        const B   = Math.min(window.innerHeight, r.bottom + pad);
        const L   = Math.max(0, r.left   - pad);
        const R   = Math.min(window.innerWidth,  r.right  + pad);

        const panelStyles = [
            `top:0;left:0;right:0;height:${T}px`,
            `top:${B}px;left:0;right:0;bottom:0`,
            `top:${T}px;left:0;width:${L}px;height:${B - T}px`,
            `top:${T}px;left:${R}px;right:0;height:${B - T}px`,
        ];
        for (const s of panelStyles) {
            const p = _mkPanel(s);
            p.addEventListener("click", closeTutorial);
            _wrapEl.appendChild(p);
        }

        const ring = document.createElement("div");
        ring.className = "tuto-ring";
        ring.style.cssText = `
            position:fixed;pointer-events:none;z-index:9902;
            top:${T}px;left:${L}px;
            width:${R - L}px;height:${B - T}px;
            border-width:2px;border-style:solid;
        `;
        _wrapEl.appendChild(ring);
    } else {
        const p = _mkPanel("inset:0");
        p.style.background = "rgba(0,0,0,0.6)";
        p.addEventListener("click", (e) => { if (e.target === p) closeTutorial(); });
        _wrapEl.appendChild(p);
    }

    // ---- BULLE ----
    const isFirst = idx === 0;
    const isLast  = idx === _steps.length - 1;

    const bubble = document.createElement("div");
    bubble.id = "tuto-bubble";
    bubble.innerHTML = `
        <div class="tuto-bubble-header">
            <span class="tuto-step-counter">
                <span class="tuto-step-dots">${_renderDots(idx, _steps.length)}</span>
                ${idx + 1} / ${_steps.length}
            </span>
            <button class="tuto-close-btn" title="Fermer le tutoriel (Echap)">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="tuto-bubble-body">
            <h3 class="tuto-bubble-title">${step.title}</h3>
            <p class="tuto-bubble-text">${text}</p>
        </div>
        <div class="tuto-bubble-footer">
            <button class="tuto-btn tuto-prev"${isFirst ? " disabled" : ""}>
                <i class="fas fa-chevron-left"></i> Précédent
            </button>
            <button class="tuto-btn tuto-next primary">
                ${isLast
                    ? '<i class="fas fa-check"></i> Terminer'
                    : 'Suivant <i class="fas fa-chevron-right"></i>'}
            </button>
        </div>`;

    _wrapEl.appendChild(bubble);

    bubble.querySelector(".tuto-close-btn").addEventListener("click", closeTutorial);
    bubble.querySelector(".tuto-prev").addEventListener("click", () => {
        if (_current > 0) _showStep(--_current);
    });
    bubble.querySelector(".tuto-next").addEventListener("click", () => {
        if (_current < _steps.length - 1) _showStep(++_current);
        else closeTutorial();
    });

    _positionBubble(bubble, targetEl, step.position ?? "center");
}

// ================================================================
// HELPERS DOM
// ================================================================

function _mkPanel(styleStr) {
    const d = document.createElement("div");
    d.className = "tuto-panel";
    d.style.cssText = `position:fixed;pointer-events:auto;background:rgba(0,0,0,0.58);${styleStr}`;
    return d;
}

function _renderDots(current, total) {
    return Array.from({ length: Math.min(total, 12) }, (_, i) =>
        `<span class="tuto-dot${i === current ? " active" : ""}"></span>`
    ).join("");
}

// ================================================================
// POSITIONNEMENT DE LA BULLE
// ================================================================

function _positionBubble(bubble, targetEl, position) {
    bubble.style.cssText += ";position:fixed;pointer-events:auto;z-index:9910;";

    if (!targetEl || position === "center") {
        bubble.style.top       = "50%";
        bubble.style.left      = "50%";
        bubble.style.transform = "translate(-50%,-50%)";
        return;
    }

    requestAnimationFrame(() => {
        const rT   = targetEl.getBoundingClientRect();
        const rB   = bubble.getBoundingClientRect();
        const BW   = rB.width  || 340;
        const BH   = rB.height || 200;
        const M    = 16;
        const ARR  = 14;

        let dir = position;
        if (dir === "right"  && rT.right  + BW + M + ARR > window.innerWidth)  dir = "left";
        if (dir === "left"   && rT.left   - BW - M - ARR < 0)                  dir = "right";
        if (dir === "bottom" && rT.bottom + BH + M + ARR > window.innerHeight) dir = "top";
        if (dir === "top"    && rT.top    - BH - M - ARR < 0)                  dir = "bottom";

        bubble.setAttribute("data-arrow", dir);

        const cx = rT.left + rT.width  / 2;
        const cy = rT.top  + rT.height / 2;
        let top, left;

        switch (dir) {
            case "right":
                left = rT.right + ARR + M;
                top  = clamp(cy - BH / 2, M, window.innerHeight - BH - M);
                break;
            case "left":
                left = rT.left - BW - ARR - M;
                top  = clamp(cy - BH / 2, M, window.innerHeight - BH - M);
                break;
            case "bottom":
                top  = rT.bottom + ARR + M;
                left = clamp(cx - BW / 2, M, window.innerWidth - BW - M);
                break;
            case "top":
                top  = rT.top - BH - ARR - M;
                left = clamp(cx - BW / 2, M, window.innerWidth - BW - M);
                break;
        }

        bubble.style.top       = `${top}px`;
        bubble.style.left      = `${left}px`;
        bubble.style.transform = "";
    });
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
