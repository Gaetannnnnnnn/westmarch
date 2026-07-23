// ============================================================
// toolbar.js — Bouton WestMarch (joueurs + GM)
// ============================================================

import { showTutorialSelector } from './welcome.js';

export function registerTutorielButton() {
    Hooks.on("getSceneControlButtons", (controls) => {
        // Accessible aux joueurs ET au GM — pas de garde isGM
        if (!controls.westmarch) return;

        controls.westmarch.tools.tutoriel = {
            name:     "tutoriel",
            title:    "Ouvrir le guide / tutoriel",
            icon:     "fa-solid fa-circle-question",
            button:   true,
            onChange: () => showTutorialSelector(),
            visible:  true
        };
    });
}
