// ============================================================
// carnet.js — Logique principale du module carnet
//
// - Helpers données (flags acteur)
// - Helpers dates (Simple Calendar)
// - Helpers party (westmarch)
// - Builders HTML onglets (journal + temps morts)
// - Câblage événements
// - Éditeur ProseMirror inline
// - Bouton barre de gauche GM "Date du TM"
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
// DATES — Simple Calendar
// ================================================================

export function getCurrentDate() {
    return SimpleCalendar?.api?.currentDateTime?.() ?? null;
}

export function formatDate(dateObj) {
    if (!dateObj) return "—";
    if (typeof SimpleCalendar !== "undefined" && SimpleCalendar?.api?.formatDateTime) {
        try { return SimpleCalendar.api.formatDateTime(dateObj); } catch {}
    }
    return `${dateObj.day}/${dateObj.month}/${dateObj.year}`;
}

function dateDiff(start, end) {
    if (!start || !end) return null;
    if (start.timestamp !== undefined && end.timestamp !== undefined) {
        const days = Math.round(Math.abs(end.timestamp - start.timestamp) / 86400);
        return `${days} jour${days !== 1 ? "s" : ""}`;
    }
    return null;
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

        // S'appuyer sur le groupe westmarch existant (westmarch-ashara),
        // ou le créer si ce module n'est pas actif.
        if (!controls.westmarch) {
            controls.westmarch = {
                name:       "westmarch-ashara",
                title:      "WestMarch",
                icon:       "fa-solid fa-hammer",
                layer:      "tokens",
                activeTool: "dummy",
                tools:      { dummy: { name: "dummy", title: "", icon: "fa-solid fa-hammer", visible: false } }
            };
        }

        controls.westmarch.tools.carnetDate = {
            name:    "carnetDate",
            title:   "Date du TM — Début/Fin d'expédition (party)",
            icon:    "fa-solid fa-calendar-plus",
            button:  true,
            onClick: onClickDateTM,
            visible: true
        };
    });
}

async function onClickDateTM() {
    const currentDate = getCurrentDate();
    const currentStr  = currentDate ? formatDate(currentDate) : null;

    // Valeurs pré-remplies pour la date custom (= date actuelle si dispo, sinon 1/1/1)
    const preDay   = currentDate?.day   ?? 1;
    const preMo    = currentDate != null ? currentDate.month + 1 : 1;  // affichage 1-indexé
    const preYear  = currentDate?.year  ?? 1;

    const scUnavailable = !currentDate
        ? `<p style="margin:0 0 8px;font-size:11px;color:#e67e22;">
               <i class="fas fa-exclamation-triangle"></i>
               Simple Calendar non disponible — seule la date personnalisée est possible.
           </p>`
        : "";

    const content = `
    <form class="carnet-tm-dialog" style="display:flex;flex-direction:column;gap:10px;padding:4px 0;">
        ${scUnavailable}

        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 10px;
                       border-radius:5px;border:1px solid rgba(255,255,255,0.08);
                       background:rgba(255,255,255,0.03);">
            <input type="radio" name="tm-mode" value="current"
                   ${currentDate ? "checked" : "disabled"}
                   style="margin:0;flex-shrink:0;">
            <span style="flex:1;">
                <span style="font-weight:600;">Date actuelle</span><br>
                <span style="font-size:11px;color:#aaa;">
                    ${currentStr ?? '<em>Simple Calendar requis</em>'}
                </span>
            </span>
        </label>

        <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;padding:8px 10px;
                       border-radius:5px;border:1px solid rgba(255,255,255,0.08);
                       background:rgba(255,255,255,0.03);">
            <input type="radio" name="tm-mode" value="custom"
                   ${!currentDate ? "checked" : ""}
                   style="margin:3px 0 0;flex-shrink:0;">
            <span style="flex:1;">
                <span style="font-weight:600;">Date personnalisée</span><br>
                <div class="carnet-custom-date" style="display:flex;gap:6px;align-items:center;margin-top:6px;">
                    <input type="number" name="tm-day"   min="1" max="31" value="${preDay}"
                           style="width:54px;" placeholder="Jour">
                    <span style="color:#666;">/</span>
                    <input type="number" name="tm-month" min="1" max="12" value="${preMo}"
                           style="width:54px;" placeholder="Mois">
                    <span style="color:#666;">/</span>
                    <input type="number" name="tm-year"  value="${preYear}"
                           style="width:72px;" placeholder="Année">
                </div>
            </span>
        </label>
    </form>`;

    const date = await new Promise(resolve => {
        new Dialog({
            title:   "Date du TM — Début / Fin d'expédition",
            content,
            buttons: {
                confirm: {
                    icon:  '<i class="fas fa-calendar-check"></i>',
                    label: "Appliquer à la party",
                    callback: (html) => {
                        const mode = html.find('[name="tm-mode"]:checked').val();
                        if (mode === "current") { resolve(currentDate); return; }

                        const day   = parseInt(html.find('[name="tm-day"]').val())   || 1;
                        const month = (parseInt(html.find('[name="tm-month"]').val()) || 1) - 1; // 0-indexé
                        const year  = parseInt(html.find('[name="tm-year"]').val())  || 1;

                        // Tenter d'obtenir le timestamp via Simple Calendar
                        let timestamp;
                        try { timestamp = SimpleCalendar.api.dateToTimestamp({ year, month, day }); } catch {}

                        resolve({ year, month, day, hour: 0, minute: 0, second: 0, ...(timestamp != null ? { timestamp } : {}) });
                    }
                },
                cancel: {
                    icon:  '<i class="fas fa-times"></i>',
                    label: "Annuler",
                    callback: () => resolve(null)
                }
            },
            default: "confirm"
        }, { width: 320 }).render(true);
    });

    if (!date) return;

    const members = getPartyMembers();
    if (!members.length) {
        ui.notifications.warn("[Carnet] Aucun membre dans la party. Vérifier le paramètre 'Party master' de westmarch.");
        return;
    }

    let opened = 0, closed = 0;
    for (const actor of members) {
        const open = getOpenExpedition(actor);
        if (open) {
            await closeExpedition(actor, open.id, date);
            closed++;
        } else {
            await addExpedition(actor, date);
            opened++;
        }
    }

    const parts = [];
    if (opened) parts.push(`${opened} expédition${opened > 1 ? "s" : ""} commencée${opened > 1 ? "s" : ""}`);
    if (closed) parts.push(`${closed} expédition${closed > 1 ? "s" : ""} clôturée${closed > 1 ? "s" : ""}`);
    ui.notifications.info(`[Carnet] Date du TM — ${parts.join(", ")}.`);
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
                Le GM peut créer une via le bouton <strong>Date du TM</strong>
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
// BUILDER HTML — Onglet Temps morts
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
                <strong>Date du TM</strong> dans la barre de gauche.</p>
            </div>
        </div>`;
    }

    // Boutons d'édition de date — GM uniquement
    const dateBtns = (expId, field) => isGM ? `
        <div class="carnet-date-actions">
            <button type="button" class="carnet-date-btn"
                    data-exp-id="${expId}" data-field="${field}" data-action="set"
                    title="Définir à la date actuelle (Simple Calendar)">
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
    // Modifier les notes → ouvre l'éditeur ProseMirror
    element.querySelectorAll('.carnet-edit-note').forEach(btn => {
        btn.addEventListener('click', () => {
            initNoteEditor(actor, element, btn.dataset.expId);
        });
    });

    // Ajouter une expédition
    element.querySelectorAll('.carnet-add-exp').forEach(btn => {
        btn.addEventListener('click', async () => {
            await addExpedition(actor, null);
            // La mise à jour du flag déclenche updateActor → re-render automatique
        });
    });
}

// ================================================================
// CÂBLAGE — Onglet Temps morts
// ================================================================

export function wireDowntimeTab(actor, element, sheet) {
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
            const { expId, field, action } = btn.dataset;
            let newDate = null;
            if (action === "set") {
                newDate = getCurrentDate();
                if (!newDate) {
                    ui.notifications.warn("[Carnet] Simple Calendar est requis pour définir la date.");
                    return;
                }
            }
            const updated = getExpeditions(actor).map(ex =>
                ex.id === expId ? { ...ex, [field]: newDate } : ex
            );
            await actor.setFlag(MODULE, "expeditions", updated);
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

    // Masquer la zone d'affichage et le bouton pendant l'édition
    display.classList.add('carnet-editing');
    if (actionsRow) actionsRow.style.display = 'none';

    // Conteneur éditeur
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

    // Boutons Sauvegarder / Annuler
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
        // Mettre à jour le contenu affiché sans attendre le re-render
        const inner = display.querySelector('.carnet-note-content, .carnet-note-placeholder');
        if (inner) inner.remove();
        display.innerHTML = html
            ? `<div class="carnet-note-content">${html}</div>`
            : `<p class="carnet-note-placeholder"><em>Aucune note pour cette expédition. Cliquez sur Modifier pour rédiger.</em></p>`;
        if (actionsRow) actionsRow.style.display = '';
        // Re-brancher le bouton d'édition
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
    // Fallback : innerHTML du DOM de l'éditeur
    return editor.view.dom.innerHTML;
}
