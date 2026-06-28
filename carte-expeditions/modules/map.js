// ============================================================
// map.js — Logique du module autonome "carte-expeditions",
// indépendant de westmarch (settings + flags namespacés
// "carte-expeditions").
// ============================================================

export function MapHooks() {

    Hooks.on("updateActor", (actor, changes, options, userId) => {
        if (!game.settings.get("carte-expeditions", "enableExpeditionMap")) return;
        if (actor.type !== "group") return;
        if (!changes.system?.members) return;
        if (!isActorOnExpeditionScene(actor)) return;

        syncGroupVisionOwnership(actor);
    });

    Hooks.once("ready", () => {
        if (!game.user.isGM) return;
        if (!game.settings.get("carte-expeditions", "enableExpeditionMap")) return;
        game.actors
            .filter(a => a.type === "group" && isActorOnExpeditionScene(a))
            .forEach(syncGroupVisionOwnership);
    });

    Hooks.on("preUpdateUser", (user, changes, options, userId) => {
        if (!("character" in changes)) return;
        options.cartexpePrevCharacterId = user.character?.id ?? null;
    });

    Hooks.on("updateUser", (user, changes, options, userId) => {
        if (!game.settings.get("carte-expeditions", "enableExpeditionMap")) return;
        if (!("character" in changes)) return;
        if (!game.user.isGM) return;

        const sceneId = game.settings.get("carte-expeditions", "expeditionMapSceneId");
        if (!sceneId) return;
        const scene = game.scenes.get(sceneId);
        if (!scene) return;

        const oldCharId = options.cartexpePrevCharacterId ?? null;
        const newCharId = changes.character ?? null;
        if (oldCharId === newCharId) return;

        swapFogForUserCharacter(scene, user, oldCharId, newCharId);
    });
}

function isActorOnExpeditionScene(actor) {
    const sceneId = game.settings.get("carte-expeditions", "expeditionMapSceneId");
    if (!sceneId) return false;
    const scene = game.scenes.get(sceneId);
    if (!scene) return false;
    return scene.tokens.some(t => t.actorId === actor.id);
}

async function syncGroupVisionOwnership(actor) {
    const memberActorIds = Array.from(actor.system?.members?.ids ?? []);

    const targetUserIds = game.users
        .filter(u => !u.isGM && u.character && memberActorIds.includes(u.character.id))
        .map(u => u.id);

    const previouslyAutoOwned = actor.getFlag("carte-expeditions", "autoOwners") ?? [];

    const newOwnership = foundry.utils.deepClone(actor.ownership);

    for (const userId of previouslyAutoOwned) {
        if (!targetUserIds.includes(userId)) {
            delete newOwnership[userId];
        }
    }

    for (const userId of targetUserIds) {
        newOwnership[userId] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
    }

    await actor.update({
        ownership: newOwnership,
        "flags.carte-expeditions.autoOwners": targetUserIds
    });
}

async function swapFogForUserCharacter(scene, user, oldCharId, newCharId) {
    const fogCollection = game.collections.get("FogExploration");
    const fogDoc = fogCollection.find(f => f.scene === scene.id && f.user === user.id);

    if (fogDoc && oldCharId) {
        const savedByChar = foundry.utils.deepClone(user.getFlag("carte-expeditions", "fogByCharacter") ?? {});
        savedByChar[oldCharId] = {
            explored: fogDoc.explored,
            positions: fogDoc.positions,
            timestamp: fogDoc.timestamp
        };
        await user.setFlag("carte-expeditions", "fogByCharacter", savedByChar);
    }

    const savedByChar = user.getFlag("carte-expeditions", "fogByCharacter") ?? {};
    const saved = newCharId ? savedByChar[newCharId] : null;

    if (fogDoc) {
        if (saved) {
            await fogDoc.update({
                explored: saved.explored,
                positions: saved.positions,
                timestamp: saved.timestamp
            });
        } else {
            await fogDoc.delete();
        }
    } else if (saved) {
        await foundry.documents.FogExploration.create({
            scene: scene.id,
            user: user.id,
            explored: saved.explored,
            positions: saved.positions,
            timestamp: saved.timestamp
        });
    }

    if (game.user.id === user.id && canvas.scene?.id === scene.id) {
        await canvas.fog.load();
        canvas.perception.update({ refreshLighting: true, refreshVision: true }, true);
    }
}
