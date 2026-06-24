// ============================================================
// session.js — Journal de session WestMarch
// Capture les données de session et génère un rapport
// ============================================================

import { partyFeatureEnabled } from './settings.js';

// Données capturées en début de session
var sessionData = {
    gmName: null,
    partyId: null,
    players: [],      // { userId, actorId, name, xpBefore }
    enemies: [],      // ids des combats déjà traités
    combatants: [],   // { name, cr, hp, ac, legendaryActions, legendaryResistances }
    items: [],        // { playerName, itemName, itemType }
    sceneId: null
};

export function SessionHooks() {

    // ============================================================
    // SECTION : Bouton "Clore la session" sous la liste des joueurs
    // ============================================================
    Hooks.on("renderPlayers", (app, html, data) => {
        // Supprime TOUTE instance du bouton, où qu'elle soit dans le document
        // (pas seulement sous #players), et ceci INCONDITIONNELLEMENT, avant
        // tout "return" lié à isGM/partyId/enableSessionLog. Sinon : dès que
        // la session se termine (le flag partyId est retiré), la fonction
        // sortait avant d'atteindre ce nettoyage, et l'ancien bouton restait
        // orphelin dans le DOM pour toujours — recréant un doublon à chaque
        // nouvelle session sans jamais virer le précédent.
        document.querySelectorAll('.westmarch-close-session-wrap').forEach(el => el.remove());

        if (!game.user.isGM) return;
        if (!game.user.getFlag("westmarch", "partyId")) return;
        if (!partyFeatureEnabled("enableSessionLog")) return;

        // Ni le "html" du hook ni document.getElementById('players') ne
        // sont fiables ici : Foundry peut laisser traîner un clone
        // transitoire (animation/redimensionnement) qui partage le même
        // id="players", et getElementById peut alors retourner l'un ou
        // l'autre selon l'ordre dans le DOM. Seul app.element référence
        // toujours le vrai élément géré par l'instance "Players" elle-même.
        const root = app.element instanceof HTMLElement ? app.element : app.element?.[0];
        if (!root || !root.isConnected) return;

        // Bouton Clore la session
        const closeBtn = $(`
            <div class="westmarch-close-session-wrap">
                <button type="button" class="westmarch-close-session">
                    <i class="fas fa-book"></i> Clore la session
                </button>
            </div>
        `);
        closeBtn.find('button').on("click", async (ev) => {
            ev.preventDefault();
            try {
                await closeSession(app);
            } catch (err) {
                console.error("[WestMarch] Erreur lors de la clôture de session :", err);
                ui.notifications.error("Erreur lors de la clôture de la session (voir console).");
            }
        });

        const list = $(root).find('.players-list');
        if (list.length) {
            list.after(closeBtn);
        } else {
            $(root).append(closeBtn);
        }
    });

    // ============================================================
    // SECTION : Capture des joueurs qui rejoignent la party en cours
    // - Au moment de "Create Party with Log", seul le GM a sa partyId
    //   posée : les joueurs la posent ensuite via "Join Party", donc
    //   après le snapshot initial fait dans startSessionLog(). Sans ce
    //   hook, sessionData.players restait vide (d'où l'absence des
    //   noms/XP dans le journal de session).
    // ============================================================
    Hooks.on("updateUser", (user, changes, options, userId) => {
        if (!sessionData.partyId) return;
        if (changes.flags?.westmarch?.partyId !== sessionData.partyId) return;
        if (sessionData.players.find(p => p.userId === user.id)) return;
        if (!user.character) return;

        sessionData.players.push({
            userId: user.id,
            actorId: user.character.id,
            name: user.character.name,
            xpBefore: user.character.system?.details?.xp?.value ?? 0
        });
    });

    // ============================================================
    // SECTION : Capture des ennemis via le combat tracker
    // ============================================================
    Hooks.on("deleteCombat", async (combat, options, userId) => {
        if (!game.user.isGM) return;
        if (!sessionData.partyId) return;
        if (sessionData.enemies.includes(combat.id)) return;

        sessionData.enemies.push(combat.id);

        combat.combatants.forEach(combatant => {
            const actor = combatant.actor;
            if (!actor) return;
            // Exclure les joueurs de la party
            if (actor.type === "character" && actor.hasPlayerOwner) return;

            // Eviter les doublons
            if (sessionData.combatants.find(e => e.name === actor.name)) return;

            const system = actor.system;
            const entry = {
                name: actor.name,
                type: actor.type,
                cr: system?.details?.cr ?? null,
                hp: system?.attributes?.hp?.max ?? null,
                ac: system?.attributes?.ac?.value ?? null,
                legendaryActions: system?.resources?.legact?.max ?? null,
                legendaryResistances: system?.resources?.legres?.max ?? null
            };
            sessionData.combatants.push(entry);
        });
    });

    // ============================================================
    // SECTION : Capture des items ajoutés aux joueurs
    // ============================================================
    Hooks.on("createItem", (item, options, userId) => {
        if (!sessionData.partyId) return;

        const actor = item.parent;
        if (!actor) return;
        if (actor.type !== "character") return;

        // Vérifier que l'acteur appartient à un joueur de la party
        const owner = game.users.find(u =>
            u.character?.id === actor.id &&
            u.getFlag("westmarch", "partyId") === sessionData.partyId
        );
        if (!owner) return;

        // Filtrer uniquement les items d'inventaire
        const inventoryTypes = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
        if (!inventoryTypes.includes(item.type)) return;

        sessionData.items.push({
            playerName: actor.name,
            itemName: item.name,
            itemType: item.type
        });
    });
}

// ============================================================
// SECTION : Initialisation de la session (Create Party with Log)
// ============================================================
export function startSessionLog(partyId) {
    const gm = game.user;
    sessionData = {
        gmName: gm.name,
        partyId: partyId,
        players: [],
        enemies: [],
        combatants: [],
        items: [],
        sceneId: gm.viewedScene
    };

    // Snapshot XP de chaque joueur de la party
    game.users.forEach(user => {
        if (user.getFlag("westmarch", "partyId") !== partyId) return;
        if (!user.character) return;
        sessionData.players.push({
            userId: user.id,
            actorId: user.character.id,
            name: user.character.name,
            xpBefore: user.character.system?.details?.xp?.value ?? 0
        });
    });

    console.log("[WestMarch] Session démarrée pour la party", partyId);
}

// ============================================================
// SECTION : Clôture de la session et génération du journal
// ============================================================
async function closeSession(playerListApp) {
    if (!sessionData.partyId) {
        ui.notifications.warn("Aucune session en cours.");
        return;
    }

    // Snapshot XP final + détection level up
    const playersReport = sessionData.players.map(p => {
        const actor = game.actors.get(p.actorId);
        const xpAfter = actor?.system?.details?.xp?.value ?? p.xpBefore;
        const levelBefore = getLevelFromXp(p.xpBefore);
        const levelAfter = getLevelFromXp(xpAfter);
        return {
            name: p.name,
            xpBefore: p.xpBefore,
            xpAfter: xpAfter,
            xpGained: xpAfter - p.xpBefore,
            levelUp: levelAfter > levelBefore,
            levelAfter: levelAfter
        };
    });

    // Récupérer les PNJ présents sur la scène
    const scene = game.scenes.get(sessionData.sceneId);
    const npcs = [];
    if (scene) {
        scene.tokens.forEach(token => {
            const actor = token.actor;
            if (!actor) return;
            if (actor.type !== "character") return;
            if (actor.hasPlayerOwner) return;
            if (npcs.find(n => n.name === actor.name)) return;
            npcs.push({ name: actor.name });
        });
    }

    // Générer le contenu HTML du journal
    const date = new Date().toLocaleDateString("fr-FR");
    let content = `<h2>Rapport de session — ${date}</h2>`;
    content += `<p><strong>Meneur :</strong> ${sessionData.gmName}</p>`;

    // Joueurs
    content += `<h3>Joueurs</h3><ul>`;
    playersReport.forEach(p => {
        content += `<li><strong>${p.name}</strong> — XP : ${p.xpBefore} → ${p.xpAfter}`;
        if (p.xpGained > 0) content += ` (+${p.xpGained})`;
        if (p.levelUp) content += ` <strong style="color:#e67e22;">⬆ Level Up ! (Niveau ${p.levelAfter})</strong>`;
        content += `</li>`;
    });
    content += `</ul>`;

    // Ennemis rencontrés
    if (sessionData.combatants.length > 0) {
        content += `<h3>Ennemis rencontrés</h3><ul>`;
        sessionData.combatants.forEach(e => {
            content += `<li><strong>${e.name}</strong>`;
            if (e.cr !== null) content += ` — CR ${e.cr}`;
            if (e.hp !== null) content += ` — HP ${e.hp}`;
            if (e.ac !== null) content += ` — CA ${e.ac}`;
            if (e.legendaryActions) content += ` — Actions légendaires : ${e.legendaryActions}`;
            if (e.legendaryResistances) content += ` — Résistances légendaires : ${e.legendaryResistances}`;
            content += `</li>`;
        });
        content += `</ul>`;
    }

    // PNJ rencontrés
    if (npcs.length > 0) {
        content += `<h3>PNJ rencontrés</h3><ul>`;
        npcs.forEach(n => { content += `<li>${n.name}</li>`; });
        content += `</ul>`;
    }

    // Items récupérés
    if (sessionData.items.length > 0) {
        content += `<h3>Objets récupérés</h3><ul>`;
        sessionData.items.forEach(i => {
            content += `<li><strong>${i.playerName}</strong> — ${i.itemName}</li>`;
        });
        content += `</ul>`;
    }

    // Créer la structure de dossiers et le journal
    await createSessionJournal(date, content);

    // Leave Party
    if (game.user.isGM && game.user.id === game.user.getFlag('westmarch', 'partyId')) {
        game.users.forEach(user => {
            if (user.getFlag("westmarch", "partyId") === game.user.id) {
                user.unsetFlag("westmarch", "partyId");
            }
        });
    }
    game.user.unsetFlag("westmarch", "partyId").then(() => {
        playerListApp.render();
    });

    // Reset session
    sessionData = { gmName: null, partyId: null, players: [], enemies: [], combatants: [], items: [], sceneId: null };

    ui.notifications.info("Session close — journal créé.");
}

// ============================================================
// SECTION : Création de la structure de dossiers et du journal
// ============================================================
async function createSessionJournal(date, content) {
    // Trouver ou créer le dossier racine "MJ"
    let rootFolder = game.folders.find(f => f.name === "MJ" && f.type === "JournalEntry" && !f.folder);
    if (!rootFolder) {
        rootFolder = await Folder.create({ name: "MJ", type: "JournalEntry" });
    }

    // Trouver ou créer le dossier du GM
    let gmFolder = game.folders.find(f => f.name === sessionData.gmName && f.type === "JournalEntry" && f.folder?.id === rootFolder.id);
    if (!gmFolder) {
        gmFolder = await Folder.create({ name: sessionData.gmName, type: "JournalEntry", folder: rootFolder.id });
    }

    // Trouver ou créer le dossier "Rapport de session"
    let reportFolder = game.folders.find(f => f.name === "Rapport de session" && f.type === "JournalEntry" && f.folder?.id === gmFolder.id);
    if (!reportFolder) {
        reportFolder = await Folder.create({ name: "Rapport de session", type: "JournalEntry", folder: gmFolder.id });
    }

    // Créer le journal
    // Depuis v10/v11, JournalEntry n'a plus de champ "content" direct :
    // le texte doit être posé sur une JournalEntryPage de type "text".
    await JournalEntry.create({
        name: date,
        folder: reportFolder.id,
        pages: [{
            name: date,
            type: "text",
            text: { content: content, format: 1 } // 1 = CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML
        }],
        permission: { default: 2 }
    });
}

// ============================================================
// SECTION : Calcul du niveau à partir de l'XP (D&D 5e)
// ============================================================
function getLevelFromXp(xp) {
    const thresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
    let level = 1;
    for (let i = 0; i < thresholds.length; i++) {
        if (xp >= thresholds[i]) level = i + 1;
        else break;
    }
    return level;
}