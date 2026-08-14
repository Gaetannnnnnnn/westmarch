// ============================================================
// tm.js — Downtime : déclaration joueur + validation GM
//
// Côté joueur : bouton sablier dans le header de sa fiche perso
//   → fenêtre pour déclarer compétence, maîtrise/expertise/tools,
//   dates de début/fin et test de compétence optionnel.
//
// Côté GM : bouton dans la barre de contrôle gauche
//   → fenêtre listant les déclarations joueurs
//   → le GM valide et applique en un clic
//
// Toutes les règles (formule de gain, tables de craft,
// multiplicateurs de jet) sont configurables dans les settings.
// ============================================================

import { evalGainFormula, getRollMultiplier, getScrollTable, getMagicTable } from './settings.js';

// Namespace des flags Foundry pour ce module
const FLAG_NS = "downtime";

export function TmHooks() {

    // ── Bouton GM dans la barre de contrôle gauche ──────────
    Hooks.on("getSceneControlButtons", (controls) => {
        if (!game.user.isGM) return;

        if (!controls.downtime) {
            controls.downtime = {
                name:  "downtime",
                title: "Downtime",
                icon:  "fa-solid fa-hourglass-half",
                layer: "tokens",
                tools: {}
            };
        }
        controls.downtime.tools.validate = {
            name:     "validate",
            title:    "Temps morts — Valider les gains",
            icon:     "fa-solid fa-coins",
            button:   true,
            onChange: () => openDowntimeDialog(),
            visible:  true
        };
    });

    // ── Bouton déclaration TM sur la fiche perso (joueurs) ──
    Hooks.on("renderApplicationV2", (app, element) => {
        if (game.user.isGM) return;
        if (!app.document || !(app.document instanceof Actor)) return;
        if (app.document.type !== "character") return;
        if (!app.document.isOwner) return;

        const header = element.querySelector(".window-header");
        if (!header || header.querySelector(".downtime-tm-declare")) return;

        const actor    = app.document;
        const tmFlag   = actor.getFlag(FLAG_NS, "tm");
        const items    = tmFlagItems(tmFlag);
        const declared = tmFlag?.declared ?? false;
        const hasCraft = items.some(i => i.type === "craft");

        const btn = document.createElement("button");
        btn.type  = "button";
        btn.classList.add("header-control", "icon", "fa-solid", "fa-hourglass-half", "downtime-tm-declare");
        btn.setAttribute("aria-label", "Temps mort");

        if (declared && items.length > 0) {
            const summary = items.map(i => i.type === "craft" ? `🔨 ${i.craftName || "craft"}` : i.choiceLabel).join(", ");
            btn.dataset.tooltip = `TM déclaré (${items.length}) : ${summary}`;
            btn.style.color     = "#2ecc71";
        } else if (items.length > 0) {
            const summary = items.map(i => i.type === "craft" ? `🔨 ${i.craftName || "craft"}` : i.choiceLabel).join(", ");
            btn.dataset.tooltip = `TM (${items.length}) : ${summary} — cliquer pour déclarer`;
            btn.style.color     = hasCraft ? "#3498db" : "#e67e22";
        } else {
            btn.dataset.tooltip = "Déclarer mon activité TM";
        }

        btn.addEventListener("click", () => openDeclarationDialog(actor));

        const closeBtn = header.querySelector('[data-action="close"]');
        if (closeBtn) closeBtn.before(btn); else header.appendChild(btn);
    });
}

// ============================================================
// Utilitaires — flags
// ============================================================

// Normalise le flag TM en tableau d'items.
// Gère l'ancien format plat {type, …} → [{…}] pour rétrocompatibilité.
function tmFlagItems(flag) {
    if (!flag) return [];
    if (Array.isArray(flag.items)) return flag.items;
    if (flag.type) return [flag]; // ancien format
    return [];
}

// ============================================================
// Utilitaires — acteurs & joueurs
// ============================================================

// Retourne les acteurs PJ selon le setting "pjFolderName".
// Si le setting est vide, retourne tous les personnages avec un propriétaire joueur.
function getPlayerActors() {
    const folderName = (game.settings.get("downtime", "pjFolderName") ?? "").trim();

    if (!folderName) {
        // Pas de filtre de dossier : tous les personnages joueurs
        return game.actors
            .filter(a => a.type === "character" && a.hasPlayerOwner)
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    // Vérifie si l'acteur est dans un dossier nommé folderName (ou un ancêtre)
    function isInFolder(actor) {
        let folder = actor.folder;
        while (folder) {
            if (folder.name === folderName) return true;
            folder = folder.folder;
        }
        return false;
    }

    return game.actors
        .filter(a => a.type === "character" && a.hasPlayerOwner && isInFolder(a))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function getActorOwners(actor) {
    return game.users.filter(u => !u.isGM && actor.ownership[u.id] === 3);
}

// ============================================================
// Utilitaires — calendrier
// ============================================================

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

function getMonthName(monthIndex) {
    const cal = game.time?.calendar;
    if (!cal?.months?.values) return `Mois ${monthIndex + 1}`;
    return game.i18n.localize(cal.months.values[monthIndex]?.name ?? `Mois ${monthIndex + 1}`);
}

// Convertit une date du calendrier en nombre total de jours depuis l'an 0.
function calDateToTotalDays(year, month0, day) {
    const cal      = game.time?.calendar;
    const months   = cal?.months?.values ? Array.from(cal.months.values) : [];
    const daysPerY = months.reduce((s, m) => s + (m?.days ?? 30), 0) || 360;
    let total = year * daysPerY;
    for (let i = 0; i < month0; i++) total += months[i]?.days ?? 30;
    return total + (day - 1);
}

function getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear) {
    const start = calDateToTotalDays(sYear, sMonth, sDay);
    const end   = calDateToTotalDays(eYear, eMonth, eDay);
    return Math.max(1, end - start + 1);
}

// ============================================================
// Utilitaires — compétences & proficiency
// ============================================================

function buildSkillOptionsHtml(selectedId = null) {
    return Object.entries(CONFIG.DND5E.skills)
        .map(([id, data]) => ({
            id,
            label:       game.i18n.localize(data.label),
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
    if (!cal?.months?.values)
        return `<option value="${selectedMonth}">Mois ${selectedMonth + 1}</option>`;
    return Array.from(cal.months.values).map((m, i) => {
        const name = game.i18n.localize(m?.name ?? `Mois ${i + 1}`);
        return `<option value="${i}"${i === selectedMonth ? " selected" : ""}>${name}</option>`;
    }).join("");
}

function getAbilityLabel(skillId) {
    const abilityId = CONFIG.DND5E.skills[skillId]?.ability ?? "int";
    return game.i18n.localize(CONFIG.DND5E.abilities[abilityId]?.label ?? abilityId);
}

function getProfLevel(actor, skillId) {
    const s = actor.system.skills?.[skillId];
    return s?.prof?.multiplier ?? s?.proficient ?? 0;
}

// Raccourci : utilise evalGainFormula depuis settings.js
function calcDailyRate(actor, skillId, hasMaitrise, hasExpertise, hasTools) {
    return evalGainFormula(actor, skillId, hasMaitrise, hasExpertise, hasTools);
}

// ============================================================
// Utilitaires — craft
// ============================================================

function getCraftStats(craftType, price, scrollLevel, rarity, singleUse) {
    const scrollTable = getScrollTable();
    const magicTable  = getMagicTable();
    let totalDays = 0, cost = 0;

    if (craftType === "nonmagique") {
        cost      = Math.floor(price / 2);
        totalDays = Math.ceil(price / 10);

    } else if (craftType === "parchemin") {
        const row = scrollTable[Math.min(Math.max(scrollLevel, 0), scrollTable.length - 1)];
        totalDays = row?.days ?? 1;
        cost      = row?.cost ?? 0;

    } else if (craftType === "magique") {
        const row = magicTable.find(r => r.key === rarity) ?? magicTable[0];
        totalDays = singleUse ? Math.ceil((row?.days ?? 5) / 2) : (row?.days ?? 5);
        cost      = singleUse ? Math.ceil((row?.cost ?? 50) / 2) : (row?.cost ?? 50);
    }

    return { totalDays, cost };
}

function craftTypeLabel(ct) {
    if (ct === "nonmagique") return "Non-magique";
    if (ct === "parchemin")  return "Parchemin";
    if (ct === "magique")    return "Objet magique";
    return ct ?? "—";
}

function craftInfoStr(item) {
    const magicTable = getMagicTable();
    const type = item.craftType ?? "nonmagique";
    const cost = item.craftCost ?? 0;

    if (type === "parchemin") {
        const scrollTable = getScrollTable();
        const levels = scrollTable.map((_, i) => i === 0 ? "Sort mineur" : `Niv. ${i}`);
        return `Parchemin ${levels[item.craftScrollLevel ?? 0] ?? "?"} — ${cost} po`;
    }
    if (type === "magique") {
        const row   = magicTable.find(r => r.key === item.craftRarity) ?? magicTable[0];
        const label = item.craftSingleUse ? `${row?.label ?? "?"} (usage unique)` : (row?.label ?? "?");
        return `${label} — ${cost} po`;
    }
    return `Non-magique — ${cost} po`;
}

// Déduit un coût en PO en convertissant PP/PA/PC si nécessaire.
// Redistribue le reste de façon optimale (PP → PO → PA → PC).
// Retourne true si le paiement était possible, false si fonds insuffisants.
async function deductGoldCost(actor, costGP) {
    const cur   = actor.system.currency ?? {};
    const pp = cur.pp ?? 0, gp = cur.gp ?? 0,
          ep = cur.ep ?? 0, sp = cur.sp ?? 0, cp = cur.cp ?? 0;

    const totalCP = pp * 1000 + gp * 100 + ep * 50 + sp * 10 + cp;
    const costCP  = Math.round(costGP * 100);
    const enough  = totalCP >= costCP;
    const leftCP  = Math.max(0, totalCP - costCP);

    const newPP = Math.floor(leftCP / 1000);
    const newGP = Math.floor((leftCP % 1000) / 100);
    const newSP = Math.floor((leftCP % 100)  / 10);
    const newCP = leftCP % 10;

    await actor.update({
        "system.currency.pp": newPP,
        "system.currency.gp": newGP,
        "system.currency.ep": 0,
        "system.currency.sp": newSP,
        "system.currency.cp": newCP
    });
    return enough;
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

    return `
<div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
    <label style="display:flex; align-items:center; gap:5px; cursor:pointer; opacity:${profBlocked ? "0.4" : "1"};">
        <input type="checkbox" name="tm-maitrise-${idPrefix}"
               ${hasMaitrise && !hasTools ? "checked" : ""}
               ${profBlocked ? "disabled" : ""} style="margin:0;">
        Maîtrise
    </label>
    <label style="display:flex; align-items:center; gap:5px; cursor:pointer; opacity:${profBlocked ? "0.4" : "1"};">
        <input type="checkbox" name="tm-expertise-${idPrefix}"
               ${hasExpertise && !hasTools ? "checked" : ""}
               ${profBlocked || !hasMaitrise ? "disabled" : ""} style="margin:0;">
        Expertise
    </label>
    <span style="color:#888; font-style:italic;">ou</span>
    <label style="display:flex; align-items:center; gap:5px; cursor:pointer; opacity:${toolsBlocked ? "0.4" : "1"};">
        <input type="checkbox" name="tm-tools-${idPrefix}"
               ${hasTools ? "checked" : ""}
               ${toolsBlocked ? "disabled" : ""} style="margin:0;">
        Outils
    </label>
</div>`;
}

function previewHtml(idPrefix) {
    return `<div class="tm-preview-${idPrefix}" style="color:#888; font-style:italic; font-size:0.9em;">—</div>`;
}

function dateAndRollHtml(idPrefix, sDay, sMonth, sYear, eDay, eMonth, eYear, preDoRoll) {
    const minDays   = game.settings.get("downtime", "minRollDays") ?? 5;
    const days      = getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);
    const tooFew    = days < minDays;
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
<div class="tm-d20-row-${idPrefix}" style="display:flex; gap:6px; align-items:center; ${tooFew ? "opacity:0.4;" : ""}">
    <input type="checkbox" name="tm-roll-${idPrefix}" ${preDoRoll && !tooFew ? "checked" : ""} ${tooFew ? "disabled" : ""} style="margin:0;">
    <label style="margin:0;">Test de compétence <em style="color:#888;">(≥ ${minDays} jours requis)</em></label>
</div>
<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
    <label style="min-width:90px; white-space:nowrap;">Bonus au jet :</label>
    <input type="text" name="tm-bonus-${idPrefix}" value="" placeholder="+10, 1d6…" style="width:80px;">
    <input type="text" name="tm-bonus-src-${idPrefix}" value="" placeholder="Provenance du bonus…" style="flex:1;">
</div>`;
}

// ============================================================
// Câblage dynamique (dates, d20, proficiencies, preview)
// ============================================================

function wireControls(html, actor, idPrefix) {
    const minDays = game.settings.get("downtime", "minRollDays") ?? 5;

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
        const tooFew = getDays() < minDays;
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
        const bonusRaw     = html.find(`[name="tm-bonus-${idPrefix}"]`).val()?.trim() ?? "";
        const bonusSrc     = html.find(`[name="tm-bonus-src-${idPrefix}"]`).val()?.trim() ?? "";
        const baseEst      = Math.round(rate * days);
        const bonusPart    = bonusRaw ? ` · bonus jet : ${bonusRaw}${bonusSrc ? ` (${bonusSrc})` : ""}` : "";
        html.find(`.tm-preview-${idPrefix}`)
            .text(`≈ ${rate} po/jour → ${baseEst} po sur ${days} jour${days > 1 ? "s" : ""}${bonusPart}`);
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

    // Changement de compétence → maj caractéristique + maîtrise auto depuis la fiche
    html.find(`[name="tm-skill-${idPrefix}"]`).on("change", () => {
        const skillId   = html.find(`[name="tm-skill-${idPrefix}"]`).val();
        const profLevel = getProfLevel(actor, skillId);
        html.find(`[name="tm-maitrise-${idPrefix}"]`).prop("checked", profLevel >= 1);
        html.find(`[name="tm-expertise-${idPrefix}"]`).prop("checked", profLevel >= 2);
        if (profLevel >= 1) html.find(`[name="tm-tools-${idPrefix}"]`).prop("checked", false);
        refreshAbility(); refreshProf(); refreshPreview();
    });

    // Décocher maîtrise → décoche aussi expertise
    html.find(`[name="tm-maitrise-${idPrefix}"]`).on("change", () => {
        if (!html.find(`[name="tm-maitrise-${idPrefix}"]`).prop("checked"))
            html.find(`[name="tm-expertise-${idPrefix}"]`).prop("checked", false);
        refreshProf(); refreshPreview();
    });

    html.find(`[name="tm-expertise-${idPrefix}"]`).on("change", () => { refreshProf(); refreshPreview(); });

    // Cocher Outils → décoche maîtrise et expertise
    html.find(`[name="tm-tools-${idPrefix}"]`).on("change", () => {
        if (html.find(`[name="tm-tools-${idPrefix}"]`).prop("checked")) {
            html.find(`[name="tm-maitrise-${idPrefix}"]`).prop("checked", false);
            html.find(`[name="tm-expertise-${idPrefix}"]`).prop("checked", false);
        }
        refreshProf(); refreshPreview();
    });

    const dateFields = [
        `[name="tm-sday-${idPrefix}"]`, `[name="tm-smonth-${idPrefix}"]`, `[name="tm-syear-${idPrefix}"]`,
        `[name="tm-eday-${idPrefix}"]`, `[name="tm-emonth-${idPrefix}"]`, `[name="tm-eyear-${idPrefix}"]`
    ].join(", ");
    html.find(dateFields).on("change input", () => { refreshDayCount(); refreshD20(); refreshPreview(); });
    html.find(`[name="tm-bonus-${idPrefix}"], [name="tm-bonus-src-${idPrefix}"]`).on("change input", refreshPreview);

    refreshAbility(); refreshProf(); refreshDayCount(); refreshD20(); refreshPreview();
}

// ============================================================
// Formulaire craft — joueur
// ============================================================

function craftDeclFormHtml(id, craftType, craftName, price, scrollLevel, rarity, singleUse, daysAlready, sDay, sMonth, sYear, eDay, eMonth, eYear) {
    const scrollTable = getScrollTable();
    const magicTable  = getMagicTable();

    const scrollOptions = scrollTable.map((_, i) =>
        `<option value="${i}"${i === scrollLevel ? " selected" : ""}>${i === 0 ? "Sort mineur" : `Niveau ${i}`}</option>`
    ).join("");

    const rarityOptions = magicTable.map(r =>
        `<option value="${r.key}"${r.key === rarity ? " selected" : ""}>${r.label}${r.minLevel > 1 ? ` (≥ niv. ${r.minLevel})` : ""}</option>`
    ).join("");

    const { totalDays, cost } = getCraftStats(craftType, price, scrollLevel, rarity, singleUse);
    const workDays  = getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);
    const newTotal  = daysAlready + workDays;
    const remaining = Math.max(0, totalDays - newTotal);
    const prevStr   = remaining === 0
        ? `Coût : ${cost} po · Durée : ${totalDays} j → ✅ Terminé !`
        : `Coût : ${cost} po · Durée : ${totalDays} j · Ce TM : ${workDays} j → ${remaining} j restants`;

    return `
<div style="display:flex; gap:6px; align-items:center;">
    <label style="min-width:90px; white-space:nowrap;">Type :</label>
    <select name="tm-craft-type-${id}" style="flex:1;">
        <option value="nonmagique"${craftType === "nonmagique" ? " selected" : ""}>Non-magique</option>
        <option value="parchemin" ${craftType === "parchemin"  ? " selected" : ""}>Parchemin de sort</option>
        <option value="magique"   ${craftType === "magique"    ? " selected" : ""}>Objet magique</option>
    </select>
</div>
<div style="display:flex; gap:6px; align-items:center;">
    <label style="min-width:90px; white-space:nowrap;">Nom :</label>
    <input type="text" name="tm-craft-name-${id}" value="${craftName}" placeholder="Nom de l'objet" style="flex:1;">
</div>
<div class="tm-craft-param-nonmagique-${id}" style="display:${craftType === "nonmagique" ? "flex" : "none"}; gap:6px; align-items:center;">
    <label style="min-width:90px; white-space:nowrap;">Prix d'achat :</label>
    <input type="number" name="tm-craft-price-${id}" value="${price}" min="1" style="width:80px;"> po
</div>
<div class="tm-craft-param-parchemin-${id}" style="display:${craftType === "parchemin" ? "flex" : "none"}; gap:6px; align-items:center;">
    <label style="min-width:90px; white-space:nowrap;">Niveau sort :</label>
    <select name="tm-craft-scroll-${id}">${scrollOptions}</select>
</div>
<div class="tm-craft-param-magique-${id}" style="display:${craftType === "magique" ? "flex" : "none"}; gap:6px; align-items:center; flex-wrap:wrap;">
    <label style="min-width:90px; white-space:nowrap;">Rareté :</label>
    <select name="tm-craft-rarity-${id}" style="flex:1;">${rarityOptions}</select>
    <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
        <input type="checkbox" name="tm-craft-single-${id}"${singleUse ? " checked" : ""}> Usage unique (÷2)
    </label>
</div>
<div style="display:flex; gap:6px; align-items:center;">
    <label style="min-width:90px; white-space:nowrap;">Déjà fait :</label>
    <input type="number" name="tm-craft-done-${id}" value="${daysAlready}" min="0" style="width:60px;"> j
    <span style="color:#888; font-size:0.85em;">sur ${totalDays} j total</span>
</div>
<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; margin-top:4px;">
    <label style="min-width:90px; white-space:nowrap;">Date début :</label>
    <input type="number" name="tm-craft-sday-${id}" value="${sDay}" min="1" max="30" style="width:50px;">
    <select name="tm-craft-smonth-${id}">${buildMonthOptionsHtml(sMonth)}</select>
    <input type="number" name="tm-craft-syear-${id}" value="${sYear}" min="1" style="width:70px;">
</div>
<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
    <label style="min-width:90px; white-space:nowrap;">Date fin :</label>
    <input type="number" name="tm-craft-eday-${id}" value="${eDay}" min="1" max="30" style="width:50px;">
    <select name="tm-craft-emonth-${id}">${buildMonthOptionsHtml(eMonth)}</select>
    <input type="number" name="tm-craft-eyear-${id}" value="${eYear}" min="1" style="width:70px;">
</div>
<div class="tm-craft-daycount-${id}" style="font-size:0.85em; color:#888; margin-left:96px; margin-top:-2px;">
    → ${workDays} jour${workDays > 1 ? "s" : ""}
</div>
<div class="tm-craft-preview-${id}" style="color:#888; font-style:italic; font-size:0.9em;">${prevStr}</div>`;
}

function wireCraftControls(html, idPrefix) {
    function getDays() {
        const sDay   = Math.max(1, parseInt(html.find(`[name="tm-craft-sday-${idPrefix}"]`).val())   || 1);
        const sMonth = parseInt(html.find(`[name="tm-craft-smonth-${idPrefix}"]`).val()) || 0;
        const sYear  = Math.max(1, parseInt(html.find(`[name="tm-craft-syear-${idPrefix}"]`).val())  || 1);
        const eDay   = Math.max(1, parseInt(html.find(`[name="tm-craft-eday-${idPrefix}"]`).val())   || 1);
        const eMonth = parseInt(html.find(`[name="tm-craft-emonth-${idPrefix}"]`).val()) || 0;
        const eYear  = Math.max(1, parseInt(html.find(`[name="tm-craft-eyear-${idPrefix}"]`).val())  || 1);
        return getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);
    }

    function getParams() {
        return {
            craftType:   html.find(`[name="tm-craft-type-${idPrefix}"]`).val()  ?? "nonmagique",
            price:       Math.max(1, parseInt(html.find(`[name="tm-craft-price-${idPrefix}"]`).val())  || 1),
            scrollLvl:   parseInt(html.find(`[name="tm-craft-scroll-${idPrefix}"]`).val()) || 0,
            rarity:      html.find(`[name="tm-craft-rarity-${idPrefix}"]`).val() ?? "common",
            singleUse:   html.find(`[name="tm-craft-single-${idPrefix}"]`).prop("checked"),
            daysAlready: Math.max(0, parseInt(html.find(`[name="tm-craft-done-${idPrefix}"]`).val()) || 0)
        };
    }

    function refreshTypeVisibility() {
        const { craftType } = getParams();
        html.find(`.tm-craft-param-nonmagique-${idPrefix}`).css("display", craftType === "nonmagique" ? "flex" : "none");
        html.find(`.tm-craft-param-parchemin-${idPrefix}`).css("display",  craftType === "parchemin"  ? "flex" : "none");
        html.find(`.tm-craft-param-magique-${idPrefix}`).css("display",    craftType === "magique"    ? "flex" : "none");
    }

    function refreshPreview() {
        const { craftType, price, scrollLvl, rarity, singleUse, daysAlready } = getParams();
        const workDays  = getDays();
        const { totalDays, cost } = getCraftStats(craftType, price, scrollLvl, rarity, singleUse);
        const newTotal  = daysAlready + workDays;
        const remaining = Math.max(0, totalDays - newTotal);

        html.find(`.tm-craft-daycount-${idPrefix}`).text(`→ ${workDays} jour${workDays > 1 ? "s" : ""}`);
        html.find(`[name="tm-craft-done-${idPrefix}"]`).closest("div").find("span").text(`sur ${totalDays} j total`);

        let preview = `Coût : ${cost} po · Durée : ${totalDays} j`;
        if (daysAlready > 0) preview += ` · Déjà fait : ${daysAlready} j`;
        preview += ` · Ce TM : ${workDays} j`;
        preview += remaining === 0 ? ` → ✅ Terminé !` : ` → ${remaining} j restants`;
        html.find(`.tm-craft-preview-${idPrefix}`).text(preview);
    }

    html.find(`[name="tm-craft-type-${idPrefix}"]`).on("change", () => { refreshTypeVisibility(); refreshPreview(); });
    html.find(`[name="tm-craft-price-${idPrefix}"], [name="tm-craft-scroll-${idPrefix}"], [name="tm-craft-rarity-${idPrefix}"], [name="tm-craft-single-${idPrefix}"], [name="tm-craft-done-${idPrefix}"]`)
        .on("change input", refreshPreview);
    const dateFields = [
        `[name="tm-craft-sday-${idPrefix}"]`, `[name="tm-craft-smonth-${idPrefix}"]`, `[name="tm-craft-syear-${idPrefix}"]`,
        `[name="tm-craft-eday-${idPrefix}"]`, `[name="tm-craft-emonth-${idPrefix}"]`, `[name="tm-craft-eyear-${idPrefix}"]`
    ].join(", ");
    html.find(dateFields).on("change input", refreshPreview);
    refreshTypeVisibility(); refreshPreview();
}

// ============================================================
// Dialogue de déclaration — côté joueur
// ============================================================

async function openDeclarationDialog(actor) {
    const existing = actor.getFlag(FLAG_NS, "tm");
    let cartItems = existing?.items
        ? existing.items.map(i => ({ ...i }))
        : existing?.type ? [{ ...existing }]
        : [];

    const today      = getCurrentCalDate() ?? { day: 1, month: 0, year: 1 };
    const firstSkill = Object.keys(CONFIG.DND5E.skills).sort()[0];
    const ongoingCraft = !existing?.declared
        ? cartItems.find(i => i.type === "craft" && (i.craftDaysAlready ?? 0) > 0)
        : null;

    function cartHtml(items) {
        if (items.length === 0)
            return `<em style="color:#888; font-size:0.9em;">TM vide — ajoutez au moins une activité.</em>`;
        return items.map((item, i) => {
            const label = item.type === "craft"
                ? `🔨 <strong>${item.craftName || "Craft"}</strong> — ${craftTypeLabel(item.craftType)} — ${item.dateRangeLabel ?? "?"} (${item.days ?? "?"} j) · <em>${item.craftCost ?? "?"} po</em>`
                  + ((item.craftDaysAlready ?? 0) > 0 ? ` · ${item.craftDaysAlready}/${item.craftTotalDays} j déjà faits` : "")
                : (() => {
                    const bp = item.bonusRoll ? ` · <em>bonus : ${item.bonusRoll}${item.bonusSrc ? ` (${item.bonusSrc})` : ""}</em>` : "";
                    return `<strong>${item.choiceLabel ?? item.skillId}</strong> — ${item.dateRangeLabel ?? "?"} (${item.days ?? "?"} j)${bp}`;
                })();
            return `<div class="tm-cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid #eee; font-size:0.9em; gap:8px;">
                <span style="flex:1;">${label}</span>
                <button type="button" class="tm-remove-item" data-index="${i}"
                        style="background:none; border:none; color:#e74c3c; cursor:pointer; padding:0 4px; font-size:1.1em; flex-shrink:0;">×</button>
            </div>`;
        }).join("");
    }

    await (foundry.applications.api.DialogV2 ?? DialogV2).wait({
        window: { title: `Temps mort — ${actor.name}`, resizable: true },
        position: { width: 720 },
        content: `
<div style="display:flex; gap:0; align-items:stretch; min-height:380px;">
    <!-- GUIDE GAUCHE -->
    <div style="width:175px; flex-shrink:0; background:#1e2235; color:#d0d4e8; border-radius:4px 0 0 4px;
                padding:14px 12px; display:flex; flex-direction:column; gap:10px; font-size:0.88em; line-height:1.45;">
        <div style="font-weight:bold; font-size:1em; color:#fff; letter-spacing:0.03em; margin-bottom:2px;">
            📋 Déclarer un TM
        </div>
        <div style="border-top:1px solid #3a4060; padding-top:8px; display:flex; flex-direction:column; gap:8px;">
            <div>
                <div style="color:#7eb8f7; font-weight:bold; margin-bottom:2px;">① Type d'activité</div>
                <div style="color:#b0b8d0;">Choisis <em>Gain de compétence</em> ou <em>🔨 Craft</em>.</div>
            </div>
            <div>
                <div style="color:#7eb8f7; font-weight:bold; margin-bottom:2px;">② Remplis les détails</div>
                <div style="color:#b0b8d0;">Compétence, maîtrise, dates de début et de fin.</div>
            </div>
            <div>
                <div style="color:#7eb8f7; font-weight:bold; margin-bottom:2px;">③ Ajouter</div>
                <div style="color:#b0b8d0;">Clique sur</div>
                <div style="margin-top:4px; background:#2980b9; color:#fff; border-radius:3px;
                            padding:3px 7px; font-weight:bold; font-size:0.93em; display:inline-block;">
                    + Ajouter au TM
                </div>
            </div>
            <div style="border-top:1px solid #3a4060; padding-top:8px;">
                <div style="color:#7eb8f7; font-weight:bold; margin-bottom:2px;">④ Finaliser</div>
                <div style="color:#b0b8d0;">Clique sur</div>
                <div style="margin-top:4px; background:#27ae60; color:#fff; border-radius:3px;
                            padding:3px 7px; font-weight:bold; font-size:0.93em; display:inline-block;">
                    ✔ Déclarer le TM
                </div>
                <div style="color:#9098b0; margin-top:4px; font-size:0.9em;">Le GM recevra ta déclaration.</div>
            </div>
        </div>
    </div>
    <!-- FORMULAIRE DROITE -->
    <div style="flex:1; display:flex; flex-direction:column; gap:8px; padding:4px 0 4px 14px; min-width:0;">
        <div style="background:#f5f5f5; border:1px solid #ddd; border-radius:4px; padding:8px; color:#222;">
            <div style="font-weight:bold; margin-bottom:4px; font-size:0.95em;">
                🛒 TM — <span id="tm-cart-count">${cartItems.length} activité${cartItems.length !== 1 ? "s" : ""}</span>
            </div>
            <div id="tm-cart-display">${cartHtml(cartItems)}</div>
        </div>
        <hr style="margin:2px 0;">
        <div style="font-size:0.8em; font-weight:bold; color:#666; text-transform:uppercase; letter-spacing:0.04em;">Ajouter une activité</div>
        <div style="display:flex; gap:20px; padding:4px 0 6px; border-bottom:1px solid #ddd;">
            <label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-weight:bold;">
                <input type="radio" name="tm-type-decl" value="gain" checked> Gain de compétence
            </label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:6px; font-weight:bold;">
                <input type="radio" name="tm-type-decl" value="craft"> 🔨 Craft
            </label>
        </div>
        <div class="tm-section-gain-decl" style="display:flex; flex-direction:column; gap:8px;">
            ${skillRowHtml("decl", firstSkill)}
            ${profRowHtml("decl", false, false, false)}
            ${dateAndRollHtml("decl", today.day, today.month, today.year, today.day, today.month, today.year, false)}
            ${previewHtml("decl")}
        </div>
        <div class="tm-section-craft-decl" style="display:none; flex-direction:column; gap:8px;">
            ${craftDeclFormHtml("decl", "nonmagique", ongoingCraft?.craftName ?? "", ongoingCraft?.craftPrice ?? 50,
                ongoingCraft?.craftScrollLevel ?? 0, ongoingCraft?.craftRarity ?? getMagicTable()[0]?.key ?? "common",
                ongoingCraft?.craftSingleUse ?? false, ongoingCraft?.craftDaysAlready ?? 0,
                today.day, today.month, today.year, today.day, today.month, today.year)}
        </div>
        <button type="button" id="tm-add-to-cart"
                style="padding:6px 12px; background:#2980b9; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:0.95em;">
            + Ajouter au TM
        </button>
    </div>
</div>`,
        rejectClose: false,
        render: () => {
            const rootEl = document.getElementById("tm-add-to-cart")
                ?.closest(".application, .dialog, form") ?? document.body;
            const $html = $(rootEl);

            wireControls($html, actor, "decl");
            wireCraftControls($html, "decl");

            $html.find('[name="tm-type-decl"]').on("change", function () {
                const isCraft = this.value === "craft";
                $html.find(".tm-section-gain-decl").css("display", isCraft ? "none" : "flex");
                $html.find(".tm-section-craft-decl").css("display", isCraft ? "flex" : "none");
            });

            function refreshCart() {
                $html.find("#tm-cart-display").html(cartHtml(cartItems));
                $html.find("#tm-cart-count").text(`${cartItems.length} activité${cartItems.length !== 1 ? "s" : ""}`);
                $html.find(".tm-remove-item").on("click", async function () {
                    cartItems.splice(parseInt(this.dataset.index), 1);
                    if (cartItems.length === 0) await actor.unsetFlag(FLAG_NS, "tm");
                    else await actor.setFlag(FLAG_NS, "tm", { declared: false, items: cartItems });
                    refreshCart();
                });
            }
            refreshCart();

            $html.find("#tm-add-to-cart").on("click", async () => {
                const type = $html.find('[name="tm-type-decl"]:checked').val() ?? "gain";

                if (type === "craft") {
                    const craftType   = $html.find('[name="tm-craft-type-decl"]').val();
                    const craftName   = ($html.find('[name="tm-craft-name-decl"]').val() ?? "").trim() || craftTypeLabel(craftType);
                    const price       = Math.max(1, parseInt($html.find('[name="tm-craft-price-decl"]').val())  || 1);
                    const scrollLevel = parseInt($html.find('[name="tm-craft-scroll-decl"]').val())             || 0;
                    const rarity      = $html.find('[name="tm-craft-rarity-decl"]').val()                      ?? "common";
                    const singleUse   = $html.find('[name="tm-craft-single-decl"]').prop("checked");
                    const daysAlready = Math.max(0, parseInt($html.find('[name="tm-craft-done-decl"]').val())   || 0);
                    const sDay   = Math.max(1, parseInt($html.find('[name="tm-craft-sday-decl"]').val())   || 1);
                    const sMonth = parseInt($html.find('[name="tm-craft-smonth-decl"]').val())             || 0;
                    const sYear  = Math.max(1, parseInt($html.find('[name="tm-craft-syear-decl"]').val())  || 1);
                    const eDay   = Math.max(1, parseInt($html.find('[name="tm-craft-eday-decl"]').val())   || 1);
                    const eMonth = parseInt($html.find('[name="tm-craft-emonth-decl"]').val())             || 0;
                    const eYear  = Math.max(1, parseInt($html.find('[name="tm-craft-eyear-decl"]').val())  || 1);
                    const days           = getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);
                    const dateRangeLabel = `${sDay} ${getMonthName(sMonth)} → ${eDay} ${getMonthName(eMonth)}`;
                    const { totalDays, cost } = getCraftStats(craftType, price, scrollLevel, rarity, singleUse);

                    cartItems.push({
                        type: "craft",
                        craftType, craftName, craftTotalDays: totalDays, craftCost: cost,
                        craftDaysAlready: daysAlready, craftPrice: price,
                        craftScrollLevel: scrollLevel, craftRarity: rarity, craftSingleUse: singleUse,
                        choiceLabel: `🔨 ${craftName}`,
                        startDay: sDay, startMonth: sMonth, startYear: sYear,
                        endDay: eDay, endMonth: eMonth, endYear: eYear,
                        days, dateRangeLabel
                    });

                } else {
                    const skillId      = $html.find('[name="tm-skill-decl"]').val();
                    const hasMaitrise  = $html.find('[name="tm-maitrise-decl"]').prop("checked");
                    const hasExpertise = $html.find('[name="tm-expertise-decl"]').prop("checked");
                    const hasTools     = $html.find('[name="tm-tools-decl"]').prop("checked");
                    const doRoll       = $html.find('[name="tm-roll-decl"]').prop("checked");
                    const bonusRoll    = ($html.find('[name="tm-bonus-decl"]').val() ?? "").trim();
                    const bonusSrc     = ($html.find('[name="tm-bonus-src-decl"]').val() ?? "").trim();
                    const sDay   = Math.max(1, parseInt($html.find('[name="tm-sday-decl"]').val())   || 1);
                    const sMonth = parseInt($html.find('[name="tm-smonth-decl"]').val())             || 0;
                    const sYear  = Math.max(1, parseInt($html.find('[name="tm-syear-decl"]').val())  || 1);
                    const eDay   = Math.max(1, parseInt($html.find('[name="tm-eday-decl"]').val())   || 1);
                    const eMonth = parseInt($html.find('[name="tm-emonth-decl"]').val())             || 0;
                    const eYear  = Math.max(1, parseInt($html.find('[name="tm-eyear-decl"]').val())  || 1);
                    const days           = getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);
                    const dateRangeLabel = `${sDay} ${getMonthName(sMonth)} → ${eDay} ${getMonthName(eMonth)}`;
                    const sc             = CONFIG.DND5E.skills[skillId];
                    const choiceLabel    = game.i18n.localize(sc?.label ?? skillId);
                    const abilityId      = sc?.ability ?? "int";

                    cartItems.push({
                        type: "gain",
                        skillId, choiceLabel, abilityId,
                        hasMaitrise, hasExpertise, hasTools, doRoll,
                        bonusRoll, bonusSrc,
                        startDay: sDay, startMonth: sMonth, startYear: sYear,
                        endDay: eDay, endMonth: eMonth, endYear: eYear,
                        days, dateRangeLabel
                    });
                }

                await actor.setFlag(FLAG_NS, "tm", { declared: false, items: cartItems });
                refreshCart();
            });
        },
        buttons: [
            {
                action: "declare",
                label: "Déclarer le TM",
                icon: '<i class="fas fa-check"></i>',
                default: true,
                callback: async () => {
                    if (cartItems.length === 0) {
                        ui.notifications.warn("Le TM est vide. Ajoutez au moins une activité.");
                        return false;
                    }
                    await actor.setFlag(FLAG_NS, "tm", {
                        declared: true,
                        items: cartItems.map(i => ({ ...i, declared: true }))
                    });
                    notifyTmDeclared();
                    ui.notifications.info(`TM déclaré : ${cartItems.length} activité${cartItems.length !== 1 ? "s" : ""}.`);
                }
            },
            { action: "cancel", label: "Annuler", icon: '<i class="fas fa-times"></i>' }
        ]
    });
}

// ============================================================
// Dialogue GM — ligne par acteur
// ============================================================

function buildActorRow(actor, startUnchecked = false) {
    const flag        = actor.getFlag(FLAG_NS, "tm");
    const items       = tmFlagItems(flag);
    const isDeclared  = flag?.declared ?? false;
    const id          = actor.id;
    const count       = items.length;

    const statusBadge = isDeclared && count > 0
        ? `<span style="color:#2ecc71; font-size:0.85em; margin-left:6px;">✓ ${count} activité${count > 1 ? "s" : ""} déclarée${count > 1 ? "s" : ""}</span>`
        : count > 0
            ? `<span style="color:#e67e22; font-size:0.85em; margin-left:6px;">(non déclaré)</span>`
            : `<span style="color:#888; font-size:0.85em; margin-left:6px;">(aucune déclaration)</span>`;

    const itemsHtml = items.map(item => {
        if (item.type === "craft") {
            const newTotal  = (item.craftDaysAlready ?? 0) + (item.days ?? 0);
            const complete  = newTotal >= (item.craftTotalDays ?? 0);
            const remaining = Math.max(0, (item.craftTotalDays ?? 0) - newTotal);
            const progress  = complete
                ? `<span style="color:#2ecc71; font-weight:bold;">✅ Terminé après ce TM</span>`
                : `${newTotal}/${item.craftTotalDays} j — <strong>${remaining} j restant${remaining > 1 ? "s" : ""}</strong>`;
            return `<div style="font-size:0.9em; padding:4px 0 4px 4px; border-top:1px solid #eee;">
                <div>🔨 <strong>${item.craftName || "—"}</strong> <span style="color:#888;">— ${craftTypeLabel(item.craftType)}</span></div>
                <div style="color:#888;">Coût : <strong>${item.craftCost ?? "?"} po</strong> · ${item.dateRangeLabel ?? ""} (${item.days ?? "?"} j ce TM)</div>
                <div>${progress}</div>
            </div>`;
        } else {
            const rate     = item.skillId ? calcDailyRate(actor, item.skillId, item.hasMaitrise, item.hasExpertise, item.hasTools) : 0;
            const est      = Math.floor(rate * (item.days ?? 0));
            const profStr  = item.hasTools ? " [Outils]" : item.hasExpertise ? " [Expertise]" : item.hasMaitrise ? " [Maîtrise]" : "";
            const bonusPart = item.bonusRoll ? ` · bonus : <strong>${item.bonusRoll}</strong>${item.bonusSrc ? ` <span style="color:#888;">(${item.bonusSrc})</span>` : ""}` : "";
            return `<div style="font-size:0.9em; padding:4px 0 4px 4px; border-top:1px solid #eee;">
                <div><strong>${item.choiceLabel ?? item.skillId}</strong>${profStr} — ${item.dateRangeLabel ?? ""} (${item.days ?? "?"} j)</div>
                <div style="color:#888;">≈ ${rate} po/j → ~${est} po${bonusPart}${item.doRoll ? " · test d20 demandé" : ""}</div>
            </div>`;
        }
    }).join("") || `<div style="color:#888; font-size:0.9em; font-style:italic; padding-top:4px;">Aucune activité déclarée.</div>`;

    return `
<div class="tm-actor-row" data-actor-id="${id}"
     style="border:1px solid #ccc; border-radius:4px; padding:8px; margin-bottom:8px;">
    <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
        <input type="checkbox" name="tm-active-${id}" ${startUnchecked ? "" : "checked"} style="margin:0;">
        <a class="tm-actor-name" data-actor-id="${id}"
           style="cursor:pointer; font-weight:bold; text-decoration:underline;">${actor.name}</a>${statusBadge}
        <div style="margin-left:auto; display:flex; gap:4px;">
            <button type="button" class="tm-edit-btn" data-actor-id="${id}"
                    style="padding:2px 8px; font-size:0.8em; color:#3498db; background:none; border:1px solid #3498db; border-radius:3px; cursor:pointer;">
                Modifier
            </button>
            <button type="button" class="tm-refuse-btn" data-actor-id="${id}"
                    style="padding:2px 8px; font-size:0.8em; color:#e74c3c; background:none; border:1px solid #e74c3c; border-radius:3px; cursor:pointer;">
                Refuser
            </button>
        </div>
    </div>
    <div class="tm-controls-${id}" style="opacity:${startUnchecked ? "0.4" : "1"};">
        ${itemsHtml}
    </div>
</div>`;
}

// ============================================================
// Dialogue GM — ouverture
// ============================================================

async function openDowntimeDialog() {
    const allActors  = getPlayerActors();
    const declared   = allActors.filter(a =>  a.getFlag(FLAG_NS, "tm")?.declared);
    const undeclared = allActors.filter(a => !a.getFlag(FLAG_NS, "tm")?.declared);

    if (allActors.length === 0) { ui.notifications.warn("Aucun personnage joueur trouvé."); return; }

    const showAllByDefault = declared.length === 0;
    const content = `
<div>
    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:6px;">
        ${declared.length === 0
            ? `<span style="color:#e67e22;"><em>Aucune déclaration reçue.</em></span>`
            : `<span><strong>${declared.length}</strong> déclaration${declared.length > 1 ? "s" : ""} reçue${declared.length > 1 ? "s" : ""}.</span>`}
        <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
            <input type="checkbox" id="tm-show-list" style="margin:0;">
            Afficher la liste${declared.length > 0 ? ` (${declared.length})` : ""}
        </label>
        ${!showAllByDefault && undeclared.length > 0
            ? `<label style="cursor:pointer; color:#888; display:flex; align-items:center; gap:5px;">
                   <input type="checkbox" id="tm-show-undeclared" style="margin:0;">${undeclared.length} sans déclaration
               </label>`
            : ""}
    </div>
    <div id="tm-actor-list" style="display:none;">
        <input id="tm-search" type="text" placeholder="Rechercher un personnage…"
               style="width:100%; box-sizing:border-box; margin-bottom:6px; padding:4px 8px; border:1px solid #ccc; border-radius:4px;">
        <div id="tm-actor-scroll" style="max-height:55vh; overflow-y:auto; padding-right:4px;">
            ${(showAllByDefault ? allActors : declared).map(a => buildActorRow(a, true)).join("")}
            ${!showAllByDefault && undeclared.length > 0
                ? `<div class="tm-undeclared-group" style="display:none;">${undeclared.map(a => buildActorRow(a, true)).join("")}</div>`
                : ""}
        </div>
    </div>
</div>`;

    let dialogHtml = null;

    await (foundry.applications.api.DialogV2 ?? DialogV2).wait({
        window: { title: "Downtime — Temps morts", resizable: true },
        position: { width: 560 },
        content,
        rejectClose: false,
        render: () => {
            const rootEl = document.getElementById("tm-show-list")
                ?.closest(".application, .dialog, form") ?? document.body;
            dialogHtml = rootEl;
            const $html = $(rootEl);

            $html.find("#tm-show-list").on("change", function () {
                $html.find("#tm-actor-list").css("display", this.checked ? "block" : "none");
                if (this.checked) $html.find("#tm-search").trigger("focus");
            });

            $html.find("#tm-search").on("input", function () {
                const q = this.value.trim().toLowerCase();
                $html.find(".tm-actor-row").each(function () {
                    const name = $(this).find(".tm-actor-name").text().toLowerCase();
                    $(this).toggle(!q || name.includes(q));
                });
            });

            $html.find("#tm-show-undeclared").on("change", function () {
                $html.find(".tm-undeclared-group").css("display", this.checked ? "block" : "none");
            });

            for (const actor of allActors) {
                const id = actor.id;
                $html.find(`[name="tm-active-${id}"]`).on("change", function () {
                    $html.find(`.tm-controls-${id}`).css("opacity", this.checked ? "1" : "0.4");
                });
            }

            $html.find(".tm-actor-name").on("click", function () {
                game.actors.get(this.dataset.actorId)?.sheet.render(true);
            });

            $html.find(".tm-edit-btn").on("click", function () {
                const actor = game.actors.get(this.dataset.actorId);
                if (actor) openDeclarationDialog(actor);
            });

            $html.find(".tm-refuse-btn").on("click", async function () {
                const actorId = this.dataset.actorId;
                const actor   = game.actors.get(actorId);
                if (!actor) return;

                await actor.unsetFlag(FLAG_NS, "tm");

                const owners = getActorOwners(actor);
                if (owners.length > 0) {
                    ChatMessage.create({
                        content: `❌ Votre demande de temps mort a été refusée par le MJ.`,
                        whisper: owners.map(u => u.id),
                        speaker: { alias: "Downtime" }
                    });
                }

                $html.find(`[data-actor-id="${actorId}"].tm-actor-row`).css("opacity", "0.4");
                $html.find(`[name="tm-active-${actorId}"]`).prop("checked", false);
                $html.find(`.tm-controls-${actorId}`).css("opacity", "0.4");
                this.textContent = "Refusé";
                this.disabled = true;
                this.style.color = this.style.borderColor = "#888";

                ui.notifications.info(`Demande TM refusée pour ${actor.name}.`);
            });
        },
        buttons: [
            {
                action: "apply",
                label: "Appliquer les gains",
                icon: '<i class="fas fa-coins"></i>',
                default: true,
                callback: async () => {
                    if (dialogHtml) await applyDowntimeGains($(dialogHtml), allActors);
                }
            },
            { action: "cancel", label: "Annuler", icon: '<i class="fas fa-times"></i>' }
        ]
    });
}

// ============================================================
// Application des gains — côté GM
// ============================================================

async function applyDowntimeGains($html, actors) {
    const lines        = [];
    const discordLines = [];
    const autodeduct   = game.settings.get("downtime", "autodeductCraft") ?? true;
    const reliableTalent = game.settings.get("downtime", "enableReliableTalent") ?? true;
    const minDays      = game.settings.get("downtime", "minRollDays") ?? 5;

    for (const actor of actors) {
        const id = actor.id;
        if (!$html.find(`[name="tm-active-${id}"]`).prop("checked")) continue;

        const flag  = actor.getFlag(FLAG_NS, "tm");
        const items = tmFlagItems(flag);
        if (items.length === 0) continue;

        const owners     = getActorOwners(actor);
        const playerName = owners.find(u => !u.isGM)?.name ?? owners[0]?.name ?? "?";
        const gmName     = game.user.name;
        const remaining  = []; // crafts incomplets qui persistent

        for (const item of items) {

            // ── Branche craft ─────────────────────────────────
            if (item.type === "craft") {
                const daysAlready = item.craftDaysAlready ?? 0;
                const workDays    = item.days             ?? 0;
                const totalDays   = item.craftTotalDays   ?? 0;
                const craftName   = item.craftName        ?? "?";
                const dateLabel   = item.dateRangeLabel   ?? "";
                const craftCost   = item.craftCost        ?? 0;
                const newTotal    = daysAlready + workDays;
                const complete    = newTotal >= totalDays;
                const left        = Math.max(0, totalDays - newTotal);
                const isFirst     = daysAlready === 0;

                if (autodeduct && isFirst && craftCost > 0) {
                    await deductGoldCost(actor, craftCost);
                }

                if (owners.length > 0) {
                    let msg;
                    if (complete) {
                        msg = `🔨 Craft terminé pour <strong>${actor.name}</strong> : <strong>${craftName}</strong> — ${dateLabel} (${workDays} j) → ✅ Objet créé !`;
                    } else if (isFirst) {
                        msg = `🔨 Craft démarré pour <strong>${actor.name}</strong> : <strong>${craftName}</strong> — ${dateLabel} (${workDays} j) → ${newTotal}/${totalDays} j — <strong>${left} j restant${left > 1 ? "s" : ""}</strong>`
                            + (autodeduct && craftCost > 0 ? `<br><span style="color:#e67e22;">⚠️ Le coût de <strong>${craftCost} po</strong> a été retiré de votre bourse.</span>` : "");
                    } else {
                        msg = `🔨 Craft en cours pour <strong>${actor.name}</strong> : <strong>${craftName}</strong> — ${dateLabel} (${workDays} j) → ${newTotal}/${totalDays} j — <strong>${left} j restant${left > 1 ? "s" : ""}</strong>`;
                    }
                    ChatMessage.create({ content: msg, whisper: owners.map(u => u.id), speaker: { alias: "Downtime" } });
                }

                if (complete) {
                    ChatMessage.create({
                        content: `⚠️ <strong>${actor.name}</strong> a terminé son craft : <strong>${craftName}</strong> (${craftInfoStr(item)}).`
                               + ` Pensez à ajouter l'objet sur sa fiche.`
                               + (autodeduct ? ` Le coût de <strong>${craftCost} po</strong> a déjà été retiré.` : ""),
                        whisper: ChatMessage.getWhisperRecipients("GM"),
                        speaker: { alias: "Downtime" }
                    });
                }

                if (!complete) remaining.push({ ...item, craftDaysAlready: newTotal, declared: false });

                const line = complete
                    ? `<strong>${actor.name}</strong> — 🔨 <strong>${craftName}</strong> — ${dateLabel} (${workDays} j) → ✅ <strong>Terminé !</strong>`
                    : `<strong>${actor.name}</strong> — 🔨 <strong>${craftName}</strong> — ${dateLabel} (${workDays} j) → ${newTotal}/${totalDays} j (${left} restants)`;
                lines.push(line);
                discordLines.push(complete
                    ? `**${actor.name}** (${playerName}) — 🔨 **${craftName}** — ${dateLabel} (${workDays} j) → Terminé ! (par ${gmName})`
                    : `**${actor.name}** (${playerName}) — 🔨 **${craftName}** — ${dateLabel} (${workDays} j) → ${newTotal}/${totalDays} j, ${left} j restant${left > 1 ? "s" : ""} (par ${gmName})`);

            // ── Branche gain de compétence ────────────────────
            } else {
                const { skillId, hasMaitrise, hasExpertise, hasTools, doRoll,
                        bonusRoll, bonusSrc, days, dateRangeLabel } = item;
                const sDay = item.startDay ?? 1, sMonth = item.startMonth ?? 0, sYear = item.startYear ?? 1;
                const eDay = item.endDay ?? 1, eMonth = item.endMonth ?? 0, eYear = item.endYear ?? 1;
                const totalDays   = days ?? getDaysFromDates(sDay, sMonth, sYear, eDay, eMonth, eYear);
                const dateLabel   = dateRangeLabel ?? `${sDay} ${getMonthName(sMonth)} → ${eDay} ${getMonthName(eMonth)}`;
                const activityName = game.i18n.localize(CONFIG.DND5E.skills[skillId]?.label ?? skillId);
                const profStr     = hasTools ? " [Outils]" : hasExpertise ? " [Expertise]" : hasMaitrise ? " [Maîtrise]" : "";
                const dailyRate   = calcDailyRate(actor, skillId, hasMaitrise, hasExpertise, hasTools);

                let total = dailyRate * totalDays;
                let rollResult = null;

                if (doRoll && totalDays >= minDays) {
                    const abilityId  = CONFIG.DND5E.skills[skillId]?.ability ?? "int";
                    const abilityMod = actor.system.abilities[abilityId]?.mod ?? 0;
                    const prof       = actor.system.attributes?.prof ?? 2;
                    const checkMod   = abilityMod + (hasExpertise ? prof * 2 : (hasMaitrise || hasTools) ? prof : 0);
                    const roll       = await new Roll("1d20 + @mod", { mod: checkMod }).evaluate();
                    const d20Raw     = roll.dice[0]?.results[0]?.result ?? (roll.total - checkMod);

                    // Reliable Talent : le d20 ne peut pas être inférieur à 10 si compétence maîtrisée
                    const isProficient = hasMaitrise || hasExpertise || hasTools;
                    const hasRT = reliableTalent && isProficient && actor.items.some(i => {
                        const n = i.name.toLowerCase();
                        return n.includes("reliable talent") || n.includes("talent fiable");
                    });
                    const effectiveD20 = (hasRT && d20Raw < 10) ? 10 : d20Raw;
                    rollResult = effectiveD20 + checkMod;

                    // Évalue le bonus au jet s'il est renseigné
                    if (bonusRoll) {
                        try {
                            const bonusR = await new Roll(bonusRoll).evaluate();
                            rollResult += bonusR.total ?? 0;
                            await bonusR.toMessage({
                                speaker: { alias: `Downtime — ${actor.name}` },
                                flavor: `Bonus au test${bonusSrc ? ` (${bonusSrc})` : ""}`
                            });
                        } catch(e) {
                            const flat = parseInt(bonusRoll);
                            if (!isNaN(flat)) rollResult += flat;
                        }
                    }

                    // Applique le multiplicateur configuré dans les settings
                    const mult = getRollMultiplier(rollResult);
                    total = total * mult;

                    const abilityAbbr = game.i18n.localize(
                        CONFIG.DND5E.abilities[abilityId]?.abbreviation ?? abilityId
                    ).toUpperCase();
                    await roll.toMessage({
                        speaker: { alias: `Downtime — ${actor.name}` },
                        flavor: `Test de compétence : ${activityName} (${abilityAbbr}) — ${totalDays} j`
                    });
                }

                const totalGP = Math.floor(total);
                const totalSP = Math.round((total - totalGP) * 10);
                const gainStr = totalSP > 0 ? `+${totalGP} po ${totalSP} pa` : `+${totalGP} po`;

                const update = {};
                if (totalGP > 0) update["system.currency.gp"] = (actor.system.currency?.gp ?? 0) + totalGP;
                if (totalSP > 0) update["system.currency.sp"] = (actor.system.currency?.sp ?? 0) + totalSP;
                if (Object.keys(update).length > 0) await actor.update(update);

                if (owners.length > 0) {
                    const mult = rollResult !== null ? getRollMultiplier(rollResult) : 1;
                    const pctStr = rollResult === null ? ""
                        : mult < 1   ? ` (test : ${rollResult} → ${Math.round((mult - 1) * 100)} %)`
                        : mult > 1   ? ` (test : ${rollResult} → +${Math.round((mult - 1) * 100)} %)`
                        :              ` (test : ${rollResult} → ±0 %)`;
                    ChatMessage.create({
                        content: `<span style="color:#000;">🕰️ Temps mort appliqué pour <strong>${actor.name}</strong> : `
                               + `${activityName}${profStr}, ${dateLabel} — ${totalDays} j (${dailyRate} po/j)${pctStr} → <strong>${gainStr}</strong></span>`,
                        whisper: owners.map(u => u.id),
                        speaker: { alias: "Downtime" }
                    });
                }

                const mult = rollResult !== null ? getRollMultiplier(rollResult) : 1;
                const pct  = mult !== 1 ? ` → ${mult >= 1 ? "+" : ""}${Math.round((mult - 1) * 100)} %` : "";
                let line   = `<strong>${actor.name}</strong> — ${activityName}${profStr} — ${dateLabel} (${totalDays} j, ${dailyRate} po/j)`;
                if (rollResult !== null) line += ` → test : ${rollResult}${pct}`;
                line += ` = <strong>${gainStr}</strong>`;
                lines.push(line);
                discordLines.push(`**${actor.name}** (${playerName}) — ${activityName}${profStr} — ${dateLabel} (${totalDays} j, ${dailyRate} po/j)${rollResult !== null ? ` → test : ${rollResult}${pct}` : ""} = **${gainStr}** (par ${gmName})`);
            }
        }

        // Met à jour ou efface le flag
        if (remaining.length > 0) await actor.setFlag(FLAG_NS, "tm", { declared: false, items: remaining });
        else await actor.unsetFlag(FLAG_NS, "tm");
    }

    if (lines.length === 0) { ui.notifications.info("Aucun personnage traité."); return; }

    // Résumé GM en chat privé
    ChatMessage.create({
        content: `<div style="color:#000;"><p style="margin:0 0 4px; font-weight:bold;">Résumé des temps morts</p><ul style="margin:0; padding-left:16px;">${lines.map(l => `<li>${l}</li>`).join("")}</ul></div>`,
        whisper: ChatMessage.getWhisperRecipients("GM"),
        speaker: { alias: "Downtime" }
    });

    // Webhook Discord optionnel
    const webhookUrl = game.settings.get("downtime", "tmWebhookUrl");
    if (webhookUrl) {
        fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: `🕰️ **Résumé des temps morts**\n${discordLines.map(l => `• ${l}`).join("\n")}` })
        }).catch(err => console.error("downtime | Webhook Discord :", err));
    }

    ui.notifications.info(`Temps morts appliqués : ${lines.length} activité${lines.length > 1 ? "s" : ""}.`);
}

// ============================================================
// Notification Discord — envoyée dès qu'un joueur déclare son TM
// ============================================================

function notifyTmDeclared() {
    const webhookUrl = game.settings.get("downtime", "tmWebhookUrl");
    if (!webhookUrl) return;

    const pending = game.actors.filter(a =>
        a.type === "character" && a.hasPlayerOwner && a.getFlag(FLAG_NS, "tm")?.declared
    );
    if (pending.length === 0) return;

    fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            content: `⏳ **${pending.length} temps mort${pending.length > 1 ? "s" : ""} en attente** de validation GM.\n`
                   + pending.map(a => `• ${a.name}`).join("\n")
        })
    }).catch(err => console.error("downtime | Webhook déclaration :", err));
}
