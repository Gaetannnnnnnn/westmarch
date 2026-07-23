================================================================================
                      SORUTA — TOOLKIT
                      Module Foundry VTT — Privé
================================================================================

Version : 1.0.5
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
          Toute redistribution, modification ou usage commercial est
          strictement interdit sans autorisation écrite.

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Features génériques pour Foundry VTT, indépendantes du concept West March.
Chaque feature est activable/désactivable individuellement depuis les paramètres
du module. Aucune dépendance envers le module "westmarch".

⚠️  MIGRATION DEPUIS WESTMARCH
   Les flags et settings de ces features étaient auparavant stockés sous le
   scope "westmarch". Ils sont maintenant sous "toolkit". Les données existantes
   (formes polymorphes, apparences de token, protection TGCM, etc.) devront être
   reconfigurées lors de la première activation.

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

settings.js
   Enregistre tous les paramètres du module. Accessibles via :
   Paramètres du jeu → Configuration des modules → Soruta — Toolkit.

rage.js
   Taille Large automatique pendant la Rage pour les barbares Voie du Géant
   (feature "Giant's Havoc", palier 3). Dès que l'effet actif "Rage" est activé,
   tous les tokens de l'acteur passent en 2×2 (Large) s'ils sont plus petits.
   La taille d'origine est mémorisée et restaurée à la fin de la rage.

goliath.js
   Taille Large toggle pour les Goliaths (feature "Large Form"). Utiliser la
   feature depuis la fiche bascule le token en 2×2 (Large) ; la réutiliser
   revient à la taille d'origine. Compatible Midi QOL.

polymorph.js
   Transformation de token (Wild Shape / Polymorph). Permet de configurer des
   formes sur un acteur via son onglet Apparence. Un bouton 🐾 dans le HUD
   transforme le token ; un bouton 👤 rétablit la forme originale. Les PV du
   PJ sont transférés sur la bête.

token.js
   Gestion avancée des tokens :
   - Apparences multiples : le GM configure plusieurs images, les joueurs
     cyclent via un bouton ▶ dans le HUD de leur token.
   - Bouton "Voir le portrait" : affiche en grand l'image de la fiche.

tgcm.js
   "Protégé TGCM" : token immunisé à la mort. Bouton bouclier 🛡️ dans le HUD
   (GM uniquement). Un token protégé ne peut jamais tomber à 0 PV. Compatible
   Midi QOL (masque la ligne HP dans la carte de dégâts).

items.js
   Correction de la stat par défaut des outils (tools). Réécrit automatiquement
   la bonne stat canonique à la création de l'item et sur la fiche d'acteur.

foldermove.js
   Ajoute "Déplacer vers…" et "Dupliquer vers…" dans le menu contextuel des
   scènes, acteurs, objets, journaux et dossiers. Ouvre un sélecteur arborescent
   avec recherche en temps réel. GM uniquement.

mejshop.js
   Correctifs pour les boutiques Monk's Enhanced Journal :
   - Bouton "Groupe uniquement" dans "Show to Players" (coche la party en 1 clic)
   - Correction du bug MEJ : les objets cachés restaient visibles aux joueurs.

mejrestock.js
   Réapprovisionnement automatique des boutiques MEJ. Bouton toggle 🔄 par
   article. Quand un article tombe à 0, un timer en jours de calendrier démarre.
   À expiration, la quantité repasse à 1. Délai configurable par rareté.

artbook.js
   Non implémenté.

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Toolkit

- Changement d'apparence des tokens
- Bouton "Voir le portrait" (HUD du token)
- Taille Large pendant la Rage (Voie du Géant)
- Taille Large — Goliath (Large Form)
- Transformation de token (Wild Shape / Polymorph)
- Protégé TGCM (token immunisé à la mort)
- Déplacer/Dupliquer vers… (sidebar)
- Correction de la stat des outils (tools)
- Correctifs boutiques Monk's Enhanced Journal
- Réapprovisionnement boutiques — Délai par défaut (jours)
- Réapprovisionnement boutiques — par rareté : Commun / Peu commun / Rare /
  Très rare / Légendaire (jours, 0 = utilise le délai par défaut)

--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Dans Foundry : Setup → Add-on Modules → Install Module
2. Coller l'URL du manifest dans le champ "Manifest URL" :
   https://raw.githubusercontent.com/Gaetannnnnnnn/toolkit/main/toolkit/module.json
3. Cliquer "Install"
4. Activer le module dans le monde : Setup → Gérer les modules

================================================================================
                    TOOLKIT — MISES À JOUR
================================================================================

v1.0.5 | 2026-07-23
   Synchronisation module.json / readme.txt sur la même version.

v1.0.4 | 2026-07-22
   export-dialog.js — Liste des modules à nettoyer remplacée par un registre
   dynamique CONFIG.asharaSheetsModules. Chaque module se déclare lui-même au
   init ; toolkit n'a plus de liste hardcodée. toolkit se déclare dans
   ExportDialogHooks(). tutoriel retiré (pas de flags acteur).

v1.0.3 | 2026-07-22
   export-dialog.js — Dialog de choix lors de l'export d'un acteur :
   "Fiche actuelle" (export complet) ou "Fiche originale dnd5e" (flags modules
   supprimés, sheetClass réinitialisée). S'affiche uniquement si l'acteur
   contient des données propres aux modules Ashara.

v1.0.2 | 2026-07-22
   mejshop.js — Fix crash au chargement : import mort partyFeatureEnabled
   supprimé (résidu de la migration depuis westmarch, jamais utilisé).
