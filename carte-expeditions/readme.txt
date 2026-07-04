================================================================================
                   ASHARA - MAP OUVERT SYSTÈMES — MODULE FOUNDRY VTT
                               Auteur : Soruta (Discord: s0ruta)
                                       Version : 0.1.6
                              Compatibilité : Foundry VTT v13
================================================================================

⚠️ Module propriétaire Ashara — ne pas redistribuer.

Module autonome, totalement indépendant du module westmarch (id différent,
namespace de settings/flags différent : "carte-expeditions") : il n'est PAS
destiné à être fusionné dans westmarch et reste installé/activé séparément.


DESCRIPTION
-----------
Carte des expéditions : sur une scène Foundry dédiée servant de carte du
monde commune, chaque GM place le token de l'acteur "Groupe" (fiche dnd5e,
onglet Members) d'une expédition, qui sert de source de vision / brouillard
de guerre pour les joueurs dont le personnage est Member de ce Groupe. Le
module synchronise automatiquement les permissions, isole l'exploration de
la carte par personnage ET par expédition (Groupe), et garantit qu'un même
personnage ne peut jamais être Member de deux Groupes en même temps — tout
cela restreint à la seule scène choisie dans les réglages.


--------------------------------------------------------------------------------
STRUCTURE DES FICHIERS
--------------------------------------------------------------------------------

carte-expeditions/
├── readme.txt              Ce fichier
├── module.json              Manifeste du module (id, version, compatibilité)
└── modules/
    ├── index.js             Point d'entrée — initialise les réglages et les hooks
    ├── map.js                Cœur du module : synchro Owner, exclusivité entre
    │                         Groupes, fog par personnage/groupe
    └── map-settings.js       Déclare les réglages et le bandeau d'info des paramètres

Pour l'installer, le dossier `modules/` doit être renommé en `carte-expeditions`
une fois copié dans `Data/modules/` (Foundry exige que le nom du dossier
corresponde exactement à l'`id` du module.json) — voir section INSTALLATION.


--------------------------------------------------------------------------------
DÉTAIL DES FICHIERS (modules/)
--------------------------------------------------------------------------------

index.js
   Point d'entrée du module. Au hook "init" : enregistre les réglages
   (map-settings.js) puis initialise tous les hooks du module (map.js).

map.js
   Toute la logique du module :
   - Synchro de la permission Owner sur les acteurs Groupe (vision/fog)
   - Exclusivité entre Groupes (un personnage = un seul Groupe à la fois)
   - Fog par personnage ET par Groupe actuel (isolation par expédition)
   - Rafraîchissement live du fog côté client concerné

map-settings.js
   Enregistre les paramètres configurables du module (Paramètres du jeu →
   Configuration des modules → Ashara - Map Ouvert Systèmes) et affiche le
   bandeau d'info (version, description, auteur, mention "Module propriétaire
   Ashara") en haut de la page de paramètres, sur le même principe que le
   bandeau de westmarch.


--------------------------------------------------------------------------------
FONCTIONNALITÉS
--------------------------------------------------------------------------------

1. SYNCHRO DE LA PERMISSION OWNER SUR LES GROUPES (map.js)
   ----------------------------------------------------------
   Foundry calcule la vision/brouillard de guerre d'un joueur à partir des
   tokens qu'il "owns" (Observer ne suffit pas). Dès que la liste "Members"
   d'un acteur de type "group" (fiche dnd5e) change, le module synchronise
   automatiquement la permission Owner sur cet acteur pour chaque joueur dont
   le personnage assigné (Configurer le profil) figure dans les Members —
   et retire l'Owner accordé précédemment dès qu'un personnage quitte la
   liste, ou que le token du Groupe quitte la scène configurée. Une
   resynchronisation complète tourne aussi une fois au démarrage du monde
   (GM uniquement). Restreint à la seule scène choisie dans les réglages
   (expeditionMapSceneId) : un Groupe placé ailleurs ne reçoit jamais
   d'Owner via ce module.

2. EXCLUSIVITÉ ENTRE GROUPES (map.js)
   --------------------------------------
   Sur la scène configurée, plusieurs tokens de Groupe coexistent en
   permanence (un par expédition en cours, destinés à rester en place
   plusieurs mois) et ne doivent jamais interférer entre eux. Le module
   garantit qu'un même personnage ne peut être Member que d'un seul Groupe
   à la fois : l'ajouter aux Members d'un Groupe le retire automatiquement
   des Members de tous les autres Groupes présents sur cette même scène.

3. FOG PAR PERSONNAGE ET PAR GROUPE ACTUEL (map.js)
   ------------------------------------------------------
   Nativement, Foundry sauvegarde le brouillard de guerre exploré par
   (scène, compte joueur) — donc tous les personnages d'un même joueur, et
   toutes les expéditions d'un même personnage, partageraient la même zone
   explorée pour toujours. Le module isole l'exploration par
   "<personnage>:<Groupe actuel>" : un personnage qui rejoint un nouveau
   Groupe repart avec une fog vide pour cette expédition (ou retrouve la
   sienne s'il a déjà fait équipe avec ce Groupe par le passé), sans jamais
   mélanger l'exploration de deux Groupes différents. Se recalcule à chaque
   changement de personnage assigné ET à chaque modification des Members
   d'un Groupe sur la scène configurée.

4. RAFRAÎCHISSEMENT LIVE DU FOG (map.js)
   --------------------------------------------
   Quand le document FogExploration d'un joueur est créé/modifié/supprimé
   (swap de fog par le GM...), le client concerné recharge immédiatement sa
   texture de fog et rafraîchit sa vision, sans nécessiter de rechargement
   manuel de la page.

5. RÉGLAGES ET BANDEAU D'INFO (map-settings.js)
   ----------------------------------------------------
   - "Carte des expéditions" (enableExpeditionMap) : active/désactive tout
     le module.
   - "Scène : carte des expéditions" (expeditionMapSceneId) : menu déroulant
     pour choisir la scène concernée (peuplé dynamiquement au rendu, car la
     liste des scènes n'est pas encore chargée au moment de l'enregistrement
     du réglage). C'est cette scène qui sert à la fois au filtre de synchro
     Owner, à l'exclusivité entre Groupes et à la fog par personnage/groupe.
   Un bandeau d'info (version, description, auteur, mention "Module
   propriétaire Ashara") est affiché en haut de la page de paramètres.


--------------------------------------------------------------------------------
INSTALLATION & CONFIGURATION
--------------------------------------------------------------------------------

1. Copier le dossier `modules/` de ce dépôt dans `Data/modules/`, en le
   renommant exactement `carte-expeditions` (Foundry exige que le nom du
   dossier corresponde à l'`id` du module.json) :

   cp -r carte-expeditions/modules /chemin/vers/Data/modules/carte-expeditions

2. Redémarrer le serveur Foundry, puis activer le module depuis la liste des
   modules ("Ashara - Map Ouvert Systèmes").

3. Dans Paramètres du jeu → Configuration des modules → Ashara - Map Ouvert
   Systèmes, choisir la scène concernée dans "Scène : carte des expéditions".

4. Placer un token de l'acteur Groupe de chaque expédition sur cette scène,
   et gérer les Members directement depuis la fiche du Groupe : le reste
   (Owner, exclusivité, fog) est automatique.

Désactiver le module ne touche à rien d'autre (n'affecte pas westmarch).


--------------------------------------------------------------------------------
NOTES TECHNIQUES
--------------------------------------------------------------------------------

- `actor.system.members` (acteur dnd5e type "group") est une collection avec
  une propriété `.ids` (Set) contenant directement les ids des acteurs
  membres. L'exclusivité entre Groupes manipule les données brutes via
  `actor.toObject()` / `actor.update()` plutôt que l'API dnd5e (non
  documentée pour l'ajout/retrait de Members), afin de ne filtrer que les
  entrées concernées sans risquer de corrompre la structure.
- Le token de Groupe doit avoir `sight.enabled: true` sur son prototype
  token pour générer une vision/fog.
- En v13, `scene.fogExploration` est dépréciée → utiliser `scene.fog.exploration`
  (booléen, doit être `true`).
- Pour un contraste noir/visible net, couper la Global Illumination
  (`scene.environment.globalLight.enabled = false`) et monter les ténèbres
  (`scene.environment.darknessLevel`).
- Zone déjà explorée mais hors champ de vision : assombrie par défaut
  (mémoire visuelle distincte de la vision en temps réel). Pour l'avoir
  identique à une zone actuellement visible, fixer `scene.fog.colors.explored`
  à `"#ffffffff"` et recharger la page (mis en cache au chargement de la
  scène, comme `fog.exploration`).
- Le document `FogExploration` (`game.collections.get("FogExploration")`) a
  les champs : `scene`, `user`, `explored` (PNG base64), `positions`,
  `timestamp`, `flags`. La clé de sauvegarde du module est
  `flags.carte-expeditions.fogByKey = { "<characterId>:<groupActorId>":
  { explored, positions, timestamp } }`, et le Groupe actif d'un joueur est
  mémorisé sur son flag `flags.carte-expeditions.activeFogKey`.
- L'exclusivité entre Groupes (manipulation brute de `system.members`) est
  fonctionnelle mais doit être revalidée sur la scène de test avant tout
  changement majeur de structure du système dnd5e.
- Compatible Foundry VTT v13 minimum.


================================================================================
            ASHARA - MAP OUVERT SYSTÈMES — MISES À JOUR
================================================================================

v0.1.6 | 2026-07-04
correctif
- les membres reçoivent désormais Observer au lieu de Owner sur les acteurs
  Groupe — Observer suffit pour la vision/fog en Foundry v13 et évite que les
  joueurs puissent déplacer ou supprimer le token de Groupe
- le nettoyage des permissions retire désormais aussi les entrées Observer
  résiduelles (pas seulement Owner) pour les non-membres
- changement de personnage assigné (updateUser) : les permissions Observer sont
  maintenant resynchronisées sur tous les Groupes au moment du switch — l'ancien
  Groupe perdait son Observer du joueur seulement au prochain redémarrage ou
  changement de Members, pas immédiatement

v0.1.5 | 2026-07-04
correctif
- suppression de l'ancre de vision : créait des acteurs PJ en boucle sur le
  serveur lorsque plusieurs GM étaient connectés simultanément (race condition
  au démarrage) ; le comportement natif Foundry "carte entière révélée" est
  désormais évité en forçant la permission default des acteurs Groupe à NONE
  plutôt qu'en ajoutant un token fantôme
- synchro Owner : le nettoyage s'applique désormais à TOUT Owner non-GM
  superflu sur un acteur Groupe, pas seulement à ceux accordés par le module
  — un Owner accordé manuellement sur la fiche ou hérité du template n'était
  jamais retiré au retrait d'un joueur des Members
- synchro Owner : la permission default des acteurs Groupe est forcée à NONE
  (0) lors de chaque synchro — en Foundry v13, Observer (2, valeur par défaut
  du template) donne également accès à la vision/fog, ce qui faisait voir la
  fog de tous les Groupes à tous les joueurs indépendamment de leur membership

v0.1.4 | 2026-06-28
nouveauté
- ajout de l'exclusivité entre Groupes (map.js) : un personnage ajouté aux
  Members d'un Groupe est automatiquement retiré des Members de tous les
  autres Groupes présents sur la scène configurée — plusieurs Groupes
  permanents peuvent désormais coexister sans jamais interférer
- la fog par personnage est désormais aussi isolée par Groupe actuel (clé
  "<characterId>:<groupActorId>") : un même personnage qui change
  d'expédition (sans changer de personnage assigné) ne voit plus la fog
  mémorisée par son ancien Groupe se mélanger à celle du nouveau
- ajout de l'ancre de vision : un token invisible à portée nulle, possédé
  par tous les joueurs par défaut, empêche Foundry de révéler toute la
  carte (autres tokens et leurs auras compris) quand un joueur ne possède
  plus aucun token avec vision sur la scène (token de Groupe supprimé)

v0.1.3
correctif
- la fog ne se rafraîchissait pas automatiquement sur le client du joueur
  concerné après un swap de personnage (le contrôle se faisait côté GM,
  qui ne correspond jamais au client du joueur) ; ajout d'une écoute
  directe des évènements FogExploration sur chaque client
- la synchro Owner ne nettoyait plus les permissions obsolètes une fois la
  restriction à une scène précise ajoutée (un Groupe qui quittait la scène
  configurée gardait ses joueurs Owner pour toujours) ; le filtre par scène
  est désormais appliqué à l'intérieur de la fonction de synchro plutôt
  qu'en amont, pour que le nettoyage continue de s'exécuter

v0.1.1 | 2026-06-22
nouveauté
- restriction de la synchro Owner à une seule scène configurable (réglage
  "Scène : carte des expéditions"), peuplée dynamiquement au rendu des
  paramètres car la liste des scènes n'est pas encore chargée au moment de
  l'enregistrement du réglage
- ajout du swap de brouillard de guerre par personnage assigné (au lieu du
  comportement natif par compte joueur)
- ajout du bandeau d'info dans les paramètres du module, sur le même
  principe que celui de westmarch

v0.1.0 | 2026-06-22
nouveauté
- version initiale : synchro automatique de la permission Owner sur les
  acteurs de type "group" (dnd5e) en fonction de leur liste "Members", pour
  que le token du Groupe serve de source de vision/fog à ses membres
