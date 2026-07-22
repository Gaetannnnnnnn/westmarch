================================================================================
                      SORUTA — MAP OUVERT SYSTÈMES
                      Module Foundry VTT — Privé
================================================================================

Version : 1.0.1
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
          Toute redistribution, modification ou usage commercial est
          strictement interdit sans autorisation écrite.

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Carte des expéditions : sur une scène Foundry dédiée servant de carte du monde
commune, chaque GM place le token d'un acteur "Groupe" (fiche dnd5e, onglet
Members). Ce token sert de source de vision et de brouillard de guerre pour les
joueurs dont le personnage est membre de ce Groupe.

Le module synchronise automatiquement les permissions, isole l'exploration par
personnage ET par expédition, et garantit qu'un personnage ne peut jamais être
membre de deux Groupes simultanément. Tout cela est restreint à la seule scène
configurée dans les paramètres.

Module autonome, totalement indépendant du module westmarch (id différent,
namespace de settings/flags : "carte-expeditions").

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

index.js
   Point d'entrée du module. Au hook "init" : enregistre les paramètres
   (map-settings.js) puis initialise tous les hooks (map.js).

modules/map.js
   Cœur du module :
   - Synchronisation de la permission Owner sur les acteurs Groupe (vision/fog)
   - Exclusivité entre Groupes (un personnage = un seul Groupe à la fois)
   - Fog par personnage ET par Groupe actuel (isolation par expédition)
   - Rafraîchissement live du fog côté client concerné

modules/map-settings.js
   Enregistre les paramètres du module et affiche le bandeau d'info dans la
   page de configuration. Accessible via :
   Paramètres du jeu → Configuration des modules → Soruta — Map Ouvert Systèmes.

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Map Ouvert Systèmes

- Scène : carte des expéditions (sélecteur de scène)

--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Dans Foundry : Setup → Add-on Modules → Install Module
2. Coller l'URL du manifest dans le champ "Manifest URL" :
   https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch/main/carte-expeditions/modules/module.json
3. Cliquer "Install"
4. Activer le module dans le monde : Setup → Gérer les modules
5. Dans les paramètres du module, sélectionner la scène servant de carte du monde

================================================================================
                    CARTE-EXPEDITIONS — MISES À JOUR
================================================================================

v1.0.1 | 2026-07-22
   index.js — Fix imports : map.js et map-settings.js référencés depuis modules/
   (chemin corrigé après déplacement). Titre mis à jour : Soruta — Map Ouvert
   Systèmes. Copyright readme mis à jour.
