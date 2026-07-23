================================================================================
                 SORUTA — MIDI RANGE FIX (ELLIPSES)
                      Module Foundry VTT — Privé
================================================================================

Version : 1.0.8
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
