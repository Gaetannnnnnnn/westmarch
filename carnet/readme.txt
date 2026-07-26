================================================================================
                      SORUTA — CARNET D'EXPÉDITIONS
                      Module Foundry VTT — Privé
================================================================================

Version : 1.3.4
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

v1.3.4 | 2026-07-26
   carnet.js — Persistance de l'état de repliage des notes et sections.
   Avant : _collapsedNotes et _collapsedSections étaient des Set module-level
   réinitialisés à chaque rechargement de page → toutes les notes se retrouvaient
   dépliées à la reconnexion.
   Après : état persisté par acteur dans localStorage (clé "carnet-collapse-<actorId>")
   sous la forme { notes: [...ids], sections: [...ids] }. La structure est un
   Map<actorId, {notes, sections}> côté JS, chargé depuis localStorage au premier
   accès pour chaque acteur. buildJournalHtml() lit l'état persisté pour produire
   le HTML initial avec le bon état de repliage. Les handlers toggle section et
   toggle note sauvegardent dans localStorage à chaque changement. Plusieurs fiches
   ouvertes simultanément sont gérées indépendamment (pas de cross-contamination).
   module.json — Bump 1.3.3 → 1.3.4.

v1.3.3 | 2026-07-26
   carnet.js — Fix glisser-déposer (toujours inopérant en Foundry v13 / dnd5e v3).
   Cause racine identifiée : dnd5e v3 scanne tous les éléments [data-item-id] dans
   _attachPartListeners (appelé via super) et leur ajoute draggable="true" + un
   handler dragstart propre. Nos .carnet-item portaient data-item-id → dnd5e les
   traitait comme des items d'inventaire : ses handlers en capture / bubble phase
   prenaient la main sur nos events, empêchant le drag d'aboutir.
   Correctifs :
   (1) Renommage data-item-id → data-carnet-id et data-item-type → data-carnet-type
   dans buildJournalHtml() — dnd5e ne sélectionne plus nos items.
   (2) Mise à jour de _applySectionCollapse() pour lire dataset.carnetId /
   dataset.carnetType.
   (3) _wireDragDrop() : handle.setAttribute('draggable', 'true') forcé en JS
   (contournement si le rendu HTML filtre l'attribut). e.stopImmediatePropagation()
   en plus de stopPropagation() dans le handler dragstart de la poignée pour bloquer
   tout autre handler enregistré sur l'élément. e.stopPropagation() ajouté dans
   les handlers dragover et drop pour empêcher _onDrop() de la fiche dnd5e de
   tenter d'interpréter notre dépôt.
   module.json — Bump 1.3.2 → 1.3.3.

v1.3.2 | 2026-07-26
   carnet.js — Fix glisser-déposer (toujours inopérant en Foundry v13).
   Cause racine du v1.3.1 : le flag _handleDown reposait sur mousedown pour
   détecter si le drag venait de la poignée. En Foundry v13 / dnd5e v3,
   mousedown peut être intercepté par les handlers de la fiche avant d'atteindre
   le nôtre → _handleDown restait false → dragstart appelait e.preventDefault()
   sur chaque tentative → drag annulé systématiquement.
   Correctif : draggable="true" déplacé de l'item (.carnet-item) vers la poignée
   (.carnet-drag-handle). Le drag ne peut désormais démarrer QUE depuis la
   poignée (comportement navigateur natif, aucun flag JS nécessaire). dragstart
   est câblé sur la poignée ; les items restent les cibles de dépôt (dragover /
   drop inchangés). setDragImage() affiche l'item entier comme ghost.
   module.json — Bump 1.3.1 → 1.3.2.

v1.3.1 | 2026-07-26
   carnet.js — Fix glisser-déposer (poignée inopérante).
   Cause racine : la technique mousedown → item.draggable=true est trop tardive
   dans l'environnement Foundry v13 : le navigateur évalue draggable avant que
   le handler mousedown ne s'exécute, et les attributs data-item-id sur les items
   peuvent être interceptés par le DnD natif de Foundry.
   Correctif en trois volets :
   (1) draggable="true" placé directement dans le HTML (buildJournalHtml) sur les
   .carnet-item quand canEdit — évaluation statique, plus de course condition.
   (2) Flag _handleDown (local à _wireDragDrop) : posé à true sur mousedown de la
   poignée, réinitialisé sur mouseup (carnet-body) et sur dragend. dragstart vérifie
   le flag : e.preventDefault() si _handleDown=false (clic sur titre, bouton, etc.).
   (3) e.stopPropagation() dans dragstart (quand drag valide) : empêche Foundry de
   capter l'événement via ses handlers sur la fiche (data-item-id sur .carnet-item
   pouvait déclencher une résolution d'item actor incorrecte).
   Résultat : sections ET notes sont draggables depuis leur poignée uniquement.
   Placer une note dans une section = la déposer sous l'en-tête de section
   (indicateur doré en bas de l'en-tête → note insérée juste après).
   module.json — Bump 1.3.0 → 1.3.1.

v1.3.0 | 2026-07-25
   carnet.js — Ajout des sections et du réordonnement par glisser-déposer.
   addCarnetSection() crée un item {id, type:"section", title:"Nouvelle section"}.
   buildJournalHtml() réécrit : rendu mixte sections (.carnet-section-header) et
   notes (.carnet-note-card) avec poignée de glisser (.carnet-drag-handle) et
   contenu inner (.carnet-note-inner). _applySectionCollapse() masque/affiche les
   items suivants la section jusqu'à la prochaine. _wireDragDrop() gère mousedown
   (stopPropagation sur inputs/buttons), dragstart, dragover (indicateur top/bottom
   doré), drop (réordonne le tableau et sauvegarde le flag). wireJournalTab() mis
   à jour : câblage section (add/rename/delete/collapse) + drag-drop + événements
   note existants. Variables module-level : _collapsedSections (Set persistant),
   _draggedItemId.
   carnet.css — Ajout .carnet-drag-handle (width:18px, cursor:grab, couleur subtile),
   .carnet-note-inner (flex:1), .carnet-section-header (fond or teinté, bordure
   gauche), .carnet-section-title-input, .carnet-toggle-section, .carnet-del-section.
   Ajout .carnet-dragging (opacity:0.4), .carnet-drag-over-top et
   .carnet-drag-over-bottom (bordure or 2px). Mise à jour .carnet-note-card
   (display:flex, gap:4px) et .carnet-add-bar (display:flex, justify:flex-end).
   module.json — Bump 1.2.1 → 1.3.0.

v1.2.1 | 2026-07-25
   carnet.js — Corrections mineures sur la barre d'outils de l'éditeur (état
   initial des boutons, stabilité du MutationObserver).
   module.json — Bump 1.2.0 → 1.2.1.

v1.2.0 | 2026-07-25
   carnet.js — Fix icônes de la barre d'outils non illuminées dans l'éditeur :
   Foundry v13 DialogV2 supprime les balises <style> du contenu HTML lors du rendu,
   rendant le CSS d'état actif inopérant. Correction en trois volets :
   (1) Suppression du bloc <style> dans _buildToolbar() ;
   (2) _updateToolbarState() utilise désormais btn.style.color / btn.style.textShadow
   (styles inline, non filtrés par DialogV2) pour indiquer l'état actif ;
   (3) CSS des icônes injecté via document.createElement('style') +
   document.head.appendChild() depuis le callback render, avec MutationObserver
   qui nettoie la balise quand le dialog se ferme.
   module.json — Bump 1.1.8 → 1.2.0.

v1.1.3 → v1.1.8 | 2026-07-24 — 2026-07-25
   Remplacement de l'éditeur ProseMirror (Dialog popup) par une textarea avec barre
   d'outils custom (document.execCommand / queryCommandState). Diverses corrections
   de compatibilité Foundry v13 et refactorisations internes.

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
