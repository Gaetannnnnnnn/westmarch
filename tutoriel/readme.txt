================================================================================
                      SORUTA — TUTORIEL
                      Module Foundry VTT — Privé
================================================================================

Version : 1.2.2
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
  tutoriel correspondant à chaque module installé. Les sections dont le module
  requis est absent sont automatiquement masquées du sélecteur et des settings.

--------------------------------------------------------------------------------
FICHIERS
--------------------------------------------------------------------------------

index.js
   Point d'entrée. Enregistre les settings et le bouton toolbar dans le hook
   "init" (avant la construction des contrôles). Déclenche la fenêtre de
   bienvenue dans "ready" (setTimeout 1 s pour laisser l'UI se stabiliser).

modules/settings.js
   Enregistre tous les paramètres : nom du serveur, toggles de modules,
   préférence "hideWelcome" (scope client, par utilisateur).

modules/welcome.js
   Fenêtre de bienvenue (Dialog Foundry). Deux boutons :
     - Commencer le tutoriel
     - Ne plus afficher (mémorisé par client)
   (La croix native Foundry fait office de fermeture.)

modules/tutorial.js
   Moteur du tutoriel :
   - STEPS_BY_FEATURE : définition des étapes par fonctionnalité (pas par module)
   - Filtrage gmOnly / playerOnly : contenu différencié GM vs joueurs
   - beforeShow() : navigation automatique (ouvre fiche + onglet) avant la bulle
   - textGM : texte alternatif pour le GM sur certaines étapes
   - startTutorial() : filtre les étapes selon les settings, lance l'affichage
   - closeTutorial() : nettoie le DOM + retire le listener Echap
   - Fermeture via Echap (keydown listener)
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
CONTENU DU TUTORIEL PAR FONCTIONNALITÉ
--------------------------------------------------------------------------------

Barre WestMarch  (tous)
  → Barre de contrôles latérale
  → Groupe WestMarch et ses outils
  → Bouton tutoriel (rappel touche Echap)

Bestiaire  (tous, contenu différencié GM)
  → Onglet Bestiaire sur la fiche PJ
  → Consultation / modification des entrées

Relations  (tous, contenu différencié GM)
  → Onglet Relations sur la fiche PJ
  → Ajout et gestion des relations

Carnet & Expéditions  (tous, contenu différencié GM)
  → Onglet Carnet (notes, sections, drag & drop, éditeur enrichi)
  → Lier une note à une expédition
  → Onglet Expéditions (dates + durée)
  → Bouton Date Expédition dans la barre (GM uniquement)

Boutiques  (GM uniquement)
  → Boutiques Monk's Enhanced Journal
  → Réapprovisionnement automatique avec délais configurables

Temps morts  (contenu différencié GM/joueur)
  → Bouton sablier sur la fiche (couleurs gris/orange/vert)
  → Contenu de la fenêtre : blocs Gain et Artisanat, panier
  → Après déclaration : suivi et modification
  → Validation des déclarations depuis la barre (GM)

Apparence des tokens  (tous)
  → Portrait grand format (HUD)
  → Accéder au Prototype Token (bouton dans l'en-tête de la fiche)
  → Cycle d'apparences (ouvre prototype token → onglet Apparence, pointe la fenêtre)
  → Wild Shape / Polymorph (même fenêtre, même onglet)

Outils GM  (GM uniquement)
  → Faux message de maintenance
  → Protection TGCM (mort)
  → Blocage XP et Level Up
  → Logs Discord (webhook)

--------------------------------------------------------------------------------
PARAMÈTRES CONFIGURABLES
--------------------------------------------------------------------------------

Accessibles via : Paramètres du jeu → Configuration des modules → Soruta — Tutoriel

  Nom affiché dans le message de bienvenue  (texte libre)
  Barre WestMarch                            (booléen)
  Bestiaire                                  (booléen)
  Relations                                  (booléen)
  Carnet & Expéditions                       (booléen)
  Boutiques Monk's Enhanced Journal          (booléen)
  Temps morts (déclaration & validation)     (booléen)
  Apparence des tokens                       (booléen)
  Outils GM (TGCM, XP, Discord, Fake...)    (booléen)

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

v1.2.2 | 2026-07-26
   tutorial.js — Fix _openProtoTokenAppearance : la fenêtre Prototype Token
   ne s'ouvrait pas lors du tutoriel.
   Cause : les approches précédentes (clic UI + recherche DOM par classe CSS)
   étaient trop fragiles — sheetEl pouvait être null, le bouton introuvable,
   ou la fenêtre non trouvée par querySelectorAll si ses classes avaient changé.
   Correctif : réécriture complète avec triple stratégie ordonnée :
   (1) Interception du hook natif renderPrototypeTokenConfig (déclenché par
   Foundry au moment du render — le plus fiable car on reçoit l'app directement
   sans chercher dans le DOM). Le hook est enregistré AVANT l'ouverture pour
   ne pas rater l'événement.
   (2) Ouverture via new PrototypeTokenConfig(actor.prototypeToken).render(true)
   (instanciation directe de la classe Foundry) en premier lieu.
   (3) Fallback : ouvrir la fiche acteur, attendre 800ms, puis cliquer le
   bouton [data-action="openTokenConfig"] ou tout bouton data-action contenant
   "token" (regex /token/i).
   Détection "déjà ouverte" : ui.windows (registre de toutes les FormApplication
   v1 ouvertes) est vérifié avant toute tentative d'ouverture.
   Timeout de 5s sur le hook pour éviter un freeze si la config ne se rend pas.
   module.json — Bump 1.2.1 → 1.2.2.

v1.2.1 | 2026-07-26
   tutorial.js — Refonte section Apparence des tokens : 3 → 4 étapes.
   Cause des bugs : (1) le target ".tab[data-tab='appearance']" pointait sur le
   panneau de contenu de l'onglet (getBoundingClientRect=0 si inactif) ; (2) la
   détection de la fenêtre token-config via ".application, .app" + querySelector
   pouvait rater en Foundry v13 ApplicationV2 ; (3) aucune étape n'expliquait où
   cliquer pour accéder au Prototype Token.
   _openProtoTokenAppearance() réécrit :
   · Idempotent : si la fenêtre porte déjà .tuto-proto-token et est dans le DOM,
     juste naviguer vers Apparence sans la rouvrir (évite double-ouverture au step 4).
   · Ouverture : clic sur [data-action="openTokenConfig"] dans la fiche (priorité),
     ou fallback actor.prototypeToken.sheet.render() / PrototypeTokenConfig API.
   · Détection de la fenêtre token-config : cherche dans ".application, .app,
     .window-app" celle qui contient [data-tab="appearance"] et n'est pas la fiche.
   · Marquage : ajoute la classe .tuto-proto-token sur la fenêtre trouvée pour que
     les étapes 3 et 4 la retrouvent sans nouvelle recherche.
   Nouvelle étape 2 "Ouvrir le Prototype Token" : beforeShow rend juste la fiche,
   target: '[data-action="openTokenConfig"]' — spotlight sur le bouton de la fiche,
   texte qui explique le chemin d'accès + annonce l'ouverture automatique au Suivant.
   Étapes 3 "Cycle d'apparences" et 4 "Wild Shape / Polymorph" : beforeShow:
   _openProtoTokenAppearance, target: ".tuto-proto-token" (spotlight sur toute la
   fenêtre token-config ouverte), position: "left". Textes enrichis expliquant
   chaque section de l'onglet Apparence et le bouton HUD correspondant.
   module.json — Bump 1.2.0 → 1.2.1.

v1.2.0 | 2026-07-26
   tutorial.js — Section Apparence des tokens : ajout de _openProtoTokenAppearance()
   (ouvre la fiche PJ → clique le bouton prototype token dans l'en-tête → navigue
   vers l'onglet Apparence via nav [data-tab="appearance"]). Les étapes "Cycle
   d'apparences" et "Wild Shape / Polymorph" ont désormais beforeShow:
   _openProtoTokenAppearance et target: ".tab[data-tab='appearance']" au lieu de
   target: null / center, afin d'ouvrir le dialog de configuration du token et de
   pointer l'onglet Apparence pour présenter les 2 parties.
   module.json — Bump 1.1.9 → 1.2.0.

v1.1.9 | 2026-07-26
   tutorial.js — Section Temps morts joueur : l'étape unique générique remplacée
   par 3 étapes ciblées (playerOnly) + 1 étape GM inchangée.
     1. Bouton sablier (target: .westmarch-tm-declare) — explique les 3 couleurs
        (gris = rien, orange = en cours, vert = déclaré)
     2. Contenu de la fenêtre (target: null, center) — blocs Gain compétence et
        Artisanat, panier, bouton Déclarer
     3. Après déclaration (target: .westmarch-tm-declare) — sablier vert, tooltip,
        possibilité de modifier en rouvrant
     4. Valider les déclarations (target: [data-tool='downtime'], gmOnly) — inchangé
   module.json — Bump 1.1.8 → 1.1.9.

v1.1.8 | 2026-07-25
   tutorial.js — Expansion de la section Carnet de 3 à 9 étapes avec variantes
   gmOnly / playerOnly et textGM :
     1. Onglet Carnet (target: nav [data-tab="carnet-journal"])
     2. Ajouter une note (target: .carnet-add-note)
     3. Organiser en sections (target: .carnet-add-section)
     4. Réordonner les notes (target: .carnet-drag-handle)
     5. Replier une note (target: .carnet-toggle-note)
     6. Éditeur de note (target: .carnet-edit-note)
     7. Lier à une expédition (target: .carnet-link-exp)
     8. Onglet Expéditions (target: nav [data-tab="carnet-downtime"])
     9. Bouton Date Expédition (target: [data-tool='carnetDate'], gmOnly)
   module.json — Bump 1.1.7 → 1.1.8.

v1.1.7 | 2026-07-25
   welcome.js — Suppression du bouton "Fermer" dans showWelcome() : redondant
   avec la croix native Foundry (déjà présente sur toutes les fenêtres DialogV2).
   module.json — Bump 1.1.6 → 1.1.7.

v1.1.5 → v1.1.6 | 2026-07-24 — 2026-07-25
   Corrections et ajustements internes (voir session précédente).

v1.1.4 | 2026-07-24
   settings.js — Fix fenêtre de bienvenue invisible pour les autres joueurs :
   showWelcome était scope "client" → chaque navigateur gérait son propre état,
   cocher la case ne concernait que le GM. Changé en scope "world" : le GM
   contrôle l'activation pour tout le monde. Ajout de hideWelcome (scope
   "client", config false) : stocké par utilisateur quand il clique "Ne plus
   afficher". welcome.js — showWelcomeIfNeeded() vérifie les deux (world ON et
   client OFF). Bouton "Ne plus afficher" écrit hideWelcome=true (client) au
   lieu de showWelcome=false (world).

v1.1.3 | 2026-07-24
   tutorial.js — Fix _openActorSheetTab() : ciblait parfois le panneau de contenu
   (.tab) au lieu du bouton de navigation (<nav>). Le panneau inactif a un
   getBoundingClientRect() = 0,0,0,0 → bulle collée au bord gauche. Priorité
   désormais : nav.tabs [data-tab] → .tabs:not(.tab-body) → :not(.tab).
   Étape "Consulter une entrée" (bestiaire) : target null + position center —
   l'étape décrit une action générale, pointer le panneau entier n'avait pas de sens.

v1.1.2 | 2026-07-24
   tutorial.js + tutoriel.css — Fix flèche qui ne pointait pas la cible quand la
   bulle était clampée (ex: cible en haut de l'écran, bulle décalée vers le bas).
   Les flèches CSS utilisent désormais les variables --tuto-arrow-v / --tuto-arrow-h
   calculées dynamiquement en JS après le clamp viewport.

v1.1.1 | 2026-07-24
   tutorial.js — Ajout de SECTION_GM_ONLY (boutiques, outilsGm). isSectionAvailable()
   retourne false pour ces sections quand l'utilisateur n'est pas GM. Les joueurs
   ne voient plus "Boutiques" et "Outils GM" dans le sélecteur ni dans le tutoriel.

v1.1.0 | 2026-07-24
   tutorial.js — Ajout de SECTION_MODULES (map section → module(s) requis) et
   isSectionAvailable() : retourne true si au moins un module requis est actif.
   Sections sans module requis (barreWestmarch) sont toujours disponibles.
   startTutorial() filtre désormais les sections dont le module n'est pas actif.
   welcome.js — showTutorialSelector() filtre les lignes par isSectionAvailable().
   settings.js — Hook renderSettingsConfig masque les toggles des modules absents
   dans la page de configuration (les settings restent enregistrés pour la
   persistance en cas de (ré)activation d'un module).

v1.0.9 | 2026-07-24
   toolbar.js — Fix bouton tutoriel invisible pour les joueurs : le garde
   "if (!controls.westmarch) return" empêchait la création du bouton quand
   aucun module GM n'avait préalablement créé le groupe WestMarch (tous
   gardés par isGM). Remplacé par la création du groupe si absent (même
   pattern que tm.js et carnet.js).

v1.0.8 | 2026-07-24
   tutorial.js — Fix bulle au centre sur les étapes ciblant un outil WestMarch :
   en Foundry v13, les outils d'un groupe ne sont dans le DOM que si le groupe
   est actif. Ajout de _expandWestmarch() (beforeShow) sur les 4 étapes
   concernées (tutoriel, carnetDate, downtime, fakeWarning). Correction des
   sélecteurs : [data-control='westmarch'] [data-tool='xxx'] → [data-tool='xxx']
   (en v13 les tools sont dans une liste séparée, pas des descendants du groupe).
   Mise à jour du texte de l'étape carnetDate pour refléter le nouveau
   comportement (crée toujours une nouvelle expédition).
   tutorial.js — Fix points de progression : Math.min(total, 12) remplacé par
   une fenêtre glissante de 12 points centrée sur l'étape courante. Pour ≤12
   étapes, tous les points sont affichés. Pour >12, la fenêtre glisse et les
   points aux extrémités de la troncature ont la classe "dim".
   tutoriel.css — Ajout de .tuto-dot.dim (opacité 0.3, scale 0.75) pour
   indiquer visuellement la troncature de la fenêtre.

v1.0.7 | 2026-07-23
   tutorial.js — Refonte complète par fonctionnalité (remplace la structure par
   module). Nouveau STEPS_BY_FEATURE avec 8 sections : barreWestmarch, bestiary,
   relations, carnet, boutiques, tempsMorts, apparenceTokens, outilsGm.
   Ajout gmOnly / playerOnly : contenu différencié GM vs joueurs. Ajout textGM
   sur les étapes où le GM voit une version différente du texte. Ajout beforeShow :
   ouverture automatique de la fiche PJ et navigation vers l'onglet ciblé avant
   l'affichage de la bulle. Fermeture via Echap (keydown listener rattaché au
   buildWrap et retiré par closeTutorial).
   settings.js — MODULE_TOGGLES réécrits avec les nouvelles clés de fonctionnalités
   (barreWestmarch, bestiary, relations, carnet, boutiques, tempsMorts,
   apparenceTokens, outilsGm) en remplacement des anciennes clés par module.

v1.0.6 | 2026-07-23
   settings.js — hideWelcome (config: false, default: true) remplacé par
   showWelcome (config: true, default: false) : le setting est maintenant visible
   dans la configuration du module, décoché par défaut (fenêtre de bienvenue
   désactivée au login). La logique est positive (cocher = activer la fenêtre).
   welcome.js — showWelcomeIfNeeded() et le bouton "Ne plus afficher" mis à jour
   pour utiliser showWelcome.

v1.0.5 | 2026-07-23
   index.js — registerTutorielButton() déplacé de "ready" vers "init" pour que
   le hook getSceneControlButtons soit enregistré avant que Foundry construise
   la barre des contrôles. Résout l'icône "?" manquante dans la toolbar.
   settings.js — Tous les game.settings.register() appelés en premier ;
   registerMenu() déplacé en dernier et enveloppé dans un try-catch. Résout
   les settings de tutoriel invisibles en cas d'échec de registerMenu en v13.

v1.0.4 | 2026-07-23
   Synchronisation module.json / readme.txt sur la même version.

v1.0.3 | 2026-07-23
   toolbar.js — onClick → onChange sur le bouton tutoriel (Foundry v13).

v1.0.2 | 2026-07-23
   settings.js — Bouton "Lancer le tutoriel" dans les paramètres du module
   (game.settings.registerMenu). hideWelcome passe à default: true (fenêtre de
   bienvenue désactivée au login par défaut ; déclenchement manuel uniquement).
   tutorial.js — Sélecteurs CSS ciblant les éléments UI mis à jour pour
   Foundry v13 (data-group en complément de data-control). Anneau de spotlight
   décoloré inline : couleur/ombre déléguées à tutoriel.css (.tuto-ring).
   tutoriel.css — Refonte visuelle médiéval-fantastique : cuir sombre, or
   vieilli, parchemin. Suppression du violet. Flèches bordées double-couche.
   Animation fade uniquement (résout le conflit transform/translate de centrage).

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
