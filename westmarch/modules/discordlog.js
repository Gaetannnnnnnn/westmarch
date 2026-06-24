// ============================================================
// discordlog.js — Log des modifications vers un salon Discord
// Envoie un message via webhook Discord pour : ajout/suppression
// d'objets d'inventaire, changement de quantité, gain d'XP/niveau,
// et création/suppression de personnages.
// ============================================================

const INVENTORY_TYPES = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];

// Anti-doublon par contenu : certains modules tiers (ex. Monks TokenBar /
// Assign XP) déclenchent parfois deux fois le même hook preUpdateActor pour
// un seul et même changement réel (avant/après identiques). Ce n'est pas
// dû à plusieurs GM connectés (déjà géré par activeGM ci-dessous), donc on
// bloque aussi tout message strictement identique envoyé dans les 5
// dernières secondes.
const recentMessages = new Map();
const DEDUPE_WINDOW_MS = 5000;

function isDuplicate(content) {
    const now = Date.now();
    for (const [msg, ts] of recentMessages) {
        if (now - ts > DEDUPE_WINDOW_MS) recentMessages.delete(msg);
    }
    if (recentMessages.has(content)) return true;
    recentMessages.set(content, now);
    return false;
}

// Détermine si CE client est celui qui doit envoyer le message (un seul
// client doit le faire, peu importe combien sont connectés).
function isElectedSender() {
    // En priorité, le GM "actif" (désignation déterministe de Foundry,
    // identique sur tous les clients).
    const activeGM = game.users.activeGM;
    if (activeGM) return game.user.id === activeGM.id;

    // Aucun GM connecté (ex. joueurs qui gèrent leur inventaire entre deux
    // sessions) : avec l'ancien code, personne ne correspondait jamais à
    // activeGM et le message était silencieusement perdu. On élit donc à
    // la place l'utilisateur actif avec l'id le plus petit — un calcul
    // déterministe, identique sur tous les clients connectés.
    const activeUsers = game.users.filter(u => u.active);
    if (activeUsers.length === 0) return false;
    const elected = activeUsers.reduce((a, b) => (a.id < b.id ? a : b));
    return game.user.id === elected.id;
}

// Envoie un message au webhook. N'est exécuté que par le client "élu" (les
// hooks se déclenchent sur tous les clients connectés, mais on ne veut
// envoyer le message qu'une seule fois).
function sendToDiscord(content) {
    if (!isElectedSender()) return;
    if (!game.settings.get("westmarch", "enableDiscordLog")) return;
    if (isDuplicate(content)) return;

    const url = game.settings.get("westmarch", "discordLogWebhookUrl");
    if (!url) return;

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, username: "WestMarch Log" })
    }).catch(err => console.error("[WestMarch] Erreur envoi Discord log :", err));
}

// Tag d'auteur pour affichage dans le log : ajoute un ⚠️ quand l'action
// vient d'un joueur (et non d'un GM), pour repérer en un coup d'œil les
// modifications faites par les joueurs eux-mêmes.
function authorTag(userId) {
    const user = game.users.get(userId);
    const name = user?.name ?? "Inconnu";
    if (user && !user.isGM) {
        return `⚠️ *(par ${name} — joueur)*`;
    }
    return `*(par ${name})*`;
}

export function DiscordLogHooks() {

    // ============================================================
    // SECTION : Items d'inventaire (ajout / suppression / quantité)
    // ============================================================
    Hooks.on("createItem", (item, options, userId) => {
        const actor = item.parent;
        if (!actor || actor.type !== "character") return;
        if (!INVENTORY_TYPES.includes(item.type)) return;

        const qty = item.system?.quantity?.value;
        sendToDiscord(`📦 **${actor.name}** a obtenu **${item.name}**${qty > 1 ? ` x${qty}` : ""}. ${authorTag(userId)}`);
    });

    Hooks.on("deleteItem", (item, options, userId) => {
        const actor = item.parent;
        if (!actor || actor.type !== "character") return;
        if (!INVENTORY_TYPES.includes(item.type)) return;

        sendToDiscord(`🗑️ **${actor.name}** a perdu **${item.name}**. ${authorTag(userId)}`);
    });

    // preUpdateItem (et non updateItem) : au moment où updateItem se
    // déclenche, la modif est déjà appliquée sur le document, donc
    // item.system.X vaudrait déjà la valeur "après" et avant == après
    // en permanence. preUpdateItem fournit encore l'état "avant".
    Hooks.on("preUpdateItem", (item, changes, options, userId) => {
        const actor = item.parent;
        if (!actor) return;

        // ---- Quantité d'un objet d'inventaire ----
        // dnd5e envoie soit system.quantity (nombre brut, à plat — c'est
        // ce qu'envoie l'ajustement +/- de la fiche), soit system.quantity.value
        // (structure imbriquée) selon le point d'entrée utilisé.
        const quantityChange = typeof changes.system?.quantity === "number"
            ? changes.system.quantity
            : changes.system?.quantity?.value;

        if (actor.type === "character" && INVENTORY_TYPES.includes(item.type) && quantityChange !== undefined) {
            const before = typeof item.system.quantity === "number"
                ? item.system.quantity
                : (item.system.quantity?.value ?? 0);
            const after = quantityChange;
            if (before !== after) {
                sendToDiscord(`🔄 **${actor.name}** : quantité de **${item.name}** ${before} → ${after}. ${authorTag(userId)}`);
            }
        }

        // ---- Niveau (via l'item de classe) ----
        if (item.type === "class" && changes.system?.levels !== undefined) {
            const before = item.system.levels ?? 0;
            const after = changes.system.levels;
            if (before !== after) {
                sendToDiscord(`⬆️ **${actor.name}** : niveau de **${item.name}** ${before} → ${after}. ${authorTag(userId)}`);
            }
        }
    });

    // ============================================================
    // SECTION : XP et monnaie
    // ============================================================
    // Même raison : preUpdateActor (avant la modif), pas updateActor.
    Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
        // ---- XP ----
        if (changes.system?.details?.xp?.value !== undefined) {
            const before = actor.system.details?.xp?.value ?? 0;
            const after = changes.system.details.xp.value;
            if (before !== after) {
                sendToDiscord(`✨ **${actor.name}** : XP ${before} → ${after}. ${authorTag(userId)}`);
            }
        }

        // ---- Monnaie ----
        if (changes.system?.currency) {
            const before = actor.system.currency ?? {};
            const after = changes.system.currency;
            const labels = { pp: "PP", gp: "PO", ep: "PE", sp: "PA", cp: "PC" };
            const diffs = [];
            for (const [denom, newVal] of Object.entries(after)) {
                const oldVal = before[denom] ?? 0;
                if (newVal !== oldVal) {
                    const delta = newVal - oldVal;
                    diffs.push(`${labels[denom] ?? denom} : ${oldVal} → ${newVal} (${delta > 0 ? "+" : ""}${delta})`);
                }
            }
            if (diffs.length > 0) {
                sendToDiscord(`💰 **${actor.name}** : ${diffs.join(", ")}. ${authorTag(userId)}`);
            }
        }
    });

    // ============================================================
    // SECTION : Création / suppression de personnages
    // ============================================================
    Hooks.on("createActor", (actor, options, userId) => {
        sendToDiscord(`🆕 Personnage créé : **${actor.name}** (${actor.type}). ${authorTag(userId)}`);
    });

    Hooks.on("deleteActor", (actor, options, userId) => {
        sendToDiscord(`❌ Personnage supprimé : **${actor.name}** (${actor.type}). ${authorTag(userId)}`);
    });
}
