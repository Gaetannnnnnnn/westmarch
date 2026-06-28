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

        syncGroupVisionOwnership(actor);
    });

    Hooks.once("ready", () => {
        if (!game.user.isGM) return;
        if (!game.settings.get("carte-expeditions", "enableExpeditionMap")) return;
        game.actors
            .filter(a => a.type === "group")
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

    // ---- Rafraîchit le fog affiché en direct sur le client concerné.
    // Ces hooks se déclenchent sur TOUS les clients connectés quand le
    // document FogExploration change (y compris celui du joueur dont le
    // fog vient d'être swappé par le GM) — contrairement à un simple
    // contrôle dans swapFogForUserCharacter, qui ne s'exécute que côté
    // GM et ne peut donc jamais correspondre au client du joueur. ----
    Hooks.on("createFogExploration", refreshFogIfMine);
    Hooks.on("updateFogExploration", refreshFogIfMine);
    Hooks.on("deleteFogExploration", refreshFogIfMine);
}

function refreshFogIfMine(fogDoc) {
    if (game.user.id !== fogDoc.user) return;
    if (canvas.scene?.id !== fogDoc.scene) return;
    canvas.fog.load();
    canvas.perception.update({ refreshLighting: true, refreshVision: true }, true);
}

function isActorOnExpeditionScene(actor) {
    const sceneId = game.settings.get("carte-expeditions", "expeditionMapSceneId");
    if (!sceneId) return false;
    const scene = game.scenes.get(sceneId);
    if (!scene) return false;
    return scene.tokens.some(t => t.actorId === actor.id);
}

async function syncGroupVisionOwnership(actor) {
    // Si le token du Groupe n'est pas (ou plus) sur la scène configurée,
    // personne ne doit recevoir Owner via ce module pour cet acteur — mais
    // la fonction continue quand même de tourner pour RETIRER les Owner
    // précédemment accordés (sinon un Groupe qui quitte la scène configurée,
    // ou dont les Members sont vidés après coup, garde ses joueurs Owner
    // pour toujours).
    const onScene = isActorOnExpeditionScene(actor);
    const memberActorIds = onScene ? Array.from(actor.system?.members?.ids ?? []) : [];

    const targetUserIds = onScene
        ? game.users
            .filter(u => !u.isGM && u.character && memberActorIds.includes(u.character.id))
            .map(u => u.id)
        : [];

    const previouslyAutoOwned = actor.getFlag("carte-expeditions", "autoOwners") ?? [];
    if (previouslyAutoOwned.length === 0 && targetUserIds.length === 0) return;

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
}
