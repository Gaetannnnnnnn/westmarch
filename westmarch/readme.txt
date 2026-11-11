================================================================================
                      SORUTA — WESTMARCH SYSTÈME
                  Foundry VTT module — free and open source
================================================================================

Version  : 2.2.8
Author   : Soruta
System   : dnd5e, Foundry VTT v13 (verified on v14)
Licence  : © 2026 Soruta — open source software. Redistribution and
           modification allowed, provided you credit the author.
Support  : ticket on the Althéia Discord (no private messages, please)
           https://discord.com/invite/sbHSVXDeMJ

Languages: French and English (each user picks in the module settings;
"Automatic" follows the Foundry language).

--------------------------------------------------------------------------------
DESCRIPTION
--------------------------------------------------------------------------------

Foundation for West Marches campaigns: several game masters and several
groups ("parties") playing in parallel in the same world. Each party has its
own sessions, chat, combats and audio, without disturbing the others.

Full module: Soruta — Completed Westmarch (licensed) includes every feature
of WestMarch Système and adds many more (world registry, relations, bestiary,
expedition map, downtime, XP, Discord log…). Do not enable both in the same
world.
Overview (in French): https://altheia.eu/foundry-modules.html

--------------------------------------------------------------------------------
INSTALLATION
--------------------------------------------------------------------------------

1. Foundry VTT: Setup → Add-on Modules → Install Module.
2. Paste the manifest URL:
   https://raw.githubusercontent.com/Gaetannnnnnnn/westmarch/main/westmarch/module.json
3. Install, then enable the module in the world (Manage Modules).

Optional: Monk's TokenBar (token movement during party combats).

--------------------------------------------------------------------------------
SETTINGS
--------------------------------------------------------------------------------

Game Settings → Configure Settings → Soruta — WestMarch Système

- Party system (master setting: when disabled, the options marked ┗ have no
  effect)
  ┗ Join Scene ............................ join a member's scene
  ┗ Show Party ............................ show an image to your party
  ┗ Group players by party ................ sorted player list
  ┗ Go With Party (scene directory) ....... take the whole party along
  ┗ Go With Party (journal links) ......... "Go Alone" / "Go With Party"
  ┗ Filter chat by party .................. IC / OOC / Other tabs
  ┗ Session log ........................... "Close session" button
  ┗ Party-bound combat .................... one combat per party
- Anti-Cheat (combat) ..................... alert to the GM during combat

Visible to every user (players and GMs), each one for themselves:
- Module language ......................... Automatic / English / Français
- Accessibility (window) .................. colour-blind mode, high contrast
                                            and outline colour, compact
                                            left-hand controls
- About (window) .......................... version, author, rights,
                                            website, support

--------------------------------------------------------------------------------
FILES
--------------------------------------------------------------------------------

index.js        Entry point: registers the settings and enables each part.
i18n.js         Module language (tl("French text")) and "Module language"
                setting; i18n-en.js = English dictionary.
accessibility.js  Accessibility window and per-user settings (colour-blind
                filter on the map and the interface, high contrast with
                outline colour, compact controls); styles/accessibility.css.
about.js        "About" window (version, author, rights, website, support).
settings.js     Module settings and information banner in the settings.
player.js       Player list: create / join / leave / invite / kick from a
                party, Join Scene, visual grouping by party.
scenes.js       "Go With Party" in the scene directory.
journal.js      "Go Alone" / "Go With Party" on journal scene links.
socket.js       Moves a specific player to a scene (Foundry v13 targeted
                queries, no module socket).
image.js        "Show Party" button in image windows (GM).
chat.js         Chat filtering by party (IC / OOC / Other tabs) and GM
                buttons: clear, export (text / JSON), import their party's
                messages.
combat.js       One combat per party (partyId flag), the right combat shown to
                each client even on a shared scene, routing of tokens added
                to combat, camera, sounds and movement (Monk's TokenBar) for
                clients outside the party.
audio.js        Mutes global sounds (dice, combat) outside the party.
session.js      "Close session": session journal (players present, XP
                before / after, enemies, NPCs, items found).
anticheat.js    During combat: private alert to the GM if a player changes
                their prepared spells, attunement or equipment.
document.js     Document ownership window limited to 70% of the screen
                (scrolls beyond that).
site.js         Private message to the GMs, once per version and per world:
                link to the modules page on altheia.eu.

================================================================================
                    WESTMARCH — CHANGELOG
================================================================================

v2.2.8 | 2026-11-11
   i18n.js / i18n-en.js — New: French / English interface. Every text of
   the module goes through tl(); English dictionary. "Module language"
   setting (client, visible to everyone): Automatic (Foundry language) /
   English / Français. The "GM" and "Session report" journal folders are
   found under either name, so two GMs using different languages do not
   create duplicates.
   accessibility.js — New (ported from Completed Westmarch): "Accessibility"
   window visible to players and GMs, personal settings: colour-blind mode
   (protanopia / deuteranopia / tritanopia correction on the map and the
   interface), high contrast with outline colour, compact left-hand
   controls.
   about.js — New: "About" window visible to everyone: version, author,
   rights (open source, attribution), source code, website, support
   (Discord ticket), full version.

v2.2.7 | 2026-10-16
   site.js — New: on first launch and after each update, GMs receive a
   private chat message with the link to the modules page on the Althéia
   website (updates + the full Completed Westmarch version). Once per version
   and per world; invisible to players.

v2.2.6 | 2026-10-06
   combat.js — Party combat repair (ported from Completed Westmarch):
     • preCreateCombat no longer forces scene:null (this caused the "you must
       link a scene" error / only one combat possible): a valid scene is kept,
       isolation is done through the partyId flag.
     • Per-client override of the CombatTracker#viewed getter: each player/GM
       sees THEIR party's combat, even on a shared scene.
     • preCreateCombatant routing: a token added to combat on a shared scene
       goes into THEIR party's combat (created if needed), no longer into
       another GM's combat.
   readme — Removed mentions of a "Discord webhook for IC messages" (not
   implemented in this module); header version resynchronised with
   module.json.

v2.2.4 | 2026-07-31
   chat.js + chat.css — 2nd row fix: dropped the insertBefore approach (the
   5th native button does not exist — .control-buttons only contains
   filter/export/flush, the 4 message-style buttons are in a SIBLING
   container). New approach using CSS order: the 3 native buttons get
   order:11 (inline style via JS), the break stays at order:10, our buttons
   (import, clear) get order:11.
   Visual result: row 1 = message-style buttons (sibling) | break (invisible),
   row 2 = filter | floppy | trash | import | clear.
   chat.css — Removed the break's border-top (visually useless in row 1).
   .wm-party-btn order: 10 → 11 (consistent with the new order scheme).

v2.2.3 | 2026-07-30
   chat.js — Move filter+export+flush to row 2: the break div is now inserted
   BEFORE the 5th native button (instead of being appended at the end). The
   4 roll-mode buttons stay in row 1; filter, export, flush + the westmarch
   buttons (import, clear party) all move to row 2.

v2.2.2 | 2026-07-29
   chat.js — 2nd row fix: force flex-wrap with an inline JS style instead of
   CSS !important. Inline styles take absolute priority over stylesheets
   (Foundry's included) — which is how Foundry got around our previous CSS
   !important rules.

v2.2.1 | 2026-07-29
   chat.css — Invisible 2nd row fix: added height:auto!important,
   overflow:visible!important on .control-buttons and #chat-controls so the
   2nd row is not clipped by Foundry's fixed height.
   Added order:10 on .wm-party-break and .wm-party-btn to make sure they
   appear after the native buttons.

v2.2.0 | 2026-07-29
   chat.js + chat.css — Fix for invisible GM party buttons: version 2.1.9
   used insertAdjacentElement('afterend'), which moved the buttons outside
   the container and made them invisible. New mechanism: a .wm-party-break
   separator div (data-wm-action="break", flex-basis:100%) is injected at the
   end of .control-buttons along with the westmarch buttons, and
   flex-wrap:wrap is enabled on the native container.
   Result: 2 stable rows without leaving .control-buttons.

v2.1.9 | 2026-07-29
   chat.js + chat.css — GM party buttons on 2 rows: Foundry's native controls
   stay in .control-buttons (top row), and the westmarch buttons (import,
   clear party) are moved into a new .wm-party-controls div inserted right
   after it (bottom row). Reduces clutter in the chat control bar.

v2.1.8 | 2026-07-28
   chat.js — Fix GM buttons disappearing after a Sidebar re-render:
   _injectPartyChatButtons is now called on every renderChatLog (not only at
   ready). Guard replaced by remove + re-inject: old [data-wm-action] buttons
   are removed before re-injecting, which also keeps the capture listener on
   the native export button (the listener was lost when the DOM was
   recreated).

v2.1.7 | 2026-07-28
   chat.js — Interception of the native export button (floppy disk): capture
   listener on .control-buttons → "Text (.txt) / JSON / Cancel" dialog. Text
   re-triggers Foundry's native behaviour; JSON exports the messages with
   their full HTML (formatting kept on re-import). JSON import: no tab
   dialog, the style is already in the JSON. New function
   _exportPartyChatJSON.

v2.1.6 | 2026-07-28
   chat.js — Import: tab choice dialog (Characters / Rolls / Players /
   Cancel) instead of a simple confirm. The style is applied to all imported
   messages.

v2.1.5 | 2026-07-28
   chat.js — Duplicate tabs fix: document.querySelector('.tabbed-controls')
   guard before the prepend to avoid duplicates when renderChatLog fires
   several times.
   chat.css — margin-left: 4px on .wm-party-btn to space the custom buttons.

v2.1.4 | 2026-07-28
   chat.js — GM button injection through Hooks.once("ready") +
   setTimeout(200ms) to make sure #chat-controls is in the DOM (renderChatLog
   fires too early).
   Fix for renderTemplate deprecated in v13 →
   foundry.applications.handlebars.renderTemplate, with a fallback for v12
   compatibility.

v2.1.3 | 2026-07-28
   chat.js — Button injection fix: the #chat-controls footer is rendered by
   the parent Sidebar and is not in log.element when the hook fires. Now
   uses setTimeout(fn, 0) + document.querySelector on the global document
   instead of $html.find(). Removed the $html parameter from
   _injectPartyChatButtons.

v2.1.2 | 2026-07-28
   chat.js — Party button injection fix: in v13 the icon is a class on the
   button itself (no <i> child), and the controls are in .control-buttons
   (not reached via i.fa-trash-can). New selector: button[data-action="flush"]
   in .control-buttons. makePartyBtn adapted to the v13 ui-control style (FA
   icon directly on the button).
   chat.css — Simplified CSS inheriting Foundry v13's ui-control.

v2.1.1 | 2026-07-28
   chat.js — .txt import parser fix: Foundry's native format is
   "[timestamp] GM Name\ncontent\n---------------------------"
   (not "[timestamp] Author: content" on one line). The new parser splits on
   the "---" separators, extracts the name by stripping the role suffix (GM,
   Trusted…) and rebuilds multi-line content.

v2.1.0 | 2026-07-28
   chat.js — GM party button injection fix: in Foundry v13, renderChatLog
   passes html = message area only (not the bottom controls). Now uses
   log.element (ApplicationV2 root of the sidebar) to find the native
   filter/save/trash buttons. Added a diagnostic console.log listing the
   data-actions found in the root element, to fix the anchoring if needed.
   module.json — Bump 2.0.9 → 2.1.0.

v2.0.9 | 2026-07-28
   chat.js — Three new GM buttons in the chat (visible to GMs only):
     • Clear my party (fa-users-slash) — deletes only the messages whose
       author shares the current GM's partyId. Other parties are not
       affected.
     • Export JSON (fa-file-export) — downloads the party's messages as JSON.
     • Import JSON (fa-file-import) — re-imports a previously exported JSON;
       messages are recreated with their original timestamp to keep the
       chronological order, but with new _ids to avoid conflicts.
   chat.css — styles of the three buttons (.wm-party-btn).
   module.json — Bump 2.0.8 → 2.0.9.

v2.0.8 | 2026-07-23
   module.json / readme.txt synchronised on the same version.

v2.0.7 | 2026-07-22
   socket.js — removed dead code (sendFakeWarning, westmarch.fakeWarning
   handler moved to the former server module). Title updated:
   Soruta — WestMarch Système. Settings banner: open source copyright added.
