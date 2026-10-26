# Soruta — WestMarch Système

A **Foundry VTT** module for **West Marches** campaigns: several game masters and several groups of players playing in parallel in the same world, without getting in each other's way.

Each group ("party") has its own sessions, chat, combats and audio. The module is **free and open source**.

- **Module ID:** `westmarch`
- **Version:** 2.2.7
- **Compatibility:** Foundry VTT **v13** (verified on **v14**), **dnd5e** system
- **Author:** Soruta

> The in-game interface of the module is in French.

---

## Features

| Feature | What it does |
|---|---|
| **Party system** | Players create, join and leave groups from the player list (create, join, leave, invite, kick). This is the master setting: the features below depend on it. |
| **Join Scene** | A party member can join the scene another member is on (context menu of the player list). |
| **Go With Party** | From the scene directory or a scene link in a journal: "Go With Party" takes the whole party, "Go Alone" only yourself. |
| **Show Party** | The GM shows an image to their own party only (button in the image window). |
| **Player grouping** | The player list is sorted by party, with a coloured separator. |
| **Party chat** | Each player only sees the messages of their own party. Three tabs (IC / OOC / Other). The GM can clear, export (text or JSON) and re-import their party's messages. |
| **Party combat** | Each combat belongs to its GM's party. Everyone only sees their party's combat, even when several groups play on the same scene. With Monk's TokenBar, movement is handled for players outside the combat. |
| **Party audio** | A party's global sounds (dice, combat theme) are not played for the other parties. |
| **Session log** | "Close session" button under the player list: generates a journal with the players present, XP before / after, enemies met, NPCs and items found. |
| **Anti-cheat (combat)** | During a combat, privately warns the GM if a player changes their prepared spells, attunement or equipment. |

Each feature can be turned on or off separately in **Game Settings → Configure Settings → Soruta — WestMarch Système**.

---

## Installation

In Foundry VTT: **Setup → Add-on Modules → Install Module**, then paste this URL into "Manifest URL":

```
https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch/main/westmarch/module.json
```

Then enable the module in your world (**Manage Modules**).

### Recommended modules (optional)

- **Monk's TokenBar**: token movement handling during party combats.

---

## What about Completed Westmarch?

**Soruta — Completed Westmarch** is the full module, built on top of this one: world registry, relations and bestiary, expedition map with per-character fog of war, downtime and crafting, XP progression, Discord log, diagnostics… It is reserved for trusted tables and requires a licence.

Do not enable both modules in the same world: Completed Westmarch already includes every feature of WestMarch Système.

Overview of both modules (in French): https://altheia.eu/foundry-modules.html

---

## Support and updates

- **A problem or a question?** Open a **ticket** on the Althéia Discord (please avoid private messages): https://discord.com/invite/sbHSVXDeMJ
- **New releases** are announced on the same Discord, in the module updates channel. You can "follow" it from your own server.
- **Detailed version history:** [`westmarch/readme.txt`](westmarch/readme.txt).

---

## Licence

© 2026 Soruta. Open source software: redistribution and modification are allowed, **provided you credit the author** (Soruta) and keep this link to the original project.
