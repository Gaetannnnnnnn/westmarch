// ============================================================
// discordlog.js — Log des modifications vers un salon Discord
// Envoie un message via webhook Discord pour : ajout/suppression
// d'objets d'inventaire, changement de quantité, gain d'XP/niveau,
// et création/suppression de personnages.
// ============================================================

const INVENTORY_TYPES = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];

// Envoie un message au webhook. N'est exécuté que côté GM (les hooks
// se déclenchent sur tous les clients connectés, mais on ne veut
// envoyer le message qu'une seule fois).
function sendToDiscord(content) {
    if (!game.user.isGM) return;
    if (!game.settings.get("westmarch", "enableDiscordLog")) return;

    const url = game.settings.get("westmarch", "discordLogWebhookUrl");
    if (!url) return;

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, username: "WestMarch Log" })
    }).catch(err => console.error("[WestMarch] Erreur envoi Discord log :", err));
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
        sendToDiscord(`📦 **${actor.name}** a obtenu **${item.name}**${qty > 1 ? ` x${qty}` : ""}.`);
    });

    Hooks.on("deleteItem", (item, options, userId) => {
        const actor = item.parent;
        if (!actor || actor.type !== "character") return;
        if (!INVENTORY_TYPES.includes(item.type)) return;

        sendToDiscord(`🗑️ **${actor.name}** a perdu **${item.name}**.`);
    });

    Hooks.on("updateItem", (item, changes, options, userId) => {
        const actor = item.parent;
        if (!actor) return;

        // ---- Quantité d'un objet d'inventaire ----
        if (actor.type === "character" && INVENTORY_TYPES.includes(item.type) && changes.system?.quantity?.value !== undefined) {
            const before = item.system.quantity?.value ?? 0;
            const after = changes.system.quantity.value;
            if (before !== after) {
                sendToDiscord(`🔄 **${actor.name}** : quantité de **${item.name}** ${before} → ${after}.`);
            }
        }

        // ---- Niveau (via l'item de classe) ----
        if (item.type === "class" && changes.system?.levels !== undefined) {
            const before = item.system.levels ?? 0;
            const after = changes.system.levels;
            if (before !== after) {
                sendToDiscord(`⬆️ **${actor.name}** : niveau de **${item.name}** ${before} → ${after}.`);
            }
        }
    });

    // ============================================================
    // SECTION : XP
    // ============================================================
    Hooks.on("updateActor", (actor, changes, options, userId) => {
        if (changes.system?.details?.xp?.value === undefined) return;

        const before = actor.system.details?.xp?.value ?? 0;
        const after = changes.system.details.xp.value;
        if (before !== after) {
            sendToDiscord(`✨ **${actor.name}** : XP ${before} → ${after}.`);
        }
    });

    // ============================================================
    // SECTION : Création / suppression de personnages
    // ============================================================
    Hooks.on("createActor", (actor, options, userId) => {
        sendToDiscord(`🆕 Personnage créé : **${actor.name}** (${actor.type}).`);
    });

    Hooks.on("deleteActor", (actor, options, userId) => {
        sendToDiscord(`❌ Personnage supprimé : **${actor.name}** (${actor.type}).`);
    });
}
