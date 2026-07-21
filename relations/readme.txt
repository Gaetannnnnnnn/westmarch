================================================================================
                      SORUTA — RELATIONS
                      Module Foundry VTT — Privé
================================================================================

Version : 1.5.8
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
          Toute redistribution, modification ou usage commercial est
          strictement interdit sans autorisation écrite.

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Gestion des relations entre personnages (PJ↔PJ, PJ↔PNJ). Détecte
automatiquement les rencontres entre personnages sur les scènes et crée les
liens correspondants sans jamais modifier les fiches des acteurs (aucune
feature, aucun item créé).

Chaque relation est stockée sur l'acteur via les flags Foundry (scope
"ashara-relations"). Interface sous la forme d'un onglet "Relations" injecté
dans chaque fiche de personnage (type "character").

Expose AshCharacterSheet via CONFIG.asharaSheets.relations pendant son init,
permettant à ashara-bestiary de s'empiler sur la même fiche.

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

settings.js
   Enregistre tous les paramètres du module. Accessibles via :
   Paramètres du jeu → Configuration des modules → Soruta — Relations.

relations.js
   Logique principale : CRUD des relations (flags), injection de l'onglet,
   picker d'acteur pour ajouter des relations, détection automatique des
   rencontres sur les scènes, boutons Révéler/Masquer (anonymisation).

character-sheet.js
   Sous-classe AshCharacterSheet : ajoute l'onglet Relations via le système
   PARTS/TABS natif de dnd5e v3. Exposée via CONFIG.asharaSheets.relations
   pour permettre à ashara-bestiary de s'en servir comme base.

templates/character-relations.hbs
   Template Handlebars de l'onglet Relations.

styles/relations.css
   Styles de l'onglet Relations et du picker d'acteur.

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Relations

- Activer le système de relations
- Activer l'anonymisation
- Dossier des personnages joueurs (PJ) — liste déroulante
- Dossier des personnages non-joueurs (PNJ) — liste déroulante
- Dossier des créatures — liste déroulante

--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Dans Foundry : Setup → Add-on Modules → Install Module
2. Coller l'URL du manifest dans le champ "Manifest URL" :
   https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch/main/relations/module.json
3. Cliquer "Install"
4. Activer le module dans le monde : Setup → Gérer les modules
5. Configurer les dossiers PJ, PNJ et Créatures dans les paramètres du module

================================================================================
                    RELATIONS — MISES À JOUR
================================================================================

v1.5.8 | 2026-07-13
   relations.js — Section PJ filtrée sur type="character" uniquement : les NPC
   stockés dans le dossier PJ ne sont plus comptabilisés comme joueurs dans
   pjRels, le picker joueurs, scanVisibleTokens et le picker d'acteur.
