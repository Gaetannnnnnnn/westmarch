// ============================================================
// tm.js — Temps morts : déclaration joueur + validation GM
//
// Côté joueur : bouton sablier dans le header de sa fiche perso
//   → fenêtre pour déclarer compétence, maîtrise/expertise/tools,
//   dates de début/fin et test de compétence optionnel (grisé si < 5 j)
//
// Côté GM : bouton dans le groupe WestMarch de la barre de gauche
//   → fenêtre pré-remplie depuis les déclarations joueurs
//   → le GM valide et applique en un clic
// ============================================================

export function TmHooks() {

    // ---- Bouton dans le groupe WestMarch (barre de gauche, GM uniquement) ----
    Hooks.on("getSceneControlButtons", (controls) => {
        if (!game.user.isGM) return;
        if (!controls.westmarch) return;
        controls.westmarch.tools.downtime = {
            name: "downtime",
            title: "Temps morts — Gains",
            icon: "fa-solid fa-hourglass-half",
            button: true,
            onClick: () => openDowntimeDialog(),
            visible: true
        };
    });

    // ---- Bouton déclaration TM sur la fiche perso (ApplicationV2, joueurs) ----
    Hooks.on("renderApplicationV2", (app, element) => {
        if (game.user.isGM) return;
        if (!app.document || !(app.document instanceof Actor)) return;
        if (app.document.type !== "character") return;
        if (!app.document.isOwner) return;

        const header = element.querySelector(".window-header");
        if (!header || header.querySelector(".westmarch-tm-declare")) return;

        const actor  = app.document;
        const tmFlag = actor.getFlag("westmarch", "tm");
        const btn    = document.createElement("button");
        btn.type = "button";
        btn.classList.add("header-control", "icon", "fa-solid", "fa-hourglass-half", "westmarch-tm-declare");
        btn.setAttribute("aria-label", "Temps mort");
        btn.dataset.tooltip = tmFlag?.declared
            ? `TM déclaré : ${tmFlag.choiceLabel} (${tmFlag.dateRangeLabel ?? (tmFlag.days ?? "?") + " j"})`
            : "Déclarer mon activité TM";
        if (tmFlag?.declared) btn.style.color = "#2ecc71";
        btn.addEventListener("click", () => openDeclarationDialog(actor));

        const closeBtn = header.querySelector('[data-action="close"]');
        if (closeBtn) closeBtn.before(btn); else header.appendChild(btn);
    });

    // ---- Fallback : fiche perso non-ApplicationV2 (joueurs) ----
    Hooks.on("renderActorSheet", (app, html) => {
        if (game.user.isGM) return;
        if (app.actor?.type !== "character" || !app.actor?.isOwner) return;

        const header = $(html).find(".window-header");
        if (!header.length || header.find(".westmarch-tm-declare").length) return;

        const actor  = app.actor;
        const tmFlag = actor.getFlag("westmarch", "tm");
        const color  = tmFlag?.declared ? ' style="color:#2ecc71;"' : '';
        const tip    = tmFlag?.declared
            ? `TM déclaré : ${tmFlag.choiceLabel} (${tmFlag.dateRangeLabel ?? (tmFlag.days ?? "?") + " j"})`
            : "Déclarer mon activité TM";
        const btn = $(`<button type="button" class="header-control icon fa-solid fa-hourglass-half westmarch-tm-declare" data-tooltip="${tip}" aria-label="Temps mort"${color}></button>`);
        btn.on("click", () => openDeclarationDialog(actor));

        const closeBtn = header.find('[data-action="close"]');
        if (closeBtn.length) closeBtn.first().before(btn); else header.append(btn);
    });
}

// ============================================================
// Utilitaires communs
// ============================================================

function buildSkillOptionsHtml(selectedId = null) {
    return Object.entries(CONFIG.DND5E.skills)
        .map(([id, data]) => ({
            id,
            label: game.i18n.localize(data.label),
            abilityAbbr: (game.i18n.localize(
                CONFIG.DND5E.abilities[data.ability]?.abbreviation ?? data.ability
            ) ?? data.ability).toUpperCase()
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
        .map(s => `<option value="${s.id}" ${s.id === selectedId ? "selected" : ""}>${s.label} (${s.abilityAbbr})</option>`)
        .join("");
}

function buildMonthOptionsHtml(selectedMonth = 0) {
    const cal = game.time?.calendar;
    if (!cal?.months?.values) {
        return `<option value="${selectedMonth}">Mois ${selectedMonth + 1}</option>`;
    }
    return Array.from(cal.months.values).map((m, i) => {
        const name = game.i18n.localize(m?.name ?? `Mois ${i + 1}`);
        return `<option value="${i}"${i === selectedMonth ? " selected" : ""}>${name}</option>`;
    }).join("");
}

function getAbilityLabel(skillId) {
    const abilityId = CONFIG.DND5E.skills[skillId]?.ability ?? "int";
    return game.i18n.localize(CONFIG.DND5E.abilities[abilityId]?.label ?? abilityId);
}

function getMonthName(monthIndex) {
    const cal = game.time?.calendar;
    if (!cal?.months?.values) return `Mois ${monthIndex + 1}`;
    return game.i18n.localize(cal.months.values[monthIndex]?.name ?? `Mois ${monthIndex + 1}`);
}

function getPlayerActors() {
    return game.actors
        .filter(a => a.type === "character" && a.hasPlayerOwner)
        .sort((a, b) => a.name.localeCompare(b.name));
}

function getActorOwners(actor) {
    return game.users.filter(u => !u.isGM && actor.ownership[u.id] === 3);
}

function getProfLevel(actor, skillId) {
    const s = actor.system.skills?.[skillId];
    return s?.prof?.multiplier ?? s?.proficient ?? 0;
}

function calcDailyRate(actor, skillId, hasMaitrise, hasExpertise, hasTools) {
    const abilityId  = CONFIG.DND5E.skills[skillId]?.ability ?? "int";
    const abilityMod = actor.system.abilities[abilityId]?.mod ?? 0;
    const profBonus  = hasTools ? 4 : hasExpertise ? 4 : hasMaitrise ? 2 : 0;
    return Math.max(0, 1 + abilityMod + profBonus);
}

// Convertit une date du calendrier en nombre total de jours depuis l'an 0
// (pour calculer des différences). month0 = 0-indexé, day = 1-indexé.
function calDateToTotalDays(year, month0, day) {
    const cal    = game.time?.calendar;
    const months = cal?.months?.values ? Array.from(cal.months.values) : [];
    const daysPerYear = months.reduce((s, m) => s + (m?.days ?? 30), 0) || 360;

    let total = year * daysPerYear;
    for (let i = 0; i < month0; i++) {
        total += months[i]?.days ?? 30;
    }
    return total + (day - 1); // day est 1-indexé
}

function getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear) {
    const start = calDateToTotalDays(sYear, sMonth, sDay);
    const end   = calDateToTotalDays(eYear, eMonth, eDay);
    return Math.max(1, end - start + 1);
}

function getCurrentCalDate() {
    try {
        const cal = game.time?.calendar;
        if (!cal) return null;
        const c = cal.timeToComponents(game.time.worldTime);
        return { day: c.dayOfMonth + 1, month: c.month, year: c.year };
    } catch(e) {
        return null;
    }
}

// ============================================================
// Blocs HTML réutilisables
// ============================================================

function skillRowHtml(idPrefix, selectedSkillId) {
    const abilityLabel = getAbilityLabel(selectedSkillId ?? Object.keys(CONFIG.DND5E.skills)[0]);
    return `
<div style="display:flex; gap:6px; align-items:center;">
    <label style="min-width:90px; white-space:nowrap;">Compétence :</label>
    <select name="tm-skill-${idPrefix}" style="flex:1;">${buildSkillOptionsHtml(selectedSkillId)}</select>
</div>
<div class="tm-ability-${idPrefix}" style="font-size:0.85em; color:#888; margin-left:96px; margin-top:-2px;">
    Caractéristique : ${abilityLabel}
</div>`;
}

function profRowHtml(idPrefix, hasMaitrise, hasExpertise, hasTools) {
    const profBlocked  = hasTools;
    const toolsBlocked = hasMaitrise || hasExpertise;
    const expBlocked   = profBlocked || !hasMaitrise;

    const profOp  = profBlocked  ? "0.4" : "1";
    const toolsOp = toolsBlocked ? "0.4" : "1";

    return `
<div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
    <label style="display:flex; align-items:center; gap:5px; cursor:pointer; opacity:${profOp};">
        <input type="checkbox" name="tm-maitrise-${idPrefix}"
               ${hasMaitrise && !hasTools ? "checked" : ""}
               ${profBlocked ? "disabled" : ""} style="margin:0;">
        Maîtrise <em style="color:#888;">(+2 po/j)</em>
    </label>
    <label style="display:flex; align-items:center; gap:5px; cursor:pointer; opacity:${profOp};">
        <input type="checkbox" name="tm-expertise-${idPrefix}"
               ${hasExpertise && !hasTools ? "checked" : ""}
               ${expBlocked ? "disabled" : ""} style="margin:0;">
        Expertise <em style="color:#888;">(+2 po/j)</em>
    </label>
    <span style="color:#888; font-style:italic;">ou</span>
    <label style="display:flex; align-items:center; gap:5px; cursor:pointer; opacity:${toolsOp};">
        <input type="checkbox" name="tm-tools-${idPrefix}"
               ${hasTools ? "checked" : ""}
               ${toolsBlocked ? "disabled" : ""} style="margin:0;">
        Tools <em style="color:#888;">(+4 po/j)</em>
    </label>
</div>`;
}

function previewHtml(idPrefix) {
    return `<div class="tm-preview-${idPrefix}" style="color:#888; font-style:italic; font-size:0.9em;">—</div>`;
}

function dateAndRollHtml(idPrefix, sDay, sMonth, sYear, eDay, eMonth, eYear, preDoRoll) {
    const days         = getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);
    const tooFew       = days < 5;
    const rollDisabled = tooFew ? " disabled" : "";
    const rollChecked  = preDoRoll && !tooFew ? " checked" : "";
    const rollOpacity  = tooFew ? " opacity:0.4;" : "";
    return `
<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
    <label style="min-width:90px; white-space:nowrap;">Date début :</label>
    <input type="number" name="tm-sday-${idPrefix}" value="${sDay}" min="1" max="30" style="width:50px;">
    <select name="tm-smonth-${idPrefix}">${buildMonthOptionsHtml(sMonth)}</select>
    <input type="number" name="tm-syear-${idPrefix}" value="${sYear}" min="1" style="width:70px;">
</div>
<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
    <label style="min-width:90px; white-space:nowrap;">Date fin :</label>
    <input type="number" name="tm-eday-${idPrefix}" value="${eDay}" min="1" max="30" style="width:50px;">
    <select name="tm-emonth-${idPrefix}">${buildMonthOptionsHtml(eMonth)}</select>
    <input type="number" name="tm-eyear-${idPrefix}" value="${eYear}" min="1" style="width:70px;">
</div>
<div class="tm-daycount-${idPrefix}" style="font-size:0.85em; color:#888; margin-left:96px; margin-top:-2px;">
    → ${days} jour${days > 1 ? "s" : ""}
</div>
<div class="tm-d20-row-${idPrefix}" style="display:flex; gap:6px; align-items:center;${rollOpacity}">
    <input type="checkbox" name="tm-roll-${idPrefix}"${rollChecked}${rollDisabled} style="margin:0;">
    <label style="margin:0;">Test de compétence <em style="color:#888;">(≥ 5 jours requis)</em></label>
</div>`;
}

// ============================================================
// Câblage dynamique (dates, d20, proficiencies, preview)
// ============================================================

function wireControls(html, actor, idPrefix) {

    function getDays() {
        const sDay   = Math.max(1, parseInt(html.find(`[name="tm-sday-${idPrefix}"]`).val())   || 1);
        const sMonth = parseInt(html.find(`[name="tm-smonth-${idPrefix}"]`).val()) || 0;
        const sYear  = Math.max(1, parseInt(html.find(`[name="tm-syear-${idPrefix}"]`).val())  || 1);
        const eDay   = Math.max(1, parseInt(html.find(`[name="tm-eday-${idPrefix}"]`).val())   || 1);
        const eMonth = parseInt(html.find(`[name="tm-emonth-${idPrefix}"]`).val()) || 0;
        const eYear  = Math.max(1, parseInt(html.find(`[name="tm-eyear-${idPrefix}"]`).val())  || 1);
        return getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);
    }

    function refreshDayCount() {
        const days = getDays();
        html.find(`.tm-daycount-${idPrefix}`).text(`→ ${days} jour${days > 1 ? "s" : ""}`);
    }

    function refreshD20() {
        const tooFew = getDays() < 5;
        const d20box = html.find(`[name="tm-roll-${idPrefix}"]`);
        d20box.prop("disabled", tooFew);
        if (tooFew) d20box.prop("checked", false);
        html.find(`.tm-d20-row-${idPrefix}`).css("opacity", tooFew ? "0.4" : "1");
    }

    function refreshPreview() {
        const skillId      = html.find(`[name="tm-skill-${idPrefix}"]`).val();
        const hasMaitrise  = html.find(`[name="tm-maitrise-${idPrefix}"]`).prop("checked");
        const hasExpertise = html.find(`[name="tm-expertise-${idPrefix}"]`).prop("checked");
        const hasTools     = html.find(`[name="tm-tools-${idPrefix}"]`).prop("checked");
        const days         = getDays();
        const rate         = calcDailyRate(actor, skillId, hasMaitrise, hasExpertise, hasTools);
        html.find(`.tm-preview-${idPrefix}`)
            .text(`≈ ${rate} po/jour → ${Math.round(rate * days)} po sur ${days} jour${days > 1 ? "s" : ""}`);
    }

    function refreshAbility() {
        const skillId = html.find(`[name="tm-skill-${idPrefix}"]`).val();
        html.find(`.tm-ability-${idPrefix}`).text(`Caractéristique : ${getAbilityLabel(skillId)}`);
    }

    function refreshProf() {
        const hasMaitrise  = html.find(`[name="tm-maitrise-${idPrefix}"]`).prop("checked");
        const hasExpertise = html.find(`[name="tm-expertise-${idPrefix}"]`).prop("checked");
        const hasTools     = html.find(`[name="tm-tools-${idPrefix}"]`).prop("checked");
        const profBlocked  = hasTools;
        const toolsBlocked = hasMaitrise || hasExpertise;

        html.find(`[name="tm-maitrise-${idPrefix}"]`)
            .prop("disabled", profBlocked)
            .closest("label").css("opacity", profBlocked ? "0.4" : "1");

        html.find(`[name="tm-expertise-${idPrefix}"]`)
            .prop("disabled", profBlocked || !hasMaitrise)
            .closest("label").css("opacity", profBlocked ? "0.4" : "1");

        html.find(`[name="tm-tools-${idPrefix}"]`)
            .prop("disabled", toolsBlocked)
            .closest("label").css("opacity", toolsBlocked ? "0.4" : "1");
    }

    // Changement de compétence → caractéristique + maîtrise/expertise auto
    html.find(`[name="tm-skill-${idPrefix}"]`).on("change", () => {
        const skillId   = html.find(`[name="tm-skill-${idPrefix}"]`).val();
        const profLevel = getProfLevel(actor, skillId);
        html.find(`[name="tm-maitrise-${idPrefix}"]`).prop("checked", profLevel >= 1);
        html.find(`[name="tm-expertise-${idPrefix}"]`).prop("checked", profLevel >= 2);
        if (profLevel >= 1) html.find(`[name="tm-tools-${idPrefix}"]`).prop("checked", false);
        refreshAbility();
        refreshProf();
        refreshPreview();
    });

    // Décocher maîtrise → décoche aussi expertise
    html.find(`[name="tm-maitrise-${idPrefix}"]`).on("change", () => {
        if (!html.find(`[name="tm-maitrise-${idPrefix}"]`).prop("checked"))
            html.find(`[name="tm-expertise-${idPrefix}"]`).prop("checked", false);
        refreshProf();
        refreshPreview();
    });

    html.find(`[name="tm-expertise-${idPrefix}"]`).on("change", () => { refreshProf(); refreshPreview(); });

    // Cocher Tools → décoche maîtrise et expertise
    html.find(`[name="tm-tools-${idPrefix}"]`).on("change", () => {
        if (html.find(`[name="tm-tools-${idPrefix}"]`).prop("checked")) {
            html.find(`[name="tm-maitrise-${idPrefix}"]`).prop("checked", false);
            html.find(`[name="tm-expertise-${idPrefix}"]`).prop("checked", false);
        }
        refreshProf();
        refreshPreview();
    });

    // Changement de date → recalcule tout
    const dateFields = [
        `[name="tm-sday-${idPrefix}"]`, `[name="tm-smonth-${idPrefix}"]`, `[name="tm-syear-${idPrefix}"]`,
        `[name="tm-eday-${idPrefix}"]`, `[name="tm-emonth-${idPrefix}"]`, `[name="tm-eyear-${idPrefix}"]`
    ].join(", ");
    html.find(dateFields).on("change input", () => { refreshDayCount(); refreshD20(); refreshPreview(); });

    // État initial
    refreshAbility();
    refreshProf();
    refreshDayCount();
    refreshD20();
    refreshPreview();
}

// ============================================================
// Déclaration joueur
// ============================================================

function openDeclarationDialog(actor) {
    const existing   = actor.getFlag("westmarch", "tm");
    const preSkillId = existing?.skillId ?? null;
    const preSkill   = preSkillId ?? Object.keys(CONFIG.DND5E.skills).sort()[0];
    const profLevel  = getProfLevel(actor, preSkill);

    const preMaitrise  = existing?.hasMaitrise  ?? (profLevel >= 1);
    const preExpertise = existing?.hasExpertise ?? (profLevel >= 2);
    const preTools     = existing?.hasTools     ?? false;
    const preDoRoll    = existing?.doRoll       ?? false;

    const today        = getCurrentCalDate() ?? { day: 1, month: 0, year: 1 };
    const preStartDay  = existing?.startDay   ?? today.day;
    const preStartMth  = existing?.startMonth ?? today.month;
    const preStartYear = existing?.startYear  ?? today.year;
    const preEndDay    = existing?.endDay     ?? today.day;
    const preEndMth    = existing?.endMonth   ?? today.month;
    const preEndYear   = existing?.endYear    ?? today.year;

    const dlg = new Dialog({
        title: `Temps mort — ${actor.name}`,
        content: `
<div style="display:flex; flex-direction:column; gap:8px; padding:4px 0;">
    ${existing?.declared
        ? `<p style="color:#2ecc71; margin:0 0 4px;"><em>✓ Déjà déclaré : <strong>${existing.choiceLabel}</strong>. Modifiable ci-dessous.</em></p>`
        : ""}
    ${skillRowHtml("decl", preSkillId)}
    ${profRowHtml("decl", preMaitrise, preExpertise, preTools)}
    ${dateAndRollHtml("decl", preStartDay, preStartMth, preStartYear, preEndDay, preEndMth, preEndYear, preDoRoll)}
    ${previewHtml("decl")}
</div>`,
        buttons: {
            declare: {
                icon: '<i class="fas fa-check"></i>',
                label: "Déclarer",
                callback: async (html) => {
                    const $h = $(html);
                    const skillId      = $h.find('[name="tm-skill-decl"]').val();
                    const hasMaitrise  = $h.find('[name="tm-maitrise-decl"]').prop("checked");
                    const hasExpertise = $h.find('[name="tm-expertise-decl"]').prop("checked");
                    const hasTools     = $h.find('[name="tm-tools-decl"]').prop("checked");
                    const doRoll       = $h.find('[name="tm-roll-decl"]').prop("checked");
                    const sDay   = Math.max(1, parseInt($h.find('[name="tm-sday-decl"]').val())   || 1);
                    const sMonth = parseInt($h.find('[name="tm-smonth-decl"]').val()) || 0;
                    const sYear  = Math.max(1, parseInt($h.find('[name="tm-syear-decl"]').val())  || 1);
                    const eDay   = Math.max(1, parseInt($h.find('[name="tm-eday-decl"]').val())   || 1);
                    const eMonth = parseInt($h.find('[name="tm-emonth-decl"]').val()) || 0;
                    const eYear  = Math.max(1, parseInt($h.find('[name="tm-eyear-decl"]').val())  || 1);
                    const days   = getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);

                    const sc             = CONFIG.DND5E.skills[skillId];
                    const choiceLabel    = game.i18n.localize(sc?.label ?? skillId);
                    const abilityId      = sc?.ability ?? "int";
                    const dateRangeLabel = `${sDay} ${getMonthName(sMonth)} → ${eDay} ${getMonthName(eMonth)}`;

                    await actor.setFlag("westmarch", "tm", {
                        skillId, choiceLabel, abilityId,
                        hasMaitrise, hasExpertise, hasTools,
                        startDay: sDay, startMonth: sMonth, startYear: sYear,
                        endDay: eDay, endMonth: eMonth, endYear: eYear,
                        days, dateRangeLabel, doRoll, declared: true
                    });
                    ui.notifications.info(`Activité TM déclarée : ${choiceLabel} — ${dateRangeLabel} (${days} j).`);
                }
            },
            cancel: { icon: '<i class="fas fa-times"></i>', label: "Annuler" }
        },
        default: "declare"
    }, { width: 480 });

    Hooks.once("renderDialog", (app, html) => {
        if (app !== dlg) return;
        wireControls(html, actor, "decl");
    });

    dlg.render(true);
}

// ============================================================
// Dialogue GM — construction des lignes
// ============================================================

function buildActorRow(actor, startUnchecked = false) {
    const flag     = actor.getFlag("westmarch", "tm");
    const declared = flag?.declared ?? false;

    const preSkillId   = flag?.skillId    ?? null;
    const preSkill     = preSkillId       ?? Object.keys(CONFIG.DND5E.skills).sort()[0];
    const profLevel    = getProfLevel(actor, preSkill);
    const preMaitrise  = flag?.hasMaitrise  ?? (profLevel >= 1);
    const preExpertise = flag?.hasExpertise ?? (profLevel >= 2);
    const preTools     = flag?.hasTools     ?? false;
    const preDoRoll    = flag?.doRoll       ?? false;

    const today        = getCurrentCalDate() ?? { day: 1, month: 0, year: 1 };
    const preStartDay  = flag?.startDay   ?? today.day;
    const preStartMth  = flag?.startMonth ?? today.month;
    const preStartYear = flag?.startYear  ?? today.year;
    const preEndDay    = flag?.endDay     ?? today.day;
    const preEndMth    = flag?.endMonth   ?? today.month;
    const preEndYear   = flag?.endYear    ?? today.year;
    const preDays      = flag?.days ?? getDaysFromDates(preStartDay, preStartMth, preStartYear, preEndDay, preEndMth, preEndYear);

    const statusBadge = declared
        ? `<span style="color:#2ecc71; font-size:0.85em; margin-left:6px;">✓ ${flag.choiceLabel} — ${flag.dateRangeLabel ?? preDays + " j"}</span>`
        : `<span style="color:#e67e22; font-size:0.85em; margin-left:6px;">(non déclaré)</span>`;

    const id = actor.id;
    return `
<div class="tm-actor-row" data-actor-id="${id}"
     style="border:1px solid #ccc; border-radius:4px; padding:8px; margin-bottom:8px;">
    <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
        <input type="checkbox" name="tm-active-${id}" ${startUnchecked ? "" : "checked"} style="margin:0;">
        <strong>${actor.name}</strong>${statusBadge}
        <button type="button" class="tm-refuse-btn" data-actor-id="${id}"
                style="margin-left:auto; padding:2px 8px; font-size:0.8em; color:#e74c3c; background:none; border:1px solid #e74c3c; border-radius:3px; cursor:pointer;">
            Refuser
        </button>
    </div>
    <div class="tm-controls-${id}" style="display:flex; flex-direction:column; gap:5px; opacity:${startUnchecked ? "0.4" : "1"};">
        ${skillRowHtml(id, preSkillId)}
        ${profRowHtml(id, preMaitrise, preExpertise, preTools)}
        ${dateAndRollHtml(id, preStartDay, preStartMth, preStartYear, preEndDay, preEndMth, preEndYear, preDoRoll)}
        ${previewHtml(id)}
    </div>
</div>`;
}

// ============================================================
// Dialogue GM — ouverture
// ============================================================

function openDowntimeDialog() {
    const allActors  = getPlayerActors();
    const declared   = allActors.filter(a =>  a.getFlag("westmarch", "tm")?.declared);
    const undeclared = allActors.filter(a => !a.getFlag("westmarch", "tm")?.declared);

    if (allActors.length === 0) { ui.notifications.warn("Aucun personnage joueur trouvé."); return; }

    const showAllByDefault = declared.length === 0;

    const headerHtml = declared.length === 0
        ? `<p style="color:#e67e22; margin:0 0 8px;"><em>Aucune déclaration reçue — tous les personnages affichés.</em></p>`
        : `<p style="margin:0 0 6px;"><strong>${declared.length}</strong> déclaration${declared.length > 1 ? "s" : ""} reçue${declared.length > 1 ? "s" : ""}.`
          + (undeclared.length > 0
              ? ` <label style="cursor:pointer; color:#888;"><input type="checkbox" id="tm-show-undeclared" style="margin:0 4px 0 8px;">${undeclared.length} sans déclaration</label>`
              : "")
          + `</p>`;

    const content = `
<div>
    ${headerHtml}
    <div style="max-height:58vh; overflow-y:auto; padding-right:4px;">
        ${(showAllByDefault ? allActors : declared).map(a => buildActorRow(a, false)).join("")}
        ${!showAllByDefault && undeclared.length > 0
            ? `<div class="tm-undeclared-group" style="display:none;">${undeclared.map(a => buildActorRow(a, true)).join("")}</div>`
            : ""}
    </div>
</div>`;

    const dlg = new Dialog({
        title: "Temps morts — Gains",
        content,
        buttons: {
            apply: {
                icon: '<i class="fas fa-coins"></i>',
                label: "Appliquer les gains",
                callback: async (html) => applyDowntimeGains($(html), allActors)
            },
            cancel: { icon: '<i class="fas fa-times"></i>', label: "Annuler" }
        },
        default: "apply"
    }, { width: 560 });

    Hooks.once("renderDialog", (app, html) => {
        if (app !== dlg) return;

        html.find("#tm-show-undeclared").on("change", function () {
            html.find(".tm-undeclared-group").css("display", this.checked ? "block" : "none");
        });

        for (const actor of allActors) {
            const id = actor.id;
            html.find(`[name="tm-active-${id}"]`).on("change", function () {
                html.find(`.tm-controls-${id}`).css("opacity", this.checked ? "1" : "0.4");
            });
            wireControls(html, actor, id);
        }

        html.find(".tm-refuse-btn").on("click", async function () {
            const actorId = this.dataset.actorId;
            const actor   = game.actors.get(actorId);
            if (!actor) return;

            await actor.unsetFlag("westmarch", "tm");

            const owners = getActorOwners(actor);
            if (owners.length > 0) {
                ChatMessage.create({
                    content: `❌ Votre demande de temps mort a été refusée par le MJ.`,
                    whisper: owners.map(u => u.id),
                    speaker: { alias: "WestMarch — Temps morts" }
                });
            }

            html.find(`[data-actor-id="${actorId}"].tm-actor-row`).css("opacity", "0.4");
            html.find(`[name="tm-active-${actorId}"]`).prop("checked", false);
            html.find(`.tm-controls-${actorId}`).css("opacity", "0.4");
            this.textContent = "Refusé";
            this.disabled = true;
            this.style.color = "#888";
            this.style.borderColor = "#888";

            ui.notifications.info(`Demande TM refusée pour ${actor.name}.`);
        });
    });

    dlg.render(true);
}

// ============================================================
// Calcul et application des gains
// ============================================================

async function applyDowntimeGains($html, actors) {
    const lines        = [];
    const discordLines = [];

    for (const actor of actors) {
        const id = actor.id;
        if (!$html.find(`[name="tm-active-${id}"]`).prop("checked")) continue;

        const skillId      = $html.find(`[name="tm-skill-${id}"]`).val();
        const doRoll       = $html.find(`[name="tm-roll-${id}"]`).prop("checked");
        const hasMaitrise  = $html.find(`[name="tm-maitrise-${id}"]`).prop("checked");
        const hasExpertise = $html.find(`[name="tm-expertise-${id}"]`).prop("checked");
        const hasTools     = $html.find(`[name="tm-tools-${id}"]`).prop("checked");

        const sDay   = Math.max(1, parseInt($html.find(`[name="tm-sday-${id}"]`).val())   || 1);
        const sMonth = parseInt($html.find(`[name="tm-smonth-${id}"]`).val()) || 0;
        const sYear  = Math.max(1, parseInt($html.find(`[name="tm-syear-${id}"]`).val())  || 1);
        const eDay   = Math.max(1, parseInt($html.find(`[name="tm-eday-${id}"]`).val())   || 1);
        const eMonth = parseInt($html.find(`[name="tm-emonth-${id}"]`).val()) || 0;
        const eYear  = Math.max(1, parseInt($html.find(`[name="tm-eyear-${id}"]`).val())  || 1);
        const days   = getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);

        const activityName = game.i18n.localize(CONFIG.DND5E.skills[skillId]?.label ?? skillId);
        const profStr      = hasTools ? " [Tools]" : hasExpertise ? " [Expertise]" : hasMaitrise ? " [Maîtrise]" : "";
        const dailyRate    = calcDailyRate(actor, skillId, hasMaitrise, hasExpertise, hasTools);
        const dateLabel    = `${sDay} ${getMonthName(sMonth)} → ${eDay} ${getMonthName(eMonth)}`;
        let total = dailyRate * days, rollResult = null;

        if (doRoll && days >= 5) {
            // Test de compétence : d20 + mod de caractéristique + bonus de maîtrise/expertise
            const abilityId  = CONFIG.DND5E.skills[skillId]?.ability ?? "int";
            const abilityMod = actor.system.abilities[abilityId]?.mod ?? 0;
            const prof       = actor.system.attributes?.prof ?? 2;
            const checkMod   = abilityMod + (hasExpertise ? prof * 2 : (hasMaitrise || hasTools) ? prof : 0);

            const roll = await new Roll("1d20 + @mod", { mod: checkMod }).evaluate();
            rollResult = roll.total;
            const mult = rollResult <= 1 ? 0.8 : rollResult >= 20 ? 1.2 : rollResult >= 10 ? 1.1 : 1.0;
            total = total * mult;

            const abilityAbbr = game.i18n.localize(
                CONFIG.DND5E.abilities[abilityId]?.abbreviation ?? abilityId
            ).toUpperCase();
            await roll.toMessage({
                speaker: { alias: `Temps mort — ${actor.name}` },
                flavor: `Test de compétence : ${activityName} (${abilityAbbr}) — ${days} j`
            });
        }

        // Séparer PO (entier) et PA (décimale × 10, arrondie)
        const totalGP = Math.floor(total);
        const totalSP = Math.round((total - totalGP) * 10);
        const gainStr = totalSP > 0 ? `+${totalGP} po ${totalSP} pa` : `+${totalGP} po`;

        const currencyUpdate = {};
        if (totalGP > 0) currencyUpdate["system.currency.gp"] = (actor.system.currency?.gp ?? 0) + totalGP;
        if (totalSP > 0) currencyUpdate["system.currency.sp"] = (actor.system.currency?.sp ?? 0) + totalSP;
        if (Object.keys(currencyUpdate).length > 0)
            await actor.update(currencyUpdate);

        await actor.unsetFlag("westmarch", "tm");

        const owners = getActorOwners(actor);
        if (owners.length > 0) {
            const pctStr = rollResult === null ? ""
                : rollResult <= 1  ? " (test : ≤1 → −20 %)"
                : rollResult >= 20 ? ` (test : ${rollResult} → +20 %)`
                : rollResult >= 10 ? ` (test : ${rollResult} → +10 %)`
                :                   ` (test : ${rollResult} → ±0 %)`;
            ChatMessage.create({
                content: `🕰️ Temps mort appliqué pour <strong>${actor.name}</strong> : `
                       + `${activityName}${profStr}, ${dateLabel} — ${days} j (${dailyRate} po/j)${pctStr} → <strong>${gainStr}</strong>`,
                whisper: owners.map(u => u.id),
                speaker: { alias: "WestMarch — Temps morts" }
            });
        }

        let line        = `<strong>${actor.name}</strong> — ${activityName}${profStr} — ${dateLabel} (${days} j, ${dailyRate} po/j)`;
        let discordLine = `**${actor.name}** — ${activityName}${profStr} — ${dateLabel} (${days} j, ${dailyRate} po/j)`;
        if (rollResult !== null) {
            const pct = rollResult <= 1 ? "−20 %" : rollResult >= 20 ? "+20 %" : rollResult >= 10 ? "+10 %" : "±0 %";
            line        += ` → test : ${rollResult} (${pct})`;
            discordLine += ` → test : ${rollResult} (${pct})`;
        }
        line        += ` = <strong>${gainStr}</strong>`;
        discordLine += ` = **${gainStr}**`;
        lines.push(line);
        discordLines.push(discordLine);
    }

    if (lines.length === 0) { ui.notifications.info("Aucun personnage traité."); return; }

    ChatMessage.create({
        content: `<p style="margin:0 0 4px; font-weight:bold;">Résumé des temps morts</p><ul style="margin:0; padding-left:16px;">${lines.map(l => `<li>${l}</li>`).join("")}</ul>`,
        whisper: ChatMessage.getWhisperRecipients("GM"),
        speaker: { alias: "WestMarch — Temps morts" }
    });

    const webhookUrl = game.settings.get("westmarch", "tmWebhookUrl");
    if (webhookUrl) {
        fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: `🕰️ **Résumé des temps morts**\n${discordLines.map(l => `• ${l}`).join("\n")}`
            })
        }).catch(err => console.error("westmarch | Webhook TM Discord :", err));
    }

    ui.notifications.info(`Temps morts appliqués pour ${lines.length} personnage${lines.length > 1 ? "s" : ""}.`);
}
