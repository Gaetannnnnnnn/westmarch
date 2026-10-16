// ============================================================
// site.js — Lien vers la page des modules sur le site d'Althéia
// Soruta — WestMarch Système
//
// Au premier lancement, puis après chaque mise à jour du module, un message
// privé est envoyé aux MJ dans le chat : où suivre les mises à jour, et où
// découvrir la version complète (Soruta — Completed Westmarch).
// © 2026 Soruta.
// ============================================================

const MOD = "westmarch";
export const URL_PAGE_MODULES = "https://altheia.eu/foundry-modules.html";

export function registerSiteSettings() {
    // Dernière version pour laquelle le message a été envoyé (une fois par version et par monde).
    game.settings.register(MOD, "siteMessageVersion", {
        scope: "world", config: false, type: String, default: ""
    });
}

export function SiteHooks() {
    Hooks.once("ready", () => { annoncerSite().catch((e) => console.warn(`[${MOD}] Message du site :`, e)); });
}

async function annoncerSite() {
    if (!game.user?.isGM) return;
    if ((game.users?.activeGM ?? game.user) !== game.user) return;   // un seul MJ envoie le message
    const version = String(game.modules.get(MOD)?.version ?? "");
    if (game.settings.get(MOD, "siteMessageVersion") === version) return;

    const mj = game.users.filter((u) => u.isGM).map((u) => u.id);
    await ChatMessage.create({
        speaker: { alias: "Soruta — WestMarch Système" },
        whisper: mj,
        content: `
            <div style="line-height:1.5;">
                <p style="margin:0 0 6px;"><strong>Merci d’utiliser Soruta — WestMarch Système</strong> (version ${version.replace(/[^\w.\-]/g, "")}).</p>
                <p style="margin:0 0 6px;">Sur le site d’Althéia, retrouve les mises à jour du module et découvre sa <strong>version complète</strong>, Soruta — Completed Westmarch&nbsp;: casier du meneur, carte des expéditions, temps morts, fiche enrichie et bien plus.</p>
                <p style="margin:0;"><a href="${URL_PAGE_MODULES}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> altheia.eu — Nos modules</a></p>
                <p style="margin:6px 0 0;font-size:11px;opacity:.7;">Ce message n’est visible que par les MJ et ne s’affiche qu’une fois par version.</p>
            </div>`
    });
    await game.settings.set(MOD, "siteMessageVersion", version);
}
