================================================================================
                        WESTMARCH SYSTÈME — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 1.4.1
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
│   ├── audio.js            Coupe les sons globaux (dés, thème de combat) qui traversent les party
│   ├── chat.js             Gestion du chat filtré par party et webhook Discord
│   ├── discordlog.js       Log Discord (webhook) des modifications : items, XP/niveau, monnaie, persos
│   ├── document.js         Amélioration de la fenêtre de propriété des documents
│   ├── fake-warning.js     Bouton GM (icônes de gauche) pour envoyer un faux message d'avertissement à un joueur
│   ├── image.js            Bouton "Show Party" sur les popouts d'image
│   ├── items.js            Correction de la stat par défaut des outils (tool) à la création
│   ├── journal.js          Menu contextuel sur les liens de scène dans les journaux
│   ├── mejshop.js          Correctifs boutiques Monk's Enhanced Journal (groupe + objets cachés)
│   ├── player.js           Liste des joueurs, menu contextuel et gestion des parties
│   ├── rage.js             Passage en taille Large (2x2) pendant la Rage du Barbare
│   ├── scenes.js           Téléportation de groupe depuis le répertoire de scènes
│   ├── session.js          Journal de session : capture XP, ennemis, PNJ, objets et génère un rapport
│   ├── settings.js         Enregistrement des paramètres configurables du module
│   ├── socket.js           Canal socket dédié au module, pour téléporter un utilisateur précis vers une scène
│   ├── token.js            Changement d'apparence des tokens + bouton "Voir le portrait"
│   └── xp.js               Blocage de la modification de l'XP et masquage du bouton Level Up
└── styles/
    ├── chat.css            Styles du chat
    └── character.css       Styles des fiches personnage


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

discordlog.js
   Envoie un message vers un second webhook Discord (indépendant de celui de
   chat.js) à chaque modification d'inventaire (ajout/suppression/quantité),
   changement d'XP ou de niveau, changement de monnaie, ou création/
   suppression de personnage. Indique si l'action vient d'un GM ou d'un
   joueur. Gère la déduplication (un seul envoi même avec plusieurs comptes
   connectés, et anti-doublon de contenu sur 5 secondes pour les modules
   tiers qui redéclenchent deux fois le même évènement).

document.js
   Limite la hauteur de la fenêtre de gestion des permissions/propriété d'un
   document (journal, acteur...) à 70% de l'écran, avec scroll si le contenu
   dépasse.

fake-warning.js
   Ajoute un groupe d'icônes "WestMarch" dans la barre d'outils de gauche du
   canevas (GM uniquement). Le bouton ouvre une fenêtre permettant de choisir
   un joueur connecté et un texte de message, puis envoie une fausse
   notification jaune (façon avertissement système) visible uniquement par
   ce joueur, via le canal socket du module.

image.js
   Ajoute un bouton "Show Party" dans la barre de titre des fenêtres d'image
   (popout), visible par le GM uniquement. Partage l'image affichée à tous
   les membres de la party du GM en un clic.

items.js
   Corrige automatiquement, vers la stat canonique de chaque outil selon
   le système dnd5e (lue dans CONFIG.DND5E.tools, jamais recopiée à la
   main), deux structures de données distinctes qui retombent toutes les
   deux sur "Intelligence" par défaut côté système, peu importe l'outil
   réel :
   1) l'item "tool" lui-même (system.ability), si Plutonium ne le
      renseigne pas à la création ;
   2) la proficiency d'outil sur la fiche d'un acteur (system.tools.<clé>,
      ex: PNJ/monstres importés par Plutonium sans item associé) — c'est
      cette structure qui était responsable des "Outils de forgeron" en
      Intelligence au lieu de Force, le système dnd5e initialisant
      ability: "int" sur CHAQUE entrée par défaut.
   Couvre la création ET la mise à jour d'acteur (Plutonium renseigne
   parfois les proficiencies après coup), plus un rattrapage one-shot au
   chargement du monde pour les acteurs déjà importés avant ce correctif.

journal.js
   Ajoute un menu contextuel (clic droit) sur les liens de scène à l'intérieur
   des journaux, avec les options "Go Alone" (se téléporter seul) et "Go With
   Party" (téléporter toute la party).

mejshop.js
   Deux correctifs pour les boutiques de Monk's Enhanced Journal (module
   tiers, jamais modifié directement) :
   1) Ajoute un bouton "Groupe uniquement" dans la fenêtre native "Show to
      Players" (patchée par MEJ pour ajouter le menu "Show As", mais sans
      sélection rapide par groupe) : coche en un clic uniquement les
      membres de la party du GM, au lieu de devoir décocher joueur par
      joueur dans une fenêtre qui s'affiche trop grande. Réutilise la
      même logique partyId que le bouton "Show Party" d'image.js.
   2) Corrige côté affichage joueur un bug confirmé dans le code source
      actuel de MEJ : la coche "cacher l'objet" d'une boutique écrit le
      champ "hidden" sur l'objet, mais le filtre d'affichage de MEJ teste
      un champ "hide" (jamais défini) — les objets censés être cachés
      étaient donc toujours visibles aux joueurs. Sur le client de chaque
      joueur (jamais sur celui du GM), les lignes d'objets marqués
      "hidden" sont retirées de l'affichage de la boutique.
   Géré par le setting "Correctifs boutiques Monk's Enhanced Journal"
   (enableMejShopFix), indépendant du système de Party.

player.js
   Cœur du système de party : ajoute le scroll et un bouton refresh sur la
   liste des joueurs, regroupe visuellement les membres d'une même party
   (séparateurs colorés), et ajoute le menu contextuel (clic droit sur un
   joueur) avec Create Party, Create Party with Log, Join Party, Leave Party,
   Kick Party, Invite Party et Join Scene. La party est stockée comme un flag
   "partyId" sur chaque utilisateur (l'id du GM chef).

rage.js
   Spécifique à la sous-classe Voie du Géant (feature "Giant's Havoc",
   palier 3) : dès que la rage s'active sur un acteur possédant cette
   feature, passe automatiquement tous ses tokens en taille 2x2 (Large)
   s'ils sont plus petits ; restaure la taille d'origine de chaque token
   (flag mémorisé) dès que la rage se termine. N'a aucun effet sur les
   barbares d'une autre sous-classe.
   L'effet actif "Rage" (PHB 2024) est stocké en permanence sur l'item
   lui-même (transfer effect), désactivé par défaut : activer/désactiver
   la rage ne crée/détruit pas de document, ça bascule juste son champ
   "disabled" — le module écoute donc updateActiveEffect (en plus de
   create/deleteActiveEffect, au cas où un effet maison fonctionnerait
   autrement) et remonte jusqu'à l'acteur via l'item porteur si besoin.
   GM uniquement (évite que plusieurs clients tentent la même mise à
   jour de token en même temps).

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
   Enregistre tous les paramètres configurables du module (Paramètres du jeu
   → Configuration des modules → WestMarch Système), gère la cascade
   visuelle/fonctionnelle des sous-options dépendantes du système de Party, et
   affiche le bandeau d'info (version, description, auteur, mention
   "Module propriétaire Ashara") en haut de la page de paramètres.

socket.js
   Canal socket dédié au module ("module.westmarch"), utilisé pour cibler un
   utilisateur précis : téléporter quelqu'un vers une scène (pullUserToScene,
   remplace le socket natif "pullToScene" devenu peu fiable en v13) et
   envoyer une fausse notification (sendFakeWarning, utilisé par
   fake-warning.js). Chaque client filtre les messages reçus par userId.

token.js
   Permet au GM de configurer plusieurs apparences sur un token (image de
   personnage + bordure PNG à centre transparent, fusionnées via une popup
   d'import avec cadrage, zoom et découpe circulaire ajustable). Les joueurs
   peuvent cycler entre les apparences enregistrées via un bouton dans le HUD
   de leur propre token.
   Ajoute aussi un bouton "Voir le portrait" dans le HUD de tout token
   (pas seulement le sien), qui affiche en grand l'image de la fiche du
   personnage. Patch (libWrapper) l'ouverture du HUD par clic droit pour
   qu'elle fonctionne même sur un token dont on n'est pas propriétaire
   (comportement par défaut de Foundry sinon). Pour un non-propriétaire,
   toutes les autres icônes du HUD (et les barres de vie/ressource) sont
   retirées : seul le bouton "Voir le portrait" reste visible.

xp.js
   Empêche les joueurs de modifier leur XP ou de monter de niveau (fiche
   standard, assistant d'avancement, ou modules tiers comme Plutonium — tout
   passe par une modification de l'item de classe ou de system.details.xp,
   qui est bloquée côté serveur). Désactive aussi visuellement le champ XP et
   le bouton Level Up sur la fiche, sans les masquer.


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

5. BLOCAGE DE L'XP ET DU LEVEL UP (xp.js)
   ------------------------------------------
   Les joueurs ne peuvent pas modifier leur XP manuellement ni utiliser le bouton
   Level Up sur leur fiche personnage. Les GM conservent un accès complet.
   - Champ XP désactivé en édition
   - Bouton Level Up masqué
   - Tentative de modification bloquée avec message d'avertissement

6. CHANGEMENT D'APPARENCE DES TOKENS (token.js)
   -----------------------------------------------
   Les GM peuvent configurer plusieurs images sur un token via sa configuration
   (onglet Apparence → section WestMarch). Les joueurs peuvent cycler entre les
   images via un bouton ▶ dans le HUD du token (uniquement sur leur propre token).
   - GM : ajouter/supprimer des images via une popup d'import dédiée
   - Joueurs : bouton ▶ dans le HUD pour passer à l'image suivante

   Popup d'import ("Importer un token") :
   - Sélection d'une image de personnage + d'une image de bordure (PNG avec
     centre transparent), chacune via "Parcourir" (FilePicker Foundry) ou
     "Importer (PC)" (upload direct depuis l'ordinateur)
   - Cadrage du personnage à la souris (glisser-déposer) + zoom (molette ou
     curseur), avec bouton de réinitialisation du cadrage
   - Curseur "Taille de la découpe" : ajuste le rayon du cercle de découpe
     du personnage pour qu'il corresponde exactement à l'anneau visible de
     la bordure importée (évite que le perso dépasse dans les coins si la
     bordure a un anneau plus petit que le canvas)
   - Le personnage est découpé en cercle avant fusion avec la bordure, et le
     fond reste réellement transparent dans le PNG exporté (le quadrillage
     affiché pendant l'édition n'est qu'un repère visuel CSS, jamais inclus
     dans l'export)
   - La popup est une fenêtre flottante non-modale : cliquer ailleurs (sur
     le canevas du jeu, sur la fenêtre "Parcourir", etc.) ne l'annule pas —
     seuls les boutons "Annuler" ou "Créer" la ferment

7. PARAMÈTRES CONFIGURABLES (settings.js)
   ------------------------------------------
   Toutes les fonctionnalités du module sont activables/désactivables par les GM
   via : Paramètres du jeu → Configuration des modules → WestMarch Système.
   Chaque paramètre dispose d'une description au survol de la souris.

   Paramètres indépendants :
   - Blocage de l'XP et du Level Up
   - Changement d'apparence des tokens
   - Webhook Discord (chat IC, par scène)
   - Log Discord (modifications : items, XP/niveau, monnaie, persos)
   - Anti-Cheat (combat)
   - Correctifs boutiques Monk's Enhanced Journal (groupe + objets cachés)

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

8. JOURNAL DE SESSION (session.js)
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

9. ANTI-CHEAT EN COMBAT (anticheat.js)
   --------------------------------------
   Pendant un combat actif (game.combat.started), si un joueur dont le
   personnage est engagé dans le combat modifie :
   - un sort préparé (coche/décoche "préparé" sur un sort en mode "prepared")
   - l'attunement d'un objet (attuned on/off)
   - l'équipement d'une arme ou armure (equipped on/off)
   ...un message d'avertissement est envoyé dans le chat, visible uniquement
   par les GM (whisper), indiquant le personnage, le joueur et l'objet/sort
   concerné. Les modifications faites par un GM ne déclenchent jamais d'alerte.

10. CHAT FILTRÉ ET WEBHOOK DISCORD (chat.js)
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

11. LOG DISCORD DES MODIFICATIONS (discordlog.js)
   ---------------------------------------------------
   Envoie un message dans un salon Discord (via un second webhook, distinct
   de celui du chat IC par scène) à chaque :
   - Ajout / suppression d'un objet d'inventaire, ou changement de quantité
   - Gain de niveau (classe) ou changement d'XP
   - Changement de monnaie (PP/PO/PE/PA/PC), avec le détail des deltas
   - Création / suppression d'un personnage

   Chaque message indique qui a fait l'action : "(par <nom>)" pour un GM,
   ou "⚠️ (par <nom> — joueur)" pour repérer en un coup d'œil les actions
   faites par les joueurs eux-mêmes plutôt que par un GM.

   Chaque message est précédé d'un horodatage classique entre backticks,
   au format jour/mois/année heure:minute:seconde, ex: `25/06/2026 14:23:05`.

   Un seul message est envoyé par évènement, même avec plusieurs comptes
   connectés simultanément : le GM "actif" (game.users.activeGM) est élu
   pour l'envoi ; si aucun GM n'est connecté, un joueur actif est élu à sa
   place (calcul déterministe, identique sur tous les clients) pour éviter
   que le log soit perdu quand les joueurs gèrent leur inventaire seuls. Une
   protection anti-doublon supplémentaire (5 secondes) filtre aussi les cas
   où un module tiers (ex. Monks TokenBar) redéclenche deux fois le même
   évènement réel.

   Configuration : Paramètres du jeu → Configuration des modules →
   WestMarch Système → "Log Discord (modifications)" (activer) + "URL du
   Webhook Discord (log)" (coller l'URL créée côté Discord via Paramètres
   du salon → Intégrations → Webhooks → Nouveau webhook).

12. FAUX MESSAGE DE MAINTENANCE (fake-warning.js)
   ----------------------------------------------------
   Ajoute un nouveau groupe d'icônes "WestMarch" (marteau 🔨) dans la barre
   d'outils de gauche du canevas, visible uniquement par les GM. En cliquant
   sur l'icône ⚠️ qui apparaît dans ce groupe, le GM peut :
   - Choisir un joueur connecté dans une liste déroulante
   - Modifier le texte du message (pré-rempli avec "Mise à jour effectuée —
     le problème devrait être résolu.")
   - Envoyer : le joueur ciblé (et lui seul) voit alors apparaître ce texte
     sous la forme d'une notification jaune classique de Foundry, comme si
     un vrai avertissement venait du système — pratique pour faire croire
     qu'un bug vient d'être corrigé.
   Le message est transmis via le canal socket du module (socket.js), donc
   uniquement reçu par le client du joueur visé.

13. AMÉLIORATIONS DIVERSES
   -------------------------
   - Scroll sur la liste des joueurs (player.js), quand il y a beaucoup de joueurs connectés, la liste devient scrollable au lieu de déborder hors de l'écran
   - Scroll sur les fenêtres de propriété (document.js), quand tu ouvres la fenêtre de permissions/propriété d'un document (journal, acteur...), elle est limitée à 70% de la hauteur de l'écran avec un scroll si le contenu dépasse

14. CORRECTIFS BOUTIQUES MONK'S ENHANCED JOURNAL (mejshop.js)
   -----------------------------------------------------------------
   - Bouton "Groupe uniquement" dans la fenêtre "Show to Players" (boutiques
     MEJ) : coche en un clic les membres de sa party au lieu de décocher
     joueur par joueur dans une fenêtre qui s'affiche trop grande
   - Les objets de boutique marqués "cachés" par le GM ne s'affichent plus
     aux joueurs (correction d'un bug confirmé côté MEJ, sans toucher à
     ses fichiers)
   - Géré par le setting indépendant "Correctifs boutiques Monk's Enhanced
     Journal" (enableMejShopFix)


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

- La téléportation utilise un canal socket dédié au module ("module.westmarch",
  voir socket.js) plutôt que le socket natif "pullToScene" de Foundry : ce
  dernier a changé de comportement en v13 (il ne filtre plus par userId et
  n'est jamais relayé à l'émetteur), donc on gère nous-mêmes le filtrage par
  userId côté client. Un déplacement vers soi-même n'utilise aucun socket
  (scene.view() directement).

- Le menu contextuel des liens de scène dans les journaux utilise le système
  ContextMenu natif de Foundry pour éviter les conflits avec d'autres modules.

- Compatible Foundry VTT v13 minimum.

================================================================================
                        WESTMARCH SYSTÈME — MISES À JOUR
================================================================================

v1.4.1 | 2026-06-30
nouveauté
- ajout de deux correctifs pour les boutiques de Monk's Enhanced Journal
  (mejshop.js, module tiers — aucun fichier de MEJ modifié) :
  1) bouton "Groupe uniquement" dans la fenêtre native "Show to Players" :
     coche en un clic les membres de sa party, au lieu de devoir décocher
     joueur par joueur dans une fenêtre qui s'affiche trop grande (réutilise
     la logique partyId déjà utilisée par "Show Party" dans image.js)
  2) les objets de boutique marqués "cachés" par le GM ne s'affichent plus
     aux joueurs — bug confirmé dans le code source actuel de MEJ : son
     filtre d'affichage teste un champ "hide" qui n'existe pas, au lieu du
     champ "hidden" réellement écrit par la coche "cacher l'objet" ; corrigé
     côté client joueur uniquement, sans modifier MEJ
  Géré par le nouveau setting indépendant "Correctifs boutiques Monk's
  Enhanced Journal" (enableMejShopFix)

v1.4.0 | 2026-06-25
nouveauté
- ajout du combat lié à la party plutôt qu'à la scène (combat.js) : un
  combat créé par un GM est tagué avec sa party ; chaque joueur ET chaque
  GM ne voit dans son tracker que le combat de sa propre party (message
  "Aucun combat en cours pour votre party." sinon) — sur une table à
  plusieurs GM, un GM ne voit donc plus le combat géré par un autre GM

- ajout du passage automatique en taille Large (2x2) pendant la Rage,
  spécifique à la Voie du Géant (rage.js) : dès que l'effet actif
  "Rage" apparaît sur un acteur possédant la feature "Giant's Havoc"
  (palier 3), son token passe en 2x2 s'il est plus petit ; revient à
  sa taille d'origine dès que l'effet disparaît (fin de la rage). Sans
  cette feature (autre sous-classe de barbare), aucun effet

- ajout d'un horodatage classique devant chaque message de log Discord
  (discordlog.js), au format jour/mois/année heure:minute:seconde,
  ex: `25/06/2026 14:23:05`

- ajout de la suppression des sons globaux (jet de dés, thème de
  combat) qui traversaient les party (audio.js) : Foundry diffuse ces
  sons à toute la table, indépendamment du masquage visuel déjà fait
  par chat.js/combat.js (le son est joué avant ce masquage) — on coupe
  maintenant le son lui-même quand le message ou le combat à l'origine
  n'est pas le nôtre

- ajout de la correction automatique de la stat des outils (items.js) :
  s'applique à la fois aux items "tool" sans stat définie ET aux
  proficiencies d'outil directement sur la fiche d'un acteur
  (system.tools, typiquement pour les PNJ/monstres importés par
  Plutonium sans item associé) — assigne la stat canonique de chaque
  outil précis selon le système dnd5e (ex: Outils de forgeron -> Force)
  au lieu de rester sur Intelligence (valeur de repli codée en dur côté
  système, peu importe l'outil) ; inclut un rattrapage au chargement du
  monde pour les acteurs déjà importés avant ce correctif

correctif
- combat.js : le message "Aucun combat en cours pour votre party." restait
  affiché en permanence dans l'onglet sidebar même pour un joueur dont
  c'était bien le combat de party en cours — le filtre se basait sur
  game.combat (le combat "actif" global, peu fiable puisque tous les
  combats ont scene: null) au lieu du combat réellement rendu (data.combat)
- combat.js : la caméra des joueurs hors-party n'est plus auto-déplacée
  par le pan automatique de Foundry à chaque changement de tour d'un
  combat qui n'est pas le leur (position restaurée juste après)
- combat.js : le blocage de mouvement causé par le module tiers "Monk's
  TokenBar" (qui bascule tout le monde en "Mouvement de Combat" sans
  notion de party dès qu'un combat démarre) ne bloque plus les joueurs
  hors-party — leurs tokens sont passés en mouvement libre via le flag
  propre à TokenBar tant que le combat actif n'est pas le leur
- combat.js : le popup non-fermable du tracker de combat (causé par le
  module tiers "Monk's Combat Details", qui fait apparaître le tracker
  dans une fenêtre flottante pour tout le monde dès qu'un combat démarre,
  sans notion de party) est maintenant refermé automatiquement pour les
  joueurs hors-party
- combat.js : la liste des combattants d'un combat étranger restait
  visible dans l'onglet sidebar (sous notre message "Aucun combat..."),
  parce que Foundry v13 déclenche le rendu du tracker séparément pour le
  bandeau "Round X" et pour la liste des combattants, avec un data.combat
  pas toujours cohérent entre les deux appels — on se base maintenant sur
  tracker.viewed (fiable dans tous les cas) pour vider les deux parties
- combat.js : le message "Aucun combat en cours pour votre party." restait
  coincé même pour des joueurs dont la party avait bien un combat en
  cours — tracker.viewed (utilisé pour identifier le combat de CE rendu)
  ne reflétait pas forcément le bon combat avec plusieurs combats en
  parallèle ; le filtrage se fait maintenant ligne par ligne, combattant
  par combattant (via son id propre), sans dépendre d'un pointeur global
- combat.js : un joueur hors de toute party (ou hors du combat en cours)
  pouvait se retrouver à nouveau bloqué dans ses mouvements après un
  rechargement de scène — le hook canvasReady se basait sur game.combat
  (peu fiable avec plusieurs combats en parallèle) pour décider de
  libérer ses tokens ; il recalcule maintenant en regardant tous les
  combats actifs de la table, peu importe lequel a déclenché le hook
- combat.js : un joueur hors de toute party (ou hors du combat en cours),
  présent sur la même scène, pouvait quand même se retrouver bloqué dans
  ses mouvements au moment exact où le combat démarrait — Monk's
  TokenBar efface lui-même le flag de mouvement libre de TOUS les tokens
  de la scène à cet instant précis (round 1, turn 0), sur le même hook
  "updateCombat" que notre propre correctif, sans garantie d'ordre entre
  les deux (les deux sont asynchrones) ; notre correctif se réapplique
  maintenant à plusieurs reprises juste après (300ms puis 1200ms) pour
  ne plus perdre cette course
- combat.js : un GM qui n'est pas celui qui gère une party voyait quand
  même le combat de cette party dans son tracker (et subissait le pan de
  caméra automatique, etc.) — tout le filtrage par party (tracker, pan
  caméra, mouvement libre TokenBar) s'applique maintenant aussi aux GM,
  chacun étant identifié par son propre partyId comme un joueur
- token.js : le bouton "Voir le portrait" du HUD token n'était utilisable
  que par le propriétaire du token (Foundry empêche par défaut l'ouverture
  du HUD par clic droit pour un non-propriétaire) ; patché via libWrapper
  pour que le HUD s'ouvre pour tout le monde — pour un non-propriétaire,
  toutes les autres icônes et les barres de vie/ressource sont retirées
  du HUD (elles donneraient des informations sur un token qu'on ne
  possède pas), seul le bouton "Voir le portrait" reste visible

v1.4.0 | 2026-06-24
nettoyage
- suppression du setting "Masquage des stats sur la fiche de groupe"
  (enablePartyStats) : jamais lu par aucun code, fonctionnalité jamais
  implémentée
- suppression d'une IIFE vide en tête d'index.js, d'un console.log de debug
  oublié dans scenes.js, et du hack de z-index sur le FilePicker dans
  token.js (devenu inutile depuis le passage à une popup non-modale)

v1.4.0 | 2026-06-24
nouveauté
- ajout d'un bandeau d'info dans les paramètres du module (settings.js) :
  version, description et auteur lus depuis module.json, avec mention
  "Module propriétaire Ashara — ne pas redistribuer"
- ajout du faux message de maintenance (fake-warning.js) : nouveau groupe
  d'icônes "WestMarch" dans la barre d'outils de gauche (GM uniquement),
  permettant d'envoyer une fausse notification jaune à un joueur précis

correctif
- bouton "Clore la session" toujours dupliqué malgré le correctif précédent :
  le nettoyage global était placé après les conditions (isGM/partyId/
  enableSessionLog) et ne s'exécutait donc jamais à la fin d'une session
  (le flag partyId étant retiré avant le re-rendu) ; il est maintenant
  exécuté sans condition à chaque renderPlayers

v1.3.0 | 2026-06-24
nouveauté
- ajout du log Discord des modifications (discordlog.js) : items, XP/niveau,
  monnaie, création/suppression de personnage, avec tag joueur vs GM

correctif
- join scene / go alone / go with party : le socket natif "pullToScene" de
  Foundry v13 ne fonctionnait plus correctement (ne filtrait plus par joueur
  et n'était jamais reçu par l'émetteur) ; remplacé par un canal socket
  dédié au module (socket.js) avec filtrage par userId
- popup d'import de token : le quadrillage de transparence se retrouvait
  inclus dans le PNG exporté (carré visible autour du token rond) ; il n'est
  désormais qu'un repère visuel CSS, jamais dessiné dans l'image
- popup d'import de token : la fenêtre "Parcourir" (FilePicker) restait
  inaccessible derrière la popup ; celle-ci est maintenant une fenêtre
  flottante non-modale (un clic à côté ne l'annule plus et ne bloque plus
  l'accès aux autres fenêtres)
- popup d'import de token : le personnage pouvait dépasser de la bordure
  ronde ; ajout d'une découpe circulaire avec curseur "Taille de la
  découpe" ajustable pour coller à l'anneau de chaque bordure
- bouton "Clore la session" dupliqué : un clone orphelin pouvait rester
  affiché ailleurs dans la page après un re-rendu partiel ; le nettoyage
  cherche maintenant dans tout le document, pas seulement sous la liste
  des joueurs
- log Discord envoyé en triple pour certains changements d'XP : un module
  tiers (Monks TokenBar) redéclenchait deux fois le même évènement réel ;
  ajout d'un anti-doublon par contenu (5 secondes)
- log Discord absent pour les changements de quantité/monnaie faits par un
  joueur quand aucun GM n'est connecté : le message n'était envoyé que par
  le GM "actif", donc perdu si personne n'est GM ; un joueur actif est
  désormais élu à la place dans ce cas

v1.3.9 | 2026-06-25

- rage path of giant qui grandit