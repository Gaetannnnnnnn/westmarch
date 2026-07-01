// ============================================================
// tm.js — Temps morts : calcul des gains d'argent par personnage
// Bouton dans le groupe WestMarch de la barre d'outils de gauche.
// Le GM sélectionne la compétence (ou l'outil) de chaque perso,
// entre le nombre de jours, et applique les gains directement
// sur la monnaie de chaque acteur.
// Formule : (1 + modif_carac + bonus_maîtrise) × jours,
// puis modificateur du d20 optionnel sur le total.
// ============================================================

export function TmHooks() {

    // Ajouter le bouton au groupe WestMarch existant (créé par fake-warning.js).
    // Ce hook se déclenche après celui de fake-warning.js (ordre d'enregistrement),
    // donc controls.westmarch existe déjà quand on y ajoute notre outil.
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
}

// ---- Récupération des acteurs joueurs ----------------------------------------

function getPlayerActors() {
    return game.actors
        .filter(a => a.type === "character" && a.hasPlayerOwner)
        .sort((a, b) => a.name.localeCompare(b.name));
}

// ---- Construction des listes déroulantes ------------------------------------

function buildSkillOptionsHtml() {
    return Object.entries(CONFIG.DND5E.skills)
        .map(([id, data]) => ({
            id,
            label: game.i18n.localize(data.label),
            abilityAbbr: (game.i18n.localize(
                CONFIG.DND5E.abilities[data.ability]?.abbreviation ?? data.ability
            ) ?? data.ability).toUpperCase()
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
        .map(s => `<option value="${s.id}">${s.label} (${s.abilityAbbr})</option>`)
        .join("");
}

function buildToolOptionsHtml(actor) {
    const tools = actor.items
        .filter(i => i.type === "tool" && ((i.system.prof?.multiplier ?? i.system.proficient ?? 0) >= 1))
        .sort((a, b) => a.name.localeCompare(b.name));
    if (tools.length === 0) return null;
    return tools.map(i => `<option value="${i.id}">${i.name}</option>`).join("");
}

// ---- Construction du contenu HTML du dialogue --------------------------------

function buildDialogContent(actors) {
    const skillOptionsHtml = buildSkillOptionsHtml();

    const rows = actors.map(actor => {
        const toolOptionsHtml = buildToolOptionsHtml(actor);
        const hasTools = toolOptionsHtml !== null;

        return `
<div class="tm-actor-row" data-actor-id="${actor.id}"
     style="border:1px solid #ccc; border-radius:4px; padding:8px; margin-bottom:8px;">
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <input type="checkbox" name="tm-active-${actor.id}" checked style="margin:0;">
        <strong>${actor.name}</strong>
    </div>
    <div class="tm-controls-${actor.id}" style="display:flex; flex-direction:column; gap:5px;">
        <div style="display:flex; gap:6px; align-items:center;">
            <label style="min-width:70px; white-space:nowrap;">Mode :</label>
            <select name="tm-mode-${actor.id}" style="flex:1;">
                <option value="skill">Compétence</option>
                <option value="tool" ${!hasTools ? 'disabled' : ''}>Outil${!hasTools ? ' (aucun maîtrisé)' : ''}</option>
            </select>
        </div>
        <div class="tm-skill-row-${actor.id}" style="display:flex; gap:6px; align-items:center;">
            <label style="min-width:70px; white-space:nowrap;">Compétence :</label>
            <select name="tm-skill-${actor.id}" style="flex:1;">${skillOptionsHtml}</select>
        </div>
        <div class="tm-tool-row-${actor.id}" style="display:none; gap:6px; align-items:center;">
            <label style="min-width:70px; white-space:nowrap;">Outil :</label>
            <select name="tm-tool-${actor.id}" style="flex:1;">
                ${hasTools ? toolOptionsHtml : '<option disabled>Aucun outil maîtrisé</option>'}
            </select>
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
            <label style="min-width:70px; white-space:nowrap;">Jours :</label>
            <input type="number" name="tm-days-${actor.id}" value="10" min="1" style="width:70px;">
        </div>
        <div style="display:flex; gap:6px; align-items:center;">
            <input type="checkbox" name="tm-roll-${actor.id}" style="margin:0;">
            <label style="margin:0;">Test de d20 optionnel <em>(≥ 5 jours requis)</em></label>
        </div>
    </div>
</div>`;
    }).join("");

    return `<div style="max-height:60vh; overflow-y:auto; padding-right:4px;">${rows}</div>`;
}

// ---- Ouverture du dialogue ---------------------------------------------------

function openDowntimeDialog() {
    const actors = getPlayerActors();
    if (actors.length === 0) {
        ui.notifications.warn("Aucun personnage joueur trouvé.");
        return;
    }

    const dlg = new Dialog({
        title: "Temps morts — Gains",
        content: buildDialogContent(actors),
        buttons: {
            apply: {
                icon: '<i class="fas fa-coins"></i>',
                label: "Appliquer les gains",
                callback: async (html) => applyDowntimeGains($(html), actors)
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Annuler"
            }
        },
        default: "apply"
    }, { width: 520 });

    // Branchement des écouteurs après le rendu
    Hooks.once("renderDialog", (app, html) => {
        if (app !== dlg) return;

        for (const actor of actors) {
            const id = actor.id;

            // Actif/inactif → estompe les contrôles
            html.find(`[name="tm-active-${id}"]`).on("change", function () {
                html.find(`.tm-controls-${id}`).css("opacity", this.checked ? "1" : "0.4");
            });

            // Mode compétence / outil → bascule les listes
            html.find(`[name="tm-mode-${id}"]`).on("change", function () {
                if (this.value === "tool") {
                    html.find(`.tm-skill-row-${id}`).css("display", "none");
                    html.find(`.tm-tool-row-${id}`).css("display", "flex");
                } else {
                    html.find(`.tm-skill-row-${id}`).css("display", "flex");
                    html.find(`.tm-tool-row-${id}`).css("display", "none");
                }
            });
        }
    });

    dlg.render(true);
}

// ---- Calcul et application des gains ----------------------------------------

async function applyDowntimeGains($html, actors) {
    const lines = [];

    for (const actor of actors) {
        const id = actor.id;

        if (!$html.find(`[name="tm-active-${id}"]`).prop("checked")) continue;

        const mode  = $html.find(`[name="tm-mode-${id}"]`).val();
        const days  = Math.max(1, parseInt($html.find(`[name="tm-days-${id}"]`).val()) || 1);
        const doRoll = $html.find(`[name="tm-roll-${id}"]`).prop("checked");

        let abilityId    = "int";
        let abilityMod   = 0;
        let profBonus    = 0;
        let activityName = "";

        if (mode === "skill") {
            const skillId   = $html.find(`[name="tm-skill-${id}"]`).val();
            const skillConf = CONFIG.DND5E.skills[skillId];
            abilityId       = skillConf?.ability ?? "int";
            abilityMod      = actor.system.abilities[abilityId]?.mod ?? 0;

            // dnd5e v3/v4 : prof.multiplier (0/1/2) ; fallback v2 : proficient
            const profLevel = actor.system.skills[skillId]?.prof?.multiplier
                ?? actor.system.skills[skillId]?.proficient ?? 0;
            // Maîtrise = +2, Expertise = +2 supplémentaires (total +4)
            profBonus    = profLevel >= 2 ? 4 : profLevel >= 1 ? 2 : 0;
            activityName = game.i18n.localize(skillConf?.label ?? skillId);

        } else {
            const toolId   = $html.find(`[name="tm-tool-${id}"]`).val();
            const toolItem = actor.items.get(toolId);
            abilityId      = toolItem?.system?.ability ?? "int";
            abilityMod     = actor.system.abilities[abilityId]?.mod ?? 0;
            profBonus      = 4; // outil = +4 fixe, non cumulable avec maîtrise/expertise
            activityName   = toolItem?.name ?? "Outil";
        }

        // Taux journalier (plancher à 0 : une activité ne peut pas faire perdre de l'argent)
        const dailyRate = Math.max(0, 1 + abilityMod + profBonus);
        let total       = dailyRate * days;
        let rollResult  = null;

        // Test de d20 optionnel (au moins 5 jours requis)
        if (doRoll) {
            if (days < 5) {
                ui.notifications.warn(`${actor.name} : le test de d20 nécessite au moins 5 jours de travail. Bonus non appliqué.`);
            } else {
                const roll = await new Roll("1d20").evaluate();
                rollResult = roll.total;

                let mult = 1.0;
                if (rollResult === 1)                     mult = 0.8;  // −20 %
                else if (rollResult >= 10 && rollResult <= 19) mult = 1.1;  // +10 %
                else if (rollResult >= 20)                mult = 1.2;  // +20 %
                // 2–9 : mult reste 1.0

                total = Math.round(total * mult);

                await roll.toMessage({
                    speaker: { alias: `Temps mort — ${actor.name}` },
                    flavor: `Test de d20 — ${activityName} (${days} jour${days > 1 ? "s" : ""})`
                });
            }
        } else {
            total = Math.round(total);
        }

        // Application sur la monnaie de l'acteur
        if (total > 0) {
            const currentGp = actor.system.currency?.gp ?? 0;
            await actor.update({ "system.currency.gp": currentGp + total });
        }

        // Ligne du rapport
        let line = `<strong>${actor.name}</strong> — ${activityName} — `
                 + `${days} jour${days > 1 ? "s" : ""} `
                 + `(${dailyRate} po/jour)`;
        if (rollResult !== null) {
            const pct = rollResult === 1 ? "−20 %" : rollResult >= 20 ? "+20 %" : rollResult >= 10 ? "+10 %" : "±0 %";
            line += ` → d20 : ${rollResult} (${pct})`;
        }
        line += ` = <strong>+${total} po</strong>`;
        lines.push(line);
    }

    if (lines.length === 0) {
        ui.notifications.info("Aucun personnage traité.");
        return;
    }

    // Rapport en message privé GM uniquement
    ChatMessage.create({
        content: `<h3>Résumé des temps morts</h3><ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul>`,
        whisper: ChatMessage.getWhisperRecipients("GM"),
        speaker: { alias: "WestMarch — Temps morts" }
    });

    ui.notifications.info(`Temps morts appliqués pour ${lines.length} personnage${lines.length > 1 ? "s" : ""}.`);
}
