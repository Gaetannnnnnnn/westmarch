// ============================================================
// anticheat.js — Surveillance des modifications suspectes en combat
// Avertit les GM (en privé) quand un joueur modifie ses sorts
// préparés, son attunement, ou son équipement pendant un combat
// ============================================================

export function AntiCheatHooks() {

    Hooks.on("preUpdateItem", (item, changes, options, userId) => {
        if (game.user.isGM) return;
        if (!game.settings.get("westmarch", "enableAntiCheat")) return;

        // Uniquement pendant un combat actif
        if (!game.combat || !game.combat.started) return;

        const actor = item.parent;
        if (!actor || actor.type !== "character") return;
        if (!actor.hasPlayerOwner) return;

        // L'acteur doit être engagé dans le combat en cours
        const isCombatant = game.combat.combatants.some(c => c.actorId === actor.id);
        if (!isCombatant) return;

        const events = [];

        // ---- Sorts préparés ----
        if (changes.system?.preparation?.prepared !== undefined && item.type === "spell") {
            const before = item.system.preparation?.prepared;
            const after = changes.system.preparation.prepared;
            if (before !== after && item.system.preparation?.mode === "prepared") {
                events.push(`${after ? "a préparé" : "a dé-préparé"} le sort <strong>${item.name}</strong>`);
            }
        }

        // ---- Attunement ----
        if (changes.system?.attuned !== undefined) {
            const before = item.system.attuned;
            const after = changes.system.attuned;
            if (before !== after) {
                events.push(`${after ? "s'est attuné à" : "s'est désattuné de"} <strong>${item.name}</strong>`);
            }
        }

        // ---- Équipement (armes/armures) ----
        if (changes.system?.equipped !== undefined && ["weapon", "equipment"].includes(item.type)) {
            const before = item.system.equipped;
            const after = changes.system.equipped;
            if (before !== after) {
                events.push(`${after ? "a équipé" : "a déséquipé"} <strong>${item.name}</strong>`);
            }
        }

        if (events.length === 0) return;

        const author = game.users.get(userId)?.name ?? "Inconnu";
        const gmIds = game.users.filter(u => u.isGM).map(u => u.id);

        ChatMessage.create({
            content: `⚠️ <strong>Anti-Cheat</strong> — <strong>${actor.name}</strong> (joueur : ${author}) ${events.join(", ")} <em>pendant le combat</em>.`,
            whisper: gmIds,
            speaker: { alias: "Anti-Cheat" }
        });
    });
}
