# Carte des expéditions — Module autonome, indépendant de westmarch

Ce dossier est volontairement isolé du module `westmarch` en production
(`Ashara/westmarch/`). Il s'agit d'un module Foundry autonome, **non destiné
à être fusionné** dans `westmarch` : il reste un projet séparé, installé et
activé indépendamment.

## Fonctionnement visé

- Une scène Foundry dédiée sert de carte du monde commune.
- Chaque GM place manuellement le token de son acteur "Groupe" (fiche dnd5e
  avec onglet Members) sur cette carte et le déplace au fil des sessions.
  Un même token de Groupe sert pour UNE expédition : en fin d'expédition le
  GM retire les joueurs des Members, puis une nouvelle expédition utilise un
  nouveau token de Groupe avec d'autres Members.
- Les personnages joueurs sont ajoutés comme Members sur la fiche du Groupe
  (comme dans la capture d'écran fournie par Lyra : onglet "Members" avec
  PJ + PNJ).
- `map.js` écoute les modifications de `system.members` sur les acteurs de
  type `group` et synchronise automatiquement la permission **Owner** sur
  cet acteur pour chaque joueur dont le personnage (`user.character`) est
  dans la liste. Foundry calcule la vision/brouillard de guerre d'un joueur
  à partir des tokens qu'il "owns" — Owner est donc nécessaire (Observer ne
  suffit pas) pour que le token du groupe éclaire la carte pour ses membres.
- **Brouillard de guerre par personnage (pas par compte).** Nativement,
  Foundry sauvegarde le fog exploré par (scène, compte joueur) — donc tous
  les personnages d'un même joueur partageraient la même zone explorée.
  Ce n'est pas ce qui est voulu : chaque personnage doit avoir ses propres
  zones explorées, qui persistent même quand son joueur change de
  personnage assigné (Configurer le profil) ou change d'expédition (donc de
  token de Groupe). `map.js` intercepte le changement de `user.character`
  (hooks `preUpdateUser` + `updateUser`) et swap le document `FogExploration`
  du joueur : sauvegarde le fog actuel sous l'ancien personnage, restaure
  (ou vide) le fog du nouveau personnage. Voir section technique plus bas.

## Fichiers

- `modules/` (sous-dossier — **anciennement nommé `carte-expeditions/`**,
  renommé en `modules/`) — contient le **module Foundry autonome et
  activable**, titre affiché "Map Ouvert Systèmes", namespace
  `carte-expeditions` (settings + flags). Contient `module.json`, `index.js`,
  `map.js`, `map-settings.js`.
  - `modules/map.js` — synchro des permissions (hook `updateActor` +
    resynchro au démarrage, restreinte à la scène choisie dans les réglages)
    et swap du fog par personnage (hooks `preUpdateUser` / `updateUser`).
  - `modules/map-settings.js` — déclare `enableExpeditionMap` (active/
    désactive tout le module) et `expeditionMapSceneId` (menu déroulant pour
    choisir la scène carte du monde concernée — sert à la fois au swap de
    fog et au filtre de synchro Owner).
  - **Pour l'installer** : le dossier Foundry de destination (`Data/modules/`)
    doit contenir un sous-dossier portant exactement l'`id` du module, soit
    `carte-expeditions` — c'est une exigence de Foundry pour le reconnaître.
    Comme ce sous-dossier s'appelle maintenant `modules/` et non plus
    `carte-expeditions/`, il faut le **renommer en `carte-expeditions`** au
    moment de la copie dans `Data/modules/` (ou créer un dossier
    `Data/modules/carte-expeditions/` et y copier le contenu de `modules/`).
    Puis activer le module depuis la liste des modules. Le désactiver ne
    touche à rien d'autre.

## Détails techniques vérifiés sur le serveur

- `actor.system.members` (acteur dnd5e type "group") est une collection avec
  une propriété `.ids` (`Set`) contenant directement les ids des acteurs
  membres. `map.js` utilise `Array.from(actor.system.members.ids)`.
- Le token de Groupe a bien `sight.enabled: true` sur son prototype token —
  nécessaire pour qu'il génère une vision/fog.
- En v13, `scene.fogExploration` est dépréciée → utiliser `scene.fog.exploration`
  (booléen, doit être `true` pour activer la persistance native).
- Pour qu'il y ait un contraste visuel noir/visible, il faut couper la
  Global Illumination (`scene.environment.globalLight.enabled = false`) ET
  monter les ténèbres (`scene.environment.darknessLevel`, ex. `1`).
- Le rendu "zone déjà explorée mais hors champ de vision actuel" est
  assombri par défaut (mémoire visuelle distincte de la vision en temps
  réel). Pour l'avoir identique à une zone actuellement visible (choix de
  Lyra : "juste vu" / "pas vu", sans état intermédiaire), il faut fixer
  `scene.fog.colors.explored` à `"#ffffffff"` (blanc, alpha plein) **et
  recharger la page** après le changement (mis en cache au chargement de la
  scène, comme `fog.exploration`). Confirmé fonctionnel sur la scène de test
  "Ashara Joueur (Copy)".
- Le document `FogExploration` (accessible en lecture/écriture via
  `game.collections.get("FogExploration")`, ou via `canvas.fog.exploration`
  quand la scène concernée est affichée) a les champs : `scene` (id scène),
  `user` (id compte), `explored` (image PNG encodée en base64,
  `data:image/png;base64,...`), `positions` (objet, vu vide `{}` en test),
  `timestamp`, `flags`.
- Le swap de fog par personnage sauvegarde/restaure `explored`, `positions`
  et `timestamp` dans un flag sur le `User` :
  `flags.carte-expeditions.fogByCharacter = { [characterId]: { explored,
  positions, timestamp } }`. Si le nouveau personnage n'a jamais exploré la carte, le
  document `FogExploration` du joueur est supprimé (retour à l'état natif
  "rien exploré") plutôt que d'écrire une valeur vide potentiellement
  invalide.

## Points à surveiller

- **Swap de fog par personnage** : conçu et écrit, mais **pas encore testé
  en conditions réelles** (changement de personnage en cours de partie, va
  et vient entre scènes, plusieurs personnages avec des zones différentes).
- **Cas multi-GM** : le swap ne s'exécute que sur le client `game.user.isGM`
  pour éviter une double écriture ; si plusieurs GM sont connectés en même
  temps, chacun exécutera le swap (idempotent mais redondant — pas
  bloquant).
- **Compatibilité midi-qol / DAE / polyglot / plutonium** : aucun hook ne se
  recoupe a priori (`updateActor`/`updateUser` sont très génériques), mais
  pas testé en conditions réelles.

## Statut

Owner sync : vérifié fonctionnel sur le serveur, et désormais restreinte à la
scène choisie dans les réglages (`expeditionMapSceneId`). Fog natif
(activation + contraste visuel) : vérifié fonctionnel sur la scène de test.
Swap de fog par personnage : code écrit, **pas encore testé**.
