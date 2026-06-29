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
        if (isActorOnExpeditionScene(actor)) {
            enforceGroupExclusivity(actor);
            // Un changement de Members peut faire basculer le "groupe actuel"
            // de n'importe quel personnage actuellement assigné à un joueur
            // (ajouté/retiré de ce Groupe) → on recalcule pour tout le monde.
            resyncAllCharacterFog();
        }
    });

    Hooks.once("ready", async () => {
        if (!game.user.isGM) return;
        if (!game.settings.get("carte-expeditions", "enableExpeditionMap")) return;
        game.actors
            .filter(a => a.type === "group")
            .forEach(syncGroupVisionOwnership);
        resyncAllCharacterFog();
        await ensureVisionAnchor();
    });

    // ---- Si l'ancre de vision est supprimée par erreur (purge de scène,
    // suppression manuelle...), on la recrée : sans elle, dès qu'un joueur
    // n'a plus aucun token possédé avec vision active sur la scène, Foundry
    // lui montre TOUTE la carte sans restriction (comportement natif,
    // documenté : "You do not own any Tokens with vision on this scene"). ----
    Hooks.on("deleteToken", (tokenDoc) => {
        if (!game.user.isGM) return;
        if (!game.settings.get("carte-expeditions", "enableExpeditionMap")) return;
        const sceneId = game.settings.get("carte-expeditions", "expeditionMapSceneId");
        if (!sceneId || tokenDoc.parent?.id !== sceneId) return;
        if (tokenDoc.getFlag("carte-expeditions", "isVisionAnchor")) {
            ensureVisionAnchor();
        }
    });

    Hooks.on("updateUser", (user, changes, options, userId) => {
        if (!game.settings.get("carte-expeditions", "enableExpeditionMap")) return;
        if (!("character" in changes)) return;
        if (!game.user.isGM) return;

        recomputeFogForCharacter(changes.character ?? null);
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

// ============================================================
// Ancre de vision : un token caché, à portée de vision nulle, présent
// en permanence sur la scène des expéditions et possédé (Owner) par
// TOUS les joueurs par défaut. Son seul rôle est d'éviter que Foundry
// ne considère un joueur comme "ne possédant aucun token avec vision
// sur cette scène" — cas dans lequel il affiche toute la carte sans
// restriction (token de Groupe supprimé, joueur retiré des Members,
// etc.). Comme sa portée est 0, il ne révèle jamais rien par
// lui-même : il sert uniquement à garder la restriction de vision
// active. Ne pas supprimer manuellement ce token sur la scène.
// ============================================================
async function ensureVisionAnchor() {
    if (!game.user.isGM) return;
    if (!game.settings.get("carte-expeditions", "enableExpeditionMap")) return;

    const sceneId = game.settings.get("carte-expeditions", "expeditionMapSceneId");
    if (!sceneId) return;
    const scene = game.scenes.get(sceneId);
    if (!scene) return;

    const existing = scene.tokens.find(t => t.getFlag("carte-expeditions", "isVisionAnchor"));
    if (existing) return;

    let anchorActor = game.actors.find(a => a.getFlag("carte-expeditions", "isVisionAnchor"));
    if (!anchorActor) {
        anchorActor = await Actor.create({
            name: "(Ancre de vision — carte-expéditions, ne pas supprimer)",
            type: "character",
            ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
            flags: { "carte-expeditions": { isVisionAnchor: true } }
        });
    }

    await scene.createEmbeddedDocuments("Token", [{
        name: "Ancre de vision (ne pas supprimer)",
        actorId: anchorActor.id,
        x: 0,
        y: 0,
        alpha: 0,
        hidden: false,
        sight: { enabled: true, range: 0 },
        ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
        flags: { "carte-expeditions": { isVisionAnchor: true } }
    }]);
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

// ============================================================
// Exclusivité : sur la carte des expéditions, un même personnage ne
// doit jamais être Member de deux Groupes en même temps (sinon les
// deux Groupes lui donnent Owner, et sa vision/fog se mélange avec
// celle de tokens dont il ne devrait pas faire partie). Quand un
// personnage est ajouté aux Members d'un Groupe présent sur la
// scène configurée, on le retire des Members de tous les AUTRES
// Groupes présents sur cette même scène.
//
// On manipule les données brutes via toObject()/update() plutôt que
// l'API du système dnd5e pour system.members (non documentée ici),
// afin de ne pas risquer de corrompre la structure si elle diffère
// de ce qu'on suppose : on filtre simplement les entrées concernées
// dans le tableau brut, en préservant tout le reste tel quel.
// ============================================================
function getRawMemberId(entry) {
    if (typeof entry === "string") return entry;
    return entry?.actor ?? entry?.id ?? entry?._id ?? null;
}

async function enforceGroupExclusivity(actor) {
    if (!game.user.isGM) return;

    const memberActorIds = Array.from(actor.system?.members?.ids ?? []);
    if (!memberActorIds.length) return;

    const sceneId = game.settings.get("carte-expeditions", "expeditionMapSceneId");
    const scene = game.scenes.get(sceneId);
    if (!scene) return;

    const otherGroupActorIds = new Set(
        scene.tokens
            .filter(t => t.actorId && t.actorId !== actor.id)
            .map(t => t.actorId)
    );

    for (const otherId of otherGroupActorIds) {
        const other = game.actors.get(otherId);
        if (!other || other.type !== "group") continue;

        const rawMembers = other.toObject().system?.members ?? [];
        if (!Array.isArray(rawMembers) || !rawMembers.length) continue;

        const filtered = rawMembers.filter(m => !memberActorIds.includes(getRawMemberId(m)));
        if (filtered.length !== rawMembers.length) {
            await other.update({ "system.members": filtered });
        }
    }
}

// ============================================================
// Fog par personnage ET par groupe actuel. Un même personnage qui
// change de Groupe (nouvelle expédition, même sans changer de
// personnage assigné) doit voir sa fog se ré-isoler : l'exploration
// faite avec le Groupe A ne doit pas rester visible une fois rejoint
// le Groupe B, sinon les deux Groupes "interfèrent" sur la carte.
//
// Clé de sauvegarde = "<characterId>:<groupActorId>" (pas de groupe
// trouvé => pas de clé => fog vide, comme un personnage qui n'a
// encore rejoint aucune expédition).
// ============================================================

function findGroupIdForCharacter(characterId, scene) {
    if (!characterId) return null;
    for (const token of scene.tokens) {
        if (!token.actorId) continue;
        const actor = game.actors.get(token.actorId);
        if (!actor || actor.type !== "group") continue;
        const ids = Array.from(actor.system?.members?.ids ?? []);
        if (ids.includes(characterId)) return actor.id;
    }
    return null;
}

function resyncAllCharacterFog() {
    if (!game.user.isGM) return;
    game.users
        .filter(u => !u.isGM && u.character)
        .forEach(u => recomputeFogForCharacter(u.character.id));
}

async function recomputeFogForCharacter(characterId) {
    if (!characterId) return;
    if (!game.settings.get("carte-expeditions", "enableExpeditionMap")) return;

    const sceneId = game.settings.get("carte-expeditions", "expeditionMapSceneId");
    if (!sceneId) return;
    const scene = game.scenes.get(sceneId);
    if (!scene) return;

    const user = game.users.find(u => !u.isGM && u.character?.id === characterId);
    if (!user) return;

    const newGroupId = findGroupIdForCharacter(characterId, scene);
    const newKey = newGroupId ? `${characterId}:${newGroupId}` : null;
    const oldKey = user.getFlag("carte-expeditions", "activeFogKey") ?? null;

    if (oldKey === newKey) return;

    await swapFogForUserKey(scene, user, oldKey, newKey);
    await user.setFlag("carte-expeditions", "activeFogKey", newKey);
}

async function swapFogForUserKey(scene, user, oldKey, newKey) {
    const fogCollection = game.collections.get("FogExploration");
    const fogDoc = fogCollection.find(f => f.scene === scene.id && f.user === user.id);

    if (fogDoc && oldKey) {
        const savedByKey = foundry.utils.deepClone(user.getFlag("carte-expeditions", "fogByKey") ?? {});
        savedByKey[oldKey] = {
            explored: fogDoc.explored,
            positions: fogDoc.positions,
            timestamp: fogDoc.timestamp
        };
        await user.setFlag("carte-expeditions", "fogByKey", savedByKey);
    }

    const savedByKey = user.getFlag("carte-expeditions", "fogByKey") ?? {};
    const saved = newKey ? savedByKey[newKey] : null;

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
