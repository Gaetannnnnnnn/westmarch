Soruta — Downtime
=================
Version : 1.0.0
Compatibilité : Foundry VTT v13

Description
-----------
Système de temps morts configurable. Contrairement à westmarch-ashara/tm.js,
toutes les règles sont paramétrables par le GM sans toucher au code :
  - Formule de gain journalier (variables @)
  - Tables de coût/durée pour les crafts
  - Multiplicateurs de jet de compétence
  - Dossier des PJ, minimum de jours pour le test, webhook Discord

Installation
------------
Déposer le dossier "downtime/" dans Data/modules/ de Foundry.
Activer le module dans Paramètres → Gérer les modules.

Configuration
-------------
Paramètres → Configuration des modules → Soruta — Downtime

  Dossier des PJ
    Nom du dossier (ou ancêtre) contenant les acteurs PJ.
    Laisser vide = tous les personnages joueurs.

  Formule de gain (po/jour)
    Expression mathématique évaluée pour chaque activité.
    Variables disponibles :
      @mod         — modificateur de la caractéristique liée à la compétence
      @prof        — bonus de maîtrise du personnage
      @hasMaitrise — 1 si maîtrise cochée, 0 sinon
      @hasExpertise— 1 si expertise cochée, 0 sinon
      @hasTools    — 1 si outils cochés, 0 sinon
      @level       — niveau du personnage
    Fonctions supportées : floor(), ceil(), max(), min(), abs()
    Exemple Ashara : 1 + @mod + @hasMaitrise * 2 + @hasExpertise * 2 + @hasTools * 4

  Minimum de jours pour le test de compétence
    Défaut : 5. En dessous de ce seuil, la case "Test" est désactivée.

  Déduire automatiquement le coût de craft
    Si activé, le coût est soustrait de la bourse à la validation du premier TM.

  Prise en charge du Reliable Talent
    Le d20 ne peut pas être < 10 si l'acteur possède un item
    nommé "Reliable Talent" ou "Talent Fiable".

  URL du Webhook Discord
    Optionnel. Reçoit les notifications de déclaration et de résumé des gains.

  Configurer les tables (bouton)
    Ouvre un éditeur JSON pour :
      - Les multiplicateurs de jet (selon résultat du d20)
      - La table des parchemins de sort (durée + coût par niveau)
      - La table des objets magiques (durée + coût par rareté)

Utilisation
-----------
Joueur : bouton sablier dans le header de sa fiche personnage.
GM     : bouton hourglass dans la barre de contrôle gauche (groupe Downtime).

Changelog
---------
1.0.0 (2026-08-13)
  - Création du module, séparé de westmarch-ashara
  - Formule de gain configurable avec variables @
  - Tables de craft et multiplicateurs de jet éditables via settings
  - Dossier PJ configurable (ou auto-détection)
  - Reliable Talent activable/désactivable
  - Déduction automatique du coût de craft activable/désactivable
