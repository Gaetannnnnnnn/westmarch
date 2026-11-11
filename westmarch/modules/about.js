// ============================================================
// about.js — Fenêtre « À propos » (Soruta — WestMarch Système)
//
// Réglages du module → « À propos », visible par tous (joueurs et MJ) :
// version, auteur, droits, site internet, support et version complète.
// © 2026 Soruta.
// ============================================================

import { tl } from "./i18n.js";
import { URL_PAGE_MODULES } from "./site.js";

const MOD = "westmarch";
const URL_DISCORD = "https://discord.com/invite/sbHSVXDeMJ";
const URL_GITHUB = "https://github.com/Gaetannnnnnnn/westmarch";

export async function openAboutDialog() {
    const version = game.modules.get(MOD)?.version ?? "?";
    const lien = (url, texte) => `<a href="${url}" target="_blank" rel="noopener">${texte}</a>`;
    const content = `
    <div style="display:flex;flex-direction:column;gap:10px;padding:2px 0;font-size:12px;line-height:1.55;">
        <div style="display:flex;align-items:center;gap:10px;">
            <i class="fa-solid fa-compass" style="font-size:22px;color:#e67e22;"></i>
            <div>
                <div style="font-weight:700;font-size:15px;">Soruta — WestMarch Système</div>
                <div style="opacity:.75;">${tl("Version {0}", version)}</div>
            </div>
        </div>
        <div style="opacity:.9;">${tl("Base pour les campagnes West Marches : plusieurs meneurs et plusieurs groupes (parties) jouent en parallèle dans le même monde, chacun avec ses sessions, son chat, ses combats et son audio.")}</div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,.12);margin:0;">
        <div>${tl("<strong>Auteur :</strong> {0}", tl("Soruta (Discord : s0ruta)"))}</div>
        <div>${tl("<strong>Droits :</strong> © 2026 Soruta — logiciel libre et open source. Redistribution et modification autorisées, à condition de créditer l'auteur.")}</div>
        <div>${tl("<strong>Code source :</strong> {0}", lien(URL_GITHUB, "GitHub — Gaetannnnnnnn/westmarch"))}</div>
        <div>${tl("<strong>Site internet :</strong> {0}", lien(URL_PAGE_MODULES, tl("altheia.eu — Nos modules")))}
            <span style="opacity:.75;">${tl("(nouveautés et mises à jour)")}</span></div>
        <div>${tl("<strong>Support :</strong> ouvre un ticket sur le Discord d'Althéia, pas de message privé s'il te plaît. {0}", lien(URL_DISCORD, tl("Rejoindre le Discord")))}</div>
        <hr style="border:none;border-top:1px solid rgba(255,255,255,.12);margin:0;">
        <div style="opacity:.85;">${tl("<strong>Version complète :</strong> Soruta — Completed Westmarch reprend toutes les fonctions de ce module et en ajoute beaucoup d'autres (registre du monde, carte des expéditions, temps morts, XP, journal Discord…). Ne pas activer les deux dans le même monde.")}</div>
    </div>`;
    await foundry.applications.api.DialogV2.wait({
        window: { title: tl("À propos — Soruta WestMarch Système"), icon: "fas fa-circle-info" },
        position: { width: 460 },
        rejectClose: false,
        content,
        buttons: [{ action: "close", label: tl("Fermer"), icon: '<i class="fa-solid fa-xmark"></i>', default: true }]
    }).catch(() => {});
}

export function registerAboutMenu() {
    game.settings.registerMenu(MOD, "menu-about", {
        name:  tl("À propos"),
        label: tl("Ouvrir"),
        hint:  tl("Informations sur le module : version, auteur, droits, site internet et support."),
        icon:  "fas fa-circle-info",
        type:  class extends foundry.applications.api.ApplicationV2 {
            static DEFAULT_OPTIONS = { id: "wm-menu-about", window: { title: tl("À propos") } };
            async render() { openAboutDialog(); return this; }
            async close()  { return this; }
        },
        restricted: false   // visible par tout le monde (joueurs inclus)
    });
}
