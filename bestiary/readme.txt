================================================================================
                      SORUTA — BESTIAIRE
                      Module Foundry VTT — Privé
================================================================================

Version : 1.2.3
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

v1.2.3 | 2026-07-14
   bestiary.js — Fix doublons : plusieurs tokens du même acteur de base (ex :
   5 Knights non-liés) ne créaient qu'une seule entrée par type. Ajout d'un
   Set seenIds dans scanVisibleTokens pour dédupliquer par token et non par
   acteur.
