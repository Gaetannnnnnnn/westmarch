================================================================================
                        WESTMARCH SYSTÈME — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 1.1.10
                              Compatibilité : Foundry VTT v13
================================================================================

DESCRIPTION
-----------
WestMarch Système est un module Foundry VTT conçu pour les campagnes de type
West March, où plusieurs GM gèrent chacun leur propre groupe de joueurs de
manière indépendante. Il introduit un système de "parties" (groupes) permettant
d'organiser les joueurs, de les téléporter ensemble et de filtrer les
interactions en fonction de leur appartenance à un groupe.


--------------------------------------------------------------------------------
STRUCTURE DES FICHIERS
--------------------------------------------------------------------------------

westmarch/
├── README.txt              Ce fichier, regroupant toutes les informations utiles à la compréhension du module ainsi que les mises à jour apportées
├── module.json             Manifeste du module (id, version, compatibilité)
├── index.js                Point d'entrée — initialise tous les hooks
├── modules/
│   ├── anticheat.js        Avertit les GM en privé des modifs suspectes (sorts/attunement/équipement) en combat
│   ├── chat.js             Gestion du chat filtré par party et webhook Discord
│   ├── document.js         Amélioration de la fenêtre de propriété des documents
│   ├── image.js            Bouton "Show Party" sur les popouts d'image
│   ├── journal.js          Menu contextuel sur les liens de scène dans les journaux
│   ├── party.js            Masquage des stats des autres membres sur la fiche de groupe
│   ├── player.js           Liste des joueurs, menu contextuel et gestion des parties
│   ├── scenes.js           Téléportation de groupe depuis le répertoire de scènes
│   ├── session.js          Journal de session : capture XP, ennemis, PNJ, objets et génère un rapport
│   ├── settings.js         Enregistrement des paramètres configurables du module
│   ├── token.js            Changement d'apparence des tokens
│   └── xp.js               Blocage de la modification de l'XP et masquage du bouton Level Up
└── styles/
    ├── chat.css            Styles du chat
    └── character.css       Styles des fiches personnage


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

5. FICHE DE GROUPE MASQUÉE (party.js)
   --------------------------------------
   Sur la fiche d'acteur de groupe, les joueurs ne voient que leurs propres
   statistiques (HP, Hit Dice, monnaie). Les statistiques des autres membres
   leur sont masquées.

6. BLOCAGE DE L'XP ET DU LEVEL UP (xp.js)
   ------------------------------------------
   Les joueurs ne peuvent pas modifier leur XP manuellement ni utiliser le bouton
   Level Up sur leur fiche personnage. Les GM conservent un accès complet.
   - Champ XP désactivé en édition
   - Bouton Level Up masqué
   - Tentative de modification bloquée avec message d'avertissement

7. CHANGEMENT D'APPARENCE DES TOKENS (token.js)
   -----------------------------------------------
   Les GM peuvent configurer plusieurs images sur un token via sa configuration
   (onglet Apparence → section WestMarch). Les joueurs peuvent cycler entre les
   images via un bouton ▶ dans le HUD du token (uniquement sur leur propre token).
   - GM : ajouter/supprimer des images via FilePicker dans la config du token
   - Joueurs : bouton ▶ dans le HUD pour passer à l'image suivante

8. PARAMÈTRES CONFIGURABLES (settings.js)
   ------------------------------------------
   Toutes les fonctionnalités du module sont activables/désactivables par les GM
   via : Paramètres du jeu → Configuration des modules → WestMarch Système.
   Chaque paramètre dispose d'une description au survol de la souris.

   Paramètres indépendants :
   - Blocage de l'XP et du Level Up
   - Masquage des stats sur la fiche de groupe
   - Changement d'apparence des tokens
   - Webhook Discord
   - Anti-Cheat (combat)

   Paramètre maître :
   - Système de Party (enableParty) — affiche un symbole ⚠️ avec une infobulle
     listant les 7 sous-options ci-dessous. S'il est désactivé, ces sous-options
     sont automatiquement inactives même si elles sont cochées. Dans le menu,
     elles apparaissent indentées et reliées visuellement juste après lui.

   Sous-options dépendantes du Système de Party :
   - Join Scene
   - Show Party (partage d'image)
   - Regroupement visuel des joueurs par party
   - Go With Party (répertoire de scènes)
   - Go With Party (liens de journaux)
   - Filtrage du chat par party
   - Journal de session

9. JOURNAL DE SESSION (session.js)
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

10. ANTI-CHEAT EN COMBAT (anticheat.js)
   --------------------------------------
   Pendant un combat actif (game.combat.started), si un joueur dont le
   personnage est engagé dans le combat modifie :
   - un sort préparé (coche/décoche "préparé" sur un sort en mode "prepared")
   - l'attunement d'un objet (attuned on/off)
   - l'équipement d'une arme ou armure (equipped on/off)
   ...un message d'avertissement est envoyé dans le chat, visible uniquement
   par les GM (whisper), indiquant le personnage, le joueur et l'objet/sort
   concerné. Les modifications faites par un GM ne déclenchent jamais d'alerte.

11. CHAT FILTRÉ ET WEBHOOK DISCORD (chat.js)
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

12. AMÉLIORATIONS DIVERSES
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

- La téléportation utilise game.socket.emit("pullToScene", sceneId, userId),
  fonctionnalité native de Foundry v13.

- Le menu contextuel des liens de scène dans les journaux utilise le système
  ContextMenu natif de Foundry pour éviter les conflits avec d'autres modules.

- Compatible Foundry VTT v13 minimum.

================================================================================
                        WESTMARCH SYSTÈME — MISES À JOUR
================================================================================
 
v1.1.10 | 2026-06-23
correctif