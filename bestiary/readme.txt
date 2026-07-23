================================================================================
                      SORUTA — BESTIAIRE
                      Module Foundry VTT — Privé
================================================================================

Version : 1.2.9
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
          Toute redistribution, modification ou usage commercial est
          strictement interdit sans autorisation écrite.

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Ajoute un onglet "Bestiaire" sur les fiches de personnage (PJ uniquement).
Répertorie automatiquement les créatures rencontrées sur les scènes, limitées
à un exemplaire par créature et par personnage.

Les données sont stockées sur l'acteur via les flags Foundry (scope
"ashara-bestiary"). Conçu pour coexister avec ashara-relations : si les deux
modules sont actifs, les deux onglets apparaissent sur la même fiche.

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

settings.js
   Enregistre tous les paramètres du module. Accessibles via :
   Paramètres du jeu → Configuration des modules → Soruta — Bestiaire.

bestiary.js
   Logique principale : CRUD des entrées de bestiaire (flags), injection de
   l'onglet dans la fiche, scan automatique des tokens sur les scènes,
   détection des créatures présentes avec les PJs.

character-sheet.js
   Factory createBestiarySheet(BaseSheet) : crée la sous-classe de fiche
   personnage qui intègre l'onglet Bestiaire via le système PARTS/TABS de
   dnd5e v3. S'appuie sur la fiche de ashara-relations si disponible
   (via CONFIG.asharaSheets.relations), sinon sur la fiche dnd5e par défaut.

templates/character-bestiary.hbs
   Template Handlebars de l'onglet Bestiaire.

styles/bestiary.css
   Styles de l'onglet Bestiaire.

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Bestiaire

- Activer le bestiaire
- Activer l'anonymisation
- Dossier des personnages joueurs (PJ) — liste déroulante
- Dossier des créatures — liste déroulante

--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Dans Foundry : Setup → Add-on Modules → Install Module
2. Coller l'URL du manifest dans le champ "Manifest URL" :
   https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch/main/bestiary/module.json
3. Cliquer "Install"
4. Activer le module dans le monde : Setup → Gérer les modules
5. Configurer les dossiers PJ et Créatures dans les paramètres du module

================================================================================
                    BESTIAIRE — MISES À JOUR
================================================================================

v1.2.9 | 2026-07-23
   index.js — Guard avant Actors.registerSheet : si carnet est actif et activé,
   bestiary laisse carnet enregistrer la fiche complète (CarnetSheet étend déjà
   AshBestiarySheet). Évite que bestiary et carnet écrasent mutuellement la clé
   "dnd5e.CharacterActorSheet" dans le registre Foundry, ce qui faisait
   disparaître les onglets Relations et Bestiaire dès que carnet était activé.
   CONFIG.asharaSheets.bestiary est toujours exposé (avant le guard) pour que
   carnet puisse l'étendre correctement.

v1.2.8 | 2026-07-23
   index.js — Expose CONFIG.asharaSheets.bestiary après l'enregistrement de la
   fiche. Sans ça, carnet étendait relations uniquement et l'onglet Bestiaire
   disparaissait de la fiche PJ dès que carnet était activé.

v1.2.7 | 2026-07-22
   bestiary.js — Textareas de notes auto-redimensionnées à la hauteur du contenu
   (à l'ouverture des notes, à la saisie, et au rechargement si déjà ouvertes).
   bestiary.css — resize: none; overflow: hidden; sur .bst-note-input.

v1.2.6 | 2026-07-22
   index.js — Enregistrement dans CONFIG.asharaSheetsModules au init pour que
   toolkit puisse nettoyer les flags "bestiary" lors d'un export "fiche originale".

v1.2.5 | 2026-07-22
   settings.js — Dropdown dossiers affiché en arbre indenté (gère les dossiers
   homonymes). bestiary.js — isInFolder utilise folder.id au lieu du nom.
