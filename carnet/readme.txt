================================================================================
                      SORUTA — CARNET D'EXPÉDITIONS
                      Module Foundry VTT — Privé
================================================================================

Version : 1.0.5
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
          Toute redistribution, modification ou usage commercial est
          strictement interdit sans autorisation écrite.

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Ajoute deux onglets sur la fiche de chaque personnage joueur :

  Carnet — Notes d'expédition rédigées avec ProseMirror (éditeur enrichi).
  Chaque expédition a sa propre section avec titre, dates et zone de texte.
  Un clic sur le nom d'une expédition depuis l'onglet Temps morts navigue
  directement vers sa section dans le Carnet.

  Temps morts — Cartes par expédition avec dates de début et de fin,
  durée calculée automatiquement, et statut (En cours / Terminée / Planifiée).
  Le nom de chaque expédition est éditable directement dans la carte.
  Les GM peuvent définir ou effacer les dates individuellement via les boutons
  intégrés (📅 = date actuelle, ✕ = effacer).

Le bouton "Date du TM" dans la barre WestMarch (barre de gauche, GM uniquement)
enregistre automatiquement la date Simple Calendar pour tous les membres de la
party :
  - Si l'acteur n'a pas d'expédition en cours → crée une nouvelle avec la
    date actuelle comme début.
  - Si l'acteur a une expédition en cours (début sans fin) → enregistre la
    date actuelle comme fin.

Les données sont stockées en flags sur l'acteur (scope "carnet").
Aucune modification des fiches, items ou features existants.

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

index.js
   Point d'entrée. Enregistre les settings au hook "init", puis crée et
   enregistre la fiche enrichie au hook "setup" (après tous les "init").

modules/settings.js
   Paramètre d'activation avec rechargement requis.

modules/carnet.js
   Logique principale : CRUD des expéditions (flags), formatage des dates
   (Simple Calendar), récupération de la party (westmarch), génération HTML
   des deux onglets, câblage des événements, éditeur ProseMirror inline,
   bouton barre de gauche "Date du TM".

modules/character-sheet.js
   Factory createCarnetSheet(BaseSheet) : crée la sous-classe de fiche PJ
   qui ajoute les deux onglets via PARTS / TABS dnd5e v3. S'empile sur la
   fiche bestiary si disponible, puis relations, puis la fiche dnd5e native.

templates/character-journal.hbs
   Template de l'onglet Carnet (rendu HTML depuis carnet.js).

templates/character-downtime.hbs
   Template de l'onglet Temps morts (rendu HTML depuis carnet.js).

styles/carnet.css
   Styles des deux onglets.

--------------------------------------------------------------------------------
DÉPENDANCES
--------------------------------------------------------------------------------

Obligatoires :
  - dnd5e v3+ (système de jeu)

Recommandées :
  - Simple Calendar (dates en jeu — sans lui, le bouton "Date du TM" est
    inactif et les dates s'affichent en format numérique brut)
  - westmarch (pour le bouton "Date du TM" — lit le paramètre "partyMaster"
    pour identifier les membres de la party)

Compatibles :
  - ashara-relations (s'empile : Relations → Bestiary → Carnet)
  - ashara-bestiary  (s'empile : idem)

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Carnet d'Expéditions

- Activer le Carnet d'Expéditions (rechargement requis)

--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Dans Foundry : Setup → Add-on Modules → Install Module
2. Coller l'URL du manifest dans le champ "Manifest URL" :
   https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch/main/carnet/module.json
3. Cliquer "Install"
4. Activer le module dans le monde : Setup → Gérer les modules

================================================================================
                    CARNET D'EXPÉDITIONS — MISES À JOUR
================================================================================

v1.0.5 | 2026-07-23
   Synchronisation module.json / readme.txt sur la même version.

v1.0.4 | 2026-07-23
   carnet.js — Retrait dummy/activeTool, onClick → onChange, name "westmarch-ashara"
   → "westmarch". index.js — retrait injection CSS dummy.

v1.0.3 | 2026-07-23
   carnet.js — dummy tool visible: false → true. index.js — injection CSS pour
   masquer le dummy dans le DOM (même fix que westmarch-ashara).

v1.0.2 | 2026-07-22
   index.js — Enregistrement dans CONFIG.asharaSheetsModules au init pour que
   toolkit puisse nettoyer les flags "carnet" lors d'un export
   "fiche originale".

v1.0.1 | 2026-07-22
   Onglet Temps morts redesigné en cartes par expédition (bande colorée selon
   statut, typographie propre, badge de statut). Les GM peuvent désormais
   définir ou effacer les dates de début et de fin individuellement via les
   boutons intégrés dans chaque carte (Simple Calendar requis pour "définir").

v1.0.0 | 2026-07-22
   Initial release. Onglets Carnet (ProseMirror) et Temps morts.
   Bouton GM "Date du TM" pour enregistrer début/fin d'expédition sur toute
   la party via Simple Calendar.
