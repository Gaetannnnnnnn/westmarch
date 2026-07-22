================================================================================
                      SORUTA — TUTORIEL
                      Module Foundry VTT — Privé
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

Fournit un guide interactif du serveur Ashara.

  Fenêtre de bienvenue — S'affiche automatiquement à chaque connexion tant que
  l'utilisateur ne clique pas "Ne plus afficher". Présente un message d'accueil
  configurable (nom du serveur) et propose de lancer le tutoriel.

  Tutoriel interactif — Série de bulles d'information positionnées sur les
  éléments de l'interface. Chaque bulle pointe vers l'élément dont elle parle
  via un spotlight (4 panneaux semi-transparents qui exposent la cible) et une
  flèche orientée automatiquement. Navigation Précédent / Suivant / Fermer.
  Points de progression visibles dans chaque bulle.

  Bouton toolbar — Un bouton "?" dans la barre WestMarch (côté gauche) ouvre
  un sélecteur de sections : cases à cocher pour chaque partie du tutoriel
  (pré-cochées selon les settings). Permet de relancer uniquement les sections
  souhaitées. Accessible aux joueurs et au GM.

  Configuration par module — Le GM peut activer ou désactiver les sections du
  tutoriel correspondant à chaque module installé.

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

index.js
   Point d'entrée. Enregistre les settings, le bouton toolbar, et déclenche
   la fenêtre de bienvenue au hook "ready".

modules/settings.js
   Enregistre tous les paramètres : nom du serveur, toggles de modules,
   préférence "hideWelcome" (scope client, par utilisateur).

modules/welcome.js
   Fenêtre de bienvenue (Dialog Foundry). Trois boutons :
     - Commencer le tutoriel
     - Fermer
     - Ne plus afficher (mémorisé par client)

modules/tutorial.js
   Moteur du tutoriel :
   - STEPS_BY_MODULE : définition des étapes par module
   - startTutorial() : filtre les étapes selon les settings, lance l'affichage
   - closeTutorial() : nettoie le DOM
   - Spotlight : 4 panneaux positionnés autour de la cible, plein écran si
     aucune cible
   - Anneau lumineux animé autour de la cible
   - Bulle positionnée automatiquement (right/left/top/bottom) avec flip si
     débordement

modules/toolbar.js
   Ajoute le bouton "Tutoriel" dans le groupe WestMarch.
   Visible et cliquable par tous (joueurs + GM).
   Ouvre le sélecteur de sections (showTutorialSelector), pas la fenêtre de
   bienvenue.

styles/tutoriel.css
   Styles de la fenêtre de bienvenue, de l'overlay, de l'anneau de spotlight
   et de la bulle (flèches directionnelles, points de progression, boutons).

--------------------------------------------------------------------------------
CONTENU DU TUTORIEL PAR MODULE
--------------------------------------------------------------------------------

WestMarch (core)
  → Barre de contrôles latérale
  → Groupe WestMarch et ses outils
  → Bouton tutoriel

Bestiaire
  → Onglet Bestiaire sur la fiche PJ
  → Consultation des entrées

Relations
  → Onglet Relations sur la fiche PJ
  → Ajout d'une relation

Carnet d'Expéditions
  → Onglet Carnet (éditeur ProseMirror)
  → Onglet Expéditions (dates + durée)
  → Bouton Date du TM (GM uniquement)

Toolkit
  → Boutiques Monk's Enhanced Journal

WestMarch Ashara
  → Fonctions propres au serveur

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Tutoriel

  Nom affiché dans le message de bienvenue  (texte libre)
  WestMarch — Barre latérale, scènes, party  (booléen)
  Bestiaire — Onglet Bestiaire               (booléen)
  Relations — Onglet Relations               (booléen)
  Carnet d'Expéditions — Onglets Carnet +    (booléen)
  Toolkit — Boutiques MEJ                    (booléen)
  WestMarch Ashara — Fonctions serveur       (booléen)

Paramètre utilisateur (non visible dans la config) :
  hideWelcome — booléen client, mis à true par "Ne plus afficher".
  Réinitialisable en effaçant le localStorage ou en rechargement de la config.

--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Dans Foundry : Setup → Add-on Modules → Install Module
2. Coller l'URL du manifest dans le champ "Manifest URL" :
   https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch/main/tutoriel/module.json
3. Cliquer "Install"
4. Activer le module dans le monde : Setup → Gérer les modules
5. Configurer le nom du serveur et les modules actifs dans les paramètres

================================================================================
                    TUTORIEL — MISES À JOUR
================================================================================

v1.0.1 | 2026-07-22
   toolbar.js — Le bouton "?" ouvre maintenant un sélecteur de sections (cases
   à cocher) au lieu de la fenêtre de bienvenue. Permet de choisir quelles
   parties du tutoriel revoir sans relancer le tout.
   tutorial.js — startTutorial() accepte un paramètre optionnel selectedSections
   (tableau de clés de sections) ; null = comportement par settings (inchangé).
   welcome.js  — Ajout de showTutorialSelector().
   tutoriel.css — Styles du sélecteur (.tuto-section-row, etc.).

v1.0.0 | 2026-07-22
   Initial release. Fenêtre de bienvenue, tutoriel interactif avec bulles
   pointées (spotlight), bouton toolbar WestMarch accessible aux joueurs et GM.
   Contenu pour 6 modules : westmarch, bestiary, relations, carnet, toolkit,
   westmarch-ashara.
