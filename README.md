# Soruta — Modules Foundry VTT

Modules Foundry VTT v13 / D&D 5e v3 pour le serveur WestMarch d'Ashara.

---

## Modules

| Module | ID | Version | Description |
|--------|----|---------|-------------|
| WestMarch Système | `westmarch` | 2.0.8 | Socle core — sessions, party, chat, combat, audio |
| WestMarch Ashara | `westmarch-ashara` | 1.0.7 | Extensions serveur — temps morts, XP, Discord log |
| Relations | `ashara-relations` | 1.6.0 | Onglet Relations sur la fiche PJ |
| Bestiaire | `ashara-bestiary` | 1.3.1 | Onglet Bestiaire sur la fiche PJ |
| Carnet d'Expéditions | `carnet` | 1.1.8 | Onglets Carnet & Expéditions sur la fiche PJ |
| Map Ouvert Systèmes | `carte-expeditions` | 1.0.2 | Gestion fog of war par personnage/groupe |
| Midi Range Fix | `midi-range-fix` | 1.2.4 | Corrige la portée midi-qol pour les grands tokens |
| Toolkit | `toolkit` | 1.0.7 | Outils GM — polymorph, boutiques MEJ, export fiches |
| Tutoriel | `tutoriel` | 1.1.5 | Guide interactif pour les joueurs et le GM |

---

## Prérequis

### Légende

- **Requis** — sans ce module, la fonctionnalité centrale ne fonctionne pas
- **Recommandé** — fonctionne seul mais incomplet sans
- **Ext. requis** — module tiers indispensable
- **Ext. optionnel** — améliore une feature spécifique

### Tableau des dépendances

| Module | Soruta requis | Soruta recommandé | Externe requis | Externe optionnel |
|--------|--------------|-------------------|----------------|-------------------|
| `westmarch` | — | — | — | `monks-tokenbar` |
| `westmarch-ashara` | `westmarch` | — | — | `simple-calendar` |
| `ashara-relations` | — | — | — | — |
| `ashara-bestiary` | — | `ashara-relations` | — | — |
| `carnet` | `westmarch` | `ashara-bestiary`, `ashara-relations` | — | `simple-calendar` |
| `carte-expeditions` | — | — | — | — |
| `midi-range-fix` | — | — | `midi-qol` | — |
| `toolkit` | — | — | `monks-enhanced-journal` | `lib-wrapper`, `monks-tokenbar` |
| `tutoriel` | — | `westmarch` | — | `monks-enhanced-journal` |

### Chaîne d'héritage des fiches PJ

```
CharacterActorSheet (dnd5e)
  → AshCharacterSheet      (ashara-relations)
    → AshBestiarySheet     (ashara-bestiary)
      → CarnetSheet        (carnet)
```

Chaque module détecte ceux qui le précèdent via `CONFIG.asharaSheets` et hérite de leur fiche. Si un maillon manque, il remonte à la fiche disponible la plus proche.

---

## Notes

- Tous les modules nécessitent **Foundry VTT v13+** et le système **D&D 5e v3+**.
- `midi-range-fix` s'inactive automatiquement si `midi-qol` n'est pas installé.
- `westmarch-ashara` — les dates (temps morts, caldate) utilisent l'API calendrier **native Foundry v13** (`game.time.calendar`), pas `SimpleCalendar.api` directement. Mais en pratique, Simple Calendar est recommandé pour avoir les bons noms de mois du calendrier Ashara. Le log Discord passe par un webhook HTTP configuré en settings.
- `carte-expeditions` et `ashara-relations` sont les seuls modules totalement autonomes.

---

*© 2026 Soruta — Usage personnel autorisé. Toute redistribution ou usage commercial est interdit sans autorisation écrite.*
