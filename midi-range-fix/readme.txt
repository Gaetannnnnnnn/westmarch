================================================================================
                      SORUTA — MIDI RANGE FIX
                      Module Foundry VTT — Privé
================================================================================

Version : 1.0.2
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

Aucun paramètre configurable. Le module s'active/désactive depuis la liste
des modules Foundry.

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

v1.0.2 | 2026-07-16
   range-fix.js — patch canvas.grid.measurePath : mesure centre→bord pour
   tokens Large+ (Medium inchangé). Titre mis à jour : Soruta — Midi Range Fix.
