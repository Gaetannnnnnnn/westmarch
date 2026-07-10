================================================================================
                        ASHARA - RELATIONS — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 1.0.0
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

v1.0.0 | 2026-07-10
   Version initiale du module.
   relations.js  — CRUD flags, onglet fiche acteur, picker Joueurs/PNJ,
                  dialog ajout/modification, suppression avec confirmation,
                  notes dépliables avec champ "Dernière position",
                  auto-save debounce, détection automatique via tokens.
   relations.css — Styles complets de l'onglet et du picker.
   settings.js   — Paramètre "enabled".
   module.json   — Manifeste du module standalone.
