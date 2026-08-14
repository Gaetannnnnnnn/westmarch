// ============================================================
// settings.js — Paramètres configurables du module Downtime
//
// Tous les paramètres sont GM uniquement (scope: "world").
// Les tables JSON complexes (craft, multiplicateurs) sont
// éditées via un menu dédié avec des textareas.
// ============================================================

// -----------------------------------------------------------
// Valeurs par défaut des tables JSON
// Modifiables via : Paramètres → Downtime → Configurer les tables
// -----------------------------------------------------------

export const DEFAULT_ROLL_TABLE = JSON.stringify([
    { "max": 1,  "mult": 0.8, "label": "Échec critique (≤1) → −20 %" },
    { "max": 9,  "mult": 1.0, "label": "Neutre (2–9) → ±0 %"          },
    { "max": 19, "mult": 1.1, "label": "Succès (10–19) → +10 %"       },
    { "max": 99, "mult": 1.2, "label": "Critique (≥20) → +20 %"       }
], null, 2);

// Index = niveau du sort (0 = sort mineur, 1 = niveau 1, …, 9 = niveau 9)
export const DEFAULT_SCROLL_TABLE = JSON.stringify([
    { "days": 1,   "cost": 15    },
    { "days": 1,   "cost": 25    },
    { "days": 3,   "cost": 100   },
    { "days": 5,   "cost": 150   },
    { "days": 10,  "cost": 1000  },
    { "days": 25,  "cost": 1500  },
    { "days": 40,  "cost": 10000 },
    { "days": 50,  "cost": 12500 },
    { "days": 60,  "cost": 15000 },
    { "days": 120, "cost": 50000 }
], null, 2);

// Chaque entrée : key (identifiant interne), label (affiché),
// days (jours pour créer), cost (coût en po), minLevel (niveau minimum requis)
// Les entrées sont affichées dans l'ordre du tableau.
export const DEFAULT_MAGIC_TABLE = JSON.stringify([
    { "key": "common",    "label": "Common",    "days": 5,   "cost": 50,     "minLevel": 1  },
    { "key": "uncommon",  "label": "Uncommon",  "days": 10,  "cost": 200,    "minLevel": 1  },
    { "key": "rare",      "label": "Rare",      "days": 50,  "cost": 2000,   "minLevel": 5  },
    { "key": "veryrare",  "label": "Very Rare", "days": 125, "cost": 20000,  "minLevel": 11 },
    { "key": "legendary", "label": "Legendary", "days": 250, "cost": 100000, "minLevel": 17 }
], null, 2);

// -----------------------------------------------------------
// Classe interne — ouvre la fenêtre d'édition des tables JSON
// Foundry requiert une classe Application pour registerMenu.
// -----------------------------------------------------------

class _TableConfigOpener extends Application {
    async _render() {
        openTableConfigDialog();
    }
}

// -----------------------------------------------------------
// registerSettings — appelé dans Hooks.on("init")
// -----------------------------------------------------------

export function registerSettings() {

    // ── Dossier des PJ ──────────────────────────────────────
    game.settings.register("downtime", "pjFolderName", {
        name: "Dossier des PJ",
        hint: "Nom du dossier (ou ancêtre) contenant les acteurs PJ. "
            + "Laisser vide pour inclure tous les personnages joueurs sans filtrage de dossier.",
        scope: "world",
        config: true,
        type: String,
        default: "PJ",
        requiresReload: false
    });

    // ── Formule de gain journalier ───────────────────────────
    game.settings.register("downtime", "gainFormula", {
        name: "Formule de gain (po/jour)",
        hint: "Expression mathématique évaluée pour chaque activité. "
            + "Variables disponibles : @mod (modificateur de carac.), @prof (bonus de maîtrise), "
            + "@hasMaitrise (1/0), @hasExpertise (1/0), @hasTools (1/0), @level (niveau du perso). "
            + "Fonctions math. supportées : floor(), ceil(), max(), min(), abs(), round(). "
            + "Exemple Ashara : 1 + @mod + @hasMaitrise * 2 + @hasExpertise * 2 + @hasTools * 4",
        scope: "world",
        config: true,
        type: String,
        default: "1 + @mod + @hasMaitrise * 2 + @hasExpertise * 2 + @hasTools * 4",
        requiresReload: false
    });

    // ── Minimum de jours pour un jet de compétence ───────────
    game.settings.register("downtime", "minRollDays", {
        name: "Minimum de jours pour le test de compétence",
        hint: "Nombre de jours minimal requis pour pouvoir cocher l'option de jet de compétence.",
        scope: "world",
        config: true,
        type: Number,
        default: 5,
        requiresReload: false
    });

    // ── Déduction automatique du coût de craft ───────────────
    game.settings.register("downtime", "autodeductCraft", {
        name: "Déduire automatiquement le coût de craft",
        hint: "Si activé, le coût total du craft est automatiquement soustrait de la bourse du PJ "
            + "lors de la validation du premier temps mort pour ce craft.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    // ── Reliable Talent ──────────────────────────────────────
    game.settings.register("downtime", "enableReliableTalent", {
        name: "Prise en charge du Reliable Talent",
        hint: "Si activé, un personnage possédant un item nommé 'Reliable Talent' ou 'Talent Fiable' "
            + "ne peut pas obtenir moins de 10 sur le d20 de son test de compétence.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        requiresReload: false
    });

    // ── Webhook Discord ──────────────────────────────────────
    game.settings.register("downtime", "tmWebhookUrl", {
        name: "URL du Webhook Discord",
        hint: "URL complète d'un webhook Discord. Si renseignée, un message est envoyé automatiquement "
            + "quand un joueur déclare un TM et quand le GM applique les gains. "
            + "Laisser vide pour désactiver.",
        scope: "world",
        config: true,
        type: String,
        default: "",
        requiresReload: false
    });

    // ── Tables JSON (cachées — éditées via le menu) ──────────
    game.settings.register("downtime", "rollTable", {
        scope: "world", config: false, type: String, default: DEFAULT_ROLL_TABLE
    });
    game.settings.register("downtime", "scrollTable", {
        scope: "world", config: false, type: String, default: DEFAULT_SCROLL_TABLE
    });
    game.settings.register("downtime", "magicTable", {
        scope: "world", config: false, type: String, default: DEFAULT_MAGIC_TABLE
    });

    // ── Menu d'édition des tables ────────────────────────────
    game.settings.registerMenu("downtime", "tableConfig", {
        name: "Tables de craft & multiplicateurs de jet",
        label: "Configurer les tables",
        hint: "Modifier les tables de coût/durée pour les parchemins et objets magiques, "
            + "ainsi que les multiplicateurs appliqués selon le résultat du jet de compétence.",
        icon: "fa-solid fa-table",
        type: _TableConfigOpener,
        restricted: true
    });
}

// -----------------------------------------------------------
// Dialogue d'édition des tables JSON
// Ouvert par _TableConfigOpener._render()
// -----------------------------------------------------------

async function openTableConfigDialog() {
    const rollTableStr   = game.settings.get("downtime", "rollTable");
    const scrollTableStr = game.settings.get("downtime", "scrollTable");
    const magicTableStr  = game.settings.get("downtime", "magicTable");

    const textareaStyle = "width:100%; box-sizing:border-box; font-family:monospace; "
        + "font-size:0.82em; background:#1a1a2e; color:#d0d4e8; border:1px solid #444; "
        + "border-radius:4px; padding:6px; min-height:130px; resize:vertical;";

    const content = `
<div style="display:flex; flex-direction:column; gap:16px; padding:4px 0;">

    <div>
        <div style="font-weight:bold; margin-bottom:4px;">
            Multiplicateurs de jet de compétence
            <span style="font-weight:normal; color:#888; font-size:0.88em;">
                — tableau JSON : [{"max": N, "mult": X, "label": "…"}, …]
            </span>
        </div>
        <div style="color:#888; font-size:0.85em; margin-bottom:4px;">
            Pour chaque résultat de jet, la première entrée dont <code>max ≥ résultat</code> est utilisée.
            <code>mult</code> est un multiplicateur appliqué au gain total (ex. 0.8 = −20 %, 1.2 = +20 %).
        </div>
        <textarea id="dt-roll-table" style="${textareaStyle}">${rollTableStr}</textarea>
    </div>

    <div>
        <div style="font-weight:bold; margin-bottom:4px;">
            Table des parchemins de sort
            <span style="font-weight:normal; color:#888; font-size:0.88em;">
                — tableau JSON : [{"days": N, "cost": N}, …]
            </span>
        </div>
        <div style="color:#888; font-size:0.85em; margin-bottom:4px;">
            10 entrées, une par niveau : index 0 = sort mineur, index 1 = niveau 1, … index 9 = niveau 9.
        </div>
        <textarea id="dt-scroll-table" style="${textareaStyle}">${scrollTableStr}</textarea>
    </div>

    <div>
        <div style="font-weight:bold; margin-bottom:4px;">
            Table des objets magiques
            <span style="font-weight:normal; color:#888; font-size:0.88em;">
                — tableau JSON : [{"key": "…", "label": "…", "days": N, "cost": N, "minLevel": N}, …]
            </span>
        </div>
        <div style="color:#888; font-size:0.85em; margin-bottom:4px;">
            <code>key</code> = identifiant interne (unique). <code>label</code> = texte affiché dans la liste déroulante.
            <code>minLevel</code> = niveau minimum du personnage requis pour cette rareté.
        </div>
        <textarea id="dt-magic-table" style="${textareaStyle}">${magicTableStr}</textarea>
    </div>

</div>`;

    await (foundry.applications.api.DialogV2 ?? DialogV2).wait({
        window: { title: "Downtime — Tables de craft & jets", resizable: true },
        position: { width: 680 },
        content,
        rejectClose: false,
        buttons: [
            {
                action: "save",
                label: "Sauvegarder",
                icon: '<i class="fas fa-save"></i>',
                default: true,
                callback: async () => {
                    const rollRaw   = document.getElementById("dt-roll-table")?.value   ?? rollTableStr;
                    const scrollRaw = document.getElementById("dt-scroll-table")?.value ?? scrollTableStr;
                    const magicRaw  = document.getElementById("dt-magic-table")?.value  ?? magicTableStr;

                    let valid = true;
                    for (const [name, raw] of [["Multiplicateurs", rollRaw], ["Parchemins", scrollRaw], ["Objets magiques", magicRaw]]) {
                        try { JSON.parse(raw); }
                        catch(e) {
                            ui.notifications.error(`Downtime — JSON invalide dans "${name}" : ${e.message}`);
                            valid = false;
                        }
                    }
                    if (!valid) return false;

                    await game.settings.set("downtime", "rollTable",   rollRaw);
                    await game.settings.set("downtime", "scrollTable", scrollRaw);
                    await game.settings.set("downtime", "magicTable",  magicRaw);
                    ui.notifications.info("Downtime — Tables sauvegardées.");
                }
            },
            { action: "cancel", label: "Annuler", icon: '<i class="fas fa-times"></i>' }
        ]
    });
}

// -----------------------------------------------------------
// Accesseurs publics — utilisés dans tm.js
// -----------------------------------------------------------

export function getScrollTable() {
    try   { return JSON.parse(game.settings.get("downtime", "scrollTable")); }
    catch { return JSON.parse(DEFAULT_SCROLL_TABLE); }
}

export function getMagicTable() {
    try   { return JSON.parse(game.settings.get("downtime", "magicTable")); }
    catch { return JSON.parse(DEFAULT_MAGIC_TABLE); }
}

export function getRollTable() {
    try   { return JSON.parse(game.settings.get("downtime", "rollTable")); }
    catch { return JSON.parse(DEFAULT_ROLL_TABLE); }
}

// Évalue la formule de gain configurée par le GM.
// Retourne le taux journalier en po (nombre).
// Variables injectées : @mod, @prof, @hasMaitrise, @hasExpertise, @hasTools, @level
export function evalGainFormula(actor, skillId, hasMaitrise, hasExpertise, hasTools) {
    const formula   = game.settings.get("downtime", "gainFormula");
    const abilityId = CONFIG.DND5E.skills[skillId]?.ability ?? "int";
    const abilityMod = actor.system.abilities[abilityId]?.mod ?? 0;

    const vars = {
        mod:          abilityMod,
        prof:         actor.system.attributes?.prof ?? 2,
        hasMaitrise:  hasMaitrise ? 1 : 0,
        hasExpertise: hasExpertise ? 1 : 0,
        hasTools:     hasTools ? 1 : 0,
        level:        actor.system.details?.level ?? 1
    };

    try {
        // Remplace @var par la valeur numérique correspondante
        const expr = Roll.replaceFormulaData(formula, vars, { missing: "0" });
        // Évalue l'expression avec accès aux fonctions Math (floor, ceil, max, min…)
        // Seuls les GMs peuvent modifier cette formule → usage de Function acceptable.
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; with(Math) { return (${expr}); }`)();
        return Math.max(0, isNaN(result) ? 0 : result);
    } catch(e) {
        console.warn("downtime | Formule de gain invalide :", formula, e.message);
        return 0;
    }
}

// Retourne le multiplicateur à appliquer pour un résultat de jet donné.
export function getRollMultiplier(rollResult) {
    const table  = getRollTable();
    const sorted = [...table].sort((a, b) => a.max - b.max);
    for (const entry of sorted) {
        if (rollResult <= entry.max) return entry.mult ?? 1.0;
    }
    return sorted[sorted.length - 1]?.mult ?? 1.0;
}
