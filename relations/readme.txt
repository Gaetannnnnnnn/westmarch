================================================================================
                        ASHARA - RELATIONS — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 1.2.1
                              Compatibilité : Foundry VTT v13
================================================================================

DESCRIPTION
-----------
Ashara - Relations est un module Foundry VTT dédié à la gestion des relations
entre personnages (PJ↔PJ, PJ↔PNJ). Il détecte automatiquement les rencontres
entre personnages sur les scènes et crée les liens correspondants sans jamais
modifier les fiches des acteurs (aucune feature, aucun item créé).

Chaque relation est stockée directement sur l'acteur via les flags Foundry
(scope "ashara-relations"). L'interface se présente sous la forme d'un onglet
"Relations" injecté dans chaque fiche de personnage (type "character").


--------------------------------------------------------------------------------
STRUCTURE DES FICHIERS
--------------------------------------------------------------------------------

relations/
├── readme.txt              Ce fichier
├── module.json             Manifeste du module (id, version, compatibilité)
├── index.js                Point d'entrée — initialise les settings et les hooks
├── modules/
│   ├── settings.js         Enregistrement des paramètres du module
│   └── relations.js        Logique principale (CRUD, onglet, picker, auto-détection)
└── styles/
    └── relations.css       Styles de l'onglet et du picker d'acteur


--------------------------------------------------------------------------------
DÉTAIL DES FICHIERS
--------------------------------------------------------------------------------

settings.js
   Enregistre le paramètre "enabled" (Boolean, default: true) dans la
   configuration du module Foundry. Accessible via :
   Paramètres du jeu → Configuration des modules → Ashara - Relations.

relations.js
   Fichier principal. Contient :

   1. CRUD FLAGS
      Toutes les données sont stockées sous forme de flags sur chaque acteur :
      actor.getFlag("ashara-relations", "list") → tableau de relations.
      Chaque relation est un objet :
        {
          id:           string (ID unique, 12 chars),
          targetId:     string (ID de l'acteur cible),
          targetName:   string (nom mis en cache),
          targetImg:    string (image mise en cache),
          type:         string (texte libre : "Allié", "Ennemi", etc.),
          level:        number (-3 à +3),
          note:         string (notes libres),
          lastPosition: string (dernière position connue de la rencontre),
          secret:       boolean (visible GM uniquement si true)
        }

   2. ICÔNES DE NIVEAU (-3 → +3)
      Chaque palier est représenté par une icône FontAwesome distincte et
      une couleur propre :
        -3 : fa-skull       (rouge foncé #8b0000) — Haine totale
        -2 : fa-fire        (rouge #e74c3c)        — Hostilité
        -1 : fa-thumbs-down (orange #e67e22)       — Méfiance
         0 : fa-minus       (gris #888888)          — Neutre
        +1 : fa-thumbs-up   (vert clair #a8d5a2)   — Sympathie
        +2 : fa-star        (vert #27ae60)          — Amitié
        +3 : fa-heart       (rose #e91e8c)          — Loyauté

   3. ONGLET RELATIONS (fiche acteur)
      Injecté via le hook renderApplication sur toutes les fiches de type
      "character". L'onglet affiche la liste des relations avec pour chaque
      ligne :
        - Avatar de la cible (image mise en cache si l'acteur est supprimé)
        - Nom de la cible
        - Badge de type (texte libre)
        - Icône de niveau
        - Icône cadenas si secret (GM uniquement)
        - Bouton ▼ pour déplier les notes
        - Bouton ✏ pour modifier (GM / propriétaire)
        - Bouton 🗑 pour supprimer avec confirmation (GM / propriétaire)

      Section notes dépliable (▼/▲) :
        - Champ "Dernière position" (texte court, auto-save au blur)
        - Textarea de notes (auto-save debounce 1.2s + immédiat au blur)

      L'état déplié des notes et l'onglet actif sont mémorisés en session
      (survivent aux re-renders déclenchés par les sauvegardes de flags).

   4. DIALOG AJOUT (openAddDialog)
      Ouvert via le bouton "+ Ajouter une relation". Contient :
        - Picker d'acteur avec barre de recherche et deux sections
          dépliables :
            • "Joueurs" : acteurs de type "character" dans le dossier "PJ"
            • "PNJ"     : acteurs de type "character" hors du dossier "PJ"
          Les acteurs déjà en relation sont exclus de la liste.
          Un seul acteur peut être sélectionné (clic → mise en évidence).
        - Champ Type de relation (texte libre)
        - Slider Niveau d'affinité (-3 → +3)
        - Case Secret (GM uniquement)
      La "Dernière position" est automatiquement remplie avec le nom de la
      scène courante au moment de l'ajout.

   5. DIALOG MODIFICATION (openEditDialog)
      Ouvert via le bouton ✏ sur une ligne. Permet de modifier :
        - Type de relation
        - Niveau d'affinité
        - Secret
      L'acteur cible est affiché en lecture seule (non modifiable).

   6. DÉTECTION AUTOMATIQUE (GM only)
      Le module crée automatiquement des relations entre tous les personnages
      de type "character" visibles (non cachés) sur une scène. La détection
      se déclenche sur trois événements :
        - canvasReady  : scan de tous les tokens visibles au chargement
        - createToken  : nouveau token posé sur la scène et non caché
        - updateToken  : token passant de hidden=true à hidden=false
      Pour chaque paire de personnages visibles, si la relation n'existe pas
      encore sur l'un ou l'autre, elle est créée avec les valeurs par défaut
      (type vide, level 0, lastPosition = nom de la scène courante).
      Un guard anti-doublon (_scanning) évite les appels concurrents.
      Uniquement exécuté côté GM pour éviter les conflits de permissions.

relations.css
   Styles de l'onglet Relations et du picker d'acteur dans le dialog d'ajout.
   Suit la charte visuelle sombre d'Ashara.


--------------------------------------------------------------------------------
DONNÉES STOCKÉES
--------------------------------------------------------------------------------

Les données sont stockées en flags Foundry sur chaque acteur :
  actor.getFlag("ashara-relations", "list") → Array<RelationObject>

Aucune modification n'est faite sur les items, features, effets actifs ou
toute autre propriété système de l'acteur. Le module est non-invasif.


--------------------------------------------------------------------------------
INSTALLATION & CONFIGURATION
--------------------------------------------------------------------------------

1. Copier le dossier "relations" dans le dossier des modules Foundry :
   cp -r /chemin/vers/relations /foundrydata/Data/modules/relations

   IMPORTANT : Le nom du dossier doit être exactement "relations" pour
   correspondre à l'id "ashara-relations" défini dans module.json.

2. Redémarrer le serveur Foundry :
   sudo systemctl restart foundryvtt

3. Activer le module dans Foundry :
   Setup → Gérer les modules → Activer "Ashara - Relations"

4. Configuration :
   Paramètres du jeu → Configuration des modules → Ashara - Relations
   → "Activer le système de relations" (activé par défaut)

5. Structure attendue dans le répertoire des acteurs :
   Un dossier nommé exactement "PJ" doit exister dans le répertoire des
   acteurs pour que la section "Joueurs" du picker soit peuplée correctement.
   Les acteurs hors de ce dossier apparaissent dans la section "PNJ".


--------------------------------------------------------------------------------
NOTES TECHNIQUES
--------------------------------------------------------------------------------

- Compatible Foundry VTT v13 minimum.
- Utilise foundry.applications.api.DialogV2 pour tous les dialogs.
- L'injection de l'onglet via renderApplication est compatible avec les
  fiches ApplicationV2 (dnd5e v3+). La gestion du tab actif est manuelle
  (stopPropagation sur le clic, manipulation directe des classes CSS "active")
  pour éviter les conflits avec le TabsV2 interne de Foundry.
- jQuery ($) est utilisé pour la manipulation DOM dans les hooks (disponible
  globalement dans Foundry VTT).

================================================================================
                        ASHARA - RELATIONS — MISES À JOUR
================================================================================

v1.2.1 | 2026-07-10
   relations.js  — Fix ordre des icônes de niveau : Object.entries() place
                  les clés entières positives ("0","1","2","3") avant les
                  négatives en JS, inversant l'ordre. Fix : .sort() explicite
                  par parseInt avant le .map(). Suppression du badge .rel-type
                  sur les lignes de relation.
   Version       — 1.2.0 → 1.2.1

v1.2.0 | 2026-07-10
   character-sheet.js — Nouveau fichier. Sous-classe AshCharacterSheet
                       étend dnd5e.applications.actor.CharacterActorSheet.
                       Enregistre l'onglet Relations via static PARTS /
                       static TABS (intégration native ApplicationV2 dnd5e
                       v3). _prepareContext injecte relationsHtml dans le
                       contexte. _attachPartListeners branche wireTab.
   templates/         — Nouveau dossier. character-relations.hbs = template
                       Handlebars minimaliste ({{{relationsHtml}}}).
   index.js           — Importe AshCharacterSheet + Actors.registerSheet
                       pour en faire la fiche par défaut des personnages.
   module.json        — Ajout "templates" + version 1.2.0.
   relations.js       — Suppression de injectTab() et des hooks
                       renderApplicationV2/renderApplication (remplacés par
                       le mécanisme PARTS natif). Export de MODULE,
                       buildTabHtml, buildRowHtml, emptyStateHtml, wireTab.
   Version            — 1.1.0 → 1.2.0

v1.1.0 | 2026-07-10
   relations.js  — Refonte CRUD : relSave utilise actor.update({render:false})
                  au lieu de setFlag pour supprimer tout re-render déclenché
                  depuis l'onglet Relations. Le DOM est géré manuellement :
                  add → buildRowHtml + append ; delete → $row.remove() +
                  emptyStateHtml si liste vide ; level/note/lastpos → DOM
                  optimiste uniquement. Plus aucun kick hors de l'onglet.
                  Extraction de buildRowHtml() et emptyStateHtml() pour
                  réutilisation entre buildTabHtml et wireTab.
                  relAdd retourne désormais l'objet relation créé.
   Version       — 1.0.9 → 1.1.0

v1.0.9 | 2026-07-10
   relations.js  — Ajout du label du niveau actuel à gauche des icônes
                  (.rel-level-label, coloré selon le niveau). Mise à jour
                  optimiste incluse : label + couleur changent immédiatement
                  au clic sans attendre le re-render.
   relations.css — Style .rel-level-label (11px bold, min-width 70px aligné
                  à droite pour stabiliser la largeur entre les niveaux).
   Version       — 1.0.8 → 1.0.9

v1.0.8 | 2026-07-10
   relations.js  — Remplacement du bouton ✏ Modifier par un sélecteur de
                  niveau inline : les 7 icônes (-3→+3) sont affichées
                  directement sur chaque ligne, l'actif en couleur, les
                  autres grisés (opacity 0.22). Clic immédiat → relUpdate
                  avec mise à jour optimiste du DOM avant re-render.
   relations.css — Ajout styles .rel-level-selector et .rel-level-btn.
   Version       — 1.0.7 → 1.0.8

v1.0.7 | 2026-07-10
   relations.js  — Fix suppression/re-render : extraction d'un helper
                  activateOurs() appelé au clic ET via setTimeout(0) lors
                  d'un re-render avec wasActive=true (après l'init dnd5e).
                  Suppression de clearActiveOnClose : la fiche se souvient
                  maintenant du dernier onglet ouvert (Relations ou autre)
                  entre les fermetures/réouvertures, comme les autres onglets.
   Version       — 1.0.6 → 1.0.7

v1.0.6 | 2026-07-10
   relations.js  — Fix onglets vides après retour depuis Relations : quand on
                  quittait l'onglet Relations, les inline display:none posés
                  sur les panneaux dnd5e n'étaient pas retirés, empêchant
                  dnd5e de les réafficher via ses classes CSS. Fix : au clic
                  sur un autre tab, on retire tous nos inline styles avec
                  .css("display","") avant que dnd5e reprenne la main.
   Version       — 1.0.5 → 1.0.6

v1.0.5 | 2026-07-10
   relations.js  — Fix double-panneau à la réouverture : ajout des hooks
                  closeApplicationV2 + closeApplication qui retirent l'acteur
                  de _activeActs à la fermeture de sa fiche. Sans ce fix, le
                  panneau Relations restait marqué "actif" et s'affichait en
                  même temps que le panneau Details de dnd5e à la réouverture.
   Version       — 1.0.4 → 1.0.5

v1.0.4 | 2026-07-10
   relations.js  — Fix affichage onglet : passage à la gestion explicite du
                  display (inline style) au lieu des classes CSS "active".
                  Clic sur notre tab : hide() sur tous les autres panneaux,
                  display:flex sur le nôtre. Clic sur un autre tab : hide()
                  sur notre panneau, dnd5e gère le reste sans interférence.
                  Insertion après le dernier tab existant (after()) au lieu
                  d'un simple append sur .sheet-body.
   Version       — 1.0.3 → 1.0.4

v1.0.3 | 2026-07-10
   relations.js  — Fix icône onglet : ajout classe "control" + data-tooltip,
                  suppression du <span> (dnd5e v3 tabs = icon only).
                  Refonte HTML onglet : en-tête avec titre + bouton "Ajouter",
                  état vide centré avec icône fa-heart-broken.
   relations.css — Refonte complète : layout flex colonne, header-bar dédié,
                  boutons d'action masqués sauf au hover sur la ligne,
                  état vide centré, picker plus compact et lisible.
   Version       — 1.0.2 → 1.0.3

v1.0.2 | 2026-07-10
   relations.js  — Fix acteur : en dnd5e v3 / Foundry v13, l'acteur est dans
                  app.document (DocumentSheetV2), pas app.actor. Résolution
                  via app.actor ?? app.document ?? app.object avec vérification
                  documentName === "Actor" pour éviter les faux positifs.
   Version       — 1.0.1 → 1.0.2

v1.0.1 | 2026-07-10
   relations.js  — Fix hook : ajout de renderApplicationV2 (fiches dnd5e v3
                  basées sur ApplicationV2 en Foundry v13 ne déclenchent pas
                  renderApplication). Double hook renderApplicationV2 +
                  renderApplication pour compatibilité maximale.
                  Sélecteurs body élargis : ajout de .sheet-body et
                  section.sheet-body pour dnd5e v3.
   Version       — 1.0.0 → 1.0.1

v1.0.0 | 2026-07-10
   Version initiale du module.
   relations.js  — CRUD flags, onglet fiche acteur, picker Joueurs/PNJ,
                  dialog ajout/modification, suppression avec confirmation,
                  notes dépliables avec champ "Dernière position",
                  auto-save debounce, détection automatique via tokens.
   relations.css — Styles complets de l'onglet et du picker.
   settings.js   — Paramètre "enabled".
   module.json   — Manifeste du module standalone.
