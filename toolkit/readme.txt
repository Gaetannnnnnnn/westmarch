================================================================================
                         SORUTA — TOOLKIT
                         Module Foundry VTT — Privé
================================================================================

Version : 1.0.0
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : Cercle de confiance uniquement — ne pas redistribuer

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Features génériques pour Foundry VTT, indépendantes du concept West March.
Chaque feature est activable/désactivable individuellement depuis les paramètres
du module. Aucune dépendance envers le module "westmarch".

⚠️  MIGRATION DEPUIS WESTMARCH
   Les flags et settings de ces features étaient auparavant stockés sous le
   scope "westmarch". Ils sont maintenant sous "toolkit". Les données existantes
   (formes polymorphes, apparences de token, protection TGCM, etc.) seront
   perdues lors de la première activation si elles ont été configurées dans
   l'ancienne version unifiée du module westmarch.

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

settings.js
   Enregistre tous les paramètres du module Toolkit. Accessible via :
   Paramètres du jeu → Configuration des modules → Soruta — Toolkit.

rage.js
   Taille Large automatique pendant la Rage pour les barbares Voie du Géant
   (feature "Giant's Havoc", palier 3). Dès que l'effet actif "Rage" est activé
   sur un acteur possédant cette feature, tous ses tokens passent en 2x2 (Large)
   s'ils sont plus petits. La taille d'origine est mémorisée et restaurée dès
   que la rage se termine. GM uniquement (évite les conflits multi-clients).

goliath.js
   Taille Large toggle pour les Goliaths (feature "Large Form"). Utiliser la
   feature depuis la fiche bascule le token en 2×2 (Large) ; la réutiliser
   revient à la taille d'origine. Prérequis : la feature doit avoir au moins
   une activité configurée dans dnd5e (ex: Bonus Action). Compatible Midi QOL.

polymorph.js
   Transformation de token (Wild Shape / Polymorph). Permet de configurer des
   "formes" (acteurs existants) sur un acteur via son onglet Apparence (config
   du prototype token). Un bouton 🐾 dans le HUD du token permet de transformer ;
   un bouton 👤 rétablit la forme originale. Les PV du PJ sont transférés sur
   la bête. La sauvegarde ne s'écrase pas : re-transformer depuis une forme
   intermédiaire conserve l'état PC original.

token.js
   Gestion avancée des tokens :
   - Apparences multiples : le GM peut configurer plusieurs images sur un token
     (image personnage + bordure PNG). Les joueurs cyclent via un bouton ▶ dans
     le HUD de leur propre token.
   - Bouton "Voir le portrait" : dans le HUD de tout token, affiche en grand
     l'image de la fiche du personnage. Pour les non-propriétaires, c'est le
     seul bouton visible dans le HUD (les autres sont masqués).

tgcm.js
   "Protégé TGCM" : token immunisé à la mort. Le GM active la protection via
   un bouton bouclier 🛡️ dans le HUD du token. Un token protégé ne peut jamais
   tomber à 0 PV : tout dégât qui l'y amènerait le laisse à 1 PV. Un bouclier
   doré est affiché au-dessus du token sur le client GM. Compatible Midi QOL
   (masque la ligne HP dans la carte de dégâts et affiche les dégâts réels en
   floating text).

items.js
   Correction de la stat par défaut des outils (tools). dnd5e initialise chaque
   outil avec "Intelligence" par défaut, quel que soit l'outil. Ce correctif
   réécrit automatiquement la bonne stat canonique (ex: Outils de voleur →
   Dextérité, Outils de forgeron → Force) à la création de l'item et sur la
   fiche d'acteur. Un rattrapage one-shot au chargement corrige les acteurs
   déjà importés avant l'activation du module.

foldermove.js
   Déplacer et dupliquer des documents via le clic droit du sidebar. Ajoute
   "Déplacer vers…" et "Dupliquer vers…" sur les scènes, acteurs, objets et
   journaux, et "Déplacer vers…" sur les dossiers. Ouvre un sélecteur arborescent
   avec recherche en temps réel. GM uniquement.

artbook.js
   Non activé.

mejshop.js
   Deux correctifs pour les boutiques de Monk's Enhanced Journal (module tiers,
   jamais modifié directement) :
   1) Bouton "Groupe uniquement" dans "Show to Players" : coche en un clic les
      membres d'une party westmarch. Dépend du flag partyId posé par westmarch.
   2) Correction du bug MEJ : les objets "cachés" dans une boutique restaient
      visibles aux joueurs. Corrigé côté affichage client uniquement.
   Géré par le setting "Correctifs boutiques Monk's Enhanced Journal".

mejrestock.js
   Réapprovisionnement automatique des boutiques MEJ. Par article, un bouton
   toggle 🔄 dans la zone des contrôles active/désactive le timer. Quand un
   article tombe à 0 et que le toggle est actif, un timer en jours de calendrier
   démarre. À expiration, la quantité repasse à 1. Délai configurable par rareté
   (Commun, Peu commun, Rare, Très rare, Légendaire) dans les paramètres.
   Un décompte "dans X j" s'affiche sous la quantité quand un timer est actif.


--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Toolkit

- Changement d'apparence des tokens
- Bouton 'Voir le portrait' (HUD du token)
- Taille Large pendant la Rage (Voie du Géant)
- Taille Large — Goliath (Large Form)
- Transformation de token (Wild Shape / Polymorph)
- Protégé TGCM (token immunisé à la mort)
- Déplacer/Dupliquer vers… (sidebar)
- Correction de la stat des outils (tools)
- Correctifs boutiques Monk's Enhanced Journal
- Réapprovisionnement boutiques — Délai par défaut (jours)
- Réapprovisionnement boutiques — Commun / Peu commun / Rare / Très rare / Légendaire (jours)


--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Copier le dossier "toolkit" dans /foundrydata/Data/modules/
2. Redémarrer Foundry : sudo systemctl restart foundryvtt
3. Activer le module : Setup → Gérer les modules → Soruta — Toolkit


================================================================================
                         TOOLKIT — MISES À JOUR
================================================================================

v1.0.0 | 2026-07-20
   Initial release : séparation depuis westmarch (modules rage, goliath,
   polymorph, token, items, tgcm, foldermove, artbook, mejshop, mejrestock).
   Scope settings et flags migré de "westmarch" vers "toolkit".
   Settings manquants ajoutés : enableLargeForm, enablePolymorph,
   enableTgcm, enableFolderMove.
