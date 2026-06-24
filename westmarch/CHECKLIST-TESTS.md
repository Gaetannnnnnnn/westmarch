# Checklist de tests — WestMarch Système

À refaire après chaque mise à jour du module (upload + restart du serveur).
Cocher au fur et à mesure. Les points marqués **(régression)** correspondent
à des bugs déjà corrigés une fois — à vérifier en priorité.

Version testée : ____________   Date : ____________   Testé par : ____________

---

## 1. Système de parties (player.js)

- [ ] **Create Party** : un GM peut créer sa party (clic droit sur lui-même dans la liste des joueurs)
- [ ] **Create Party with Log** : démarre aussi le journal de session (voir section 8)
- [ ] **Join Party** : un joueur peut rejoindre la party d'un GM
- [ ] **Leave Party** : un joueur peut quitter sa party
- [ ] **Leave Party (GM chef)** : dissout bien la party pour tous ses membres
- [ ] **Kick Party** : le GM peut expulser un joueur de sa party
- [ ] **Invite Party** : le GM peut inviter un joueur directement
- [ ] Les options du menu n'apparaissent que quand elles sont pertinentes (pas de "Join Party" si déjà dans une party, etc.)
- [ ] Regroupement visuel : les membres d'une party sont bien groupés avec séparateurs colorés dans la liste des joueurs
- [ ] Bouton refresh (icône ↻) recharge bien la liste des joueurs
- [ ] Liste des joueurs scrollable si beaucoup de joueurs connectés

## 2. Join Scene (player.js + socket.js)

- [ ] Un membre de party peut rejoindre la scène d'un autre membre via clic droit → "Join Scene"
- [ ] **(régression)** Le déplacement fonctionne bien dans les deux sens (A → scène de B, et B → scène de A)
- [ ] Message d'avertissement correct si le joueur ciblé n'est sur aucune scène
- [ ] Option absente si la cible n'est pas dans la même party, est un GM, ou est soi-même

## 3. Téléportation de groupe (scenes.js + journal.js)

- [ ] "Go With Party" depuis le répertoire de scènes téléporte tous les membres de la party
- [ ] "Go With Party" depuis un lien de scène dans un journal fait la même chose
- [ ] "Go Alone" depuis un lien de scène dans un journal téléporte uniquement soi-même
- [ ] **(régression)** Tous les membres arrivent bien sur la scène (pas seulement certains clients)

## 4. Show Party — partage d'image (image.js)

- [ ] Bouton "Show Party" visible dans la barre de titre des popouts d'image (GM uniquement)
- [ ] Clic partage l'image à tous les membres connectés de la party du GM
- [ ] Message d'avertissement si aucun membre de la party n'est connecté
- [ ] Bouton absent côté joueur

## 5. Blocage XP et Level Up (xp.js)

- [ ] Un joueur ne peut pas modifier son champ XP directement
- [ ] Un joueur ne peut pas cliquer sur Level Up / monter de niveau (fiche standard)
- [ ] Idem via l'assistant d'avancement dnd5e
- [ ] Idem via un import de classe par un module tiers (ex. Plutonium)
- [ ] Le GM peut toujours librement modifier l'XP et faire monter de niveau
- [ ] Le niveau reste visible (juste non cliquable) sur la fiche joueur

## 6. Apparence des tokens (token.js)

- [ ] Popup d'import s'ouvre correctement depuis la configuration du token (onglet Apparence)
- [ ] "Parcourir" (FilePicker) fonctionne pour l'image de personnage **(régression)**
- [ ] "Parcourir" fonctionne pour l'image de bordure **(régression)**
- [ ] "Importer (PC)" fonctionne pour les deux images (upload direct)
- [ ] Cadrage à la souris (glisser-déposer) fonctionne
- [ ] Zoom (molette / curseur) fonctionne
- [ ] Bouton de réinitialisation du cadrage fonctionne
- [ ] Curseur "Taille de la découpe" ajuste bien le cercle de découpe en aperçu
- [ ] Cliquer en dehors de la popup (sur le canevas, sur une autre fenêtre) ne l'annule plus **(régression)**
- [ ] PNG exporté : fond bien transparent, **aucun quadrillage visible** dans le résultat final **(régression)**
- [ ] PNG exporté : le personnage ne dépasse pas de la bordure ronde, dans les coins comme sur les côtés **(régression)**
- [ ] Bouton ▶ dans le HUD du token (joueur) fait bien cycler vers l'apparence suivante
- [ ] Le bouton ▶ n'apparaît que sur le token du joueur concerné (pas sur ceux des autres)

## 7. Journal de session (session.js)

- [ ] Bouton "Clore la session" apparaît sous la liste des joueurs quand une party "with Log" est active
- [ ] **(régression)** Aucun bouton dupliqué/orphelin n'apparaît ailleurs sur l'écran, y compris après plusieurs ouvertures/fermetures de session
- [ ] Le journal généré contient les bons joueurs avec XP avant/après
- [ ] Détection correcte d'un level up dans le rapport
- [ ] Les ennemis affrontés (CR, HP, CA, actions/résistances légendaires) sont bien listés
- [ ] Les PNJ présents sur la scène en fin de session apparaissent dans le rapport
- [ ] Les objets obtenus par les joueurs de la party apparaissent dans le rapport
- [ ] Le journal est bien créé dans MJ/<nom du GM>/Rapport de session/
- [ ] La party est bien dissoute automatiquement après la clôture

## 8. Anti-Cheat en combat (anticheat.js)

- [ ] Pendant un combat actif, (dé)préparer un sort déclenche une alerte whisper au GM
- [ ] (Dés)attuner un objet déclenche une alerte
- [ ] (Dés)équiper une arme/armure déclenche une alerte
- [ ] Regagner des utilisations d'une feature pendant le combat déclenche une alerte
- [ ] Modifier le max d'utilisations d'une feature déclenche une alerte
- [ ] Regagner un emplacement de sort pendant le combat déclenche une alerte
- [ ] Aucune alerte hors combat (combat non démarré, ou personnage non engagé)
- [ ] Aucune alerte si l'action est faite par un GM
- [ ] L'alerte n'est visible que par le(s) GM concerné(s), pas par les joueurs

## 9. Chat filtré + Webhook Discord par scène (chat.js)

- [ ] Onglets IC / OOC / Other bien séparés
- [ ] Un joueur ne voit que les messages de sa propre party dans chaque onglet
- [ ] Sans party assignée, tous les messages restent visibles
- [ ] Le GM voit toujours tous les messages
- [ ] Webhook configuré sur une scène : les messages IC sont bien relayés vers le bon salon Discord
- [ ] Scènes différentes → salons Discord différents (ou aucun si non configuré)
- [ ] Le nom et l'avatar du personnage apparaissent correctement côté Discord

## 10. Log Discord des modifications (discordlog.js)

- [ ] Ajout d'un objet d'inventaire → message Discord envoyé
- [ ] Suppression d'un objet → message envoyé
- [ ] Changement de quantité d'un objet → message envoyé, **côté joueur aussi** **(régression)**
- [ ] Gain de niveau → message envoyé
- [ ] Changement d'XP → message envoyé
- [ ] Changement de monnaie → message envoyé, **côté joueur aussi** **(régression)**
- [ ] Création / suppression de personnage → message envoyé
- [ ] Tag "⚠️ joueur" présent quand l'action vient d'un joueur, absent pour un GM
- [ ] **(régression)** Un seul message envoyé, pas de triplon, même avec plusieurs comptes connectés
- [ ] **(régression)** Les logs fonctionnent même quand aucun GM n'est connecté (joueurs seuls)

## 11. Faux message de maintenance (fake-warning.js)

- [ ] Icône "WestMarch" (marteau) visible dans la barre d'outils de gauche, GM uniquement
- [ ] Bouton ⚠️ ouvre bien la fenêtre de sélection
- [ ] Liste déroulante propose bien les joueurs actuellement connectés
- [ ] Message par défaut pré-rempli, modifiable
- [ ] Après envoi, seul le joueur ciblé voit la notification jaune apparaître
- [ ] Les autres joueurs connectés ne voient rien

## 12. Paramètres du module (settings.js)

- [ ] Bandeau d'info (version, description, auteur, "Module propriétaire Ashara") visible en haut de la page de paramètres
- [ ] Désactiver "Système de Party" grise bien toutes les sous-options dépendantes
- [ ] Réactiver "Système de Party" restaure l'état précédent des sous-options (pas remises à zéro)
- [ ] Chaque paramètre indépendant active/désactive bien la fonctionnalité correspondante quand on le coche/décoche

## 13. Améliorations diverses

- [ ] Fenêtre de permissions/propriété d'un document (clic droit → Configurer/Permissions) limitée en hauteur avec scroll si besoin

---

## Bugs trouvés pendant ce test

| Fonctionnalité | Description du problème | Capture / log |
|---|---|---|
|  |  |  |
|  |  |  |
