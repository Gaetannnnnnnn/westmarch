================================================================================
                      SORUTA — WESTMARCH SYSTÈME
                      Module Foundry VTT — Open Source
================================================================================

Version : 2.0.7
Auteur  : Soruta (Discord : s0ruta)
Système : dnd5e sur Foundry VTT v13+
Accès   : Open source — redistribution autorisée avec attribution
          © 2026 Soruta — Logiciel open source. Redistribution et modification
          autorisées avec attribution.

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Module core pour les campagnes de type West March, où plusieurs GM gèrent
chacun leur propre groupe de joueurs de manière indépendante. Gère le système
de parties (groupes), la téléportation, le filtrage du chat, le journal de
session et l'anti-cheat.

Ce module fait partie d'un ensemble de trois modules complémentaires :
  • westmarch          (ce fichier) — core multijoueur, open source
  • toolkit            — features génériques (tokens, transformations, MEJ...)
  • westmarch-ashara   — personnalisations serveur Ashara (temps morts, logs...)

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

settings.js
   Enregistre tous les paramètres du module. Accessibles via :
   Paramètres du jeu → Configuration des modules → Soruta — WestMarch Système.

socket.js
   Canal de communication ciblée entre clients (queries Foundry v13). Gère la
   téléportation d'un utilisateur précis vers une scène sans socket natif.

player.js
   Gestion de la liste des joueurs : création/gestion des parties (Create Party,
   Join, Leave, Kick, Invite), menu contextuel, Join Scene, et regroupement
   visuel des membres d'une même party.

scenes.js
   Option "Go With Party" dans le menu contextuel du répertoire de scènes.
   Téléporte tous les membres de la party vers la scène sélectionnée.

journal.js
   Menu contextuel sur les liens de scène dans les journaux : "Go Alone" et
   "Go With Party".

image.js
   Bouton "Show Party" dans la barre de titre des fenêtres d'image (GM
   uniquement). Partage l'image directement aux membres de sa party.

chat.js
   Filtrage du chat par party (3 onglets IC/OOC/Other, isolation par groupe)
   et relay des messages IC vers un webhook Discord par scène.

session.js
   Bouton "Clore la session" sous la liste des joueurs. Capture automatiquement
   l'XP, les ennemis, les PNJ et les objets de la session, et génère un journal.

anticheat.js
   Pendant un combat actif, avertit les GM (whisper) si un joueur modifie ses
   sorts préparés, son attunement ou son équipement sur un personnage engagé.

combat.js
   Détache les combats de la scène et les associe à la party du GM. Chaque
   joueur ne voit que le combat de sa propre party.

audio.js
   Coupe les sons globaux (dés, thème de combat) pour les clients hors-party,
   utilisé en complément du filtrage du chat.

document.js
   Limite la hauteur de la fenêtre de propriété des documents à 70 % de l'écran
   avec scroll si le contenu dépasse.

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — WestMarch Système

- Système de Party (paramètre maître)
  └ Join Scene
  └ Show Party (partage d'image)
  └ Regroupement visuel des joueurs par party
  └ Go With Party (répertoire de scènes)
  └ Go With Party (liens de journaux)
  └ Filtrage du chat par party
  └ Journal de session
  └ Combat lié à la party
- Webhook Discord (chat IC, par scène)
- Anti-Cheat (combat)

--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Dans Foundry : Setup → Add-on Modules → Install Module
2. Coller l'URL du manifest dans le champ "Manifest URL" :
   https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch/main/westmarch/module.json
3. Cliquer "Install"
4. Activer le module dans le monde : Setup → Gérer les modules

================================================================================
                    WESTMARCH — MISES À JOUR
================================================================================

v2.0.7 | 2026-07-22
   socket.js — suppression du code mort (sendFakeWarning, handler
   westmarch.fakeWarning déplacé dans westmarch-ashara). Titre mis à jour :
   Soruta — WestMarch Système. Bandeau settings : copyright open source ajouté.
