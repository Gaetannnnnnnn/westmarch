================================================================================
                 SORUTA — MIDI RANGE FIX (ELLIPSES)
                      Module Foundry VTT — Privé
================================================================================

Version : 1.3.1
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
          Toute redistribution, modification ou usage commercial est
          strictement interdit sans autorisation écrite.

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Corrige le calcul de portée de midi-qol pour les tokens Large, Huge et
Gargantuan. Sans ce fix, midi-qol mesure du centre de l'attaquant vers
plusieurs coins du token cible, ce qui donne ~5.82ft au lieu de 5ft pour des
tokens adjacents — bloquant des attaques de mêlée à 5ft légitimes.

Le fix intercepte canvas.grid.measurePath et remplace le point cible par le
point le plus proche sur la bordure du token (mesure centre → bord).

Exemple :
  - vs Large  (2 cases) : ~2.5ft centre→bord → autorisé ✓  [corrigé]
  - vs Huge   (3 cases) : ~2.5ft centre→bord → autorisé ✓  [corrigé]
  - 1 case de gap       : ~7.5ft centre→bord → bloqué   ✓

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

index.js
   Point d'entrée du module. Initialise RangeFixHooks au hook "init".

modules/range-fix.js
   Patch de canvas.grid.measurePath : remplace le point cible par le bord le
   plus proche du token pour les tokens Large+. Les tokens Medium sont
   inchangés. Se désactive silencieusement si midi-qol n'est pas actif.

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Midi Range Fix

  Activer le fix de portée (rechargement requis)

La page de paramètres affiche également un tableau explicatif du calcul.

Dépendance : midi-qol doit être actif. Sans lui, le module ne fait rien.

--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Dans Foundry : Setup → Add-on Modules → Install Module
2. Coller l'URL du manifest dans le champ "Manifest URL" :
   https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch/main/midi-range-fix/module.json
3. Cliquer "Install"
4. Activer le module dans le monde : Setup → Gérer les modules

================================================================================
                    MIDI-RANGE-FIX — MISES À JOUR
================================================================================

v1.3.1 | 2026-07-27
   range-fix.js — Fix condition du patch ruler : l'ajustement s'affichait en
   permanence (h24) dès qu'un token était contrôlé et une cible désignée, même
   pour des mesures sans rapport avec ces tokens. Remplacement de la condition
   controlled/targeted par une vérification des coords pixel : on cherche si
   ray.A (départ de la règle) et ray.B (arrivée) tombent dans les bounds d'un
   token distinct (tolérance 8 px pour les points de bord). Le +adjust n'apparaît
   désormais que pour une mesure effectivement token→token.
   module.json — Bump 1.3.0 → 1.3.1.

v1.3.0 | 2026-07-27
   range-fix.js — La règle Foundry affiche maintenant la distance D&D effective
   (bord→bord + ajustement) quand un token est contrôlé et une cible est désignée.
   Patch de Ruler.prototype._getWaypointLabelContext : ajoute rangeAdjust à
   waypoint.measurement.distance avant le formatage de l'étiquette. Le patch est
   posé sur le prototype (idempotent, survit aux changements de scène sans
   réinstallation). Les mesures sans token contrôlé/cible restent inchangées.
   Ex. avec adjust=2.5 : règle à 2,5 ft de bord → affiche « 5 ft », cohérent
   avec ce que midi-qol autorise.
   module.json — Bump 1.2.9 → 1.3.0.

v1.2.9 | 2026-07-27
   range-fix.js — La règle (ruler) affiche maintenant la même distance que midi-qol
   utilise pour les attaques : bord→bord + ajustement. Suppression du guard
   ruler._state > 0 qui laissait Foundry mesurer sans correction. Les joueurs
   voient désormais 5 ft quand ils sont à la limite de portée (bord→bord = 2.5 ft
   avec l'ajustement par défaut), cohérent avec ce que le jeu autorise.
   module.json — Bump 1.2.8 → 1.2.9.

v1.2.8 | 2026-07-27
   range-fix.js — Fix distances incohérentes (6/10/11 ft en se déplaçant légèrement).
   Cause : _trueOriginal (midi-qol) rappelle canvas.grid.measurePath en interne avec
   SES propres points (coins des tokens), ce qui produisait un mélange de notre mesure
   bord→bord et de la mesure native midi-qol. Résultat : distances aléatoires selon
   la position exacte des tokens. Correction : utilisation du PROTOTYPE Foundry
   directement (_protoCall) pour le calcul bord→bord. Le prototype ne rappelle pas
   canvas.grid.measurePath, la mesure est stable et prévisible.
   Toutes les sorties de secours (fallback) utilisent aussi _protoCall au lieu de
   _trueOriginal. module.json — Bump 1.2.7 → 1.2.8.

v1.2.7 | 2026-07-27
   range-fix.js — Fix récursion infinie (InternalError: too much recursion).
   Cause : _trueOriginal (midi-qol) appelle canvas.grid.measurePath en interne,
   ce qui déclenche notre getter → _ourPatch → _trueOriginal → ... à l'infini.
   Correction : garde de ré-entrance (_reentering). Quand _reentering = true,
   les appels internes sont redirigés vers Object.getPrototypeOf(canvas.grid)
   .measurePath directement, sans passer par le getter de l'instance.
   module.json — Bump 1.2.6 → 1.2.7.

v1.2.6 | 2026-07-27
   range-fix.js — Fix sens de l'ajustement (soustrait → ajouté) + patch universel.
   L'ajustement rangeAdjust doit être AJOUTÉ à la distance bord→bord (pas soustrait).
   Midi-qol vérifie ensuite result.distance ≤ weapon_range, ce qui donne :
   bord→bord ≤ weapon_range − adjust. Ex. (adjust=2.5) : arme 5ft atteint jusqu'à
   2.5ft depuis le bord ; arme 10ft jusqu'à 7.5ft. La version précédente soustrayait,
   ce qui donnait bord→bord ≤ weapon_range + 2.5 (2.5ft de portée bonus incorrect).
   Suppression du court-circuit Medium vs Medium : le patch s'applique désormais à
   tous les tokens.
   settings.js — Restauration du setting rangeAdjust avec hint corrigé.
   Tableau d'exemples recalculé avec la bonne formule.
   module.json — Bump 1.2.5 → 1.2.6.

v1.2.5 | 2026-07-27
   range-fix.js — Suppression de la soustraction rangeAdjust (overcorrection).
   Le module mesurait correctement bord→bord des DEUX côtés (bord attaquant +
   bord cible), puis soustrayait encore 2.5 ft, donnant 2.5 ft de portée bonus
   gratuite. Conséquence : des tokens à 7.4 ft bord→bord passaient comme étant
   à portée 5 ft. Correction : la distance bord→bord est la portée effective,
   aucun ajustement supplémentaire n'est nécessaire.
   settings.js — Suppression du setting "rangeAdjust" (plus pertinent).
   Tableau d'exemples corrigé : "1 case de gap = ✗ hors portée 5 ft".
   module.json — Bump 1.2.4 → 1.2.5.

v1.2.4 | 2026-07-24
   range-fix.js — Optimisation perf : polling de vérification du patch réduit
   de 250ms à 2000ms (de 4×/s à 0.5×/s). Le filet de sécurité est conservé
   (détecte un écrasement via Object.defineProperty tiers) mais la charge CPU
   constante est divisée par 8. Le hook dnd5e.preUseItem reste le mécanisme
   principal de réinstallation avant chaque attaque.

v1.2.3 | 2026-07-24
   settings.js — Nouveau setting "rangeAdjust" (Number, défaut 2.5 ft, scope
   world, config true). Configurable dans Paramètres du jeu sans rechargement.
   Bloc d'explication mis à jour : formule bord→bord − ajustement, tableau
   d'exemples recalculé.
   range-fix.js — _RANGE_ADJUST_FT (constante) remplacé par
   game.settings.get("midi-range-fix", "rangeAdjust") avec fallback 2.5.

v1.2.2 | 2026-07-24
   range-fix.js — Ajout de _RANGE_ADJUST_FT (constante module, défaut 2.5 ft).
   Après le calcul bord→bord, cette valeur est soustraite de result.distance
   (Math.max 0). Compense le rayon du token attaquant : 2.5 ft = demi-case
   d'un token Medium sur grille 5 ft. Modifiable directement dans le fichier
   sans passer par les settings du module.

v1.2.1 | 2026-07-24
   range-fix.js — Fix règle manuelle : _ourPatch interceptait tous les appels
   à measurePath, y compris les glissés de la règle Foundry. Résultat : la
   ligne dessinée (anneau → anneau) et la distance affichée (bord→bord des
   bounding boxes) ne correspondaient pas. Ajout d'un guard ruler._state > 0 :
   si la règle est activement glissée par l'utilisateur, on retourne la mesure
   native Foundry sans correction. Le correctif bord→bord ne s'applique qu'aux
   appels midi-qol (règle inactive).

v1.2.0 | 2026-07-24
   range-fix.js — Fix patch perdu après la première attaque. Cause racine :
   midi-qol ou libWrapper appelle Object.defineProperty(canvas.grid,
   'measurePath', { value: fn }) pendant le workflow d'attaque, remplaçant
   notre getter/setter (configurable: true) par un value descriptor sans
   déclencher notre setter. Résultat : dès l'attaque 1, notre getter est
   détruit ; l'attaque 2 utilise la version midi-qol sans correction bord→bord.
   Nouvelle architecture triple couche :
     1. _ourPatch déplacé en portée MODULE (référence stable, marquée par un
        Symbol _PATCH_MARK) — comparaisons === fiables inter-appels.
     2. Object.defineProperty getter/setter conservé (résiste aux assignments).
     3. Hook dnd5e.preUseItem : réinstalle le getter/setter avant chaque item
        use, avant que midi-qol ne démarre son workflow.
     4. Polling setInterval 250ms : détecte si le descripteur est redevenu un
        value descriptor (remplacement tiers via Object.defineProperty) et
        réinstalle immédiatement.
   _readCurrentFn() lit le descripteur brut (sans passer par notre getter) pour
   capturer un _trueOriginal non circulaire. canvasInit arrête le polling proprement.

v1.1.3 | 2026-07-23
   range-fix.js — Patch rendu permanent via Object.defineProperty : au lieu de
   remplacer canvas.grid.measurePath directement (ce que midi-qol écrasait à
   chaque workflow d'attaque), on pose un getter/setter sur la propriété.
   Le getter renvoie toujours notre fonction bord→bord, quelle que soit la scène.
   Le setter intercepte les réécritures de midi-qol, met à jour le fallback
   interne (_trueOriginal) pour qu'on appelle toujours la bonne version de
   midi-qol en dernier recours, mais ne laisse jamais sa version exposée.
   Résultat : le fix survit à tous les lancers sans re-ciblage requis.
   Try-catch conservé pour sécurité. Hook targetToken retiré (inutile).

v1.1.2 | 2026-07-23
   range-fix.js — (intermédiaire, remplacé par 1.1.3) Guard ._mrf + hook
   targetToken + try-catch. Le targetToken ne fonctionnait pas quand la cible
   restait la même entre deux attaques.

v1.1.1 | 2026-07-23
   index.js — RangeFixHooks() déplacé de "init" vers "ready". Le listener
   canvasReady était enregistré trop tôt (init) : midi-qol enregistre le sien
   dans "ready", donc son handler s'exécutait après le nôtre et écrasait le patch.
   En déplaçant dans "ready" et en profitant de l'ordre alphabétique (midi-qol <
   midi-range-fix), notre canvasReady est enregistré en dernier et s'exécute après
   celui de midi-qol.
   range-fix.js — Ajout d'un setTimeout(0) dans le handler canvasReady pour
   repousser l'application du patch après tous les handlers synchrones, garantissant
   que notre version est bien la dernière active quelle que soit la version de
   midi-qol.

v1.1.0 | 2026-07-23
   range-fix.js — Refonte complète de la mesure de portée.
   Ancienne approche : centre attaquant → bord cible − bonus taille. Incorrecte
   pour Medium attaquant vs Large cible (le demi-espace du PJ n'était pas
   soustrait → 6.9ft au lieu de 1.6ft pour un PJ adjacent à un Brown Bear).
   Nouvelle approche : bord→bord. On calcule le point le plus proche sur la
   bounding box de l'attaquant depuis le centre de la cible, et vice-versa ;
   la distance entre ces deux points est la portée D&D 5e exacte.
   Hook "ready" → "canvasReady" : canvas.grid est recréé à chaque chargement
   de scène, le patch ne survivait pas. canvasReady re-patche à chaque scène.
   Ajout de la vérification du setting "enabled" dans le hook canvasReady.

v1.0.9 | 2026-07-23
   settings.js — Fix hook renderSettingsConfig pour Foundry v13 : html passé en
   HTMLElement natif (pas jQuery). Ajout de $(html) pour normaliser. Sélecteur
   remplacé par [data-setting-id^="midi-range-fix."] (robuste v12/v13, sans
   dépendance sur .tab[data-tab="system"] qui n'existe plus en v13). Description
   du tableau mise à jour (bounding box, plus cercle inscrit).

v1.0.8 | 2026-07-23
   Synchronisation module.json / readme.txt sur la même version.

v1.0.7 | 2026-07-23
   range-fix.js — Remplacement du cercle inscrit par la bounding box rectangulaire
   dans _nearestBorderPoint. Le cercle sur-estimait la distance en approche diagonale
   d'un coin de token Large : ex. Brown Bear diagonalement adjacent = 5.6ft au lieu
   de 3.5ft → Foundry arrondissait à 6ft et bloquait l'attaque à tort. La bounding
   box (point le plus proche sur le rectangle) correspond exactement au "nearest cell
   edge" de D&D 5e sur grille carrée, sans biais diagonal.

v1.0.6 | 2026-07-22
   range-fix.js — Fix centres de cases (Foundry v13) :
   - token.center renvoie le centre de la 1ère case, pas le centre géométrique
     du token. Remplacement par _boundsCenter() basé sur token.bounds, partout
     (attaquant + calcul du cercle inscrit dans _nearestBorderPoint).
   - Identification de l'attaquant maintenant uniquement par bounds (plus
     robuste que la recherche par centre).

v1.0.5 | 2026-07-22
   range-fix.js — Fix asymétrie PJ / mob :
   - Identification de l'attaquant en double passe : centre d'abord (tolérance
     5px), puis fallback bounds si src = bord (cas Large mob avec midi-qol).
   - Mesure toujours depuis attacker.center (pas src) → comportement identique
     PJ et mob, plus de biais centre→bord vs bord→centre.

v1.0.4 | 2026-07-22
   settings.js — Toggle d'activation + bloc explicatif injecté dans la page
   de config (formule + tableau des cas d'usage).
   styles/midi-range-fix.css — Styles du bloc explicatif.

v1.0.3 | 2026-07-22
   range-fix.js — Copyright ajouté. Titre mis à jour : Soruta — Midi Range Fix.
   Installation readme mise à jour (manifest URL GitHub).
