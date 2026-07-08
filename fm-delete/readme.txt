================================================================================
                     FM-DELETE — MODULE FOUNDRY VTT
                          Auteur : Soruta (Discord: s0ruta)
                                  Version : 1.0.1
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
