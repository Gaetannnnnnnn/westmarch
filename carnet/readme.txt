================================================================================
                      SORUTA — CARNET D'EXPÉDITIONS
                      Module Foundry VTT — Privé
================================================================================

Version : 1.1.2
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
          Toute redistribution, modification ou usage commercial est
          strictement interdit sans autorisation écrite.

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Ajoute deux onglets indépendants sur la fiche de chaque personnage joueur :

  Carnet — Notes libres rédigées avec ProseMirror (éditeur enrichi). Les notes
  sont indépendantes des expéditions. Chaque note a un titre éditable, un
  éditeur de texte enrichi, et peut optionnellement être liée à une expédition
  (badge cliquable de navigation).

  Expéditions — Cartes par expédition avec dates de début et de fin, durée
  calculée automatiquement, et statut (En cours / Terminée / Planifiée). Le nom
  est éditable dans la carte. Le GM peut définir ou effacer les dates via les
  boutons intégrés (📅 = date actuelle, ✕ = effacer). Chaque expédition peut
  créer ou afficher une note liée dans l'onglet Carnet.

Le bouton "Date Expédition" dans la barre WestMarch (barre de gauche, GM uniquement)
crée toujours une nouvelle expédition (date de début) pour tous les membres de la
party. La date de fin se gère manuellement dans l'onglet Expéditions.

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
   Logique principale : deux flags indépendants ("expeditions" et "carnetNotes"),
   CRUD pour chacun, formatage des dates (game.time.calendar v13 natif,
   Simple Calendar en fallback), récupération de la party, génération HTML
   des deux onglets, câblage des événements, liens navigables entre onglets,
   éditeur ProseMirror inline, bouton barre de gauche "Date Expédition".

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
  - westmarch (pour le bouton "Date Expédition" — lit le paramètre "partyMaster"
    pour identifier les membres de la party)
  - Simple Calendar (optionnel — utilisé en fallback pour le formatage des dates
    si game.time.calendar n'est pas suffisant)

Compatibles :
  - ashara-relations (s'empile : Relations → Bestiary → Carnet)
  - ashara-bestiary  (s'empile : idem)

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Carnet d'Expéditions

- Activer le Carnet d'Expéditions (rechargement requis)
- Nom du dossier des PJ (défaut : "PJ" — sensible à la casse)

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

v1.1.2 | 2026-07-24
   carnet.js — Remplacement de l'éditeur ProseMirror inline (ApplicationV2 part)
   par un Dialog popup. L'éditeur inline dans un PART ApplicationV2 n'avait pas
   le contexte DOM/CSS nécessaire pour les menus ProseMirror : la toolbar
   s'affichait comme une liste plate HEADINGS/BLOCK/INLINE inutilisable.
   initNoteEditor() ouvre désormais un new Dialog({...}) avec ProseMirrorEditor.create()
   initialisé dans le callback render. Le Dialog a son propre DOM complet et les
   menus déroulants fonctionnent correctement. Taille : 640×520. Boutons
   Sauvegarder / Annuler. La sauvegarde passe par actor.setFlag() (pas besoin
   de restauration DOM manuelle : le flag update déclenche le re-render de la fiche).
   carnet.css — Suppression des anciens styles .carnet-editor-wrap / .carnet-editor-buttons /
   .carnet-btn-save / .carnet-btn-cancel (inutilisés). Ajout styles .carnet-editor-dialog /
   .carnet-dialog-editor / .carnet-dialog-editor .editor-content.

v1.1.1 | 2026-07-24
   carnet.js — Fix ouverture d'onglet navigateur au clic sur les liens : Foundry
   v13 ApplicationV2 a un handler global sur tous les <a[href]> qui appelle
   window.open(anchor.href). Nos liens avaient href="#" → window.open("#")
   ouvrait un nouvel onglet Foundry. Suppression de l'attribut href sur tous
   les <a> interactifs (carnet-go-exp, carnet-link-exp, carnet-del-note,
   carnet-go-note, carnet-create-note, carnet-del-exp). Ajout de cursor:pointer
   en style inline pour conserver l'apparence cliquable.

v1.1.0 | 2026-07-24
   carnet.js — Fix menu ProseMirror orphelin : Foundry v13 injecte .editor-menu
   dans le parent de editorWrap plutôt qu'à l'intérieur. Après
   ProseMirrorEditor.create(), tout menu nouvellement apparu hors de editorWrap
   est déplacé dedans via prepend(). Ainsi editorWrap.remove() (save/cancel)
   emporte le menu et évite qu'il reste affiché dans l'onglet Carnet comme
   liste brute HEADINGS/BLOCK/etc.

v1.0.9 | 2026-07-24
   carnet.js — Séparation complète des deux onglets en sources de données
   indépendantes. Onglet Carnet → flag "carnetNotes" [{id, title, content,
   linkedExpId?}]. Onglet Expéditions → flag "expeditions" [{id, name,
   startDate, endDate}] (champ "note" retiré). Les deux onglets fonctionnent
   et s'affichent sans dépendre l'un de l'autre.
   Liens optionnels navigables : depuis une note, "Lier à une expédition"
   ouvre un sélecteur → stocke linkedExpId sur la note → affiche badge violet
   cliquable "Expédition : [nom]" qui navigue vers l'onglet Expéditions et
   scroll sur la carte. Depuis une expédition, "Créer une note" génère une note
   liée et navigue vers l'onglet Carnet ; si note déjà liée, affiche "Note liée"
   cliquable.
   Bouton "Date Expédition" : crée toujours une nouvelle expédition (plus de
   logique "ferme si ouverte"). La clôture se fait manuellement via le bouton
   de date de fin dans l'onglet Expéditions.

v1.0.8 | 2026-07-24
   carnet.js — Fix bouton toolbar "Date Expédition" et boutons de date dans
   l'onglet Expéditions (anciennement "Temps morts") : remplacement de
   SimpleCalendar.api.currentDateTime() par game.time.calendar (API Foundry v13
   native). L'ancienne API SimpleCalendar retournait null dans la version
   installée → le bouton 📅 affichait "Calendrier requis" et ne faisait rien.
   getCurrentDate() utilise maintenant game.time.calendar.timeToComponents()
   en priorité (même source que tm.js dans westmarch-ashara), Simple Calendar
   en fallback.
   Refonte onClickDateTM() avec DialogV2 (foundry.applications.api.DialogV2) :
   accès au DOM via document.querySelector('[name="carnet-tm-mode"]:checked')
   et document.getElementById() au lieu de html.find() (Dialog v1). Fallback
   Dialog v1 conservé pour compatibilité. Sélecteur de mois dynamique via
   game.time.calendar.months.
   Texte empty-state "Date du TM" → "Date Expédition" dans buildDowntimeHtml.
   wireDowntimeTab : guard instanceof Element, try-catch sur handlers, message
   d'avertissement mis à jour.
   getPartyMembers() réécrit : plus de dépendance au setting westmarch
   "partyMaster" (inutilisé/incorrect). Même logique que getPlayerActors() dans
   tm.js : filtre game.actors sur type "character" + hasPlayerOwner + dossier
   dont le nom correspond au setting "pjFolderName" (ou sous-dossier).
   settings.js — Nouveau paramètre "Nom du dossier des PJ" (pjFolderName,
   défaut "PJ") configurable dans les settings du module.

v1.0.7 | 2026-07-23
   carnet.css — Fix positionnement des menus déroulants ProseMirror : ajout de
   position:relative et overflow:visible sur .carnet-editor-wrap pour que les
   dropdowns (police, titres, tableau) s'ancrent au conteneur de l'éditeur et
   non à un ancêtre distant du dialog. Ajout z-index sur .editor-menu et les
   classes .prosemirror-dropdown / .dropdown-menu / .pm-dropdown.

v1.0.6 | 2026-07-23
   carnet.js — Renommage du bouton toolbar "Date du TM" → "Date Expédition"
   (title, titre du Dialog, notifications, textes des empty-states).

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
