// ============================================================
// carnet.js — Logique principale du module carnet
//
// Deux onglets indépendants :
//   - Carnet (journal)     → flag "carnetNotes"    : [{id, title, content, linkedExpId?}]
//   - Expéditions          → flag "expeditions"    : [{id, name, startDate, endDate}]
//
// Lien optionnel : une note peut avoir linkedExpId → navigation vers l'onglet
// Expéditions + scroll sur l'expédition, et réciproquement.
//
// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
// ============================================================

const MODULE = "carnet";

// ================================================================
// EXPÉDITIONS — CRUD
// ================================================================

export function getExpeditions(actor) {
    return actor.getFlag(MODULE, "expeditions") ?? [];
}

export async function addExpedition(actor, startDate = null) {
    const exps   = getExpeditions(actor);
    const newExp = {
        id:        foundry.utils.randomID(),
        name:      "Nouvelle expédition",
        startDate: startDate ?? null,
        endDate:   null
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
// CARNET NOTES — CRUD
// ================================================================

export function getCarnetNotes(actor) {
    return actor.getFlag(MODULE, "carnetNotes") ?? [];
}

export async function addCarnetNote(actor, { title = "Nouvelle note", linkedExpId = null } = {}) {
    const notes   = getCarnetNotes(actor);
    const newNote = {
        id:          foundry.utils.randomID(),
        title,
        content:     "",
        linkedExpId: linkedExpId ?? null
    };
    await actor.setFlag(MODULE, "carnetNotes", [...notes, newNote]);
    return newNote;
}

// ================================================================
// DATES — game.time.calendar (Foundry v13 natif)
// ================================================================

export function getCurrentDate() {
    try {
        const cal = game.time?.calendar;
        if (cal) {
            const c = cal.timeToComponents(game.time.worldTime);
            return { day: c.dayOfMonth + 1, month: c.month, year: c.year };
        }
    } catch {}
    try {
        const sc = SimpleCalendar?.api?.currentDateTime?.();
        if (sc) return { day: sc.day, month: sc.month, year: sc.year };
    } catch {}
    return null;
}

function _getMonthName(month) {
    try {
        const cal = game.time?.calendar;
        if (cal?.months?.values) {
            const name = Array.from(cal.months.values)[month]?.name;
            if (name) return game.i18n.localize(name);
        }
    } catch {}
    return `Mois ${month + 1}`;
}

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

export function formatDate(dateObj) {
    if (!dateObj) return "—";
    try {
        if (typeof SimpleCalendar !== "undefined" && SimpleCalendar?.api?.formatDateTime)
            return SimpleCalendar.api.formatDateTime(dateObj);
    } catch {}
    return `${dateObj.day} ${_getMonthName(dateObj.month)} ${dateObj.year}`;
}

function _toTotalDays(date) {
    try {
        const cal = game.time?.calendar;
        if (cal?.months?.values) {
            const months      = Array.from(cal.months.values);
            const daysPerYear = months.reduce((s, m) => s + (m?.days ?? 30), 0) || 360;
            let total = (date.year ?? 1) * daysPerYear;
            for (let i = 0; i < (date.month ?? 0); i++) total += months[i]?.days ?? 30;
            return total + ((date.day ?? 1) - 1);
        }
    } catch {}
    return (date.year ?? 1) * 365 + (date.month ?? 0) * 30 + ((date.day ?? 1) - 1);
}

function dateDiff(start, end) {
    if (!start || !end) return null;
    try {
        const days = Math.abs(_toTotalDays(end) - _toTotalDays(start));
        if (isNaN(days)) return null;
        return `${days} jour${days !== 1 ? "s" : ""}`;
    } catch { return null; }
}

// ================================================================
// PARTY
// ================================================================

function _isInPjFolder(actor) {
    const folderName = game.settings.get(MODULE, "pjFolderName") || "PJ";
    let folder = actor.folder;
    while (folder) {
        if (folder.name === folderName) return true;
        folder = folder.folder;
    }
    return false;
}

function getPartyMembers() {
    try {
        return game.actors
            .filter(a => a.type === "character" && a.hasPlayerOwner && _isInPjFolder(a))
            .sort((a, b) => a.name.localeCompare(b.name));
    } catch { return []; }
}

// ================================================================
// BOUTON BARRE DE GAUCHE — crée toujours une nouvelle expédition
// ================================================================

export function CarnetToolbarHooks() {
    Hooks.on("getSceneControlButtons", (controls) => {
        if (!game.user.isGM) return;
        if (!controls.westmarch) {
            controls.westmarch = {
                name: "westmarch", title: "WestMarch",
                icon: "fa-solid fa-hammer", layer: "tokens", tools: {}
            };
        }
        controls.westmarch.tools.carnetDate = {
            name:     "carnetDate",
            title:    "Date Expédition — Nouvelle expédition (party)",
            icon:     "fa-solid fa-calendar-plus",
            button:   true,
            onChange: () => onClickDateTM(),
            visible:  true
        };
    });
}

async function onClickDateTM() {
    const currentDate = getCurrentDate();
    const preDay      = currentDate?.day   ?? 1;
    const preMo       = currentDate?.month ?? 0;
    const preYear     = currentDate?.year  ?? 1;

    const noCalWarning = !currentDate
        ? `<p style="margin:0 0 8px;font-size:11px;color:#e67e22;">
               <i class="fas fa-exclamation-triangle"></i>
               Calendrier non disponible — seule la date personnalisée est utilisable.
           </p>`
        : "";

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
                ${currentDate
                    ? `${preDay} ${_getMonthName(preMo)} ${preYear}`
                    : '<em>Calendrier non disponible</em>'}
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
    <p style="margin:0;font-size:11px;color:#aaa;padding:0 2px;">
        <i class="fas fa-info-circle"></i>
        Crée une nouvelle expédition (date de début) pour chaque PJ de la party.
    </p>
</div>`;

    let resolvedDate = null;
    const DialogClass = foundry.applications.api?.DialogV2 ?? globalThis.DialogV2;

    if (DialogClass?.wait) {
        const action = await DialogClass.wait({
            window:      { title: "Date Expédition — Nouvelle expédition" },
            position:    { width: 340 },
            content,
            rejectClose: false,
            render: () => {
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
                    label:    "Créer pour la party",
                    icon:     '<i class="fas fa-calendar-plus"></i>',
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
                { action: "cancel", label: "Annuler", icon: '<i class="fas fa-times"></i>' }
            ]
        });
        if (action !== "confirm" || !resolvedDate) return;
    } else {
        // Fallback Dialog v1
        resolvedDate = await new Promise(resolve => {
            new Dialog({
                title:   "Date Expédition — Nouvelle expédition",
                content,
                buttons: {
                    confirm: {
                        icon:  '<i class="fas fa-calendar-plus"></i>',
                        label: "Créer pour la party",
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
                    cancel: { icon: '<i class="fas fa-times"></i>', label: "Annuler", callback: () => resolve(null) }
                },
                default: "confirm"
            }, { width: 340 }).render(true);
        });
        if (!resolvedDate) return;
    }

    const members = getPartyMembers();
    if (!members.length) {
        ui.notifications.warn(`[Carnet] Aucun PJ trouvé. Les acteurs PJ doivent être dans un dossier nommé "${game.settings.get(MODULE, "pjFolderName") || "PJ"}".`);
        return;
    }

    // Toujours créer une nouvelle expédition — pas de logique de fermeture
    for (const actor of members) {
        await addExpedition(actor, resolvedDate);
    }

    const n = members.length;
    ui.notifications.info(`[Carnet] Nouvelle expédition créée pour ${n} PJ${n > 1 ? "s" : ""}.`);
}

// ================================================================
// BUILDER HTML — Onglet Carnet (notes indépendantes)
// ================================================================

export function buildJournalHtml(actor) {
    const notes   = getCarnetNotes(actor);
    const canEdit = actor.isOwner;
    const isGM    = game.user.isGM;
    const exps    = getExpeditions(actor); // pour afficher les badges de lien

    const addBar = canEdit ? `
        <div class="carnet-add-bar">
            <button type="button" class="carnet-add-note">
                <i class="fas fa-plus"></i> Ajouter une note
            </button>
        </div>` : "";

    if (!notes.length) {
        return `
        <div class="carnet-body">
            ${addBar}
            <div class="carnet-empty-state">
                <i class="fas fa-book-open"></i>
                <p>Aucune note dans le carnet.<br>
                   Utilisez le bouton ci-dessus pour rédiger votre première note.</p>
            </div>
        </div>`;
    }

    const cards = notes.map(note => {
        const linkedExp  = note.linkedExpId ? exps.find(e => e.id === note.linkedExpId) : null;
        const linkBadge  = linkedExp
            ? `<a class="carnet-go-exp" href="#" data-exp-id="${linkedExp.id}"
                  title="Voir l'expédition liée dans l'onglet Expéditions"
                  style="font-size:11px;color:#9b59b6;text-decoration:none;white-space:nowrap;">
                   <i class="fas fa-calendar-alt"></i> ${linkedExp.name || "Expédition"}
               </a>`
            : (canEdit
                ? `<a class="carnet-link-exp" href="#" data-note-id="${note.id}"
                      title="Lier cette note à une expédition"
                      style="font-size:11px;color:#666;text-decoration:none;white-space:nowrap;">
                       <i class="fas fa-link"></i> Lier à une expédition
                   </a>`
                : "");

        const noteHtml = note.content
            ? `<div class="carnet-note-content">${note.content}</div>`
            : `<p class="carnet-note-placeholder"><em>Note vide. Cliquez sur Modifier pour rédiger.</em></p>`;

        return `
        <div class="carnet-note-card" data-note-id="${note.id}">
            <div class="carnet-note-header">
                <div class="carnet-note-title-row">
                    ${canEdit
                        ? `<input class="carnet-note-title-input" type="text"
                                  data-note-id="${note.id}"
                                  value="${(note.title ?? "").replace(/"/g, "&quot;")}"
                                  placeholder="Titre de la note">`
                        : `<span class="carnet-note-title-label">${note.title || "Note sans titre"}</span>`}
                    <div class="carnet-note-actions-row">
                        ${linkBadge}
                        ${canEdit ? `
                        <a class="carnet-del-note" href="#" data-note-id="${note.id}" title="Supprimer cette note">
                            <i class="fas fa-trash"></i>
                        </a>` : ""}
                    </div>
                </div>
            </div>
            <div class="carnet-note-display" data-note-id="${note.id}">
                ${noteHtml}
            </div>
            ${canEdit ? `
            <div class="carnet-edit-actions" data-note-id="${note.id}">
                <button type="button" class="carnet-edit-note" data-note-id="${note.id}">
                    <i class="fas fa-pen"></i> Modifier
                </button>
            </div>` : ""}
        </div>`;
    }).join('<hr class="carnet-separator">');

    return `<div class="carnet-body">${addBar}${cards}</div>`;
}

// ================================================================
// BUILDER HTML — Onglet Expéditions (indépendant)
// ================================================================

export function buildDowntimeHtml(actor) {
    const exps    = getExpeditions(actor);
    const notes   = getCarnetNotes(actor); // pour reverse-lookup des liens
    const isGM    = game.user.isGM;
    const canEdit = actor.isOwner;

    const addBar = isGM ? `
        <div class="carnet-add-bar">
            <button type="button" class="carnet-add-exp">
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
                   Le GM peut en créer une via le bouton <strong>Date Expédition</strong>
                   dans la barre de gauche, ou via le bouton ci-dessus.</p>
            </div>
        </div>`;
    }

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
        const isOpen      = !!(exp.startDate && !exp.endDate);
        const hasDates    = !!(exp.startDate);
        const startStr    = formatDate(exp.startDate);
        const endStr      = exp.endDate ? formatDate(exp.endDate) : null;
        const duration    = dateDiff(exp.startDate, exp.endDate);
        const statusClass = isOpen ? "open" : (hasDates ? "closed" : "pending");
        const statusLabel = isOpen ? "En cours" : (hasDates ? "Terminée" : "Planifiée");
        const statusIcon  = isOpen ? "fa-clock" : (hasDates ? "fa-check-circle" : "fa-hourglass-start");

        // Notes liées à cette expédition
        const linkedNotes = notes.filter(n => n.linkedExpId === exp.id);
        const noteLink = linkedNotes.length
            ? `<a class="carnet-go-note" href="#" data-note-id="${linkedNotes[0].id}"
                  title="Voir la note liée dans l'onglet Carnet"
                  style="font-size:11px;color:#9b59b6;text-decoration:none;white-space:nowrap;">
                   <i class="fas fa-book-open"></i>
                   ${linkedNotes.length === 1 ? "Note liée" : `${linkedNotes.length} notes liées`}
               </a>`
            : (isGM
                ? `<a class="carnet-create-note" href="#" data-exp-id="${exp.id}" data-exp-name="${(exp.name ?? "").replace(/"/g, "&quot;")}"
                      title="Créer une note liée dans le Carnet"
                      style="font-size:11px;color:#666;text-decoration:none;white-space:nowrap;">
                       <i class="fas fa-plus"></i> Créer une note
                   </a>`
                : "");

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
                        ${noteLink}
                        ${isGM ? `
                        <a class="carnet-del-exp" href="#" data-exp-id="${exp.id}" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </a>` : ""}
                    </div>
                </div>

                <div class="carnet-tm-dates">
                    <div class="carnet-date-block">
                        <span class="carnet-date-label"><i class="fas fa-play"></i> Début</span>
                        <span class="carnet-date-value${!exp.startDate ? " empty" : ""}">${startStr}</span>
                        ${dateBtns(exp.id, "startDate")}
                    </div>
                    <span class="carnet-dates-sep"><i class="fas fa-long-arrow-alt-right"></i></span>
                    <div class="carnet-date-block">
                        <span class="carnet-date-label"><i class="fas fa-flag-checkered"></i> Fin</span>
                        <span class="carnet-date-value${!exp.endDate ? " empty" : ""}">${endStr ?? "—"}</span>
                        ${dateBtns(exp.id, "endDate")}
                    </div>
                    ${duration ? `
                    <div class="carnet-date-block duration">
                        <span class="carnet-date-label"><i class="fas fa-hourglass-half"></i> Durée</span>
                        <span class="carnet-duration-value">${duration}</span>
                    </div>` : ""}
                </div>

            </div>
        </div>`;
    }).join("");

    return `<div class="carnet-body">${addBar}<div class="carnet-tm-cards">${cards}</div></div>`;
}

// ================================================================
// CÂBLAGE — Onglet Carnet
// ================================================================

export function wireJournalTab(actor, element, sheet) {
    if (!(element instanceof Element)) return;

    // Ajouter une note
    element.querySelectorAll('.carnet-add-note').forEach(btn => {
        btn.addEventListener('click', async () => {
            await addCarnetNote(actor);
        });
    });

    // Renommer une note
    element.querySelectorAll('.carnet-note-title-input').forEach(input => {
        input.addEventListener('change', async () => {
            const noteId  = input.dataset.noteId;
            const updated = getCarnetNotes(actor).map(n =>
                n.id === noteId ? { ...n, title: input.value.trim() || "Note sans titre" } : n
            );
            await actor.setFlag(MODULE, "carnetNotes", updated);
        });
    });

    // Modifier le contenu (ProseMirror)
    element.querySelectorAll('.carnet-edit-note').forEach(btn => {
        btn.addEventListener('click', () => {
            initNoteEditor(actor, element, btn.dataset.noteId);
        });
    });

    // Supprimer une note
    element.querySelectorAll('.carnet-del-note').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const noteId = link.dataset.noteId;
            const note   = getCarnetNotes(actor).find(n => n.id === noteId);
            const ok = await Dialog.confirm({
                title:   "Supprimer la note ?",
                content: `<p>Supprimer <strong>${note?.title ?? "cette note"}</strong> ? Cette action est irréversible.</p>`,
                yes: () => true, no: () => false
            });
            if (!ok) return;
            await actor.setFlag(MODULE, "carnetNotes",
                getCarnetNotes(actor).filter(n => n.id !== noteId)
            );
        });
    });

    // Lier à une expédition
    element.querySelectorAll('.carnet-link-exp').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const noteId = link.dataset.noteId;
            await _linkNoteToExpDialog(actor, noteId, sheet);
        });
    });

    // Naviguer vers l'expédition liée (onglet Expéditions)
    element.querySelectorAll('.carnet-go-exp').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const expId = link.dataset.expId;
            _navigateToTab(sheet, "carnet-downtime", `[data-exp-id="${expId}"]`);
        });
    });
}

// ================================================================
// CÂBLAGE — Onglet Expéditions
// ================================================================

export function wireDowntimeTab(actor, element, sheet) {
    if (!(element instanceof Element)) return;

    // Ajouter une expédition
    element.querySelectorAll('.carnet-add-exp').forEach(btn => {
        btn.addEventListener('click', async () => {
            await addExpedition(actor, null);
        });
    });

    // Renommer une expédition
    element.querySelectorAll('.carnet-name-input').forEach(input => {
        input.addEventListener('change', async () => {
            const expId   = input.dataset.expId;
            const updated = getExpeditions(actor).map(ex =>
                ex.id === expId ? { ...ex, name: input.value.trim() || "Expédition sans nom" } : ex
            );
            await actor.setFlag(MODULE, "expeditions", updated);
        });
    });

    // Boutons date (set / clear)
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

    // Supprimer une expédition
    element.querySelectorAll('.carnet-del-exp').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const expId = link.dataset.expId;
            const exp   = getExpeditions(actor).find(ex => ex.id === expId);
            const ok = await Dialog.confirm({
                title:   "Supprimer l'expédition ?",
                content: `<p>Supprimer <strong>${exp?.name ?? "cette expédition"}</strong> ? Cette action est irréversible.</p>`,
                yes: () => true, no: () => false
            });
            if (!ok) return;
            await actor.setFlag(MODULE, "expeditions",
                getExpeditions(actor).filter(ex => ex.id !== expId)
            );
        });
    });

    // Créer une note liée depuis l'onglet Expéditions
    element.querySelectorAll('.carnet-create-note').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const expId   = link.dataset.expId;
            const expName = link.dataset.expName;
            await addCarnetNote(actor, { title: expName || "Nouvelle note", linkedExpId: expId });
            // Naviguer vers l'onglet Carnet
            _navigateToTab(sheet, "carnet-journal", null);
        });
    });

    // Naviguer vers la note liée (onglet Carnet)
    element.querySelectorAll('.carnet-go-note').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const noteId = link.dataset.noteId;
            _navigateToTab(sheet, "carnet-journal", `[data-note-id="${noteId}"]`);
        });
    });
}

// ================================================================
// NAVIGATION ENTRE ONGLETS
// ================================================================

function _navigateToTab(sheet, tabName, scrollSelector) {
    if (!sheet) return;
    try {
        sheet.changeTab(tabName, "primary", { updatePosition: false });
        if (!scrollSelector) return;
        setTimeout(() => {
            const el = sheet.element?.querySelector?.(scrollSelector);
            if (!el) return;
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            el.classList.add("carnet-highlight");
            setTimeout(() => el.classList.remove("carnet-highlight"), 2000);
        }, 150);
    } catch(err) {
        console.error("[Carnet] Erreur navigation onglet :", err);
    }
}

// ================================================================
// PICKER — Lier une note à une expédition
// ================================================================

async function _linkNoteToExpDialog(actor, noteId, sheet) {
    const exps = getExpeditions(actor);
    if (!exps.length) {
        ui.notifications.warn("[Carnet] Aucune expédition à lier. Créez d'abord une expédition dans l'onglet Expéditions.");
        return;
    }

    const itemsHtml = exps.map(ex => {
        const isOpen      = !!(ex.startDate && !ex.endDate);
        const hasDates    = !!(ex.startDate);
        const statusLabel = isOpen ? "En cours" : (hasDates ? "Terminée" : "Planifiée");
        const statusIcon  = isOpen ? "fa-clock" : (hasDates ? "fa-check-circle" : "fa-hourglass-start");
        const statusColor = isOpen
            ? "background:rgba(46,204,113,0.18);color:#2ecc71;"
            : hasDates
                ? "background:rgba(52,152,219,0.18);color:#3498db;"
                : "background:rgba(241,196,15,0.18);color:#f1c40f;";
        const dateStr = ex.startDate ? formatDate(ex.startDate) : "Pas de date";

        return `
        <div class="carnet-picker-item" tabindex="0"
             data-id="${ex.id}"
             data-search="${(ex.name ?? "").toLowerCase()} ${dateStr.toLowerCase()}"
             style="display:flex;align-items:center;gap:12px;padding:10px 12px;
                    border-radius:6px;cursor:pointer;user-select:none;
                    border:2px solid transparent;
                    background:rgba(255,255,255,0.03);
                    transition:background 0.12s,border-color 0.12s;outline:none;">
            <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;
                        display:flex;align-items:center;justify-content:center;
                        background:rgba(155,89,182,0.15);">
                <i class="fas fa-route" style="color:#9b59b6;"></i>
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${ex.name || "Expédition sans nom"}
                </div>
                <div style="font-size:11px;color:#9b9b9b;margin-top:3px;display:flex;align-items:center;gap:6px;">
                    <span style="padding:1px 7px;border-radius:10px;font-size:10px;font-weight:600;${statusColor}">
                        <i class="fas ${statusIcon}" style="margin-right:3px;"></i>${statusLabel}
                    </span>
                    <span>${dateStr}</span>
                </div>
            </div>
            <div class="carnet-picker-check" style="flex-shrink:0;opacity:0;transition:opacity 0.12s;">
                <i class="fas fa-check-circle" style="color:#9b59b6;font-size:18px;"></i>
            </div>
        </div>`;
    }).join("");

    const content = `
<div style="display:flex;flex-direction:column;gap:8px;padding:2px 0;">
    <div style="position:relative;">
        <i class="fas fa-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
                                         color:#777;pointer-events:none;font-size:12px;"></i>
        <input type="text" id="carnet-exp-search"
               placeholder="Rechercher une expédition…"
               style="width:100%;box-sizing:border-box;padding:7px 10px 7px 32px;
                      background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.12);
                      border-radius:6px;color:inherit;font-size:13px;">
    </div>
    <div id="carnet-exp-list"
         style="display:flex;flex-direction:column;gap:3px;
                max-height:320px;overflow-y:auto;padding-right:2px;">
        ${itemsHtml}
    </div>
    <p id="carnet-exp-empty" style="display:none;text-align:center;
                                     color:#777;font-style:italic;padding:16px 0;margin:0;">
        Aucune expédition correspondante.
    </p>
</div>`;

    let selectedId = null;

    const DialogClass = foundry.applications.api?.DialogV2 ?? globalThis.DialogV2;

    if (DialogClass?.wait) {
        const action = await DialogClass.wait({
            window:      { title: "Lier à une expédition" },
            position:    { width: 420 },
            content,
            rejectClose: false,
            render: () => {
                const list        = document.getElementById("carnet-exp-list");
                const searchInput = document.getElementById("carnet-exp-search");
                const emptyMsg    = document.getElementById("carnet-exp-empty");

                const selectItem = (item) => {
                    list?.querySelectorAll(".carnet-picker-item").forEach(i => {
                        i.style.background  = "rgba(255,255,255,0.03)";
                        i.style.borderColor = "transparent";
                        i.querySelector(".carnet-picker-check").style.opacity = "0";
                    });
                    selectedId                  = item.dataset.id;
                    item.style.background       = "rgba(155,89,182,0.14)";
                    item.style.borderColor      = "rgba(155,89,182,0.45)";
                    item.querySelector(".carnet-picker-check").style.opacity = "1";
                };

                list?.querySelectorAll(".carnet-picker-item").forEach(item => {
                    item.addEventListener("click",  () => selectItem(item));
                    item.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") selectItem(item); });
                    item.addEventListener("mouseenter", () => {
                        if (item.dataset.id !== selectedId)
                            item.style.background = "rgba(255,255,255,0.07)";
                    });
                    item.addEventListener("mouseleave", () => {
                        if (item.dataset.id !== selectedId)
                            item.style.background = "rgba(255,255,255,0.03)";
                    });
                });

                searchInput?.addEventListener("input", () => {
                    const q  = searchInput.value.toLowerCase().trim();
                    let hits = 0;
                    list?.querySelectorAll(".carnet-picker-item").forEach(item => {
                        const match = !q || item.dataset.search.includes(q);
                        item.style.display = match ? "" : "none";
                        if (match) hits++;
                    });
                    if (emptyMsg) emptyMsg.style.display = hits === 0 ? "" : "none";
                });

                setTimeout(() => searchInput?.focus(), 60);
            },
            buttons: [
                {
                    action:   "confirm",
                    label:    "Lier",
                    icon:     '<i class="fas fa-link"></i>',
                    default:  true,
                    callback: () => {} // selectedId mis à jour via click
                },
                { action: "cancel", label: "Annuler", icon: '<i class="fas fa-times"></i>' }
            ]
        });
        if (action !== "confirm" || !selectedId) return;

    } else {
        // Fallback Dialog v1 — simple select
        const opts = exps.map(ex =>
            `<option value="${ex.id}">${ex.name || "Expédition sans nom"} — ${formatDate(ex.startDate)}</option>`
        ).join("");
        selectedId = await new Promise(resolve => {
            new Dialog({
                title:   "Lier à une expédition",
                content: `<div><select id="carnet-fb-sel" style="width:100%;">${opts}</select></div>`,
                buttons: {
                    confirm: { label: "Lier", callback: (html) => resolve(html.find('#carnet-fb-sel').val()) },
                    cancel:  { label: "Annuler", callback: () => resolve(null) }
                },
                default: "confirm"
            }, { width: 360 }).render(true);
        });
        if (!selectedId) return;
    }

    const updated = getCarnetNotes(actor).map(n =>
        n.id === noteId ? { ...n, linkedExpId: selectedId } : n
    );
    await actor.setFlag(MODULE, "carnetNotes", updated);
}

// ================================================================
// ÉDITEUR PROSEMIRROR (inline sur une note)
// ================================================================

async function initNoteEditor(actor, container, noteId) {
    const display    = container.querySelector(`.carnet-note-display[data-note-id="${noteId}"]`);
    const actionsRow = container.querySelector(`.carnet-edit-actions[data-note-id="${noteId}"]`);
    if (!display || display.classList.contains('carnet-editing')) return;

    const note    = getCarnetNotes(actor).find(n => n.id === noteId);
    const content = note?.content ?? "";

    display.classList.add('carnet-editing');
    if (actionsRow) actionsRow.style.display = 'none';

    const editorWrap = document.createElement('div');
    editorWrap.className = 'carnet-editor-wrap';
    display.after(editorWrap);

    // Snapshot des .editor-menu existants avant la création de l'éditeur.
    // Foundry v13 injecte parfois le menu dans le PARENT de editorWrap
    // (pas à l'intérieur). On le détecte et on le rapatrie dans editorWrap
    // pour qu'il soit retiré proprement avec editorWrap.remove().
    const menusBefore = new Set(document.querySelectorAll('.editor-menu'));

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

    // Déplace dans editorWrap tout menu orphelin créé par ProseMirror
    for (const menu of document.querySelectorAll('.editor-menu')) {
        if (!menusBefore.has(menu) && !editorWrap.contains(menu)) {
            editorWrap.prepend(menu);
        }
    }

    const btnRow = document.createElement('div');
    btnRow.className = 'carnet-editor-buttons';
    btnRow.innerHTML = `
        <button type="button" class="carnet-btn-save"><i class="fas fa-save"></i> Sauvegarder</button>
        <button type="button" class="carnet-btn-cancel"><i class="fas fa-times"></i> Annuler</button>`;
    editorWrap.after(btnRow);

    function restore(html) {
        btnRow.remove();
        editorWrap.remove();
        display.classList.remove('carnet-editing');
        display.innerHTML = html
            ? `<div class="carnet-note-content">${html}</div>`
            : `<p class="carnet-note-placeholder"><em>Note vide. Cliquez sur Modifier pour rédiger.</em></p>`;
        if (actionsRow) actionsRow.style.display = '';
        actionsRow?.querySelector('.carnet-edit-note')?.addEventListener('click', () => {
            initNoteEditor(actor, container, noteId);
        });
    }

    btnRow.querySelector('.carnet-btn-save').addEventListener('click', async () => {
        const html    = _getEditorHtml(editor);
        const updated = getCarnetNotes(actor).map(n =>
            n.id === noteId ? { ...n, content: html } : n
        );
        await actor.setFlag(MODULE, "carnetNotes", updated);
        restore(html);
    });

    btnRow.querySelector('.carnet-btn-cancel').addEventListener('click', () => restore(content));
}

function _getEditorHtml(editor) {
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
