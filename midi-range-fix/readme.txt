================================================================================
                 SORUTA — MIDI RANGE FIX (ELLIPSES)
                      Module Foundry VTT — Privé
================================================================================

Version : 1.4.8
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

v1.4.8 | 2026-07-29
   range-fix.js — Suppression du "(+adj)" dans l'affichage de la règle.
   Format : "3,76 ft — 16,40 ft" au lieu de "3,76 ft (+2,50) — 16,40 ft".

v1.4.7 | 2026-07-29
   range-fix.js — Fix unité manquante sur la 1ère valeur de la règle + meilleure
   détection du token visé. Affichage : "3,76 ft (+2,50) — 16,40 ft" au lieu de
   "3,76 (+2,50) — 16,40 ft" (Foundry n'ajoute les units qu'une seule fois en fin
   de chaîne — on intègre l'unité manuellement après rawDist).
   Détection token : _tokenAt retourne désormais le token dont le CENTRE est le
   plus proche du point (au lieu du premier dans les bounds), ce qui évite de
   capturer un token adjacent lorsque plusieurs tokens sont proches.

v1.4.6 | 2026-07-29
   range-fix.js — Fix règle figée autour d'un token : le fallback de _ourPatch
   (controlled[0] + targets[0]) s'activait pour toutes les mesures génériques,
   pas seulement les checks midi-qol. Quand la règle partait d'un token (ray.A
   dans les bounds), le fallback calculait bord→bord vers la cible désignée —
   valeur fixe → règle figée. Ajout de _inMidiWorkflow (flag posé dans
   dnd5e.preUseItem, remis à false après 500 ms) : le fallback ne s'active
   maintenant que pendant un vrai workflow d'attaque.

v1.4.5 | 2026-07-29
   range-fix.js — Affichage de l'adjust dans la règle : format
   "bord→bord (+adj) — natif ft", ex. "0,00 (+2,50) — 7,50 ft".
   L'adjust entre parenthèses correspond au buffer du setting —
   la valeur comparée par midi-qol à la portée d'arme est bord+adj.
   Permet de vérifier visuellement que le setting est bien pris en compte.

v1.4.4 | 2026-07-29
   range-fix.js — Fix ruler label pendant déplacement de token : quand le
   joueur drag son token, this.token est défini sur le Ruler. Sans ce check,
   le patch activait l'affichage bord→bord même en mode déplacement (ray.B =
   curseur, pas un token cible), ce qui figeait la valeur affichée. Ajout de
   "if (this.token) return context" en tête de _getWaypointLabelContext.

v1.4.3 | 2026-07-28
   range-fix.js — Double mesure dans la règle :
   "bord→bord — natif ft"
   La première valeur est la distance bord→bord (s'arrête à 0 quand les
   tokens se touchent). La seconde est la mesure native Foundry curseur→
   curseur (identique à la règle standard, toujours croissante).

v1.4.2 | 2026-07-28
   range-fix.js — La règle affiche désormais les deux valeurs :
   "bord→bord — ajusté ft" (ex : "6,83 — 9,33 ft").
   La première valeur est la distance brute entre les bords des tokens ;
   la seconde est la valeur que midi-qol compare à la portée de l'arme.
   Suppression du snap à la case (devenu inutile avec les deux valeurs visibles).

v1.4.1 | 2026-07-28
   range-fix.js — Arrondi de la règle (ruler label) à la case grille.
   _patchRulerLabel utilisait adjusted.toNearest(0.01) qui affichait "5.26 ft".
   Désormais toNearest(canvas.grid.distance) arrondit à la case entière :
   5.26 → 5 ft, 7.8 → 10 ft, cohérent avec l'affichage du message jaune midi-qol.
   module.json — Bump 1.4.0 → 1.4.1.

v1.4.0 | 2026-07-28
   range-fix.js — Revert du Number object (v1.3.9). typeof new Number() === "object"
   casse les guards internes de midi-qol qui font typeof distance !== "number",
   court-circuitant le check de portée et laissant toutes les attaques passer.
   Retour à un primitif number : result.distance = raw (bord→bord + adjust).
   La comparaison midi-qol distance > weaponRange fonctionne correctement avec
   un primitif (5.26 > 5 → bloqué). Le message jaune peut afficher la valeur
   arrondie toNearest(grid) mais le blocage est correct.
   module.json — Bump 1.3.9 → 1.4.0.

v1.3.9 | 2026-07-28
   range-fix.js — Court-circuit du .toNearest() de midi-qol via Number object.
   Midi-qol appelle result.distance.toNearest(canvas.grid.distance) sur notre
   valeur retournée, ce qui arrondit 5.26 → 5 ft et laisse passer une attaque
   hors-portée (bug v1.3.8). Solution : on retourne un Number OBJECT (new Number)
   au lieu d'un primitif, avec un .toNearest personnalisé qui retourne la valeur
   exacte sans arrondir. Les opérateurs de comparaison (<, <=, >) font la
   coercition automatique → la valeur exacte (5.26) est bien comparée à la portée.
   Le message affiche ainsi "5.26 away" au lieu de "5 away" ou "10 away".
   module.json — Bump 1.3.8 → 1.3.9.

v1.3.8 | 2026-07-28
   range-fix.js — Suppression du snap sur la distance renvoyée à midi-qol.
   Les versions 1.3.5–1.3.7 snappaient la distance (×5 puis ×2.5) pour éviter
   que midi-qol ne l'arrondisse à la case inférieure. Cela faisait afficher
   "10 away" ou "7.5 away" alors que la distance réelle était ex. 5.26 ft.
   On retourne maintenant la valeur brute bord→bord + adjust directement.
   Le message affiche ainsi la distance exacte calculée par le module.
   ⚠️  Si une future version de midi-qol arrondit la valeur à la case
   inférieure et laisse passer une attaque hors-portée, remettre le snap.
   module.json — Bump 1.3.7 → 1.3.8.

v1.3.7 | 2026-07-28
   range-fix.js — Snap demi-case au lieu de case entière. Le message jaune
   midi-qol affichait "10 away" (arrondi à 10 ft) alors que la distance réelle
   était 7.5 ft. Cause : le snap ceil(raw/5)×5 montait systématiquement à 10.
   Nouveau snap ceil(raw/2.5)×2.5 : 5.26 → 7.5 (non 10), 7.5 → 7.5, 2.5 → 2.5.
   Le message affiche désormais "7.5 away" pour un gap d'une case — plus lisible.
   Le blocage reste fiable car 7.5 > 5 (portée arme).
   module.json — Bump 1.3.6 → 1.3.7.

v1.3.6 | 2026-07-28
   settings.js — Bandeau version + explication GM dans la page de paramètres.
   Sélecteur robuste v12/v13 : data-setting-id en premier, fallback sur l'attribut
   name de l'input si absent (Foundry v13 ne génère plus data-setting-id dans
   certaines vues). Le bandeau orange affiche la version courante et explique
   le fonctionnement du fix (bord→bord + buffer, exemples 5ft/10ft).
   tutoriel/settings.js — Même fix de sélecteur (dual-selector v12/v13) pour
   le bandeau vert du module tutoriel. Bump tutoriel 1.2.5 → 1.2.6.
   module.json — Bump 1.3.5 → 1.3.6.

v1.3.5 | 2026-07-28
   range-fix.js — Fix arrondi midi-qol : midi-qol arrondit probablement la
   distance reçue à la case Foundry (ex. 5.26 ft → 5 ft → ≤ 5 ft arme →
   attaque autorisée à tort). Correction : _ourPatch snappe lui-même le résultat
   à la case supérieure avant de le renvoyer à midi-qol via Math.ceil(raw/grid − ε)×grid.
   Ainsi 5.26 ft → 10 ft → bloqué ✓ ; 2.5 ft → 5 ft → autorisé ✓. Le console.log
   affiche maintenant les deux valeurs : brute et snappée.
   module.json — Bump 1.3.4 → 1.3.5.

v1.3.4 | 2026-07-28
   index.js, range-fix.js, settings.js — Ajout des entêtes JSDoc complets sur
   les trois fichiers du module : auteur, version, licence, description, architecture
   technique (index.js + range-fix.js), compatibilité Foundry v13 / dnd5e v3.
   module.json — Bump 1.3.3 → 1.3.4.

v1.3.3 | 2026-07-27
   range-fix.js — Fix détection tokens dans _ourPatch : si les waypoints de
   midi-qol ne tombent pas dans les bounds d'un token (coordonnées décalées,
   coin hors-bounds, système de coord différent), la détection échouait et le
   patch faisait fallback sans +adjust → attaque passait à tort. Double détection :
   1) bounds + PAD 8 px (comme _patchRulerLabel) ; 2) fallback sur token contrôlé
   + cible désignée (game.user.targets). De plus, _protoCall utilise maintenant
   des options vides ({}) pour le calcul bord→bord, identique à _patchRulerLabel,
   pour garantir que les deux calculs produisent exactement la même distance.
   Console.log ajouté pour confirmer que le patch s'active bien (console Foundry).
   module.json — Bump 1.3.2 → 1.3.3.

v1.3.2 | 2026-07-27
   range-fix.js — Fix affichage règle incohérent avec midi-qol. La règle Foundry
   part de l'endroit où l'utilisateur clique (souvent le centre du token), pas du
   bord. Ajouter 2.5 à measurement.distance donnait donc centre→bord + 2.5, qui
   ne correspondait pas à ce que midi-qol voyait (bord→bord + 2.5). Résultat :
   la règle affichait 5.21 ft alors que midi-qol autorisait l'attaque (bord→bord
   = 0.21 ft). Correction : recalcul bord→bord dans _getWaypointLabelContext
   exactement comme dans _ourPatch (_boundsCenter + _nearestBorderPoint + _protoCall),
   avec _reentering = true pendant l'appel pour éviter toute récursion. La règle
   affiche maintenant la même valeur que midi-qol utilise pour la décision d'attaque.
   module.json — Bump 1.3.1 → 1.3.2.

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
