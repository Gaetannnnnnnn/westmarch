================================================================================
                       ASHARA - BESTIAIRE — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 1.1.8
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
          firstScene: string (nom de la scène de première rencontre),
          revealed:   boolean (true = nom/portrait réels, false = "Inconnue")
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

   4. DÉTECTION AUTOMATIQUE (côté joueur)
      Chaque joueur scanne les tokens visibles sur son écran et ajoute les
      nouvelles créatures (dossier "Creatures") à son bestiaire. Déclencheurs :
        - canvasReady  : scan au chargement de la scène
        - sightRefresh : scan après tout changement de vision (mouvement,
                        lumière, nouveau token) avec debounce 500ms
      Règles d'inclusion :
        - t.visible : vision réelle du client (LOS, fog of war, portée)
        - Créatures : acteurs dans le dossier "Creatures" (et sous-dossiers)
        - Maximum 1 entrée par créature par personnage (pas de doublon)
        - "Première rencontre" remplie avec le nom de la scène courante
        - Nouvelles entrées créées avec revealed: false
      Un guard anti-doublon (_scanning) évite les appels concurrents.

   5. ANONYMISATION (GM uniquement)
      Boutons "Révéler" et "Masquer" injectés dans l'en-tête des fiches
      acteurs (GM uniquement). Portée : PJs présents sur la scène active
      qui ont déjà cette créature dans leur bestiaire.
        - Révéler : passe revealed: true → nom et portrait réels affichés
        - Masquer  : passe revealed: false → affiché "Inconnue"
      Si Relations est aussi actif, Relations injecte les boutons (guard
      anti-doublon) ; Bestiaire écoute les hooks ashara:revealToParty et
      ashara:anonymize et met à jour ses propres données.

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

v1.1.8 | 2026-07-12
   bestiary.js   — Fix boutons Révéler/Masquer : $(html) → $(app.element).
                  renderActorSheetV2 passe le contenu dans html, pas le
                  window frame. Le header était introuvable → boutons absents.
   bestiary.js   — Hook createToken ajouté (debounce 300ms) : sightRefresh
                  ne tire pas sur les scènes sans vision active. createToken
                  garantit la détection même sans vision.
   module.json   — Version 1.1.7 → 1.1.8

v1.1.7 | 2026-07-12
   bestiary.js   — revealed conditionnel : les nouvelles entrées démarrent
                  revealed:true si le setting "anonymization" est désactivé,
                  revealed:false uniquement si le GM a activé l'anonymisation.
   module.json   — Version 1.1.6 → 1.1.7

v1.1.6 | 2026-07-12
   bestiary.js   — Fix détection automatique : suppression du filtre t.visible.
                  Toutes les créatures du dossier "Creatures" présentes sur la
                  scène sont désormais détectées, sans condition de ligne de vue
                  ou brouillard de guerre. Guard GM inchangé.
   module.json   — Version 1.1.5 → 1.1.6

v1.1.5 | 2026-07-12
   bestiary.js   — Anonymat partiel : portrait toujours visible, seul le nom
                  passe en "Inconnue". Clic portrait réactivé même pour les
                  entrées non révélées.
   module.json   — Version 1.1.4 → 1.1.5

v1.1.4 | 2026-07-12
   bestiary.js   — Fix hook injection boutons : renderActorSheet → renderActorSheetV2,
                  app.actor → app.document, <a> → <button type=button>.
   module.json   — Version 1.1.3 → 1.1.4

v1.1.3 | 2026-07-12
   settings.js   — Nouveau paramètre "Activer l'anonymisation" (world, GM only) :
                  active/désactive les boutons Révéler/Masquer sur les fiches
                  acteurs (utilisé uniquement si Relations n'est pas actif).
   bestiary.js   — Guard game.settings.get(MODULE, "anonymization") dans le
                  hook renderActorSheet.
   module.json   — Version 1.1.2 → 1.1.3

v1.1.2 | 2026-07-12
   bestiary.js   — Système d'anonymisation : écoute les hooks ashara:revealToParty
                  et ashara:anonymize pour mettre à jour le champ revealed de
                  chaque entrée. Nouvelles entrées (scan + ajout manuel) créées
                  avec revealed: false → affichées "Inconnue" jusqu'à révélation
                  GM. Entrées sans champ revealed traitées comme true (pas de
                  régression). Clic portrait bloqué si non révélé.
                  Boutons Révéler/Masquer injectés dans les fiches si Relations
                  n'est pas actif (guard anti-doublon .ashara-reveal-btn).
   module.json   — Version 1.1.1 → 1.1.2

v1.1.1 | 2026-07-12
   bestiary.js   — Clic sur une ligne ouvre le portrait de la créature via
                  ImagePopout. Les boutons (hostilité, notes, supprimer) sont
                  exclus du déclenchement.
   bestiary.css  — cursor: pointer sur .bst-row-header.
   module.json   — Version 1.1.0 → 1.1.1

v1.1.0 | 2026-07-12
   bestiary.js   — Suppression hooks createToken et updateToken : sightRefresh
                  tire toujours après eux et travaille sur un t.visible déjà à
                  jour. Seuls canvasReady + sightRefresh (debounce 500ms) sont
                  conservés, ce qui évite les fausses détections dues aux timings.
   module.json   — Version 1.0.9 → 1.1.0

v1.0.9 | 2026-07-12
   bestiary.js   — Refonte de la détection automatique : scan désormais côté
                  joueur (plus côté GM). Utilise t.visible qui reflète la vision
                  réelle du client (LOS, fog of war, portée). Un joueur ne détecte
                  que les créatures qu'il voit réellement sur son écran.
                  Ajout hook sightRefresh (debounce 500ms) pour détecter les
                  créatures qui entrent dans le champ de vision suite à un
                  mouvement ou changement de lumière.
   module.json   — Version 1.0.8 → 1.0.9

v1.0.8 | 2026-07-11
   bestiary.js   — Fix détection tokens cachés : t.hidden est undefined sur les
                  placeables canvas en Foundry v13. Remplacement par
                  t.document?.hidden dans scanVisibleTokens (pjActors + creatures).
                  Les tokens en "Toggle Visibility State" sont désormais correctement
                  exclus de la détection automatique.
   module.json   — Version 1.0.7 → 1.0.8

v1.0.7 | 2026-07-11
   bestiary.js   — Champ "Première rencontre" rendu éditable (input texte) pour
                  les utilisateurs pouvant modifier l'entrée (GM + propriétaire).
                  Auto-save au blur, identique à "Dernière position" dans Relations.
   bestiary.css  — Ajout style .bst-scene-input (soulignement discret, focus).
   module.json   — Version 1.0.6 → 1.0.7

v1.0.6 | 2026-07-11
   settings.js   — Ajout bandeau d'information en haut de la page de paramètres
                  (version, description, auteur, mention propriétaire Ashara).
                  Même style que WestMarch Système.
   module.json   — Version 1.0.5 → 1.0.6

v1.0.5 | 2026-07-11
   bestiary.js   — Ajout bouton "Ajouter" (GM uniquement) dans la barre de titre
                  de l'onglet. Ouvre un dialog picker listant les créatures du
                  dossier "Creatures" pas encore dans le bestiaire, avec barre
                  de recherche en temps réel. La suppression reste accessible
                  au GM et aux propriétaires (canEdit, inchangé).
   bestiary.css  — Styles .bst-picker-actor (hover, selected) pour le picker.
   module.json   — Version 1.0.4 → 1.0.5

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
