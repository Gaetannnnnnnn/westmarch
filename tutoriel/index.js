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
});

Hooks.on("ready", () => {
    registerTutorielButton();
    // Légère temporisation pour laisser l'UI se stabiliser
    setTimeout(() => showWelcomeIfNeeded(), 1000);
});
