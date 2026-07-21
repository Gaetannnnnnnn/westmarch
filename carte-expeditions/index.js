// ============================================================
// index.js — Point d'entrée du module de TEST "carte-expeditions".
// Module Foundry autonome (id "carte-expeditions"), totalement
// séparé de westmarch — ne touche à aucun fichier du module en
// production. À activer/désactiver depuis la liste des modules.
// ============================================================

import { MapHooks } from "./modules/map.js";
import { registerMapSettings } from "./modules/map-settings.js";

Hooks.once("init", () => {
    registerMapSettings();
    MapHooks();
});
