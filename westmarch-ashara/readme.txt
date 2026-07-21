================================================================================
                      SORUTA — WESTMARCH ASHARA
                      Module Foundry VTT — Privé Ashara
================================================================================

Version : 1.0.0
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
   Déclare une activité de temps mort : compétence, proficiency (Maîtrise,
   Expertise, ou Tools), dates de début/fin, test optionnel (≥5 jours).
   Prévisualisation du gain en temps réel.
   Côté GM — bouton ⏳ dans la barre WestMarch de gauche. Liste les
   déclarations des joueurs. Le GM corrige si besoin et applique les gains.
   Formule : (1 + modif_carac + 2 si maîtrise + 2 si expertise OU +4 tools)
   × jours, puis modificateur d20 optionnel.
   À l'application : PO créditées sur la fiche, whisper au joueur, résumé
   dans le chat GM, et envoi sur le webhook Discord "temps morts".


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

v1.0.0 | 2026-07-20
   Initial release : séparation depuis westmarch (modules xp, caldate,
   discordlog, fake-warning, tm). Nouveau socket.js dédié (fakeWarning).
   Scope settings et flags migré de "westmarch" vers "westmarch-ashara".
