// ============================================================
// items.js — Correction de la stat par défaut des outils (tools)
// - Le système dnd5e ne stocke aucune stat par défaut par outil : le
//   champ system.ability reste vide à la création, et seul l'AFFICHAGE
//   (jet, fiche) retombe sur "int" si ce champ est vide (voir
//   ToolData#abilityMod dans le système dnd5e), quel que soit l'outil.
// - Plutonium (et d'autres importeurs de compendium) crée les items
//   "tool" avec ce champ vide (ou explicitement "int") sans jamais
//   remplir la vraie stat canonique de l'outil (ex: Outils de voleur
//   -> Dex, Instruments de musique -> Cha, Outils de forgeron -> For).
// - Cette stat canonique existe bien côté système, dans
//   CONFIG.DND5E.tools[baseItem].ability — on s'en sert directement
//   (pas de table recopiée à la main dans ce fichier, qui se
//   désynchroniserait au moindre changement du système dnd5e).
// ============================================================

export function ItemHooks() {

    // ============================================================
    // SECTION : À la création d'un item "tool", si sa stat n'est pas
    // définie (ou vaut "int" par défaut) alors que dnd5e connaît une
    // stat canonique différente pour cet outil précis, on la corrige.
    // - On ne touche jamais à un choix explicite du GM/joueur qui
    //   correspondrait déjà à la valeur canonique, ni à un outil dont
    //   la stat canonique EST réellement "int" (rien à corriger).
    // - On ne touche pas non plus aux outils inconnus de CONFIG.DND5E.tools
    //   (homebrew sans baseItem reconnu) : on ne devine rien dans ce cas.
    // ============================================================
    Hooks.on("preCreateItem", (item, data, options, userId) => {
        if (!game.settings.get("westmarch", "enableToolAbilityFix")) return;
        if (item.type !== "tool") return;

        const baseItem = item.system?.type?.baseItem;
        if (!baseItem) return;

        const canonical = CONFIG.DND5E?.tools?.[baseItem]?.ability;
        if (!canonical) return;

        const current = item.system?.ability;
        if ((!current || current === "int") && current !== canonical) {
            item.updateSource({ "system.ability": canonical });
        }
    });
}
