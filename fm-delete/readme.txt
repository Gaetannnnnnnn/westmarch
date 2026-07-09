================================================================================
                     FM-DELETE — MODULE FOUNDRY VTT
                          Auteur : Soruta (Discord: s0ruta)
                                  Version : 1.0.3
                         Compatibilité : Foundry VTT v13
================================================================================

PROPRIÉTAIRE — NE PAS REDISTRIBUER


DESCRIPTION
-----------
Ajoute un menu contextuel (clic droit) sur les fichiers dans le FilePicker
de Foundry VTT. Permet aux GMs de supprimer des fichiers directement depuis
l'interface web, sans accès SSH au serveur.

Foundry VTT v13 ne fournit aucun bouton de suppression de fichiers natif.
Ce module comble ce manque.


UTILISATION
-----------
1. Ouvrir n'importe quel FilePicker (ex. : cliquer sur le champ d'image
   d'une scène, d'un token, etc.)
2. Naviguer jusqu'au fichier à supprimer
3. Faire un clic droit sur le fichier → "Supprimer"
4. Confirmer la suppression dans la fenêtre de confirmation

Seuls les GMs voient l'option de suppression.
Les dossiers ne peuvent pas être supprimés (fichiers uniquement).


INSTALLATION
------------
Copier le dossier fm-delete/ dans :
   /srv/foundry/data/Data/modules/fm-delete/

Puis activer le module dans Foundry : Paramètres → Gestion des modules.


================================================================================
                            FM-DELETE — MISES À JOUR
================================================================================

v1.0.3 | 2026-07-09
   index.js   — _serverDelete : diagnostic confirmé — en Foundry v13, les
                opérations non-upload (browse, delete, createDirectory) passent
                par WebSocket, plus par HTTP. Le endpoint /files/ ne répond
                plus à action=deleteFile → 404.
                Nouvel ordre : (1) FilePicker.delete() si dispo, (2) FilePicker
                .manage("deleteFile", {storage, target}) méthode v13 socket,
                (3) game.socket.emit("manageFiles", ...) direct, puis HTTP
                JSON/FormData en dernier recours (compat v12).
   Version    — 1.0.2 → 1.0.3

v1.0.2 | 2026-07-08
   index.js   — _serverDelete : Foundry v13 utilise JSON (Content-Type:
                application/json) pour les opérations non-upload sur /files/.
                Le module essaie maintenant JSON en premier, puis FormData
                en fallback (compat v12). Corrige l'erreur HTTP 404.

v1.0.1 | 2026-07-08
   index.js   — Correction accès FilePicker v13 : remplacé le global déprécié
                FilePicker par foundry.applications.apps.FilePicker.
                Suppression via endpoint serveur /files/ (FilePicker.delete
                n'existe pas en v13 → POST /files/ action:deleteFile).

v1.0.0 | 2026-07-08
   Création du module.
   Clic droit → Supprimer dans le FilePicker (GM uniquement).
   Confirmation DialogV2 avant suppression.
   Compatible Foundry v13 (ApplicationV2 + DialogV2).
