# Carte des expéditions — Projet en développement séparé

Ce dossier est volontairement isolé du module `westmarch` en production
(`Ashara/westmarch/`). Rien ici n'est branché ni actif tant que les fichiers
ne sont pas copiés/fusionnés dans le module.

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

- `modules/map.js` — synchro des permissions (hook `updateActor` + resynchro
  au démarrage) et swap du fog par personnage (hooks `preUpdateUser` /
  `updateUser`). Version "prête à fusionner" (namespace `westmarch`).
- `modules/map-settings.js` — déclare `enableExpeditionMap` (active/désactive
  tout le module) et `expeditionMapSceneId` (menu déroulant pour choisir la
  scène carte du monde concernée par le swap de fog). À fusionner dans
  `westmarch/modules/settings.js`.
- `carte-expeditions/` (sous-dossier, même nom que l'`id` du module — requis
  par Foundry pour bien le reconnaître une fois placé dans `Data/modules/`)
  — **module Foundry autonome et activable**, titre affiché "Map Ouvert
  Systèmes", pour tester en conditions réelles sans toucher au module
  `westmarch` en production. Contient `module.json`, `index.js`, et des
  copies de `map.js`/`map-settings.js` avec le namespace `carte-expeditions`
  à la place de `westmarch` (settings + flags). Pour l'installer : copier ce
  sous-dossier `carte-expeditions/` directement dans `Data/modules/` du
  monde, puis l'activer depuis la liste des modules. Le désactiver ne touche
  à rien d'autre. Quand la fonctionnalité est validée, c'est le contenu de
  `modules/` (namespace `westmarch`, à la racine du dossier `carte-expeditions`
  parent) qui doit être copié dans le module en production — pas ce
  sous-dossier de test.

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
  `flags.westmarch.fogByCharacter = { [characterId]: { explored, positions,
  timestamp } }`. Si le nouveau personnage n'a jamais exploré la carte, le
  document `FogExploration` du joueur est supprimé (retour à l'état natif
  "rien exploré") plutôt que d'écrire une valeur vide potentiellement
  invalide.

## À vérifier avant fusion dans westmarch

- **Swap de fog par personnage** : conçu et écrit, mais **pas encore testé
  en conditions réelles** (changement de personnage en cours de partie, va
  et vient entre scènes, plusieurs personnages avec des zones différentes).
  À tester sur la scène de test avant tout passage en prod.
- **Cas multi-GM** : le swap ne s'exécute que sur le client `game.user.isGM`
  pour éviter une double écriture ; si plusieurs GM sont connectés en même
  temps, chacun exécutera le swap (idempotent mais redondant — pas
  bloquant).
- **Compatibilité midi-qol / DAE / polyglot / plutonium** : aucun hook ne se
  recoupe a priori (`updateActor`/`updateUser` sont très génériques), mais
  pas testé en conditions réelles.

## Statut

Owner sync : vérifié fonctionnel sur le serveur (voir tests précédents).
Fog natif (activation + contraste visuel) : vérifié fonctionnel sur la scène
de test. Swap de fog par personnage : code écrit, **pas encore testé** —
prochaine étape avant intégration dans `westmarch/index.js` et
`westmarch/modules/settings.js`.
