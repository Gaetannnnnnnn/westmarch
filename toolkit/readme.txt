================================================================================
                      SORUTA — TOOLKIT
                      Module Foundry VTT — Privé
================================================================================

Version : 1.2.4
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

template.js
   Snap des templates AoE au dixième de pied (0,1 ft). Pendant le placement,
   la taille s'incrémente par paliers de 0,1 ft (saccadé) — pas de valeurs au
   centième. Couvre cercle, cône, rayon et rect. Patch via lib-wrapper +
   hooks preCreate/preUpdate.

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

v1.2.4 | 2026-07-30
   export-dialog.js — Fix export fiche originale : saveDataToFile() n'existe plus
   en Foundry v13. Remplacé par un téléchargement natif browser (Blob + <a> click).
   Fix secondaire : callback Dialog sécurisé pour accepter HTMLElement ou jQuery
   (v13 peut passer les deux selon le contexte).

v1.2.3 | 2026-07-29
   mejshop.js — Fix root cause du hide items : les items MEJ sont des objets
   Foundry bruts avec _id (pas id). Notre check i?.id était toujours undefined
   → rien n'était jamais ajouté à hiddenIds même quand hidden:true était présent.
   Correction : const itemId = i._id ?? i.id.

v1.2.2 | 2026-07-29
   mejshop.js — Fix détection item caché : accepte i.hidden ET i.hide (MEJ
   utilise l'un ou l'autre selon la version). Ajout log diagnostic qui affiche
   la structure réelle du premier item MEJ pour identifier le champ utilisé.

v1.2.1 | 2026-07-29
   mejshop.js — Bail silencieux si l'élément n'a pas de [data-id] (évite le
   log parasite sur les fenêtres non-MEJ comme Players, Chat, etc.) ; ajout de
   candidates MEJ supplémentaires (journalEntry, options.entity, object.document,
   object.journalEntry) ; log debug plus détaillé (clés options + types) pour
   diagnostiquer les cas où le JournalEntry reste introuvable.

v1.2.0 | 2026-07-29
   mejshop.js — Fix hide items : triple stratégie pour trouver le JournalEntry
   (application.document pour ApplicationV2 + application.object pour V1 +
   fallback UUID depuis options) ; suppression du guard "page.isOwner" qui
   pouvait masquer des pages légitimes ; deux setTimeout (150 ms + 800 ms) +
   MutationObserver pendant 5 s pour attraper les items chargés de façon
   asynchrone par MEJ ; logs console.debug pour diagnostiquer les cas restants.

v1.1.9 | 2026-07-29
   mejshop.js — Fix 2 refonte complète : abandon de la détection par
   pageId (trop fragile selon la version MEJ). On remonte maintenant au
   JournalEntry depuis application.object, on collecte tous les item-ids
   marqués hidden dans toutes les pages shop du journal, puis on retire
   les lignes [data-id] correspondantes côté DOM. Fonctionne que MEJ
   stocke l'app par Entry ou par Page.

v1.1.8 | 2026-07-28
   mejshop.js — Fix 1 (bouton "Groupe uniquement") : les flags de party
   sont sur le module "westmarch", pas "toolkit". getFlag("toolkit", "partyId")
   retournait toujours undefined → "Aucun membre connecté".
   Corrigé en getFlag("westmarch", "partyId") pour le GM et les joueurs.

v1.1.7 | 2026-07-28
   mejshop.js — Fix 2 (cacher items joueur) : deux corrections.
   (1) MEJ stocke les items en tableau [{id, hidden, ...}] — l'ancien code
   faisait items[id] sur un tableau (toujours undefined). On convertit
   maintenant en objet keyed avant la recherche.
   (2) Si MEJ n'a pas migré vers ApplicationV2, renderApplicationV2 ne
   fire jamais pour la boutique. Ajout d'un hook renderApplication (v1)
   en parallèle, avec conversion jQuery → Element.

v1.1.6 | 2026-07-28
   template.js — Fix snap live : le wrap sur TemplateLayer._onDragLeftMove
   ne tirait pas en Foundry V13 (méthode absente du flux de placement V13).
   Remplacement par un wrap sur MeasuredTemplate.prototype._refreshShape,
   appelé directement dans la chaîne de rendu V13 avant que la forme et
   l'étiquette ne soient dessinées. Le snap est appliqué AVANT l'appel
   original → la valeur snappée est celle que Foundry dessine, sans double
   render. module.json — Bump 1.1.5 → 1.1.6.

v1.1.5 | 2026-07-28
   template.js (nouveau) — Snap des templates AoE (cercle, cône, rayon, rect)
   au dixième de pied. Pendant le drag la distance s'incrémente par paliers de
   0,1 ft (effet saccadé) au lieu de suivre la souris pixel par pixel. Le snap
   s'applique aussi à la création (preCreateMeasuredTemplate) et à toute
   modification ultérieure (preUpdateMeasuredTemplate). Activable/désactivable
   depuis les settings. Nécessite lib-wrapper pour le snap live.
   settings.js — Nouveau setting "enableTemplateSnap" + séparateur "Templates AoE".
   index.js — Branchement de TemplateHooks().
   module.json — Bump 1.1.4 → 1.1.5.

v1.1.4 | 2026-07-26
   character.css — Style des boutons du dialog Export : bouton Exporter en dégradé
   or (#c9a84c → #9e7c2a) sur fond sombre, texte brun foncé, hover lumineux.
   Bouton Annuler en gris-parchemin discret avec bordure or subtile.
   module.json — Bump 1.1.3 → 1.1.4.

v1.1.3 | 2026-07-26
   export-dialog.js — Fix icône "Fiche originale dnd5e" : fa-d-and-d-beyond est une
   icône de marque (FontAwesome Brands), inutilisable avec la classe fas. Remplacée
   par fa-dice-d20.
   module.json — Bump 1.1.2 → 1.1.3.

v1.1.2 | 2026-07-26
   character.css — Refonte visuelle du dialog Export : thème D&D parchemin/or.
   Fond brun sombre (#1a1008), accent or (#c9a84c), texte parchemin (#f0e6cc).
   Intro avec bordure gauche or sur fond ambre. Options : bordure or, hover doré,
   sélection encadrée or. Descriptions en brun-parchemin (#a89070) lisible.
   module.json — Bump 1.1.1 → 1.1.2.

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
