================================================================================
  SORUTA — MIDI RANGE FIX
  v1.0.0 | 2026-07-16
================================================================================

MODULE
  id      : midi-range-fix
  titre   : Soruta — Midi Range Fix
  auteur  : Soruta (s0ruta)
  système : dnd5e v3 / Foundry v13

DESCRIPTION
  Corrige le calcul de portée de midi-qol pour les tokens Large, Huge et
  Gargantuan. Sans ce fix, midi-qol mesure du centre de l'attaquant vers
  plusieurs COINS du token cible, ce qui donne ~5.82ft au lieu de 5ft pour
  des tokens adjacents à cause du décalage sub-grille — bloquant des attaques
  de mêlée à 5ft légitimes.

  Le fix intercepte canvas.grid.measurePath et remplace le point cible par
  le point le plus proche sur la BORDURE du token (centre → bord).

RÈGLE APPLIQUÉE
  Chaque token a un "rayon" naturel autour de lui. La portée d'attaque est
  mesurée du centre de l'attaquant au bord le plus proche de la cible.

  Exemple avec arme 5ft :
    - vs Medium (1 case)  : ~2.5ft centre→bord → autorisé ✓  [non modifié]
    - vs Large  (2 cases) : ~2.5ft centre→bord → autorisé ✓  [corrigé]
    - vs Huge   (3 cases) : ~2.5ft centre→bord → autorisé ✓  [corrigé]
    - 1 case de gap       : ~7.5ft centre→bord → bloqué   ✓

FICHIERS
  index.js
  modules/range-fix.js
  module.json

DÉPENDANCES
  - midi-qol (actif) — le module se désactive silencieusement sinon

CHANGELOG
  v1.0.0 | 2026-07-16
     Création du module.
     range-fix.js — patch canvas.grid.measurePath : mesure centre→bord
                    pour tokens Large+ (Medium inchangé).
     module.json  — déclaration initiale v1.0.0
