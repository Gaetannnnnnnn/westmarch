================================================================================
                        WESTMARCH SYSTÈME — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 2.0.2
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
│   ├── foldermove.js       Multi-sélection et déplacement/duplication de documents dans le sidebar
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
│   ├── caldate.js          Notification Discord lors d'un changement de date (Simple Calendar)
│   ├── mejshop.js          Correctifs boutiques Monk's Enhanced Journal (groupe + objets cachés)
│   ├── mejrestock.js       Réapprovisionnement automatique des boutiques MEJ (timer par article)
│   ├── tm.js               Temps morts : gains d'argent et craft par personnage
│   ├── player.js           Liste des joueurs, menu contextuel et gestion des parties
│   ├── polymorph.js        Transformation de token : Wild Shape / Polymorph (druide, sorcier...)
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

caldate.js
   Quand le GM avance la date dans Simple Calendar, envoie automatiquement
   un message sur le webhook Discord "changement de date" (paramètre
   "URL du Webhook Discord (changement de date)"). Le message indique la
   nouvelle date. Ne se déclenche qu'en cas de changement de jour (pas à
   chaque seconde ou minute). Un seul message est envoyé même si plusieurs
   GM sont connectés (le GM actif est élu pour l'envoi).

mejrestock.js
   Réapprovisionnement automatique des articles de boutique MEJ. Chaque
   article dispose d'un bouton toggle 🔄 dans la zone des contrôles
   (à côté des boutons masquer/éditer/supprimer) :
   - Bouton actif (teal) : dès que l'article tombe à 0, un timer de N
     jours démarre. À expiration, la quantité repasse à 1 automatiquement.
   - Activer sur un article déjà à 0 : le timer démarre immédiatement.
   - Désactiver : annule le timer en cours s'il existe.
   - Réactiver après désactivation : le timer repart depuis zéro.
   - Quand un timer est actif, un décompte "dans X j" s'affiche en
     petit et grisé sous la quantité, dans la colonne Qté.
   Le délai N est configurable par rareté (Commun, Peu commun, Rare,
   Très rare, Légendaire) dans les paramètres du module ; si une rareté
   vaut 0, c'est le délai par défaut (paramètre "Délai par défaut") qui
   s'applique. Mettre 0 dans le délai par défaut désactive la feature.
   Stockage : flags westmarch "restock" {itemId: expiry} et
   "restockEnabled" {itemId: bool} sur la page MEJ concernée.

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

polymorph.js
   Permet de gérer les transformations de token (Wild Shape, Polymorph ou
   toute autre forme). Le GM configure sur un acteur une liste de "formes
   polymorphes" (références vers d'autres acteurs existants, avec un label
   optionnel) via la section dédiée de la config du prototype token. Un
   bouton 🐾 (Transformer) apparaît en bas du HUD du token si des formes
   sont configurées : un clic ouvre un dialogue de sélection avec aperçu.
   La transformation repointe le token vers l'acteur bête (actorLink: false,
   image et taille du prototypeToken), en sauvegardant l'état original dans
   un flag du token de scène. Un bouton 👤 (Rétablir) apparaît dès que le
   token est transformé et restaure exactement l'état d'origine (acteur,
   image, taille). Seuls le propriétaire du token et le GM voient ces
   boutons. Géré par le setting "Transformation polymorphe" (enablePolymorph).

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
   - URL du Webhook Discord (changement de date) — salon joueurs
   - URL du Webhook Discord (résultats temps morts) — salon staff/MJ

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

14. NOTIFICATION DISCORD — CHANGEMENT DE DATE (caldate.js)
   ---------------------------------------------------------------
   Quand le GM avance la date dans le calendrier, un message est envoyé
   automatiquement sur un webhook Discord dédié (paramètre "URL du Webhook
   Discord (changement de date)", salon joueurs) : "📅 La date est maintenant
   le X." Ne s'envoie qu'une fois par changement de jour. URL à configurer
   dans les paramètres du module.

   Le message inclut la saison courante (ex. "17 Blanche Brebis 1496 — Printemps").
   Quand la date correspond à un événement astronomique ou à un festival, une
   ligne supplémentaire est ajoutée au message :
   - 19 Blanche Brebis → 🌸 Équinoxe de printemps
   - 1 Moisson Dorée   → 🌿 Greengrass
   - 20 Douce Vie      → ☀️ Solstice d'été
   - 1 Sombrebois      → 🌞 Midsummer
   - 1 Grise Lumière   → 🛡️ Shieldmeet
   - 1 Findefroid      → ❄️ Midwinter

15. TEMPS MORTS — GAINS D'ARGENT ET CRAFT (tm.js)
   -------------------------------------------
   Flux en deux temps (pour les deux types d'activité) :

   Côté joueur : bouton sablier ⏳ dans le header de sa fiche personnage.
   Le joueur choisit d'abord le type d'activité via un sélecteur en haut
   du dialog :

   ● Gain de compétence :
   - une compétence (liste déroulante ; la caractéristique associée est
     affichée juste en dessous et se met à jour à chaque changement)
   - cases de proficiency : Maîtrise (+2 po/j), Expertise (+2 po/j),
     ou Tools (+4 po/j) — les deux groupes sont mutuellement exclusifs
     (cocher Tools grise Maîtrise/Expertise, et inversement) ; pré-remplies
     automatiquement depuis la fiche du personnage
   - dates de début et de fin (jour, mois, année — le nombre de jours est
     calculé et affiché automatiquement)
   - test de compétence optionnel (grisé automatiquement si < 5 jours)
   Une prévisualisation du gain total se met à jour en temps réel.

   ● Craft (fabrication d'objet) :
   - type : Non-magique / Parchemin de sort / Objet magique
   - nom de l'objet (libre)
   - paramètre selon le type :
     · Non-magique : prix d'achat → coût = prix/2, durée = ceil(prix/10) j
     · Parchemin : niveau de sort (0-9) → coût et durée selon le tableau
     · Objet magique : rareté (Courant à Légendaire) → coût et durée selon
       le tableau ; option "usage unique" divise les deux par 2
   - jours déjà travaillés (pour les crafts multi-sessions)
   Preview live : coût, durée totale, jours restants.
   Le flag de craft persiste entre les TM si l'objet n'est pas terminé ;
   le joueur re-déclare juste les dates de la prochaine période.
   Le bouton sablier passe en bleu si un craft est en cours.

   Côté GM : bouton ⏳ dans le groupe WestMarch de la barre de gauche.
   Ouvre une fenêtre listant uniquement les personnages ayant déclaré
   (option d'afficher aussi les non-déclarés). Le nom de chaque personnage
   est cliquable et ouvre sa fiche. Tout est pré-rempli depuis la déclaration.

   Pour un gain de compétence, le GM peut corriger les champs si besoin,
   puis clique "Appliquer les gains".
   Formule : (1 + modif_carac + 2 si maîtrise + 2 si expertise OU +4 tools)
   × jours, puis modificateur d20 optionnel sur le total.
   Test de compétence optionnel (≥ 5 jours) : d20 + mod carac + maîtrise.
   Résultats : ≤1 → −20 %, 2-9 → ±0 %, 10-19 → +10 %, ≥20 → +20 %.

   Pour un craft, la ligne GM affiche : nom de l'objet, type, coût total,
   progression X/Y jours. À l'application : si terminé, flag supprimé +
   message de complétion au joueur ; si en cours, flag mis à jour avec les
   jours cumulés (le joueur n'a pas à tout re-saisir).

   À l'application (tous types) :
   - Un whisper est envoyé aux joueurs propriétaires du personnage
   - Un résumé est posté en message privé GM dans le chat Foundry
   - Le résumé est aussi envoyé sur le webhook Discord "résultats temps morts"
   - Pour les gains : les PO sont créditées directement sur la fiche

   Rappel Discord quotidien (tm.js) :
   Entre 17h et 20h heure de Paris, si des TM sont en attente de validation,
   un message est envoyé automatiquement sur le webhook TM. Déclenché sur
   tous les utilisateurs connectés (premier connecté dans la plage envoie,
   les suivants voient la date déjà posée et sautent). Aucun message si
   aucun TM en attente.

16. CORRECTIFS BOUTIQUES MONK'S ENHANCED JOURNAL (mejshop.js)
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