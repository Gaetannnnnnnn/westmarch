// ============================================================
// tutorial.js — Moteur de tutoriel (bulles step-by-step)
//
// Architecture :
//   - STEPS_BY_MODULE  : étapes groupées par module
//   - startTutorial()  : construit la liste filtrée, lance l'affichage
//   - closeTutorial()  : nettoie le DOM
//   - _showStep()      : rendu d'une étape (spotlight + bulle)
//   - _positionBubble(): positionnement auto avec flip si débordement
// ============================================================

const MODULE = "tutoriel";

// ================================================================
// SECTIONS : labels, icônes et clés de settings
// ================================================================

export const SECTION_LABELS = {
    westmarch:       "Barre WestMarch",
    bestiary:        "Bestiaire",
    relations:       "Relations",
    carnet:          "Carnet & Expéditions",
    toolkit:         "Boutiques (Toolkit)",
    westmarchAshara: "Fonctions serveur Ashara",
};

export const SECTION_ICONS = {
    westmarch:       "fa-compass",
    bestiary:        "fa-dragon",
    relations:       "fa-users",
    carnet:          "fa-book-open",
    toolkit:         "fa-store",
    westmarchAshara: "fa-server",
};

export const SETTING_KEYS = {
    westmarch:       "modWestmarch",
    bestiary:        "modBestiary",
    relations:       "modRelations",
    carnet:          "modCarnet",
    toolkit:         "modToolkit",
    westmarchAshara: "modWestmarchAshara",
};

// ================================================================
// DÉFINITION DES ÉTAPES PAR MODULE
// ================================================================

const STEPS_BY_MODULE = {

    // ---- WestMarch ----
    westmarch: [
        {
            // Foundry v12 : #controls | v13 : #scene-controls ou .scene-controls
            target:   "#controls, #scene-controls, nav.scene-controls",
            title:    "La barre de contrôles",
            text:     "Cette barre latérale gauche contient tous les outils de la table. Le groupe <strong>WestMarch</strong>, ajouté par le serveur, regroupe les fonctions spéciales.",
            position: "right"
        },
        {
            // v12 : data-control | v13 : data-group
            target:   "[data-control='westmarch'], [data-group='westmarch']",
            title:    "Groupe WestMarch",
            text:     "Cliquez ici pour déplier les outils WestMarch : <strong>rejoindre une scène active</strong>, voir les membres de la party, gérer les sessions et plus.",
            position: "right"
        },
        {
            target:   "[data-control='westmarch'] [data-tool='tutoriel'], [data-group='westmarch'] [data-tool='tutoriel']",
            title:    "Ce bouton",
            text:     "Le bouton <i class='fas fa-circle-question'></i> que vous avez peut-être utilisé pour lancer ce tutoriel est toujours disponible ici, <strong>même pour les joueurs</strong>.",
            position: "right"
        },
    ],

    // ---- Bestiaire ----
    bestiary: [
        {
            target:   null,
            title:    "Onglet Bestiaire",
            text:     "Ouvrez votre <strong>fiche de personnage</strong>, puis cliquez sur l'onglet <strong>Bestiaire</strong>. Vous y trouverez les créatures et PNJ que votre personnage a rencontrés ou identifiés au fil des aventures.",
            position: "center"
        },
        {
            target:   null,
            title:    "Consulter une entrée",
            text:     "Chaque entrée du bestiaire peut afficher une description, une image et des informations sur la créature. Le contenu est renseigné par le GM.",
            position: "center"
        },
    ],

    // ---- Relations ----
    relations: [
        {
            target:   null,
            title:    "Onglet Relations",
            text:     "Toujours sur votre <strong>fiche de personnage</strong>, l'onglet <strong>Relations</strong> liste vos liens avec les PJ, PNJ et factions : alliances, rivalités, rencontres mémorables.",
            position: "center"
        },
        {
            target:   null,
            title:    "Ajouter une relation",
            text:     "Vous pouvez glisser-déposer un personnage depuis le panneau Acteurs, ou utiliser le bouton <strong>Ajouter</strong> pour créer manuellement un lien.",
            position: "center"
        },
    ],

    // ---- Carnet d'Expéditions ----
    carnet: [
        {
            target:   null,
            title:    "Onglet Carnet",
            text:     "L'onglet <strong>Carnet</strong> sur votre fiche vous offre un éditeur de texte enrichi par expédition. Notez vos indices, descriptions de lieux, décisions clés…",
            position: "center"
        },
        {
            target:   null,
            title:    "Onglet Expéditions",
            text:     "L'onglet <strong>Expéditions</strong> liste vos sessions avec les dates de début et de fin, et la durée calculée automatiquement. Cliquez sur le nom d'une expédition pour rejoindre ses notes dans le Carnet.",
            position: "center"
        },
        {
            target:   "[data-control='westmarch'] [data-tool='carnetDate'], [data-group='westmarch'] [data-tool='carnetDate']",
            title:    "Bouton Date du TM (GM)",
            text:     "Ce bouton permet au GM d'enregistrer la date actuelle (Simple Calendar) pour tous les membres de la party — début d'expédition si aucune n'est ouverte, fin sinon.",
            position: "right",
            gmOnly:   true
        },
    ],

    // ---- Toolkit ----
    toolkit: [
        {
            target:   null,
            title:    "Boutiques",
            text:     "Les boutiques du serveur fonctionnent via <strong>Monk's Enhanced Journal</strong>. Tous les membres du groupe peuvent y acheter des objets, même sans être propriétaires de la fiche de la party.",
            position: "center"
        },
    ],

    // ---- WestMarch Ashara ----
    westmarchAshara: [
        {
            target:   null,
            title:    "Fonctions serveur Ashara",
            text:     "Le module <strong>WestMarch Ashara</strong> apporte des fonctionnalités propres à ce serveur : avertissements personnalisés lors des connexions, outils de gestion de campagne, et personnalisations de l'interface.",
            position: "center"
        },
    ],
};

// ================================================================
// ÉTAT GLOBAL
// ================================================================

let _steps   = [];
let _current = 0;
let _wrapEl  = null;

// ================================================================
// API PUBLIQUE
// ================================================================

/**
 * Lance le tutoriel.
 * @param {string[]|null} selectedSections  Liste explicite de sections à inclure,
 *   ou null pour utiliser les toggles de settings.
 */
export function startTutorial(selectedSections = null) {
    _steps = [];
    for (const [section, settingKey] of Object.entries(SETTING_KEYS)) {
        const include = selectedSections !== null
            ? selectedSections.includes(section)
            : game.settings.get(MODULE, settingKey);
        if (!include) continue;
        const sectionSteps = (STEPS_BY_MODULE[section] ?? []).filter(
            s => !s.gmOnly || game.user.isGM
        );
        _steps.push(...sectionSteps);
    }

    if (!_steps.length) {
        ui.notifications.warn("[Tutoriel] Aucun contenu activé. Activez des modules dans les paramètres du tutoriel.");
        return;
    }

    _current = 0;
    _buildWrap();
    _showStep(0);
}

export function closeTutorial() {
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
    // Pas de background propre : les panneaux enfants gèrent ça
    _wrapEl.style.cssText = "position:fixed;inset:0;z-index:9900;pointer-events:none;";
    document.body.appendChild(_wrapEl);
}

// ================================================================
// AFFICHAGE D'UNE ÉTAPE
// ================================================================

function _showStep(idx) {
    if (!_wrapEl) return;
    const step = _steps[idx];
    if (!step) return;

    _wrapEl.innerHTML = "";

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

        // Anneau lumineux autour de la cible (couleur/ombre gérées par CSS .tuto-ring)
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
        // Plein écran semi-transparent
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
            <button class="tuto-close-btn" title="Fermer le tutoriel">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="tuto-bubble-body">
            <h3 class="tuto-bubble-title">${step.title}</h3>
            <p class="tuto-bubble-text">${step.text}</p>
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

    // Événements
    bubble.querySelector(".tuto-close-btn").addEventListener("click", closeTutorial);
    bubble.querySelector(".tuto-prev").addEventListener("click", () => {
        if (_current > 0) _showStep(--_current);
    });
    bubble.querySelector(".tuto-next").addEventListener("click", () => {
        if (_current < _steps.length - 1) _showStep(++_current);
        else closeTutorial();
    });

    // Positionnement (après insertion dans le DOM)
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

    // Attendre un frame pour avoir les dimensions réelles de la bulle
    requestAnimationFrame(() => {
        const rT   = targetEl.getBoundingClientRect();
        const rB   = bubble.getBoundingClientRect();
        const BW   = rB.width  || 340;
        const BH   = rB.height || 200;
        const M    = 16;   // marge écran
        const ARR  = 14;   // espace pour la flèche

        // Direction avec auto-flip si débordement
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
