================================================================================
                     SORUTA — WESTMARCH SYSTÈME — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 1.5.0
                              Compatibilité : Foundry VTT v13
         © 2026 Soruta — Logiciel open source. Redistribution et modification
                          autorisées avec attribution.
================================================================================

DESCRIPTION
-----------
WestMarch Système est le module core pour les campagnes de type West March,
où plusieurs GM gèrent chacun leur propre groupe de joueurs de manière
indépendante. Il gère le système de parties (groupes), la téléportation,
le filtrage du chat, le journal de session et l'anti-cheat.

Ce module fait partie d'un ensemble de trois modules complémentaires :
  • westmarch          (ce fichier) — core multijoueur, open source
  • toolkit            — features génériques (tokens, transformations, MEJ...)
  • westmarch-ashara   — personnalisations serveur Ashara (temps morts, logs...)


--------------------------------------------------------------------------------
STRUCTURE DES FICHIERS
--------------------------------------------------------------------------------

westmarch/
├── readme.txt              Ce fichier
├── module.json             Manifeste du module (id, version, compatibilité)
├── index.js                Point d'entrée — initialise tous les hooks
├── modules/
│   ├── anticheat.js        Avertit les GM en privé des modifs suspectes en combat
│   ├── audio.js            Coupe les sons globaux (dés, thème de combat) qui traversent les party
│   ├── chat.js             Gestion du chat filtré par party et webhook Discord par scène
│   ├── combat.js           Combat lié à la party (détaché de la scène, visible par party uniquement)
│   ├── document.js         Amélioration de la fenêtre de propriété des documents
│   ├── image.js            Bouton "Show Party" sur les popouts d'image
│   ├── journal.js          Menu contextuel sur les liens de scène dans les journaux
│   ├── player.js           Liste des joueurs, menu contextuel et gestion des parties
│   ├── scenes.js           Téléportation de groupe depuis le répertoire de scènes
│   ├── session.js          Journal de session : capture XP, ennemis, PNJ, objets et génère un rapport
│   ├── settings.js         Enregistrement des paramètres configurables du module
│   └── socket.js           Canal socket dédié, pour téléporter un utilisateur précis vers une scène
└── styles/
    └── chat.css            Styles du chat et de la liste des joueurs


--------------------------------------------------------------------------------
DÉTAIL DES FICHIERS (modules/)
--------------------------------------------------------------------------------

anticheat.js
   Pendant un combat actif, surveille les changements faits par un joueur sur
   un personnage engagé dans ce combat : sort préparé/dé-préparé, objet
   attuné/désattuné, arme/armure équipée/déséquipée, utilisations d'une
   feature regagnées ou maximum modifié, emplacements de sort regagnés ou
   maximum modifié. À chaque détection, envoie un message privé (whisper) au
   GM de la party concernée. Les actions des GM ne déclenchent jamais d'alerte.

audio.js
   Empêche certains sons globaux de traverser les party : le son de jet
   de dés (ChatMessage.sound) et le son du thème de combat (réglage
   client "core.combatTheme") sont normalement diffusés par Foundry à
   TOUTE la table dès qu'un message de chat avec un jet est créé, ou
   qu'un combat démarre/change de tour — sans aucune notion de party,
   et indépendamment du masquage visuel déjà fait par chat.js/combat.js
   (qui n'agit qu'au RENDU, alors que le son est déjà joué avant). On
   intercepte directement le point d'entrée Foundry par lequel passe
   tout son diffusé à plusieurs clients (foundry.audio.AudioHelper.play)
   ; chat.js et combat.js y enregistrent chacun leur propre condition
   (l'auteur du message / le combat concerné est-il de notre party ?).

chat.js
   Filtre l'affichage du chat par party (un joueur ne voit que les messages
   de sa propre party dans les onglets IC/OOC/Other ; les GM voient tout).
   Gère aussi le webhook Discord "par scène" : relaie chaque message IC vers
   le salon Discord configuré sur la scène active (conversion HTML → markdown
   via Turndown), avec le nom et l'avatar du personnage qui parle.

document.js
   Limite la hauteur de la fenêtre de gestion des permissions/propriété d'un
   document (journal, acteur...) à 70% de l'écran, avec scroll si le contenu
   dépasse.

image.js
   Ajoute un bouton "Show Party" dans la barre de titre des fenêtres d'image
   (popout), visible par le GM uniquement. Partage l'image affichée à tous
   les membres de la party du GM en un clic.

journal.js
   Ajoute un menu contextuel (clic droit) sur les liens de scène à l'intérieur
   des journaux, avec les options "Go Alone" (se téléporter seul) et "Go With
   Party" (téléporter toute la party).

player.js
   Cœur du système de party : ajoute le scroll et un bouton refresh sur la
   liste des joueurs, regroupe visuellement les membres d'une même party
   (séparateurs colorés), et ajoute le menu contextuel (clic droit sur un
   joueur) avec Create Party, Create Party with Log, Join Party, Leave Party,
   Kick Party, Invite Party et Join Scene. La party est stockée comme un flag
   "partyId" sur chaque utilisateur (l'id du GM chef).

scenes.js
   Ajoute l'option "Go With Party" au menu contextuel du répertoire de scènes
   (et de l'entrée de scène elle-même) : téléporte tous les membres de la
   party du GM vers la scène sélectionnée.

session.js
   Gère le journal de session : affiche le bouton "Clore la session" sous la
   liste des joueurs quand une party a été créée avec "Create Party with
   Log", capture en continu l'XP des joueurs, les ennemis rencontrés en
   combat, les PNJ présents sur la scène et les objets obtenus, puis génère
   à la clôture un journal Foundry dans MJ/<nom du GM>/Rapport de session/.

settings.js
   Enregistre les paramètres core du module (Paramètres du jeu → Configuration
   des modules → WestMarch Système), gère la cascade visuelle/fonctionnelle
   des sous-options dépendantes du système de Party.

socket.js
   Canal socket dédié au module, utilisé pour cibler un utilisateur précis :
   téléporter quelqu'un vers une scène (pullUserToScene, remplace le socket
   natif "pullToScene" devenu peu fiable en v13). Utilise le système de
   queries Foundry v13 (CONFIG.queries / User#query).


--------------------------------------------------------------------------------
FONCTIONNALITÉS
--------------------------------------------------------------------------------

1. SYSTÈME DE PARTIES (player.js)
   ---------------------------------
   Chaque GM peut créer une "party" dont il devient le chef. Les joueurs peuvent
   rejoindre, quitter ou être invités dans une party. La gestion se fait via un
   clic droit sur un joueur dans la liste des joueurs.

   Tout le système est conditionné par le setting maître "Système de Party"
   (enableParty). S'il est désactivé, le GM ne peut plus créer/gérer de party,
   et toutes les options qui en dépendent sont automatiquement désactivées
   (voir section "PARAMÈTRES CONFIGURABLES").

   Options disponibles au clic droit :
   - Create Party                : Le GM crée sa propre party (GM uniquement, sur soi-même)
   - Create Party with Log       : Identique à Create Party, en démarrant aussi le Journal de session
   - Join Party                  : Rejoindre la party d'un GM
   - Leave Party                 : Quitter sa party (dissout la party si c'est le GM chef)
   - Kick Party                  : Expulser un joueur de la party (GM uniquement)
   - Invite Party                : Inviter un joueur dans sa party (GM uniquement)
   - Join Scene                  : Se téléporter vers la scène d'un membre de sa party

   La liste des joueurs est également réorganisée visuellement : les membres
   d'une même party sont regroupés ensemble, séparés par des lignes colorées.
   Un bouton refresh est aussi ajouté pour forcer le rechargement de la liste.

2. TÉLÉPORTATION DE GROUPE (scenes.js)
   --------------------------------------
   Depuis le répertoire de scènes, un clic droit sur une scène propose l'option
   "Go With Party" qui téléporte tous les membres de la party du GM vers cette
   scène simultanément.

3. LIENS DE SCÈNE DANS LES JOURNAUX (journal.js)
   -------------------------------------------------
   Un clic droit sur un lien de scène dans un journal affiche un menu contextuel
   avec deux options :
   - Go Alone       : Se téléporter seul vers la scène
   - Go With Party  : Téléporter toute la party vers la scène

4. PARTAGE D'IMAGE VERS LA PARTY (image.js)
   --------------------------------------------
   Un bouton "Show Party" est ajouté dans la barre de titre des fenêtres d'image
   (GM uniquement). Il permet de partager l'image directement à tous les membres
   de sa party sans sélection manuelle.

5. PARAMÈTRES CONFIGURABLES (settings.js)
   ------------------------------------------
   Via : Paramètres du jeu → Configuration des modules → WestMarch Système.

   Paramètres indépendants :
   - Webhook Discord (chat IC, par scène)
   - Anti-Cheat (combat)

   Paramètre maître :
   - Système de Party (enableParty) — affiche un symbole ⚠️. S'il est désactivé,
     les sous-options sont automatiquement inactives même si elles sont cochées.

   Sous-options dépendantes du Système de Party :
   - Join Scene
   - Show Party (partage d'image)
   - Regroupement visuel des joueurs par party
   - Go With Party (répertoire de scènes)
   - Go With Party (liens de journaux)
   - Filtrage du chat par party
   - Journal de session
   - Combat lié à la party

6. JOURNAL DE SESSION (session.js)
   --------------------------------------
   Un bouton "Clore la session" apparaît sous la liste des joueurs (GM
   uniquement) lorsqu'une party créée avec "Create Party with Log" est active.
   Pendant la session, le module capture automatiquement :
   - L'XP de chaque joueur de la party (avant/après, détection de level up)
   - Les ennemis affrontés (via le combat tracker) : CR, HP, CA, actions et
     résistances légendaires
   - Les PNJ présents sur la scène en fin de session
   - Les objets d'inventaire ajoutés aux joueurs de la party
   À la clôture, un journal est généré dans MJ/<nom du GM>/Rapport de session/
   avec la date du jour, puis la party est automatiquement dissoute.

7. ANTI-CHEAT EN COMBAT (anticheat.js)
   --------------------------------------
   Pendant un combat actif (game.combat.started), si un joueur dont le
   personnage est engagé dans le combat modifie :
   - un sort préparé (coche/décoche "préparé" sur un sort en mode "prepared")
   - l'attunement d'un objet (attuned on/off)
   - l'équipement d'une arme ou armure (equipped on/off)
   ...un message d'avertissement est envoyé dans le chat, visible uniquement
   par les GM (whisper), indiquant le personnage, le joueur et l'objet/sort
   concerné. Les modifications faites par un GM ne déclenchent jamais d'alerte.

8. CHAT FILTRÉ ET WEBHOOK DISCORD (chat.js)
   --------------------------------------------
   Filtrage du chat par party :
   - Le chat est divisé en 3 onglets : IC, OOC, Other (rôleplay, hors-jeu, autres
     types de messages)
   - Un joueur ne voit, dans chaque onglet, que les messages envoyés par les
     membres de sa propre party (les siens compris)
   - Sans party assignée, tous les messages sont visibles
   - Les GM voient toujours tous les messages, quelle que soit leur party

   Webhook Discord par scène :
   - Chaque scène peut avoir son propre webhook Discord, configuré indépendamment
     des autres scènes
   - Configuration : clic droit sur une scène dans le répertoire → Configurer la
     scène → champ "WebHook" (ajouté par le module) → coller l'URL du webhook
     Discord (créée côté Discord via Paramètres du salon → Intégrations →
     Webhooks)
   - Tant que ce champ est rempli et que le setting "Webhook Discord" est actif,
     tout message envoyé en IC pendant que cette scène est active est relayé
     vers le salon Discord correspondant, avec le nom et l'avatar du personnage
     qui parle (le HTML du message est converti en markdown)
   - Comme c'est rattaché à la scène et non à la table entière, chaque lieu/arc
     de la campagne peut être relayé vers un salon Discord différent (ou aucun)

9. AMÉLIORATIONS DIVERSES
   -------------------------
   - Scroll sur la liste des joueurs (player.js), quand il y a beaucoup de joueurs connectés, la liste devient scrollable au lieu de déborder hors de l'écran
   - Scroll sur les fenêtres de propriété (document.js), quand tu ouvres la fenêtre de permissions/propriété d'un document (journal, acteur...), elle est limitée à 70% de la hauteur de l'écran avec un scroll si le contenu dépasse


--------------------------------------------------------------------------------
INSTALLATION & CONFIGURATION
--------------------------------------------------------------------------------

── COMMANDES LINUX DE BASE ─────────────────────────────────────────────────────

  Navigation dans les dossiers :
    pwd                          Afficher le dossier courant
    ls                           Lister les fichiers du dossier courant
    ls /foundrydata/Data/modules Lister les modules installés
    cd /foundrydata/Data/modules Se déplacer dans le dossier modules
    cd ..                        Remonter d'un niveau
    cd ~                         Retourner à la racine utilisateur

  Gestion des fichiers :
    cp -r source/ destination/   Copier un dossier et son contenu
    mv source/ destination/      Déplacer ou renommer un dossier
    rm -rf dossier/              Supprimer un dossier (IRRÉVERSIBLE)
    cat fichier.txt              Afficher le contenu d'un fichier

── COMMANDES FOUNDRYVTT (systemctl) ────────────────────────────────────────────

  sudo systemctl status foundryvtt    Voir l'état du serveur (actif/inactif)
  sudo systemctl start foundryvtt     Démarrer le serveur
  sudo systemctl stop foundryvtt      Arrêter le serveur
  sudo systemctl restart foundryvtt   Redémarrer le serveur

  Voir les logs en temps réel :
  sudo journalctl -u foundryvtt -f

  Voir les 50 dernières lignes de logs :
  sudo journalctl -u foundryvtt -n 50

── INSTALLATION DU MODULE ───────────────────────────────────────────────────────

1. Se connecter au serveur et se placer dans le dossier modules :
   cd /foundrydata/Data/modules

2. Copier le dossier westmarch dans modules :
   cp -r /chemin/vers/westmarch /foundrydata/Data/modules/westmarch

   IMPORTANT : Le nom du dossier doit être exactement "westmarch" pour
   correspondre à l'id défini dans module.json.

3. Redémarrer le serveur Foundry :
   sudo systemctl restart foundryvtt

4. Vérifier que le serveur est bien reparti :
   sudo systemctl status foundryvtt

5. Activer le module dans Foundry :
   Setup → Gérer les modules → Activer "WestMarch Système"


--------------------------------------------------------------------------------
NOTES TECHNIQUES
--------------------------------------------------------------------------------

- Le module utilise des flags Foundry sous le scope "westmarch" pour stocker
  l'identifiant de party (partyId) sur chaque utilisateur.

- La téléportation utilise le système de queries Foundry v13 (socket.js) plutôt
  que le socket natif "pullToScene" : ce dernier ne filtre plus par userId en
  v13. Un déplacement vers soi-même n'utilise aucun socket (scene.view()).

- Le menu contextuel des liens de scène dans les journaux utilise le système
  ContextMenu natif de Foundry pour éviter les conflits avec d'autres modules.

- Les flags du module sont stockés sous le scope "westmarch" (partyId sur
  les utilisateurs). Les features déplacées dans toolkit et westmarch-ashara
  utilisent leur propre scope.

- Compatible Foundry VTT v13 minimum.

================================================================================
                        WESTMARCH SYSTÈME — MISES À JOUR
================================================================================

v1.5.0 | 2026-07-20
   Séparation du module monolithique en 3 modules distincts :
   • westmarch (ce module) — core multijoueur uniquement. Conserve : party,
     join scene, show party, go with party, chat filtré, webhook Discord,
     journal de session, anti-cheat, combat party, audio, document, journal,
     player, scenes, image.
   • toolkit — features génériques Foundry déplacées hors de westmarch :
     rage, goliath, polymorph, tokens, items (Artbook), tgcm, foldermove,
     mejshop, mejrestock. Scope flags/settings : "toolkit".
   • westmarch-ashara — personnalisations serveur Ashara déplacées :
     xp, caldate, discordlog, fake-warning, tm. Nouveau socket.js dédié.
     Scope flags/settings : "westmarch-ashara".
   settings.js  — Suppression de tous les settings déplacés vers toolkit
                  et westmarch-ashara. Seuls les settings core sont conservés.
   index.js     — Suppression de tous les imports déplacés.
   ⚠️ Migration : flags flags.westmarch.* pour les features déplacées ne
      seront plus lus. Reconfigurer les settings des nouveaux modules.

v2.0.6 | 2026-07-14
   tm.js         — Lien en bas de la fenêtre de déclaration joueur : message
                  discret renvoyant vers Journal → Temps Morts pour consulter
                  les règles.
   module.json   — Version 2.0.5 → 2.0.6

v2.0.5 | 2026-07-13
   tm.js         — Guide latéral dans la fenêtre de déclaration joueur :
                  panneau sombre à gauche (175px) expliquant les 4 étapes
                  (type → détails → Ajouter au TM → Déclarer le TM).
                  Actions clés mises en évidence avec leur couleur de bouton.
                  Largeur dialog 520 → 720px.
   module.json   — Version 2.0.4 → 2.0.5

v2.0.4 | 2026-07-13
   tm.js         — Vue GM : affichage "pas de jet" quand doRoll est false
                  sur les activités de gain, pour distinguer au premier coup
                  d'œil les TM avec et sans jet d20 demandé.
   module.json   — Version 2.0.3 → 2.0.4

v2.0.3 | 2026-07-10
   tm.js         — Fix lisibilité du panier TM : le conteneur à fond clair
                  (#f5f5f5) héritait la couleur blanche du thème sombre de
                  Foundry, rendant le texte invisible. Ajout de color:#222
                  explicite sur le div du panier.
   module.json   — Version 2.0.2 → 2.0.3

v2.0.2 | 2026-07-10
   relations.js  — Nouveau module : système de relations entre acteurs.
                  Stockage par flags ("relations"/"list") sur chaque acteur.
                  Onglet "Relations" injecté dans la fiche via renderApplication.
                  CRUD complet : ajouter, modifier, supprimer (avec confirmation).
                  Niveau d'affinité -3 → +3 (dots colorés rouge/vert).
                  Notes dépliables par relation, auto-save au blur (debounce 1.2s).
                  État déplié et tab actif conservés entre les re-renders.
                  GM only pour édition, lecture pour les propriétaires.
                  Setting "enableRelations" dans la configuration du module.
   relations.css — Styles dédiés à l'onglet Relations.
   module.json   — Ajout de styles/relations.css dans les feuilles de style.
   Version       — 2.0.1 → 2.0.2

v2.0.2 | 2026-07-10
   foldermove.js — Fix dossier : en v13 le callback du menu contextuel reçoit
                  le <header class="folder-header"> interne, pas le <li> parent
                  portant data-folder-id. On remonte maintenant via
                  el.closest("[data-folder-id]") pour récupérer l'ID correct.
   Version       — 2.0.1 → 2.0.2

v2.0.1 | 2026-07-10
   foldermove.js — Fix callback jQuery vs HTMLElement : le `li` passé par le
                  ContextMenu de Foundry v13 peut être un objet jQuery. On
                  résout maintenant l'élément via `li instanceof HTMLElement ?
                  li : li[0]` + fallback `$(li).attr("data-folder-id")` pour
                  les dossiers et `data-entry-id` pour les documents.
                  Ajout de try/catch + ui.notifications.error dans tous les
                  callbacks pour éviter les échecs silencieux.
   Version       — 2.0.0 → 2.0.1

v2.0.0 | 2026-07-10
   foldermove.js — Refonte de la fenêtre de sélection de dossier :
                  Arbre repliable/dépliable (clic sur ▶), barre de recherche
                  en temps réel (filtre les dossiers + remonte leurs parents),
                  focus automatique sur la recherche à l'ouverture, meilleure
                  mise en page (racine toujours visible). Cliquer sur le nom
                  d'un dossier confirme directement sans passer par un bouton.
                  Suppression de buildFolderTreeHtml (remplacé inline).
   Version       — 1.9.9 → 2.0.0

v1.9.9 | 2026-07-09
   foldermove.js — Fix hooks définitif (debug console) : les hooks v13 pour
                  les entrées de sidebar suivent le pattern get${documentName}
                  ContextOptions (getActorContextOptions, getSceneContextOptions,
                  getItemContextOptions, getJournalEntryContextOptions) et non
                  getXxxDirectoryEntryContextOptions. Les dossiers utilisent un
                  hook commun getFolderContextOptions (type filtré via folder.type).
                  Suppression du patch prototype devenu inutile.
   Version       — 1.9.8 → 1.9.9

v1.9.8 | 2026-07-09
   foldermove.js — Refonte complète : abandon des hooks (inexistants en v13
                  pour les menus d'acteurs/objets/journaux/dossiers). Patch
                  direct de _getEntryContextOptions et _getFolderContextOptions
                  sur les prototypes des 4 directories (scenes, actors, items,
                  journal) via Hooks.on("ready"). Confirme que les options
                  "Déplacer vers…" et "Dupliquer vers…" apparaissent dans le
                  clic droit des documents et des dossiers.