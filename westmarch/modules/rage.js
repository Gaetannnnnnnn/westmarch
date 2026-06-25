// ============================================================
// rage.js — Passage en taille Large (width/height 2x2) pendant la Rage
// - Spécifique à la sous-classe Voie du Géant : la feature "Giant's
//   Havoc" (palier 3) dit "quand vous entrez en rage, si vous êtes plus
//   petit que Large, vous devenez Large" — ce n'est PAS un comportement
//   de tous les barbares, seulement de ceux qui possèdent cette feature.
// - dnd5e ajoute un Active Effect nommé "Rage" sur l'acteur quand la
//   rage est activée (bouton sur la fiche), et le retire automatiquement
//   quand la rage se termine. On détecte la création/suppression de cet
//   effet, mais on ne redimensionne le token QUE si l'acteur possède la
//   feature "Giant's Havoc".
// - On ne grandit que si le token est plus petit que Large (2x2) — un
//   token déjà Large/Huge (race, ajustement manuel) n'est pas modifié,
//   conformément à la formulation officielle de la feature.
// - GM uniquement : ces hooks de document se déclenchent sur TOUS les
//   clients connectés (pas que celui qui a activé la rage) ; un seul
//   client doit effectuer la mise à jour du token, sinon plusieurs
//   clients tentent la même modification en même temps.
// - La taille d'origine de chaque token est mémorisée (flag) avant
//   modification, pour pouvoir la restaurer exactement à la fin de la
//   rage (utile pour les races déjà Large/Huge, ou les tokens dont la
//   taille a été ajustée manuellement par le GM).
// ============================================================

function isRageEffect(effect) {
    return /rage/i.test(effect?.name ?? "");
}

// Vérifie que l'acteur possède bien la feature "Giant's Havoc" (Voie du
// Géant, palier 3) — sans elle, la rage ne change jamais la taille.
// Le "." (et non "'?") couvre aussi bien l'apostrophe droite (') que
// l'apostrophe typographique (') utilisée dans les items officiels.
function hasGiantsHavoc(actor) {
    return actor.items?.some(i => /giant.?s havoc/i.test(i.name ?? "")) ?? false;
}

export function RageHooks() {

    Hooks.on("createActiveEffect", async (effect, options, userId) => {
        if (!game.settings.get("westmarch", "enableRageSize")) return;
        if (!game.user.isGM) return;
        if (!isRageEffect(effect)) return;

        const actor = effect.parent?.documentName === "Actor" ? effect.parent : null;
        if (!actor || !hasGiantsHavoc(actor)) return;

        for (const tokenDoc of actor.getActiveTokens(false, true)) {
            // Déjà Large ou plus grand : on ne touche à rien (cf. la
            // formulation officielle de la feature, "si plus petit que Large").
            if (tokenDoc.width >= 2 && tokenDoc.height >= 2) continue;

            // Ne mémorise la taille d'origine que si elle ne l'est pas déjà
            // (sécurité si l'effet est recréé sans que l'ancien ait été
            // proprement supprimé).
            if (!tokenDoc.getFlag("westmarch", "preRageSize")) {
                await tokenDoc.setFlag("westmarch", "preRageSize", {
                    width: tokenDoc.width,
                    height: tokenDoc.height
                });
            }

            await tokenDoc.update({ width: 2, height: 2 });
        }
    });

    Hooks.on("deleteActiveEffect", async (effect, options, userId) => {
        if (!game.settings.get("westmarch", "enableRageSize")) return;
        if (!game.user.isGM) return;
        if (!isRageEffect(effect)) return;

        const actor = effect.parent?.documentName === "Actor" ? effect.parent : null;
        if (!actor) return;

        for (const tokenDoc of actor.getActiveTokens(false, true)) {
            const saved = tokenDoc.getFlag("westmarch", "preRageSize");
            if (!saved) continue;

            await tokenDoc.update({ width: saved.width, height: saved.height });
            await tokenDoc.unsetFlag("westmarch", "preRageSize");
        }
    });
}
