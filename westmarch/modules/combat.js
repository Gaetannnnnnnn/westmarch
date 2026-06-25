// ============================================================
// combat.js — Combat lié à la party plutôt qu'à la scène
// - Un combat n'est de toute façon pas lié à une scène par défaut
//   (il fallait déjà cliquer manuellement sur le bouton "lien" du
//   tracker pour le faire) — on force juste scene: null à la
//   création par sécurité, pour garantir cet état quoi qu'il arrive.
// - Ce qui change réellement : le combat est marqué (flag) comme
//   appartenant à la party du GM qui l'a créé.
// - Du coup, si deux parties jouent en parallèle (table avec plusieurs
//   GM, chacun avec sa propre party), chaque joueur ET chaque GM ne voit
//   dans son tracker que le combat de SA propre party — un GM ne voit
//   pas le combat géré par un autre GM.
// ============================================================

import { partyFeatureEnabled } from './settings.js';

// Mémorise, pour le combat en cours de changement de tour, la position de
// la caméra d'un joueur hors-party AVANT que Foundry ne la déplace
// automatiquement (voir preUpdateCombat / updateCombat plus bas).
let savedViewPosition = null;

// Mémorise le dernier onglet de la sidebar autre que "combat" : Foundry
// force l'onglet Combat au premier plan pour TOUT LE MONDE dès qu'un
// combat démarre, sans notion de party. On s'en sert pour y revenir si
// ce combat n'est pas le nôtre.
let lastNonCombatTab = "chat";

// Renvoie true si CE combat appartient à la party de l'utilisateur courant
// (ou si le combat n'est pas tagué / le système est désactivé — dans ce
// cas on ne filtre jamais, par sécurité).
function isMyCombat(combat) {
    if (!partyFeatureEnabled("enableCombatParty")) return true;
    if (!combat) return true;

    // Pas de cas particulier pour le GM : sur une table à plusieurs GM
    // (un par party), un GM doit être traité comme un joueur de sa propre
    // party — sinon il verrait aussi les combats gérés par les autres GM.
    const combatPartyId = combat.getFlag?.("westmarch", "partyId");
    if (!combatPartyId) return true;

    // Un GM qui n'a jamais lancé "Create Party" n'a pas de partyId flag
    // posé sur lui-même (seul son combat est tagué avec son propre id, en
    // repli, à la création - voir preCreateCombat) : on applique le même
    // repli ici, sinon ce GM ne reconnaîtrait plus son propre combat
    // comme étant le sien.
    const myPartyId = game.user.getFlag("westmarch", "partyId") ?? (game.user.isGM ? game.user.id : undefined);
    return combatPartyId === myPartyId;
}

export function CombatHooks() {

    // ============================================================
    // SECTION : Tague le combat avec la party de son créateur, dès sa
    // création (GM uniquement). Garantit aussi scene: null.
    // ============================================================
    Hooks.on("preCreateCombat", (combat, data, options, userId) => {
        if (!partyFeatureEnabled("enableCombatParty")) return;
        if (!game.user.isGM) return;

        // Un GM qui a créé sa party a partyId == son propre id (voir
        // "Create Party" dans player.js). S'il n'a pas encore de party
        // assignée, on le tague tout de même avec son propre id : ça
        // reste cohérent et permet de filtrer dès qu'il en crée une.
        const partyId = game.user.getFlag("westmarch", "partyId") ?? game.user.id;

        combat.updateSource({
            scene: null,
            "flags.westmarch.partyId": partyId
        });
    });

    // ============================================================
    // SECTION : Filtrage du tracker de combat par party
    // - Un joueur ne voit le combat affiché que s'il appartient à sa
    //   propre party (sinon, message "aucun combat" à la place).
    // - Un combat non tagué (créé avant l'activation du setting, ou
    //   par un GM sans système de party) n'est jamais filtré.
    // - S'applique aussi au GM : sur une table à plusieurs GM (un par
    //   party), chaque GM ne doit voir que le(s) combat(s) de sa propre
    //   party, pas ceux gérés par un autre GM.
    // - On vide TOUT le contenu rendu (sans cibler de classe CSS
    //   précise, dont on n'était pas sûr) : plus robuste, ne dépend
    //   pas de la structure interne exacte du template Foundry.
    // ============================================================
    Hooks.on("renderCombatTracker", (tracker, html, data) => {
        if (!partyFeatureEnabled("enableCombatParty")) return;

        // Aucune des "valeurs uniques" essayées (data.combat, game.combat,
        // tracker.viewed) ne s'est avérée fiable pour savoir quel combat
        // correspond à CE rendu précis dès que plusieurs combats tournent
        // en parallèle (un par party, puisqu'aucun n'est lié à une scène) :
        // tantôt ça laissait fuiter les combattants d'un combat étranger,
        // tantôt ça coinçait un joueur sur "Aucun combat" alors que son
        // propre combat existe bien. On filtre donc ligne par ligne : pour
        // chaque <li class="combatant" data-combatant-id="...">, on
        // retrouve sans ambiguïté son combat parent en cherchant son id
        // parmi tous les combats de la table.
        const root = $(html);
        const rows = root.find("li.combatant[data-combatant-id]");

        if (root.is("ol.combat-tracker") || rows.length) {
            let kept = 0;
            rows.each(function () {
                const combatantId = this.dataset.combatantId;
                let combat = null;
                for (const c of (game.combats?.combats ?? [])) {
                    if (c.combatants.get(combatantId)) { combat = c; break; }
                }
                if (combat && !isMyCombat(combat)) {
                    $(this).remove();
                } else {
                    kept++;
                }
            });

            if (kept === 0) {
                root.empty().append(
                    `<p style="padding:8px; opacity:0.7; font-style:italic;">Aucun combat en cours pour votre party.</p>`
                );
            }
        }

        // Le bandeau ("header", Round X + boutons) n'est volontairement
        // pas modifié : il n'expose pas d'identifiant de combat exploitable
        // et ne révèle de toute façon que le numéro de round (pas les
        // combattants ni leur état) — fuite mineure jugée acceptable plutôt
        // que de risquer de re-coincer un joueur sur son propre combat.

        // Pour le changement d'onglet et la fermeture du popup ci-dessous,
        // on ne se fie qu'à l'existence ou non d'un combat À NOUS : s'il en
        // existe un, on ne déloge jamais ce joueur de son tracker, même si
        // un combat étranger tourne aussi en parallèle.
        const combats = game.combats?.combats ?? [];
        const hasOwn = combats.some(c => isMyCombat(c));
        const hasForeign = combats.some(c => !isMyCombat(c));
        if (hasOwn || !hasForeign) return;

        // Foundry vient de forcer l'onglet "Combat" au premier plan pour
        // ce joueur (comportement natif, déclenché au démarrage/maj du
        // combat). Comme ce n'est pas son combat, on le renvoie sur
        // l'onglet où il était avant, plutôt que de le laisser coincé
        // devant ce message.
        if (ui.sidebar?.activeTab === "combat") {
            ui.sidebar.activateTab(lastNonCombatTab);
        }

        // Cause réelle du popup non-fermable : le module "Monk's Combat
        // Details" (indépendant de westmarch) fait apparaître automatiquement
        // le tracker de combat dans une fenêtre flottante ("popout") pour
        // TOUT LE MONDE dès qu'un combat démarre (réglage "opencombat" =
        // "everyone" par défaut, sans notion de party). Ce popout est en
        // fait la MÊME instance d'application que le tracker de la sidebar
        // — c'est pour ça qu'il affiche aussi notre message "Aucun combat
        // en cours pour votre party.". Il ne se referme tout seul que
        // quand TOUS les combats de la table sont terminés (pas juste le
        // nôtre), donc un joueur hors-party peut rester coincé avec ce
        // popup pendant toute la durée du combat d'une autre party.
        // Comme ce n'est pas notre combat, on le referme nous-mêmes, juste
        // après son ouverture (avec le même garde-fou anti-collision que
        // Monk's Combat Details utilise lui-même : ne pas fermer une
        // fenêtre déjà en train de se fermer ou de se (re)dessiner).
        if (tracker.isPopout) {
            setTimeout(() => {
                const states = tracker.constructor?.RENDER_STATES;
                if (states && [states.CLOSING, states.RENDERING].includes(tracker.state)) return;
                tracker.close();
            }, 50);
        }
    });

    // Garde la trace du dernier onglet "normal" (chat, items, etc.) pour
    // pouvoir y renvoyer un joueur hors-party qu'on vient d'éjecter de
    // l'onglet Combat.
    Hooks.on("changeSidebarTab", (app) => {
        const tabName = app?.tabName ?? app?.options?.id;
        if (tabName && tabName !== "combat") lastNonCombatTab = tabName;
    });

    // ============================================================
    // SECTION : Empêche le pan automatique de la caméra (et le tracking
    // visuel du combattant actif) de toucher les joueurs hors-party.
    // - Foundry pan/centre la caméra de TOUS les clients qui regardent
    //   la scène à chaque changement de tour, sans notion de party.
    // - On mémorise la position de la caméra juste avant ce changement
    //   (preUpdateCombat), puis on la restaure juste après (updateCombat),
    //   une fois que le pan automatique de Foundry s'est déjà produit.
    // - Best-effort : si Foundry verrouille aussi le déplacement du
    //   token lui-même (pas juste la caméra), ce correctif ne suffira
    //   pas — à vérifier en jeu.
    // ============================================================
    Hooks.on("preUpdateCombat", (combat, changes, options, userId) => {
        if (!("turn" in changes) && !("round" in changes)) return;
        if (isMyCombat(combat)) return;

        savedViewPosition = canvas?.ready && canvas.scene?._viewPosition
            ? { ...canvas.scene._viewPosition }
            : null;
    });

    Hooks.on("updateCombat", (combat, changes, options, userId) => {
        if (!savedViewPosition) return;
        if (!("turn" in changes) && !("round" in changes)) return;

        const pos = savedViewPosition;
        savedViewPosition = null;
        if (isMyCombat(combat)) return;

        // Laisse Foundry terminer son pan automatique avant de restaurer
        // la vue précédente du joueur (sans animation, pour que ça ne
        // "saute" pas visiblement deux fois).
        setTimeout(() => {
            if (canvas?.ready) canvas.animatePan({ ...pos, duration: 0 });
        }, 50);
    });

    // ============================================================
    // SECTION : Blocage de mouvement causé par le module "Monk's
    // TokenBar" (non lié à westmarch).
    // - Quand un combat démarre, ce module bascule le mode de
    //   mouvement global sur "Combat Turn" : seul le token du
    //   combattant actif peut bouger — TOUS les autres joueurs sont
    //   bloqués, sans aucune notion de party.
    // - TokenBar permet justement de définir un mouvement "Libre" par
    //   token (flag monks-tokenbar.movement = "free"), prioritaire sur
    //   le réglage global. On s'en sert : si le combat actif n'est pas
    //   celui de notre party, on passe nos propres tokens en mouvement
    //   libre ; on annule ce forçage dès que ce n'est plus nécessaire
    //   (combat terminé, ou combat qui devient celui de notre party).
    // - On marque (flag westmarch.mtbMovementOverride) les tokens qu'on
    //   a nous-mêmes forcés, pour ne jamais toucher à un réglage de
    //   mouvement que le GM aurait défini manuellement sur un token.
    // ============================================================
    // Ne prend plus un combat précis en paramètre : on recalcule à chaque
    // fois en regardant TOUS les combats actifs de la table (game.combat
    // ne suffit pas — c'est un pointeur global unique peu fiable dès que
    // plusieurs combats tournent en parallèle sans scène, comme constaté
    // pour le tracker plus haut). On est "libre" seulement s'il existe un
    // combat étranger démarré ET qu'aucun combat de notre party n'est lui
    // aussi démarré (sinon le blocage normal de notre propre tour reste
    // pertinent).
    function applyMonksTokenBarMovementOverride() {
        if (!partyFeatureEnabled("enableCombatParty")) return;
        if (game.user.isGM) return;
        if (!game.modules.get("monks-tokenbar")?.active) return;
        if (!canvas?.ready) return;

        const combats = game.combats?.combats ?? [];
        const hasForeignStarted = combats.some(c => c.started && !isMyCombat(c));
        const hasOwnStarted = combats.some(c => c.started && isMyCombat(c));
        const foreign = hasForeignStarted && !hasOwnStarted;

        const myTokens = canvas.tokens.placeables.filter(t => t.actor?.isOwner);

        for (const token of myTokens) {
            const overridden = token.document.getFlag("westmarch", "mtbMovementOverride");
            if (foreign && !overridden) {
                token.document.setFlag("westmarch", "mtbMovementOverride", true);
                token.document.setFlag("monks-tokenbar", "movement", "free");
            } else if (!foreign && overridden) {
                token.document.unsetFlag("westmarch", "mtbMovementOverride");
                token.document.unsetFlag("monks-tokenbar", "movement");
            }
        }
    }

    Hooks.on("createCombat", () => applyMonksTokenBarMovementOverride());
    Hooks.on("deleteCombat", () => applyMonksTokenBarMovementOverride());
    Hooks.on("updateCombat", (combat, changes) => {
        if (!("started" in changes) && !("round" in changes) && !("turn" in changes)) return;
        applyMonksTokenBarMovementOverride();
    });
    Hooks.on("canvasReady", () => applyMonksTokenBarMovementOverride());
}
