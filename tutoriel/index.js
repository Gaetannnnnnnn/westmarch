// ============================================================
// index.js — Soruta — Tutoriel
// Point d'entrée : settings, toolbar, fenêtre de bienvenue
// © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
// ============================================================

import { registerSettings }      from './modules/settings.js';
import { showWelcomeIfNeeded }   from './modules/welcome.js';
import { registerTutorielButton } from './modules/toolbar.js';

Hooks.on("init", () => {
    registerSettings();
    // Enregistré dans "init" pour que getSceneControlButtons soit déjà écouté
    // quand Foundry construit la barre (qui se produit avant le hook "ready").
    registerTutorielButton();
});

Hooks.on("ready", () => {
    // Légère temporisation pour laisser l'UI se stabiliser
    setTimeout(() => showWelcomeIfNeeded(), 1000);
});
