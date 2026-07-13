================================================================================
                        ASHARA - RELATIONS — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 1.5.6
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
│   ├── relations.js        Logique principale (CRUD, onglet, picker, auto-détection)
│   └── character-sheet.js  Sous-classe AshCharacterSheet (PARTS / TABS natifs dnd5e v3)
├── templates/
│   └── character-relations.hbs  Template Handlebars de l'onglet Relations
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
          level:        number (-3 à +3),
          note:         string (notes libres),
          lastPosition: string (dernière position connue de la rencontre),
          revealed:     boolean (true = nom/portrait visible, false = "Inconnu")
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
      Injecté via AshCharacterSheet sur toutes les fiches de type "character".
      L'onglet contient, de haut en bas :

      Barre de titre ("♥ Relations") :
        - Bouton "+ Ajouter" visible uniquement pour le GM.

      Barre de recherche :
        - Filtre les relations par nom en temps réel.
        - Bouton × pour effacer la recherche.

      Liste des relations, groupée en deux sections :
        - "Joueurs" : acteurs dans le dossier "PJ" (et sous-dossiers)
        - "PNJ"     : acteurs hors des dossiers "PJ" et "Créatures"
        Les acteurs du dossier "Créatures" n'apparaissent pas dans la liste
        (ils sont gérés par le module ashara-bestiary).

      Chaque ligne de relation affiche :
        - Avatar de la cible (image mise en cache si l'acteur est supprimé)
        - Nom de la cible
        - Sélecteur de niveau inline (7 icônes -3 → +3, actif en couleur)
        - Bouton ▼ pour déplier les notes
        - Bouton 🗑 pour supprimer avec confirmation (GM / propriétaire)

      Section notes dépliable (▼/▲) :
        - Champ "Dernière position" (texte court, auto-save au blur)
        - Textarea de notes (auto-save debounce 1.2s + immédiat au blur)

      L'état déplié des notes est mémorisé en session (survit aux re-renders).

   4. DIALOG AJOUT (openAddDialog) — GM uniquement
      Ouvert via le bouton "+ Ajouter". Contient :
        - Picker d'acteur avec barre de recherche et deux sections
          dépliables :
            • "Joueurs" : acteurs de type "character" dans le dossier "PJ"
            • "PNJ"     : acteurs de type "character" hors des dossiers
                         "PJ" et "Créatures"
          Les acteurs déjà en relation sont exclus de la liste.
          Un seul acteur peut être sélectionné (clic → mise en évidence).
        - Slider Niveau d'affinité (-3 → +3)
      La "Dernière position" est automatiquement remplie avec le nom de la
      scène courante au moment de l'ajout.

   5. DÉTECTION AUTOMATIQUE (côté joueur)
      Chaque joueur scanne automatiquement les tokens visibles sur son écran
      et ajoute les nouvelles rencontres à ses relations. La détection se
      déclenche sur :
        - canvasReady  : scan au chargement de la scène
        - sightRefresh : scan après tout changement de vision (mouvement,
                        lumière, nouveau token) avec debounce 500ms
      Les nouvelles entrées sont créées avec revealed: false (Inconnu).
      Un guard anti-doublon (_scanning) évite les appels concurrents.

   6. ANONYMISATION (GM uniquement)
      Deux boutons "Révéler" et "Masquer" sont injectés dans l'en-tête de
      chaque fiche acteur (GM uniquement). Ils agissent sur les PJs présents
      sur la scène active qui ont déjà cet acteur dans leurs relations :
        - Révéler : passe revealed: true → nom et portrait réels affichés
        - Masquer  : passe revealed: false → affiché comme "Inconnu"
      Les entrées existantes sans champ revealed sont traitées comme
      revealed: true (pas de régression sur les données existantes).
      Si les deux modules (Relations + Bestiaire) sont actifs, un seul jeu
      de boutons est injecté (garde anti-doublon sur .ashara-reveal-btn) ;
      les deux modules écoutent le hook ashara:revealToParty et
      ashara:anonymize et mettent à jour leurs données indépendamment.

   6. HELPERS DOSSIERS
      isInFolder(actor, folderName) : remonte l'arbre des dossiers (gère les
      sous-dossiers à n'importe quelle profondeur).
      isInPJFolder(actor)        : alias → isInFolder(actor, "PJ")
      isInCreaturesFolder(actor) : alias → isInFolder(actor, "Créatures")

relations.css
   Styles de l'onglet Relations et du picker d'acteur dans le dialog d'ajout.
   Les styles critiques de mise en page (titre, barre de recherche, en-têtes
   de section) sont injectés en inline dans buildTabHtml pour contourner le
   cache CSS de Foundry.


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
   - Un dossier nommé exactement "PJ" pour les personnages joueurs.
   - Un dossier nommé exactement "Créatures" pour exclure les créatures
     du picker et de la liste PNJ (géré par ashara-bestiary).
   Les sous-dossiers sont supportés dans les deux cas.


--------------------------------------------------------------------------------
NOTES TECHNIQUES
--------------------------------------------------------------------------------

- Compatible Foundry VTT v13 minimum.
- Utilise foundry.applications.api.DialogV2 pour tous les dialogs.
- L'onglet Relations est ajouté via sous-classe (AshCharacterSheet étend
  dnd5e.applications.actor.CharacterActorSheet). L'intégration native via
  static PARTS / static TABS gère le rendu, la navigation et la mémorisation
  de l'onglet actif sans injection DOM manuelle.
- actor.update({render:false}) supprime tout re-render déclenché par les
  modifications de flags depuis l'onglet. Le DOM est géré manuellement
  (add/delete/level sans re-render).
- jQuery ($) est utilisé pour la manipulation DOM dans wireTab.
- Cohabitation avec ashara-bestiary : Relations expose AshCharacterSheet via
  CONFIG.asharaSheets.relations pendant son init. Bestiary lit cette référence
  dans son hook "setup" pour hériter directement de la bonne classe, sans
  détection fragile.


================================================================================
                        ASHARA - RELATIONS — MISES À JOUR
================================================================================

v1.5.6 | 2026-07-13
   relations.js  — Fix détection WestMarch multi-persos : logique inversée,
                  on cherche le token du joueur présent sur la scène en
                  premier (isOwner + isInPJFolder), puis on en déduit
                  l'acteur. Évite le faux-positif de game.actors.find()
                  qui retournait un perso arbitraire sans token sur scène.
   module.json   — Version 1.5.5 → 1.5.6

v1.5.5 | 2026-07-13
   relations.js  — Boutons Révéler/Masquer réécrits en DOM pur, même pattern
                  que le sablier TM. renderApplicationV2 + querySelector
                  remplace renderActorSheetV2 + jQuery (plus fiable en v13).
                  Icônes fa-eye / fa-eye-slash en header-control natif Foundry.
   module.json   — Version 1.5.4 → 1.5.5

v1.5.4 | 2026-07-13
   relations.js  — Hook createToken ajouté (debounce 300ms) : sightRefresh
                  ne tire pas sur les scènes sans vision active. createToken
                  garantit la détection même sans vision.
   module.json   — Version 1.5.3 → 1.5.4

v1.5.3 | 2026-07-12
   relations.js  — revealed conditionnel : les nouvelles entrées démarrent
                  revealed:true si le setting "anonymization" est désactivé,
                  revealed:false uniquement si le GM a activé l'anonymisation.
                  Les boutons Révéler/Masquer restent fonctionnels dans les
                  deux cas.
   module.json   — Version 1.5.2 → 1.5.3

v1.5.2 | 2026-07-12
   relations.js  — Fix détection automatique : suppression du filtre t.visible.
                  Tous les tokens des dossiers "PJ" et "PNJ" présents sur la
                  scène sont désormais détectés, indépendamment de la ligne de
                  vue ou du brouillard de guerre. Les GMs ne déclenchent
                  toujours pas le scan (guard inchangé).
   module.json   — Version 1.5.1 → 1.5.2

v1.5.1 | 2026-07-12
   relations.js  — Anonymat partiel : le portrait reste toujours visible sur
                  la ligne (pour différencier visuellement les inconnus), seul
                  le nom passe en "Inconnu". Clic portrait réactivé même pour
                  les entrées non révélées.
   module.json   — Version 1.5.0 → 1.5.1

v1.5.0 | 2026-07-12
   relations.js  — Fix hook injection boutons : renderActorSheet ne fire pas
                  sur les sheets ApplicationV2 de Foundry v13. Remplacement
                  par renderActorSheetV2 (commun à NPCActorSheet et
                  CharacterActorSheet). Fix app.actor → app.document (API
                  ApplicationV2). Boutons passés de <a> à <button type=button>
                  pour conformité ApplicationV2.
   module.json   — Version 1.4.9 → 1.5.0

v1.4.9 | 2026-07-12
   settings.js   — Nouveau paramètre "Activer l'anonymisation" (world, GM only) :
                  active/désactive les boutons Révéler/Masquer sur les fiches
                  acteurs. Désactiver ce paramètre supprime les boutons sans
                  affecter les données revealed existantes.
   relations.js  — Guard game.settings.get(MODULE, "anonymization") dans le
                  hook renderActorSheet.
   module.json   — Version 1.4.8 → 1.4.9

v1.4.8 | 2026-07-12
   relations.js  — Système d'anonymisation : boutons "Révéler" et "Masquer"
                  injectés dans l'en-tête de chaque fiche acteur (GM only).
                  Agissent sur les PJs de la scène active qui ont déjà cet
                  acteur dans leurs relations. Nouvelles entrées créées avec
                  revealed: false (affiché "Inconnu" jusqu'à révélation).
                  Entrées existantes (champ absent) traitées comme revealed:true
                  (pas de régression). Clic sur portrait bloqué si non révélé.
                  Communication inter-modules via hooks ashara:revealToParty /
                  ashara:anonymize (Bestiaire écoute aussi ces hooks).
   module.json   — Version 1.4.7 → 1.4.8

v1.4.7 | 2026-07-12
   relations.js  — Clic sur une ligne ouvre le portrait de l'acteur via
                  ImagePopout. Les boutons (niveau, toggle notes, supprimer)
                  et les inputs sont exclus du déclenchement.
   relations.css — cursor: pointer sur .rel-header.
   module.json   — Version 1.4.6 → 1.4.7

v1.4.6 | 2026-07-12
   relations.js  — Suppression hooks createToken et updateToken : sightRefresh
                  tire toujours après eux et travaille sur un t.visible déjà à
                  jour. Seuls canvasReady + sightRefresh (debounce 500ms) sont
                  conservés, ce qui évite les fausses détections dues aux timings.
   module.json   — Version 1.4.5 → 1.4.6

v1.4.5 | 2026-07-12
   relations.js  — Refonte de la détection automatique : scan désormais côté
                  joueur (plus côté GM). Utilise t.visible qui reflète la vision
                  réelle du client (LOS, fog of war, portée). Un joueur ne détecte
                  que les tokens qu'il voit réellement sur son écran (dossiers
                  "PJ" et "PNJ"). Ajout hook sightRefresh (debounce 500ms).
   module.json   — Version 1.4.4 → 1.4.5

v1.4.4 | 2026-07-11
   relations.js  — Section PNJ et picker recentrés sur le dossier "PNJ" (existant).
                  availableActors filtre désormais par dossier "PJ" ou "PNJ" (plus
                  par type d'acteur). Auto-détection : tokens du dossier "PNJ"
                  visibles sur la scène (remplace l'ancienne logique "hors PJ/Creatures").
                  Ajout helper isInPNJFolder.
   module.json   — Version 1.4.3 → 1.4.4

v1.4.3 | 2026-07-11
   relations.css — Refonte complète du CSS pour correspondre visuellement au
                  bestiaire : lignes border-bottom uniquement (suppression des
                  cartes arrondies), avatar carré (border-radius 4px), boutons
                  toujours visibles, notes avec indent 50px, textarea identique,
                  suppression de tous les !important sur .rel-add-btn (les styles
                  inline de buildTabHtml prennent le dessus). Sélection picker
                  en rose (#e91e8c) pour cohérence avec l'icône Relations.
   module.json   — Version 1.4.2 → 1.4.3

v1.4.2 | 2026-07-11
   relations.js  — Fix détection tokens cachés : t.hidden est undefined sur les
                  placeables canvas en Foundry v13. Remplacement par
                  t.document?.hidden dans scanVisibleTokens (visibleChars + visibleNpcs).
                  Les tokens en "Toggle Visibility State" sont désormais correctement
                  exclus de la détection automatique.
   module.json   — Version 1.4.1 → 1.4.2

v1.4.1 | 2026-07-11
   relations.js  — Détection automatique : les tokens NPC visibles sur la scène,
                  hors dossiers "PJ" et "Creatures", sont désormais ajoutés
                  automatiquement aux relations de chaque PJ présent (section PNJ).
                  Même déclencheur que les PJ : canvasReady, createToken, updateToken.
   module.json   — Version 1.4.0 → 1.4.1

v1.4.0 | 2026-07-11
   settings.js   — Ajout bandeau d'information en haut de la page de paramètres
                  (version, description, auteur, mention propriétaire Ashara).
                  Même style que WestMarch Système.
   module.json   — Version 1.3.9 → 1.4.0

v1.3.9 | 2026-07-11
   relations.css — Barre de recherche : suppression des overrides !important
                  (style plat dnd5e) au profit des styles inline déjà présents
                  dans buildTabHtml, identiques à ceux du bestiaire (fond arrondi
                  sombre, bordure subtile). Seuls le reset navigateur et le hover
                  du bouton clear sont conservés en CSS.
   module.json   — Version 1.3.8 → 1.3.9

v1.3.8 | 2026-07-11
   relations.js  — Fix nom du dossier : "Créatures" → "Creatures" (sans accent)
                  pour correspondre au nom réel du dossier Foundry. Corrige
                  l'exclusion des créatures de la section PNJ et du picker.
   module.json   — Version 1.3.7 → 1.3.8

v1.3.7 | 2026-07-11
   relations.js  — Section PNJ et picker d'ajout : inclut désormais les acteurs
                  de type "npc" (en plus des "character") qui ne sont pas dans
                  les dossiers "PJ" ou "Créatures". La section Joueurs reste
                  limitée aux "character" dans le dossier "PJ".
   module.json   — Version 1.3.6 → 1.3.7

v1.3.6 | 2026-07-11
   character-sheet.js — Fix onglet Relations blanc à la réouverture : l'appel
                        à changeTab était ignoré (early-return) car Foundry avait
                        déjà enregistré l'onglet comme actif dans tabGroups avant
                        que notre section soit dans le DOM. Fix : delete
                        tabGroups.primary avant changeTab pour forcer la
                        réactivation réelle de la section.
   module.json        — Version 1.3.5 → 1.3.6

v1.3.5 | 2026-07-10
   index.js     — Expose AshCharacterSheet via CONFIG.asharaSheets.relations
                  après registerSheet, pour qu'ashara-bestiary puisse hériter
                  directement de la bonne classe sans détection instanceof.
   module.json  — Version 1.3.4 → 1.3.5

v1.3.4 | 2026-07-10
   readme.txt    — Réécriture complète : suppression des sections obsolètes
                  (badge type, cadenas secret, bouton modifier), ajout de la
                  documentation des nouvelles fonctionnalités (groupement
                  Joueurs/PNJ, barre de titre, restrictions GM, exclusion
                  dossier Créatures, helpers isInFolder).
   module.json   — Version 1.3.3 → 1.3.4

v1.3.3 | 2026-07-10
   relations.js  — Section PNJ : désormais exclut les acteurs du dossier
                  "Créatures" (et ses sous-dossiers) en plus du dossier "PJ".
                  Seuls les acteurs hors des deux dossiers "PJ" et "Créatures"
                  apparaissent en PNJ.
                  Le bouton "Ajouter" (et le lien dans l'état vide) est
                  désormais réservé au GM. Les joueurs propriétaires conservent
                  uniquement le bouton supprimer.
                  Refacto : isInPJFolder et nouveau isInCreaturesFolder sont
                  maintenant des alias d'une fonction générique isInFolder.
   module.json   — Version 1.3.2 → 1.3.3

v1.3.2 | 2026-07-10
   relations.js  — Tous les styles critiques de mise en page (titre, barre de
                  recherche, en-têtes de section) sont désormais injectés en
                  inline dans buildTabHtml, contournant définitivement le cache
                  CSS de Foundry. La section "♥ Relations" et le bouton Ajouter
                  s'affichent maintenant correctement dès le premier chargement
                  sans nécessiter de Ctrl+Shift+R.
   module.json   — Version 1.3.1 → 1.3.2

v1.3.1 | 2026-07-10
   relations.js  — Retour du titre "♥ Relations" en haut de l'onglet
                  (.rel-title-bar) avec le bouton Ajouter à droite.
                  Groupement des relations en deux sections : "Joueurs"
                  (acteurs dans le dossier PJ et ses sous-dossiers) et
                  "PNJ" (tous les autres). Les sections n'apparaissent
                  que si elles contiennent au moins une relation. Joueurs
                  toujours affichés en premier.
   relations.css — Ajout styles .rel-title-bar, .rel-title,
                  .rel-section-hdr, .rel-section-count.
   Version       — 1.3.0 → 1.3.1

v1.3.0 | 2026-07-10
   relations.js  — Styles de la barre de recherche passés en inline
                  directement dans le HTML généré (contournement du
                  cache CSS de Foundry qui empêchait les modifications
                  du fichier .css de prendre effet sans Ctrl+Shift+R).
                  Changement type="search" → type="text" pour éviter
                  le fond blanc natif des navigateurs sur les inputs
                  de recherche.
   Version       — 1.2.9 → 1.3.0

v1.2.9 | 2026-07-10
   relations.css — Tentative de fix spécificité CSS : préfixe .rel-tab
                  sur tous les sélecteurs de la barre de recherche,
                  ajout de !important sur les propriétés critiques
                  (background, border, box-shadow, appearance) pour
                  battre les règles de dnd5e et Foundry. Contourné
                  définitivement en 1.3.0 via inline styles.
   Version       — 1.2.8 → 1.2.9

v1.2.8 | 2026-07-10
   relations.js  — Fix bouton × de la barre de recherche : le wrapper
                  <label> relayait le clic vers l'input, déclenchant des
                  comportements inattendus dans dnd5e (contenu de l'onglet
                  qui disparaît). Remplacé par un <div>. Ajout de
                  stopPropagation sur le handler du bouton clear.
   Version       — 1.2.7 → 1.2.8

v1.2.7 | 2026-07-10
   relations.css — Refonte barre de recherche pour correspondre au style
                  natif dnd5e : fond transparent, séparateur border-bottom,
                  bouton Ajouter en texte gris sans boîte bleue.
   Version       — 1.2.6 → 1.2.7

v1.2.6 | 2026-07-10
   character-sheet.js — Fix onglet Relations vide à l'ouverture : quand la
                       fiche se rouvre sur l'onglet Relations, dnd5e appelait
                       changeTab avant que notre part soit dans le DOM. Fix :
                       override _onRender qui rappelle changeTab("relations")
                       après que toutes les parts sont insérées.
   relations.css      — Fix hauteur .rel-tab : height:100% → flex:1 +
                       min-height:0.
   Version            — 1.2.5 → 1.2.6

v1.2.5 | 2026-07-10
   relations.js  — Ajout barre de recherche en haut de l'onglet. Filtrage
                  en temps réel par nom. Message "Aucune relation trouvée."
                  si aucun résultat. Bouton clear (×) pour effacer.
   relations.css — Styles .rel-search-bar, .rel-search-wrap,
                  .rel-search-input, .rel-search-clear.
   Version       — 1.2.4 → 1.2.5

v1.2.4 | 2026-07-10
   relations.js  — Fix isInPJFolder : remonte l'arbre des dossiers via
                  folder.folder (gère les sous-dossiers à n'importe quelle
                  profondeur).
   Version       — 1.2.3 → 1.2.4

v1.2.3 | 2026-07-10
   templates/         — Fix : ajout du wrapper <section class="tab"
                       data-group="primary" data-tab="relations"> dans
                       character-relations.hbs.
   character-sheet.js — Simplification _attachPartListeners.
   Version            — 1.2.2 → 1.2.3

v1.2.2 | 2026-07-10
   character-sheet.js — Ajout group:"primary" dans TABS.
   relations.js       — Suppression des champs "Type de relation" et "Secret
                       (GM uniquement)". La relation stocke désormais :
                       targetId, targetName, targetImg, level, note,
                       lastPosition.
   Version            — 1.2.1 → 1.2.2

v1.2.1 | 2026-07-10
   relations.js  — Fix ordre des icônes de niveau (sort() explicite par
                  parseInt). Suppression du badge .rel-type sur les lignes.
   Version       — 1.2.0 → 1.2.1

v1.2.0 | 2026-07-10
   character-sheet.js — Nouveau fichier. AshCharacterSheet étend
                       CharacterActorSheet via static PARTS / static TABS.
   templates/         — Nouveau dossier. character-relations.hbs.
   index.js           — Actors.registerSheet pour fiche par défaut.
   module.json        — Ajout "templates" + version 1.2.0.
   relations.js       — Suppression injectTab() et hooks renderApplicationV2.
                       Export MODULE, buildTabHtml, buildRowHtml,
                       emptyStateHtml, wireTab.
   Version            — 1.1.0 → 1.2.0

v1.1.0 | 2026-07-10
   relations.js  — Refonte CRUD : actor.update({render:false}). DOM géré
                  manuellement (add/delete/level/note sans re-render).
                  Extraction buildRowHtml() et emptyStateHtml().
                  relAdd retourne l'objet relation créé.
   Version       — 1.0.9 → 1.1.0

v1.0.9 | 2026-07-10
   relations.js  — Ajout label du niveau actuel à gauche des icônes
                  (.rel-level-label), mise à jour optimiste incluse.
   relations.css — Style .rel-level-label.
   Version       — 1.0.8 → 1.0.9

v1.0.8 | 2026-07-10
   relations.js  — Sélecteur de niveau inline (7 icônes -3→+3) remplace
                  le bouton ✏ Modifier. Clic → relUpdate + DOM optimiste.
   relations.css — Styles .rel-level-selector et .rel-level-btn.
   Version       — 1.0.7 → 1.0.8

v1.0.7 | 2026-07-10
   relations.js  — Fix suppression/re-render et mémorisation de l'onglet
                  actif entre fermetures/réouvertures.
   Version       — 1.0.6 → 1.0.7

v1.0.6 | 2026-07-10
   relations.js  — Fix onglets vides après retour depuis Relations.
   Version       — 1.0.5 → 1.0.6

v1.0.5 | 2026-07-10
   relations.js  — Fix double-panneau à la réouverture (hook closeApplicationV2).
   Version       — 1.0.4 → 1.0.5

v1.0.4 | 2026-07-10
   relations.js  — Fix affichage onglet : gestion explicite display inline.
   Version       — 1.0.3 → 1.0.4

v1.0.3 | 2026-07-10
   relations.js  — Fix icône onglet. Refonte HTML onglet (header + état vide).
   relations.css — Refonte complète des styles.
   Version       — 1.0.2 → 1.0.3

v1.0.2 | 2026-07-10
   relations.js  — Fix acteur : app.actor ?? app.document ?? app.object.
   Version       — 1.0.1 → 1.0.2

v1.0.1 | 2026-07-10
   relations.js  — Fix hook : ajout renderApplicationV2 pour dnd5e v3.
   Version       — 1.0.0 → 1.0.1

v1.0.0 | 2026-07-10
   Version initiale du module.
   relations.js  — CRUD flags, onglet fiche acteur, picker Joueurs/PNJ,
                  dialog ajout/modification, suppression avec confirmation,
                  notes dépliables, auto-save, détection automatique.
   relations.css — Styles complets.
   settings.js   — Paramètre "enabled".
   module.json   — Manifeste du module standalone.
