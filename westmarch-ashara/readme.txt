================================================================================
                      SORUTA — WESTMARCH ASHARA
                      Module Foundry VTT — Privé Ashara
================================================================================

Version : 1.0.9
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : © 2026 Soruta — Tous droits réservés. Usage personnel autorisé.
          Toute redistribution, modification ou usage commercial est
          strictement interdit sans autorisation écrite.

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Personnalisations spécifiques au serveur Ashara. Ce module contient les
features liées à l'organisation du serveur : gestion des temps morts,
blocage des progressions autonomes, logs Discord des modifications, notification
automatique de changement de date et utilitaires GM.

Aucune dépendance envers les modules "westmarch" ou "toolkit", mais conçu
pour fonctionner en complément des deux.

⚠️  MIGRATION DEPUIS WESTMARCH
   Les flags et settings de ces features étaient auparavant stockés sous le
   scope "westmarch". Ils sont maintenant sous "westmarch-ashara". Les URLs
   de webhooks Discord et les données de temps morts devront être reconfigurés
   lors de la première activation.

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

settings.js
   Enregistre tous les paramètres du module. Accessibles via :
   Paramètres du jeu → Configuration des modules → Soruta — WestMarch Ashara.

socket.js
   Canal de communication ciblée entre clients pour le faux message de
   maintenance. Utilise le système de queries Foundry v13, sans déclaration
   "socket: true" dans le manifeste.

xp.js
   Empêche les joueurs de modifier leur XP ou de monter de niveau (fiche
   standard, assistant d'avancement, ou modules tiers comme Plutonium). Bloque
   aussi visuellement le champ XP et le bouton Level Up sur la fiche, sans
   les masquer. Les GM conservent un accès complet.

caldate.js
   Quand le GM avance la date dans Simple Calendar, envoie automatiquement
   un message sur un webhook Discord dédié (paramètre "URL du Webhook Discord
   (changement de date)"). Le message indique la nouvelle date, la saison, et
   tout événement astronomique ou festival du calendrier Forgotten Realms.
   Ne s'envoie qu'une fois par changement de jour. Un seul message même si
   plusieurs GM sont connectés (élection du GM actif).

discordlog.js
   Envoie un message dans un salon Discord à chaque modification notable :
   - Ajout / suppression d'un objet d'inventaire, ou changement de quantité
   - Gain de niveau (classe) ou changement d'XP
   - Changement de monnaie (PP/PO/PE/PA/PC), avec le détail des deltas
   - Création / suppression d'un personnage
   Chaque message indique qui a fait l'action. Protection anti-doublon (5s)
   pour les modules tiers qui déclenchent deux fois le même évènement.
   Un seul message par évènement même avec plusieurs clients connectés.

fake-warning.js
   Ajoute un groupe d'icônes "westmarch-ashara" dans la barre d'outils de
   gauche (GM uniquement). En cliquant sur l'icône ⚠️, le GM peut envoyer
   un faux message d'avertissement Foundry (notification jaune) à un joueur
   ciblé — pratique pour simuler une correction de bug.

tm.js
   Système de temps morts en deux temps :
   Côté joueur — bouton sablier ⏳ dans le header de la fiche personnage.
   Couleur dynamique : gris = rien, orange = activité ajoutée non soumise,
   vert = déclaration envoyée. Deux types d'activités disponibles :

   Gain de compétence — choisit une compétence ou maîtrise (Maîtrise,
   Expertise, Tools), dates de début/fin, test de compétence optionnel
   (≥5 jours). Prévisualisation du taux journalier en temps réel.
   Formule : (1 + modif_carac + 2 si maîtrise + 2 si expertise OU +4 tools)
   × jours, puis modificateur d20 optionnel.

   Artisanat — choisit le type d'objet (arme, armure, parchemin, baguette…),
   sa rareté, son prix de base ou niveau de sort, les dates. Calcule le coût
   en PO, les jours nécessaires et la progression. Prise en charge de la
   réduction de coût si fabrication partielle (daysAlready).

   Système panier : le joueur peut ajouter plusieurs activités (Gain et/ou
   Craft) dans une même déclaration avant de soumettre. Chaque activité est
   résumée dans le panier avec possibilité de retrait individuel.
   Toutes les fenêtres utilisent foundry.applications.api.DialogV2.

   Côté GM — bouton ⏳ dans la barre WestMarch de gauche. Affiche toutes
   les déclarations reçues. Vue multi-items (read-only) par joueur. Le GM
   peut corriger et applique les gains en un clic. À l'application : XP de
   compétence et/ou PO créditées sur la fiche, whisper au joueur, résumé
   dans le chat GM, envoi sur le webhook Discord "temps morts".


--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — WestMarch Ashara

- Blocage de l'XP et du Level Up
- Log Discord (modifications)
- URL du Webhook Discord (log modifications)
- URL du Webhook Discord (changement de date)
- URL du Webhook Discord (résultats temps morts)


--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Dans Foundry : Setup → Add-on Modules → Install Module
2. Coller l'URL du manifest dans le champ "Manifest URL" :
   https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch-ashara/main/westmarch-ashara/module.json
3. Cliquer "Install"
4. Activer le module dans le monde : Setup → Gérer les modules
5. Configurer les URLs de webhooks Discord dans les paramètres du module


================================================================================
                    WESTMARCH-ASHARA — MISES À JOUR
================================================================================

v1.0.9 | 2026-07-26
   tm.js — Documentation des fonctionnalités présentes depuis v1.0.2–1.0.3
   mais jamais consignées dans le changelog :

   Artisanat (Craft) : nouveau type d'activité de temps mort parallèle au
   Gain de compétence. craftDeclFormHtml() génère le formulaire : type d'objet
   (arme, armure, parchemin, baguette, anneau, autre), rareté, prix de base
   ou niveau de sort, option "usage unique", dates de début/fin. getCraftStats()
   calcule le coût en PO, les jours nécessaires et la progression.
   wireCraftControls() câble les événements (rafraîchissement en temps réel
   du coût, de la progression et des champs conditionnels selon le type).
   deductGoldCost() déduit les PO directement sur la fiche (via item "Currency").

   Système panier : openDeclarationDialog() réécrit avec un panier multi-items.
   Le joueur peut ajouter autant d'activités que souhaité (Gain et/ou Craft) avant
   de déclarer. cartHtml() génère le résumé du panier. Le flag "tm" passe de
   {type, ...} (ancien format plat) à {items: [...], declared: bool} (nouveau).
   tmFlagItems() normalise l'un ou l'autre format pour compatibilité ascendante.

   Vue GM multi-items : buildActorRow() réécrit pour afficher toutes les activités
   d'un joueur en read-only (type, dates, gains calculés). applyDowntimeGains()
   réécrit pour itérer sur items[], appliquer chaque gain (compétence ou craft),
   envoyer un whisper et un embed Discord par joueur.

   DialogV2 : openDeclarationDialog() et openDowntimeDialog() migrés vers
   foundry.applications.api.DialogV2 (avec fallback DialogV2 direct).

   Bouton sablier : couleur dynamique gris/orange/vert selon l'état du flag.
   Tooltip indique le nombre d'activités et leur résumé. Craft → bleu.
   module.json — Bump 1.0.8 → 1.0.9.

v1.0.8 | 2026-07-25
   fake-warning.js — Refonte du dialog de sélection des destinataires.
   Ancienne version : `<select>` simple, joueurs actifs uniquement.
   Nouvelle version : checkboxes groupées (GMs d'abord, puis Joueurs) — le
   faux message peut désormais être envoyé à n'importe quel utilisateur connecté
   sauf soi-même, y compris les autres GMs. Ajout d'un bouton "Tout sélectionner /
   Tout décocher" pour sélection rapide. Notification de confirmation liste les
   noms des destinataires.
   module.json — Bump 1.0.7 → 1.0.8.

v1.0.7 | 2026-07-23
   fake-warning.js — Remplacement de l'assignation complète de controls.westmarch
   par le guard pattern (if !controls.westmarch → créer, puis ajouter l'outil).
   Corrige la disparition du bouton "Date Expédition" (carnet) : carnet se charge
   avant westmarch-ashara (ordre alphabétique) et l'ancien code écrasait l'objet
   entier, supprimant les outils déjà ajoutés par d'autres modules.

v1.0.6 | 2026-07-23
   Synchronisation module.json / readme.txt sur la même version.

v1.0.5 | 2026-07-23
   fake-warning.js, tm.js — Retrait du dummy tool et de l'activeTool (inutiles).
   onClick → onChange sur tous les outils button:true (Foundry v13 utilise onChange,
   pas onClick). name "westmarch-ashara" → "westmarch" (doit correspondre à la clé
   dans l'objet controls). index.js — retrait de l'injection CSS dummy devenue inutile.

v1.0.4 | 2026-07-23
   fake-warning.js, tm.js — dummy tool visible: false → true. index.js — injection
   CSS pour masquer le dummy dans le DOM (Foundry v13 n'expand pas les groupes
   dont l'activeTool est invisible). Même fix propagé dans carnet.

v1.0.3 | 2026-07-22
   index.js — Enregistrement dans CONFIG.asharaSheetsModules au init pour que
   toolkit puisse nettoyer les flags "westmarch-ashara" lors d'un export
   "fiche originale". fake-warning.js — Fix groupe WestMarch non expansible en
   Foundry v13 : ajout d'un outil dummy (visible: false) + activeTool: "dummy"
   sur le groupe. Même fix sur le fallback dans tm.js.

v1.0.2 | 2026-07-22
   fake-warning.js, tm.js — Fix boutons barre de gauche inactifs : onChange
   remplacé par onClick (API Foundry v13 pour les outils button: true).
   Titre mis à jour : Soruta — WestMarch Ashara. Copyright readme mis à jour.
