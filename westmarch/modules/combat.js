// ============================================================
// combat.js — Combat lié à la party plutôt qu'à la scène
// - Un combat n'est de toute façon pas lié à une scène par défaut
//   (il fallait déjà cliquer manuellement sur le bouton "lien" du
//   tracker pour le faire) — on force juste scene: null à la
//   création par sécurité, pour garantir cet état quoi qu'il arrive.
// - Ce qui change réellement : le combat est marqué (flag) comme
//   appartenant à la party du GM qui l'a créé.
// - Du coup, si deux parties jouent en parallèle, chaque joueur ne
//   voit dans son tracker que le combat de sa propre party (le GM,
//   lui, voit toujours tout, pour pouvoir gérer toutes les parties).
// ============================================================

import { partyFeatureEnabled } from './settings.js';

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
    // - Le GM voit toujours tout.
    // ============================================================
    Hooks.on("renderCombatTracker", (tracker, html, data) => {
        if (!partyFeatureEnabled("enableCombatParty")) return;
        if (game.user.isGM) return;

        const combat = tracker.viewed ?? tracker.combat ?? data?.combat;
        if (!combat) return;

        const combatPartyId = combat.getFlag?.("westmarch", "partyId");
        if (!combatPartyId) return;

        const myPartyId = game.user.getFlag("westmarch", "partyId");
        if (combatPartyId === myPartyId) return;

        const $html = $(html);
        const list = $html.find(".combat-tracker, #combat-tracker, .directory-list").first();
        if (!list.length) return;

        list.empty().append(
            `<p style="padding:8px; opacity:0.7; font-style:italic;">Aucun combat en cours pour votre party.</p>`
        );
    });
}
