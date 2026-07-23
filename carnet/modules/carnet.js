// ============================================================
// carnet.js — Logique principale du module carnet
//
// - Helpers données (flags acteur)
// - Helpers dates (game.time.calendar — pas de dépendance SimpleCalendar)
// - Helpers party (westmarch)
// - Builders HTML onglets (journal + expéditions)
// - Câblage événements
// - Éditeur ProseMirror inline
// - Bouton barre de gauche GM "Date Expédition"
// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
// ============================================================

const MODULE = "carnet";

// ================================================================
// DONNÉES — flags acteur
// ================================================================

export function getExpeditions(actor) {
    return actor.getFlag(MODULE, "expeditions") ?? [];
}

export function getOpenExpedition(actor) {
    return getExpeditions(actor).find(e => e.startDate && !e.endDate) ?? null;
}

export async function addExpedition(actor, startDate = null) {
    const exps = getExpeditions(actor);
    const newExp = {
        id:        foundry.utils.randomID(),
        name:      "Nouvelle expédition",
        startDate: startDate ?? null,
        endDate:   null,
        note:      ""
    };
    await actor.setFlag(MODULE, "expeditions", [...exps, newExp]);
    return newExp;
}

export async function closeExpedition(actor, expId, endDate) {
    const updated = getExpeditions(actor).map(e =>
        e.id === expId ? { ...e, endDate } : e
    );
    await actor.setFlag(MODULE, "expeditions", updated);
}

// ================================================================
// DATES — game.time.calendar (Foundry v13 natif, pas de SimpleCalendar requis)
// ================================================================

/**
 * Renvoie la date courante sous la forme { day, month, year }.
 * Utilise game.time.calendar (Foundry v13) en priorité, SimpleCalendar en fallback.
 */
export function getCurrentDate() {
    // Méthode 1 : API Foundry v13 native
    try {
        const cal = game.time?.calendar;
        if (cal) {
            const c = cal.timeToComponents(game.time.worldTime);
            return { day: c.dayOfMonth + 1, month: c.month, year: c.year };
        }
    } catch {}
    // Méthode 2 : Simple Calendar (fallback)
    try {
        const sc = SimpleCalendar?.api?.currentDateTime?.();
        if (sc) return { day: sc.day, month: sc.month, year: sc.year };
    } catch {}
    return null;
}

/**
 * Renvoie le nom localisé d'un mois (0-indexé).
 */
function _getMonthName(month) {
    try {
        const cal = game.time?.calendar;
        if (cal?.months?.values) {
            const months = Array.from(cal.months.values);
            const name = months[month]?.name;
            if (name) return game.i18n.localize(name);
        }
    } catch {}
    return `Mois ${month + 1}`;
}

/**
 * Formate une date { day, month, year } pour l'affichage.
 */
export function formatDate(dateObj) {
    if (!dateObj) return "—";
    // Essaie Simple Calendar si disponible (formatage complet)
    try {
        if (typeof SimpleCalendar !== "undefined" && SimpleCalendar?.api?.formatDateTime) {
            return SimpleCalendar.api.formatDateTime(dateObj);
        }
    } catch {}
    // Fallback : "J NomMois Année"
    return `${dateObj.day} ${_getMonthName(dateObj.month)} ${dateObj.year}`;
}

/**
 * Options HTML <option> pour les mois (0-indexé).
 */
function _monthOptionsHtml(selectedMonth = 0) {
    try {
        const cal = game.time?.calendar;
        if (cal?.months?.values) {
            return Array.from(cal.months.values).map((m, i) => {
                const name = m?.name ? game.i18n.localize(m.name) : `Mois ${i + 1}`;
                return `<option value="${i}"${i === selectedMonth ? " selected" : ""}>${name}</option>`;
            }).join("");
        }
    } catch {}
    return Array.from({ length: 12 }, (_, i) =>
        `<option value="${i}"${i === selectedMonth ? " selected" : ""}>Mois ${i + 1}</option>`
    ).join("");
}

/**
 * Convertit { day, month, year } en nombre total de jours depuis l'an 0.
 */
function _toTotalDays(date) {
    try {
        const cal = game.time?.calendar;
        if (cal?.months?.values) {
            const months = Array.from(cal.months.values);
            const daysPerYear = months.reduce((s, m) => s + (m?.days ?? 30), 0) || 360;
            let total = (date.year ?? 1) * daysPerYear;
            for (let i = 0; i < (date.month ?? 0); i++) total += months[i]?.days ?? 30;
            return total + ((date.day ?? 1) - 1);
        }
    } catch {}
    // Approximation sans calendrier
    return (date.year ?? 1) * 365 + (date.month ?? 0) * 30 + ((date.day ?? 1) - 1);
}

function dateDiff(start, end) {
    if (!start || !end) return null;
    try {
        const days = Math.abs(_toTotalDays(end) - _toTotalDays(start));
        if (isNaN(days)) return null;
        return `${days} jour${days !== 1 ? "s" : ""}`;
    } catch {
        return null;
    }
}

// ================================================================
// PARTY — via paramètre westmarch
// ================================================================

function getPartyMembers() {
    try {
        const partyActorId = game.settings.get("westmarch", "partyMaster");
        if (!partyActorId) return [];
        const partyActor = game.actors.get(partyActorId);
        if (!partyActor) return [];
        const members = [...(partyActor.system.members ?? [])];
        return members
            .map(m => m.actor ?? game.actors.get(m.id))
            .filter(a => a?.type === "character");
    } catch {
        return [];
    }
}

// ================================================================
// BOUTON BARRE DE GAUCHE
// ================================================================

export function CarnetToolbarHooks() {
    Hooks.on("getSceneControlButtons", (controls) => {
        if (!game.user.isGM) return;

        if (!controls.westmarch) {
            controls.westmarch = {
                name:  "westmarch",
                title: "WestMarch",
                icon:  "fa-solid fa-hammer",
                layer: "tokens",
                tools: {}
            };
        }

        controls.westmarch.tools.carnetDate = {
            name:     "carnetDate",
            title:    "Date Expédition — Début/Fin d'expédition (party)",
            icon:     "fa-solid fa-calendar-plus",
            button:   true,
            onChange: () => onClickDateTM(),
            visible:  true
        };
    });
}

async function onClickDateTM() {
    const currentDate = getCurrentDate();

    const preDay   = currentDate?.day   ?? 1;
    const preMo    = currentDate?.month ?? 0; // 0-indexé
    const preYear  = currentDate?.year  ?? 1;

    const noCalWarning = !currentDate
        ? `<p style="margin:0 0 8px;font-size:11px;color:#e67e22;">
               <i class="fas fa-exclamation-triangle"></i>
               Calendrier non disponible — seule la date personnalisée est utilisable.
           </p>`
        : "";

    const currentStr = currentDate
        ? `${preDay} ${_getMonthName(preMo)} ${preYear}`
        : null;

    const content = `
<div style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">
    ${noCalWarning}
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;
                   border-radius:5px;border:1px solid rgba(255,255,255,0.08);
                   background:rgba(255,255,255,0.03);">
        <input type="radio" name="carnet-tm-mode" id="carnet-tm-radio-current" value="current"
               ${currentDate ? "checked" : "disabled"} style="margin:0;flex-shrink:0;">
        <span>
            <span style="font-weight:600;">Date actuelle</span><br>
            <span style="font-size:11px;color:#aaa;">
                ${currentStr ?? '<em>Calendrier non disponible</em>'}
            </span>
        </span>
    </label>
    <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;padding:8px 10px;
                   border-radius:5px;border:1px solid rgba(255,255,255,0.08);
                   background:rgba(255,255,255,0.03);">
        <input type="radio" name="carnet-tm-mode" id="carnet-tm-radio-custom" value="custom"
               ${!currentDate ? "checked" : ""} style="margin:3px 0 0;flex-shrink:0;">
        <span style="flex:1;">
            <span style="font-weight:600;">Date personnalisée</span><br>
            <div style="display:flex;gap:6px;align-items:center;margin-top:6px;">
                <input type="number" id="carnet-tm-day"   min="1" max="31" value="${preDay}"  style="width:54px;">
                <select id="carnet-tm-month" style="flex:1;">${_monthOptionsHtml(preMo)}</select>
                <input type="number" id="carnet-tm-year"  value="${preYear}" style="width:72px;">
            </div>
        </span>
    </label>
</div>`;

    let resolvedDate = null;

    const DialogClass = foundry.applications.api?.DialogV2 ?? globalThis.DialogV2;

    if (DialogClass?.wait) {
        // ---- DialogV2 (Foundry v13) ----
        const action = await DialogClass.wait({
            window:      { title: "Date Expédition — Début / Fin" },
            position:    { width: 340 },
            content,
            rejectClose: false,
            render: () => {
                // Sélectionne le radio "custom" quand on clique sur les champs de date
                ["carnet-tm-day", "carnet-tm-month", "carnet-tm-year"].forEach(id => {
                    document.getElementById(id)?.addEventListener("focus", () => {
                        const r = document.getElementById("carnet-tm-radio-custom");
                        if (r) r.checked = true;
                    });
                });
            },
            buttons: [
                {
                    action:   "confirm",
                    label:    "Appliquer à la party",
                    icon:     '<i class="fas fa-calendar-check"></i>',
                    default:  true,
                    callback: () => {
                        const mode = document.querySelector('[name="carnet-tm-mode"]:checked')?.value;
                        if (mode === "current") {
                            resolvedDate = currentDate;
                        } else {
                            const day   = parseInt(document.getElementById("carnet-tm-day")?.value)   || 1;
                            const month = parseInt(document.getElementById("carnet-tm-month")?.value) || 0;
                            const year  = parseInt(document.getElementById("carnet-tm-year")?.value)  || 1;
                            resolvedDate = { day, month, year };
                        }
                    }
                },
                {
                    action: "cancel",
                    label:  "Annuler",
                    icon:   '<i class="fas fa-times"></i>'
                }
            ]
        });
        if (action !== "confirm" || !resolvedDate) return;

    } else {
        // ---- Fallback Dialog v1 ----
        resolvedDate = await new Promise(resolve => {
            new Dialog({
                title:   "Date Expédition — Début / Fin",
                content,
                buttons: {
                    confirm: {
                        icon:  '<i class="fas fa-calendar-check"></i>',
                        label: "Appliquer à la party",
                        callback: (html) => {
                            try {
                                const mode = html.find('[name="carnet-tm-mode"]:checked').val()
                                    ?? document.querySelector('[name="carnet-tm-mode"]:checked')?.value;
                                if (mode === "current") { resolve(currentDate); return; }
                                const day   = parseInt(html.find('#carnet-tm-day').val())   || 1;
                                const month = parseInt(html.find('#carnet-tm-month').val()) || 0;
                                const year  = parseInt(html.find('#carnet-tm-year').val())  || 1;
                                resolve({ day, month, year });
                            } catch(err) {
                                console.error("[Carnet] Erreur dialog callback:", err);
                                resolve(null);
                            }
                        }
                    },
                    cancel: {
                        icon:     '<i class="fas fa-times"></i>',
                        label:    "Annuler",
                        callback: () => resolve(null)
                    }
                },
                default: "confirm"
            }, { width: 340 }).render(true);
        });
        if (!resolvedDate) return;
    }

    const members = getPartyMembers();
    if (!members.length) {
        ui.notifications.warn("[Carnet] Aucun membre dans la party. Vérifier le paramètre 'Party master' de westmarch.");
        return;
    }

    let opened = 0, closed = 0;
    for (const actor of members) {
        const open = getOpenExpedition(actor);
        if (open) {
            await closeExpedition(actor, open.id, resolvedDate);
            closed++;
        } else {
            await addExpedition(actor, resolvedDate);
            opened++;
        }
    }

    const parts = [];
    if (opened) parts.push(`${opened} expédition${opened > 1 ? "s" : ""} commencée${opened > 1 ? "s" : ""}`);
    if (closed) parts.push(`${closed} expédition${closed > 1 ? "s" : ""} clôturée${closed > 1 ? "s" : ""}`);
    ui.notifications.info(`[Carnet] Date Expédition — ${parts.join(", ")}.`);
}

// ================================================================
// BUILDER HTML — Onglet Journal
// ================================================================

export function buildJournalHtml(actor) {
    const exps     = getExpeditions(actor);
    const canEdit  = actor.isOwner;

    const addBar = canEdit ? `
        <div class="carnet-add-bar">
            <button type="button" class="carnet-add-exp" data-source="journal">
                <i class="fas fa-plus"></i> Ajouter une expédition
            </button>
        </div>` : "";

    if (!exps.length) {
        return `
        <div class="carnet-body">
            ${addBar}
            <div class="carnet-empty-state">
                <i class="fas fa-book-open"></i>
                <p>Aucune expédition enregistrée.<br>
                Le GM peut créer une via le bouton <strong>Date Expédition</strong>
                dans la barre de gauche, ou via le bouton ci-dessus.</p>
            </div>
        </div>`;
    }

    const sections = exps.map(exp => {
        const isOpen   = !!(exp.startDate && !exp.endDate);
        const hasDates = !!(exp.startDate);
        const startStr = formatDate(exp.startDate);
        const endStr   = exp.endDate ? formatDate(exp.endDate) : null;

        const statusBadge = isOpen
            ? `<span class="carnet-badge open"><i class="fas fa-clock"></i> En cours</span>`
            : (hasDates
                ? `<span class="carnet-badge closed"><i class="fas fa-check-circle"></i> Terminée</span>`
                : `<span class="carnet-badge pending"><i class="fas fa-hourglass-start"></i> Planifiée</span>`);

        const dateChips = hasDates ? `
            <div class="carnet-date-chips">
                <span class="carnet-date-chip start">
                    <i class="fas fa-play"></i> ${startStr}
                </span>
                ${endStr ? `<span class="carnet-date-chip end">
                    <i class="fas fa-flag-checkered"></i> ${endStr}
                </span>` : ""}
            </div>` : "";

        const noteHtml = exp.note
            ? `<div class="carnet-note-content">${exp.note}</div>`
            : `<p class="carnet-note-placeholder"><em>Aucune note pour cette expédition. Cliquez sur Modifier pour rédiger.</em></p>`;

        return `
        <div class="carnet-exp-section${isOpen ? " is-open" : ""}" data-exp-id="${exp.id}">
            <div class="carnet-exp-header">
                <div class="carnet-exp-title-row">
                    <h3 class="carnet-exp-title">${exp.name || "Expédition sans nom"}</h3>
                    ${statusBadge}
                </div>
                ${dateChips}
            </div>
            <div class="carnet-note-display" data-exp-id="${exp.id}">
                ${noteHtml}
            </div>
            ${canEdit ? `
            <div class="carnet-note-actions" data-exp-id="${exp.id}">
                <button type="button" class="carnet-edit-note" data-exp-id="${exp.id}">
                    <i class="fas fa-pen"></i> Modifier les notes
                </button>
            </div>` : ""}
        </div>`;
    }).join('<hr class="carnet-separator">');

    return `<div class="carnet-body">${addBar}${sections}</div>`;
}

// ================================================================
// BUILDER HTML — Onglet Expéditions
// ================================================================

export function buildDowntimeHtml(actor) {
    const exps    = getExpeditions(actor);
    const isGM    = game.user.isGM;
    const canEdit = actor.isOwner;

    const addBar = isGM ? `
        <div class="carnet-add-bar">
            <button type="button" class="carnet-add-exp" data-source="downtime">
                <i class="fas fa-plus"></i> Nouvelle expédition
            </button>
        </div>` : "";

    if (!exps.length) {
        return `
        <div class="carnet-body">
            ${addBar}
            <div class="carnet-empty-state">
                <i class="fas fa-calendar-alt"></i>
                <p>Aucune expédition enregistrée.<br>
                Le GM peut enregistrer la date de début via le bouton
                <strong>Date Expédition</strong> dans la barre de gauche.</p>
            </div>
        </div>`;
    }

    // Boutons d'édition de date — GM uniquement
    const dateBtns = (expId, field) => isGM ? `
        <div class="carnet-date-actions">
            <button type="button" class="carnet-date-btn"
                    data-exp-id="${expId}" data-field="${field}" data-action="set"
                    title="Définir à la date actuelle">
                <i class="fas fa-calendar-day"></i>
            </button>
            <button type="button" class="carnet-date-btn"
                    data-exp-id="${expId}" data-field="${field}" data-action="clear"
                    title="Effacer la date">
                <i class="fas fa-times"></i>
            </button>
        </div>` : "";

    const cards = exps.map(exp => {
        const isOpen   = !!(exp.startDate && !exp.endDate);
        const hasDates = !!(exp.startDate);
        const startStr = formatDate(exp.startDate);
        const endStr   = exp.endDate ? formatDate(exp.endDate) : null;
        const duration = dateDiff(exp.startDate, exp.endDate);

        const statusClass = isOpen ? "open" : (hasDates ? "closed" : "pending");
        const statusLabel = isOpen ? "En cours" : (hasDates ? "Terminée" : "Planifiée");
        const statusIcon  = isOpen ? "fa-clock" : (hasDates ? "fa-check-circle" : "fa-hourglass-start");

        const nameField = canEdit
            ? `<input class="carnet-name-input" type="text"
                      data-exp-id="${exp.id}"
                      value="${(exp.name ?? "").replace(/"/g, "&quot;")}"
                      placeholder="Nom de l'expédition">`
            : `<span class="carnet-name-label">${exp.name || "Expédition sans nom"}</span>`;

        return `
        <div class="carnet-tm-card ${statusClass}" data-exp-id="${exp.id}">
            <div class="carnet-tm-stripe"></div>
            <div class="carnet-tm-content">

                <div class="carnet-tm-header">
                    <div class="carnet-tm-name-wrap">${nameField}</div>
                    <div class="carnet-tm-header-right">
                        <span class="carnet-badge ${statusClass}">
                            <i class="fas ${statusIcon}"></i> ${statusLabel}
                        </span>
                        <a class="carnet-to-journal" href="#" data-exp-id="${exp.id}"
                           title="Voir les notes dans le Carnet">
                            <i class="fas fa-book-open"></i>
                        </a>
                        ${isGM ? `
                        <a class="carnet-del-exp" href="#" data-exp-id="${exp.id}" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </a>` : ""}
                    </div>
                </div>

                <div class="carnet-tm-dates">
                    <div class="carnet-date-block">
                        <span class="carnet-date-label">
                            <i class="fas fa-play"></i> Début
                        </span>
                        <span class="carnet-date-value${!exp.startDate ? " empty" : ""}">
                            ${startStr}
                        </span>
                        ${dateBtns(exp.id, "startDate")}
                    </div>

                    <span class="carnet-dates-sep"><i class="fas fa-long-arrow-alt-right"></i></span>

                    <div class="carnet-date-block">
                        <span class="carnet-date-label">
                            <i class="fas fa-flag-checkered"></i> Fin
                        </span>
                        <span class="carnet-date-value${!exp.endDate ? " empty" : ""}">
                            ${endStr ?? "—"}
                        </span>
                        ${dateBtns(exp.id, "endDate")}
                    </div>

                    ${duration ? `
                    <div class="carnet-date-block duration">
                        <span class="carnet-date-label">
                            <i class="fas fa-hourglass-half"></i> Durée
                        </span>
                        <span class="carnet-duration-value">${duration}</span>
                    </div>` : ""}
                </div>

            </div>
        </div>`;
    }).join("");

    return `
    <div class="carnet-body">
        ${addBar}
        <div class="carnet-tm-cards">${cards}</div>
    </div>`;
}

// ================================================================
// CÂBLAGE — Onglet Journal
// ================================================================

export function wireJournalTab(actor, element, sheet) {
    if (!(element instanceof Element)) return;

    element.querySelectorAll('.carnet-edit-note').forEach(btn => {
        btn.addEventListener('click', () => {
            initNoteEditor(actor, element, btn.dataset.expId);
        });
    });

    element.querySelectorAll('.carnet-add-exp').forEach(btn => {
        btn.addEventListener('click', async () => {
            await addExpedition(actor, null);
        });
    });
}

// ================================================================
// CÂBLAGE — Onglet Expéditions
// ================================================================

export function wireDowntimeTab(actor, element, sheet) {
    if (!(element instanceof Element)) return;

    // Renommer une expédition
    element.querySelectorAll('.carnet-name-input').forEach(input => {
        input.addEventListener('change', async (e) => {
            const expId   = input.dataset.expId;
            const updated = getExpeditions(actor).map(ex =>
                ex.id === expId ? { ...ex, name: e.target.value.trim() || "Expédition sans nom" } : ex
            );
            await actor.setFlag(MODULE, "expeditions", updated);
        });
    });

    // Boutons date (set / clear) — GM uniquement
    element.querySelectorAll('.carnet-date-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                const { expId, field, action } = btn.dataset;
                let newDate = null;
                if (action === "set") {
                    newDate = getCurrentDate();
                    if (!newDate) {
                        ui.notifications.warn("[Carnet] Impossible de lire la date du calendrier.");
                        return;
                    }
                }
                const updated = getExpeditions(actor).map(ex =>
                    ex.id === expId ? { ...ex, [field]: newDate } : ex
                );
                await actor.setFlag(MODULE, "expeditions", updated);
            } catch(err) {
                console.error("[Carnet] Erreur bouton date :", err);
            }
        });
    });

    // Lien → onglet Journal + scroll vers l'expédition
    element.querySelectorAll('.carnet-to-journal').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const expId = link.dataset.expId;
            if (!sheet) return;
            sheet.changeTab("carnet-journal", "primary", { updatePosition: false });
            setTimeout(() => {
                const target = sheet.element?.querySelector?.(`.carnet-exp-section[data-exp-id="${expId}"]`);
                if (!target) return;
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                target.classList.add('carnet-highlight');
                setTimeout(() => target.classList.remove('carnet-highlight'), 2000);
            }, 150);
        });
    });

    // Supprimer une expédition (GM uniquement)
    element.querySelectorAll('.carnet-del-exp').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const expId = link.dataset.expId;
            const exp   = getExpeditions(actor).find(ex => ex.id === expId);
            const ok = await Dialog.confirm({
                title:   "Supprimer l'expédition ?",
                content: `<p>Supprimer <strong>${exp?.name ?? "cette expédition"}</strong> et toutes ses notes ? Cette action est irréversible.</p>`,
                yes:     () => true,
                no:      () => false
            });
            if (!ok) return;
            await actor.setFlag(MODULE, "expeditions",
                getExpeditions(actor).filter(ex => ex.id !== expId)
            );
        });
    });

    // Ajouter une expédition (GM uniquement)
    element.querySelectorAll('.carnet-add-exp').forEach(btn => {
        btn.addEventListener('click', async () => {
            await addExpedition(actor, null);
        });
    });
}

// ================================================================
// ÉDITEUR PROSEMIRROR
// ================================================================

async function initNoteEditor(actor, container, expId) {
    const display    = container.querySelector(`.carnet-note-display[data-exp-id="${expId}"]`);
    const actionsRow = container.querySelector(`.carnet-note-actions[data-exp-id="${expId}"]`);
    if (!display || display.classList.contains('carnet-editing')) return;

    const exp     = getExpeditions(actor).find(e => e.id === expId);
    const content = exp?.note ?? "";

    display.classList.add('carnet-editing');
    if (actionsRow) actionsRow.style.display = 'none';

    const editorWrap = document.createElement('div');
    editorWrap.className = 'carnet-editor-wrap';
    display.after(editorWrap);

    let editor;
    try {
        editor = await ProseMirrorEditor.create(editorWrap, {
            plugins:  ProseMirrorEditor.defaultPlugins,
            content,
            editable: true
        });
    } catch (err) {
        console.error(`[${MODULE}] ProseMirrorEditor.create failed:`, err);
        editorWrap.remove();
        display.classList.remove('carnet-editing');
        if (actionsRow) actionsRow.style.display = '';
        return;
    }

    const btnRow = document.createElement('div');
    btnRow.className = 'carnet-editor-buttons';
    btnRow.innerHTML = `
        <button type="button" class="carnet-btn-save">
            <i class="fas fa-save"></i> Sauvegarder
        </button>
        <button type="button" class="carnet-btn-cancel">
            <i class="fas fa-times"></i> Annuler
        </button>`;
    editorWrap.after(btnRow);

    function restore(html) {
        btnRow.remove();
        editorWrap.remove();
        display.classList.remove('carnet-editing');
        const inner = display.querySelector('.carnet-note-content, .carnet-note-placeholder');
        if (inner) inner.remove();
        display.innerHTML = html
            ? `<div class="carnet-note-content">${html}</div>`
            : `<p class="carnet-note-placeholder"><em>Aucune note pour cette expédition. Cliquez sur Modifier pour rédiger.</em></p>`;
        if (actionsRow) actionsRow.style.display = '';
        actionsRow?.querySelector('.carnet-edit-note')?.addEventListener('click', () => {
            initNoteEditor(actor, container, expId);
        });
    }

    btnRow.querySelector('.carnet-btn-save').addEventListener('click', async () => {
        const html    = getEditorHtml(editor);
        const updated = getExpeditions(actor).map(e =>
            e.id === expId ? { ...e, note: html } : e
        );
        await actor.setFlag(MODULE, "expeditions", updated);
        restore(html);
    });

    btnRow.querySelector('.carnet-btn-cancel').addEventListener('click', () => {
        restore(content);
    });
}

function getEditorHtml(editor) {
    try {
        if (typeof ProseMirror !== "undefined" && ProseMirror?.DOMSerializer) {
            const div        = document.createElement('div');
            const serializer = ProseMirror.DOMSerializer.fromSchema(editor.view.state.schema);
            div.appendChild(serializer.serializeFragment(editor.view.state.doc.content));
            return div.innerHTML;
        }
    } catch {}
    return editor.view.dom.innerHTML;
}
