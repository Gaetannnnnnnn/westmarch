================================================================================
                      SORUTA — TOOLKIT
                      Module Foundry VTT — Privé
================================================================================

Version : 1.1.1
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

v1.1.1 | 2026-07-26
   export-dialog.js — Fix hook nom v13 : en Foundry v13, ui.actors est ApplicationV2.
   L'ancien hook "getActorDirectoryEntryContext" (ContextMenu.create, déprécié v13) ne
   fire plus jamais. Le nouveau système (_createContextMenu → _doEvent → #callHooks)
   construit le menu contextuel UNE FOIS au render de la sidebar avec le hook
   "getActorContextOptions" (= get${documentName}ContextOptions). Ce hook reçoit
   (actorDirectoryInstance, menuItems[]) et les modifications sur menuItems sont
   appliquées en place avant la création du ContextMenu.implementation.
   Ajout de Hooks.on("getActorContextOptions", handler) en priorité.
   Les anciens hooks restent enregistrés (inoffensifs, ignorés en v13).
   module.json — Bump 1.1.0 → 1.1.1.

v1.1.0 | 2026-07-26
   export-dialog.js — Diagnostic + robustesse du remplacement de l'option Export.
   Le remplacement de l'option Foundry native échouait silencieusement si son nom
   ou son icône ne correspondait pas exactement à nos critères (idx === -1) → la
   Foundry native restait dans le menu et téléchargeait directement sans dialog.
   Correctifs : (1) détection élargie à "DOCUMENT.ExportData" et aux labels
   localisés contenant "export" (insensible à la casse) ; (2) suppression de
   TOUTES les options correspondantes (boucle inverse) avant d'insérer la nôtre,
   pour éviter les doublons même si plusieurs options matchent ; (3) logs console
   "[Toolkit Export]" à chaque étape pour diagnostiquer en cas de nouvel échec.
   module.json — Bump 1.0.9 → 1.1.0.

v1.0.9 | 2026-07-26
   export-dialog.js — Fix dialog de choix absent : la fonction _exportWithChoice
   vérifiait _hasCustomData(actor) avant d'afficher le dialog. Si l'acteur n'avait
   pas de flags Ashara détectés (CONFIG.asharaSheetsModules vide ou flags absents),
   l'export se faisait directement sans proposer le choix "Fiche actuelle / Fiche
   originale". Suppression du check : le dialog s'affiche désormais systématiquement.
   module.json — Bump 1.0.8 → 1.0.9.

v1.0.8 | 2026-07-26
   export-dialog.js — Fix menu contextuel "Export" invisible / dialog absent.
   Deux causes racines corrigées :
   (1) _getActor(li) échouait en Foundry v13 : la fonction supposait que li était
   un élément jQuery (li.data("document-id")) alors que v13 passe un HTMLElement
   natif. De plus, v13 ajoute data-uuid sur les entrées de sidebar (format
   "Actor.<id>") là où v12 utilisait data-document-id. Résultat : _getActor
   retournait null → condition() retournait false → l'option Export était masquée
   du menu contextuel ("ne propose rien").
   Correctif : normalisation jQuery→HTMLElement, lecture prioritaire de data-uuid
   (split sur "."), fallback data-document-id / data-entity-id, puis jQuery.data()
   en dernier recours.
   (2) Recherche de l'option existante élargie : en plus de "SIDEBAR.Export",
   la recherche tente "DOCUMENT.Export" et une correspondance par icône
   ("file-export") pour couvrir les variations de clés i18n entre versions.
   Si aucune option export n'est trouvée, on l'ajoute quand même en fin de liste.
   module.json — Bump 1.0.7 → 1.0.8.

v1.0.7 | 2026-07-24
   token.js — Fix fuite mémoire : les listeners window "pointermove" et "pointerup"
   ajoutés à l'ouverture du popup d'import de token n'étaient jamais supprimés.
   À chaque ouverture du popup (Importer un token), un nouveau listener
   s'accumulait sur window. Les handlers sont maintenant stockés en variables
   nommées (_onPointerMove, _onPointerUp) et retirés via removeEventListener
   dans cleanup() à la fermeture (Annuler ou Créer).

v1.0.6 | 2026-07-24
   mejrestock.js — Fix logique getRestockDays : le délai par défaut à 0 ne
   désactive plus la fonctionnalité entière. Désormais 0 sur le délai par
   défaut = "pas de fallback" (seules les rarétés avec une valeur > 0 sont
   réapprovisionnées). 0 sur une rareté = désactivé pour cette rareté (sans
   fallback sur le global).
   settings.js — Ajout du paramètre "enableMejRestock" (case à cocher on/off)
   pour activer/désactiver entièrement le système de réapprovisionnement.
   Ajout de séparateurs visuels dans la page de settings : sections
   "Boutiques MEJ" et "Réapprovisionnement automatique" clairement délimitées.
   Mise à jour des hints pour refléter le nouveau comportement.

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
