================================================================================
                       ASHARA - BESTIAIRE — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 1.0.4
                              Compatibilité : Foundry VTT v13
================================================================================

DESCRIPTION
-----------
Ashara - Bestiaire est un module Foundry VTT qui ajoute un onglet "Bestiaire"
sur les fiches de personnage (PJ uniquement). Il répertorie automatiquement les
créatures rencontrées sur les scènes, limitées à 1 exemplaire par créature et
par personnage.

Les données sont stockées directement sur l'acteur via les flags Foundry
(scope "ashara-bestiary"). Le module est conçu pour coexister avec
ashara-relations : si les deux sont actifs, les deux onglets apparaissent dans
la même fiche.


--------------------------------------------------------------------------------
STRUCTURE DES FICHIERS
--------------------------------------------------------------------------------

bestiary/
├── readme.txt              Ce fichier
├── module.json             Manifeste du module (id, version, compatibilité)
├── index.js                Point d'entrée — init (settings + hooks) + setup
│                           (lecture de CONFIG.asharaSheets + enregistrement)
├── modules/
│   ├── settings.js         Enregistrement des paramètres du module
│   ├── bestiary.js         Logique principale (CRUD, onglet, scan, wireTab)
│   └── character-sheet.js  Factory createBestiarySheet(BaseSheet)
├── templates/
│   └── character-bestiary.hbs  Template Handlebars de l'onglet Bestiaire
└── styles/
    └── bestiary.css        Styles de l'onglet Bestiaire


--------------------------------------------------------------------------------
DÉTAIL DES FICHIERS
--------------------------------------------------------------------------------

settings.js
   Enregistre le paramètre "enabled" (Boolean, default: true, scope: world)
   dans la configuration du module Foundry. Quand désactivé, la détection
   automatique des créatures n'a pas lieu (GM uniquement).

bestiary.js
   Fichier principal. Contient :

   1. CRUD FLAGS
      Toutes les données sont stockées sous forme de flags sur chaque acteur PJ :
      actor.getFlag("ashara-bestiary", "list") → tableau d'entrées.
      Chaque entrée est un objet :
        {
          id:         string (ID unique, 12 chars),
          targetId:   string (ID de l'acteur créature),
          targetName: string (nom mis en cache),
          targetImg:  string (image mise en cache),
          hostility:  number (-2 à +2, défaut 0),
          note:       string (notes libres),
          firstScene: string (nom de la scène de première rencontre)
        }

   2. NIVEAUX D'HOSTILITÉ (-2 → +2)
      Chaque palier est représenté par une icône FontAwesome et une couleur :
        -2 : fa-skull       (rouge foncé #8b0000) — Très hostile
        -1 : fa-fire        (rouge #e74c3c)        — Hostile
         0 : fa-question    (gris #888888)          — Inconnue
        +1 : fa-eye         (vert clair #a8d5a2)   — Observée
        +2 : fa-handshake   (vert #27ae60)          — Amicale

   3. ONGLET BESTIAIRE (fiche personnage uniquement)
      Affiché sur les fiches de type "character". Chaque ligne contient :
        - Avatar de la créature (image mise en cache si l'acteur est supprimé)
        - Nom de la créature
        - Sélecteur d'hostilité (5 boutons icônes, -2 → +2)
        - Bouton ▼ pour déplier les notes
        - Bouton 🗑 pour retirer du bestiaire (avec confirmation)

      Section notes dépliable (▼/▲) :
        - "Première rencontre" : nom de la scène au moment de la détection
          (lecture seule, rempli automatiquement)
        - Textarea de notes (auto-save debounce 1.2s + immédiat au blur)

      Barre de recherche en haut de l'onglet pour filtrer les créatures par
      nom en temps réel. Bouton × pour effacer la recherche.

      Les entrées sont triées par hostilité croissante (plus hostile en
      premier), puis par ordre alphabétique à hostilité égale.

   4. DÉTECTION AUTOMATIQUE (GM only)
      Le module ajoute automatiquement au bestiaire de chaque PJ les créatures
      du dossier "Créatures" (et ses sous-dossiers) visibles sur la scène.
      La détection se déclenche sur trois événements :
        - canvasReady  : scan de tous les tokens visibles au chargement
        - createToken  : nouveau token posé sur la scène (non caché)
        - updateToken  : token passant de hidden=true à hidden=false
      Règles d'inclusion :
        - PJ concernés : acteurs de type "character" dans le dossier "PJ"
          (et sous-dossiers), avec un token visible sur la scène
        - Créatures : acteurs dans le dossier "Créatures" (et sous-dossiers),
          avec un token visible et non caché
        - Maximum 1 entrée par créature par personnage (pas de doublon)
        - La "Première rencontre" est remplie avec le nom de la scène courante
      Uniquement exécuté côté GM pour éviter les conflits de permissions.
      Un guard anti-doublon (_scanning) évite les appels concurrents.

   5. COHABITATION AVEC ASHARA-RELATIONS
      Relations expose sa fiche via CONFIG.asharaSheets.relations pendant son
      hook "init". Bestiary lit cette référence dans son hook "setup" (garanti
      après tous les "init") pour construire la chaîne d'héritage :
        AshBestiarySheet → AshCharacterSheet → CharacterActorSheet (dnd5e)
      Les deux onglets (Relations + Bestiaire) coexistent dans la même fiche
      sans conflit. Si relations n'est pas actif, bestiary étend directement
      la fiche dnd5e native (CONFIG.asharaSheets absent → fallback).

bestiary.css
   Styles de l'onglet Bestiaire. Suit la charte visuelle sombre d'Ashara.
   Les styles critiques de mise en page (title bar, search bar) sont injectés
   en inline dans buildTabHtml pour contourner le cache CSS de Foundry.


--------------------------------------------------------------------------------
DONNÉES STOCKÉES
--------------------------------------------------------------------------------

Les données sont stockées en flags Foundry sur chaque acteur PJ :
  actor.getFlag("ashara-bestiary", "list") → Array<BestiaryEntry>

Aucune modification n'est faite sur les items, features, effets actifs ou
toute autre propriété système de l'acteur. Le module est non-invasif.


--------------------------------------------------------------------------------
INSTALLATION & CONFIGURATION
--------------------------------------------------------------------------------

1. Copier le dossier "bestiary" dans le dossier des modules Foundry :
   cp -r /chemin/vers/bestiary /foundrydata/Data/modules/bestiary

   IMPORTANT : Le nom du dossier doit être exactement "bestiary" pour
   correspondre à l'id "ashara-bestiary" défini dans module.json.

2. Redémarrer le serveur Foundry :
   sudo systemctl restart foundryvtt

3. Activer le module dans Foundry :
   Setup → Gérer les modules → Activer "Ashara - Bestiaire"

4. Configuration :
   Paramètres du jeu → Configuration des modules → Ashara - Bestiaire
   → "Activer le bestiaire" (activé par défaut)

5. Structure attendue dans le répertoire des acteurs :
   - Un dossier nommé exactement "PJ" pour les personnages joueurs.
   - Un dossier nommé exactement "Créatures" pour les PNJ créatures.
   Les sous-dossiers sont supportés dans les deux cas.


--------------------------------------------------------------------------------
NOTES TECHNIQUES
--------------------------------------------------------------------------------

- Compatible Foundry VTT v13 minimum.
- Utilise foundry.applications.api.DialogV2 pour la confirmation de suppression.
- La fiche est enregistrée via le hook "setup" (après tous les hooks "init").
  Relations expose AshCharacterSheet dans CONFIG.asharaSheets.relations pendant
  son "init" ; bestiary le lit dans "setup" pour un héritage garanti.
  La classe AshBestiarySheet est générée par la factory createBestiarySheet()
  définie dans character-sheet.js (même structure que character-sheet.js de
  relations).
- actor.update({render:false}) supprime tout re-render déclenché par les
  modifications de flags depuis l'onglet.
- jQuery ($) est utilisé pour la manipulation DOM dans wireTab.


================================================================================
                       ASHARA - BESTIAIRE — MISES À JOUR
================================================================================

v1.0.4 | 2026-07-11
   bestiary.js   — Fix nom du dossier : "Créatures" → "Creatures" (sans accent)
                  pour correspondre au nom réel du dossier Foundry. Corrige
                  la détection automatique des créatures sur la scène.
   module.json   — Version 1.0.3 → 1.0.4

v1.0.3 | 2026-07-11
   character-sheet.js — Fix onglet Bestiaire blanc à la réouverture : même
                        cause que relations v1.3.6 — Foundry enregistrait
                        l'onglet comme actif dans tabGroups avant l'insertion
                        de la section dans le DOM, rendant changeTab inopérant.
                        Fix : delete tabGroups.primary avant changeTab.
   module.json        — Version 1.0.2 → 1.0.3

v1.0.2 | 2026-07-10
   character-sheet.js — Nouveau fichier. Factory createBestiarySheet(BaseSheet)
                        qui génère AshBestiarySheet avec static PARTS, TABS et
                        _onRender + changeTab (même pattern que character-sheet.js
                        de relations). Remplace la classe inline dans index.js.
   index.js           — Simplifié : suppression de la détection instanceof.
                        Lit CONFIG.asharaSheets.relations dans "setup" pour
                        récupérer AshCharacterSheet de façon fiable.
   module.json        — Version 1.0.1 → 1.0.2

v1.0.1 | 2026-07-10
   index.js     — Fix détection de la fiche Relations : remplacement de la
                  recherche par info.default (non fiable en Foundry v13) par
                  une itération sur toutes les fiches enregistrées avec un
                  test instanceof. AshBestiarySheet étend désormais
                  correctement AshCharacterSheet si Relations est actif.
   module.json  — Version 1.0.0 → 1.0.1

v1.0.0 | 2026-07-10
   Version initiale du module.
   bestiary.js  — CRUD flags, onglet fiche PJ, sélecteur d'hostilité inline,
                  notes dépliables avec "Première rencontre", auto-save
                  debounce, détection automatique via tokens du dossier
                  "Créatures", barre de recherche temps réel.
   bestiary.css — Styles complets de l'onglet.
   settings.js  — Paramètre "enabled".
   module.json  — Manifeste du module standalone.
   index.js     — Hook setup : détection de la fiche Relations si active,
                  héritage dynamique, enregistrement comme fiche par défaut.
