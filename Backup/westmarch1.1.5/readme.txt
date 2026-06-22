================================================================================
                        WESTMARCH SYSTÈME — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: Soruta)
                                       Version : 1.1.5
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
│   ├── chat.js             Gestion du chat filtré par party
│   ├── document.js         Amélioration de la fenêtre de propriété des documents
│   ├── image.js            Bouton "Show Party" sur les popouts d'image
│   ├── journal.js          Menu contextuel sur les liens de scène dans les journaux
│   ├── party.js            Masquage des stats des autres membres sur la fiche de groupe
│   ├── player.js           Liste des joueurs, menu contextuel et gestion des parties
│   ├── scenes.js           Téléportation de groupe depuis le répertoire de scènes
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

   Options disponibles au clic droit :
   - Create Party                : Le GM crée sa propre party (GM uniquement, sur soi-même)
   - Join Party                  : Rejoindre la party d'un GM
   - Leave Party                 : Quitter sa party (dissout la party si c'est le GM chef)
   - Kick Party                  : Expulser un joueur de la party (GM uniquement)
   - Invite Party                : Inviter un joueur dans sa party (GM uniquement)
   - Join Scene (non activé*)     : Se téléporter vers la scène d'un membre de sa party (Ne peux juste pas rejoindre la scene des GM)

   La liste des joueurs est également réorganisée visuellement : les membres
   d'une même party sont regroupés ensemble, séparés par des lignes colorées.
   Un bouton refresh est aussi ajouté pour forcer le rechargement de la liste.

	*(non activé) : Vous pouvez décomenter la fonction dans le fichier player.js, en retirant "/*" et "*/" au
	début et à la fin de la fonction.

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

7. AMÉLIORATIONS DIVERSES
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
 
v1.1.5 — 2026-06-20
  - Ajout de xp.js
    → Blocage de la modification de l'XP pour les joueurs
    → Masquage du bouton Level Up pour les joueurs
    → Champ XP désactivé en édition pour les joueurs
    → GM non affectés

  - Ajout de la date de la derniere version du module dans le fichier "module.json"
    → Comme ceci : "changelog": "2026-06-20",

  - Ajout d'un fichier readme.txt pour l'explication du module "westmarch"
    → Fichier dans lequel vous êtes actuellement
    → Ce fichier, regroupant toutes les informations utiles à la compréhension du module ainsi que les mises à jour apportées

  - Corretif de la fonctionnalité "Show party" pour les images
    → Ajout d'une icone lors de l'affichage d'une image permettant de la montrer à sa party uniquement

  - Ajout de la possibilité d'activer dans le code la fonction "join scene" de joueur à joueur et de GM à joueur dans une même party pour faciliter les retours des joueurs déconnecté dans les sessions. (Code commenté, à decommenter si souhait de l'ajouter. (optionnel))
    → Permet au joueurs de rejoindre la scene des joueurs de la même parti que lui
    → Permet au GM de rejoindre la même scene qu'un joueurs de sa party
    → Ne permet pas aux joueurs de rejoindre la scene d'un GM ce qui evite de join une scene que le GM était entrain de preparer pendant la session pour la suite
    → L'option n'est pas encore activer, il faut décommenter la fonction pour permettre au module de l'utiliser
   

