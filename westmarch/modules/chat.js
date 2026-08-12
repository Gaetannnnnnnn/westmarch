// ============================================================
// chat.js — Gestion du chat WestMarch
//
// Ce fichier gère trois fonctionnalités indépendantes :
//
//   1. ONGLETS DU CHAT (IC / Rolls / OOC)
//      Le chat Foundry natif n'a pas d'onglets par type de message.
//      On injecte une barre de navigation (tabbedchatlog-nav.hbs) au-
//      dessus du chat, et on masque/affiche les messages selon l'onglet
//      actif ET l'appartenance à la party de l'utilisateur.
//
//   2. FILTRAGE PAR PARTY
//      Chaque utilisateur ne voit que les messages des membres de sa
//      propre party (identifiée par le flag "partyId" sur le User).
//      Un utilisateur sans party voit tous les messages.
//      Le son des jets de dés est également coupé si le message vient
//      d'une autre party (via audio.js).
//
//   3. BOUTONS GM DANS LE CHAT
//      Deux boutons supplémentaires sont injectés dans la barre de
//      contrôles du chat, visibles uniquement par le GM :
//        • "Effacer ma party" — supprime uniquement les messages de la
//          party du GM connecté, sans toucher aux autres parties.
//        • "Importer" — importe un historique de chat depuis un fichier
//          .txt (export natif Foundry) ou .json (export WestMarch).
//      Le bouton export natif de Foundry (floppy disk) est intercepté
//      pour proposer un choix entre .txt et .json.
//
// Dépendances :
//   - settings.js : partyFeatureEnabled(key) — vérifie qu'une feature
//     est activée ET que le système de party est actif.
//   - audio.js : registerSoundFilter(fn) — enregistre un filtre sur les
//     sons joués (utilisé pour couper les dés des autres parties).
//   - templates/chat/tabbedchatlog-nav.hbs : template de la barre
//     d'onglets injectée dans le chat.
//
// Flags Foundry utilisés :
//   - User.flags["westmarch"]["partyId"] : ID de la party de l'utilisateur.
//     Positionné par player.js / session.js lors de la création ou de
//     l'assignation d'une party. Absent = pas de party = voit tout.
// ============================================================

import { partyFeatureEnabled } from './settings.js';
import { registerSoundFilter } from './audio.js';

// Onglet actif parmi "IC" | "OTHER" | "OOC".
// Initialisé à "IC" (messages en personnage) au chargement.
// Mis à jour par changeTab() à chaque clic sur la barre de navigation.
var tabSelected = "IC";

// ============================================================
// ChatHooks — Point d'entrée, appelé depuis index.js au hook "init".
// Enregistre tous les hooks Foundry liés au chat.
// ============================================================
export function ChatHooks() {

    // Hook : appelé à chaque fois qu'un message est rendu dans le chat.
    // On l'utilise pour masquer les messages qui ne correspondent pas à
    // l'onglet actif ou qui viennent d'une autre party.
    Hooks.on("renderChatMessageHTML", (message, html, messageData) => renderChatMessageHTML(message, html, messageData));

    // Hook : appelé à chaque fois que la fenêtre de chat est (re)rendue.
    // La sidebar Foundry peut re-rendre le ChatLog en changeant d'onglet
    // de la sidebar ou après certains actions — on réinjecte les onglets
    // et les boutons GM à chaque fois.
    Hooks.on("renderChatLog", async (log, html, data) => await renderChatLog(log, html, data));

    // Injection des boutons GM dans la barre de contrôles du chat.
    // On attend le hook "ready" (pas "init") car #chat-controls n'existe
    // dans le DOM qu'après le rendu complet de l'interface.
    // setTimeout(300ms) : la Sidebar rend #chat-controls APRÈS le ChatLog,
    // donc on attend un tick supplémentaire pour être sûr qu'il est là.
    if (game.user?.isGM) {
        Hooks.once("ready", () => setTimeout(_injectPartyChatButtons, 300));
    }

    // Filtre audio : coupe le son des jets de dés des autres parties.
    // registerSoundFilter() est défini dans audio.js — il accepte une
    // fonction qui reçoit l'URL du son sur le point d'être joué et
    // retourne true pour le bloquer, false pour le laisser passer.
    registerSoundFilter((src) => {
        if (!partyFeatureEnabled("enableChatFilter")) return false;
        // On ne filtre que le son des dés (CONFIG.sounds.dice).
        if (!src || src !== CONFIG.sounds.dice) return false;

        // Le son joué correspond toujours au dernier message de chat
        // portant ce son. On remonte la liste pour identifier l'auteur.
        const msg = [...game.messages].reverse().find(m => m.sound === src);
        // Bloquer si l'auteur n'est pas de notre party.
        return msg ? !isPartyMember(msg.author) : false;
    });
}

// ============================================================
// ReloadChat — Rafraîchit l'affichage du chat en réappliquant
// l'onglet actif. Appelé depuis l'extérieur (ex. player.js) quand
// la composition de la party change et qu'il faut filtrer à nouveau.
// ============================================================
export function ReloadChat() {
    changeTab(tabSelected);
}

// ============================================================
// renderChatMessageHTML — Masque les messages qui ne doivent pas
// être visibles par l'utilisateur courant.
//
// Deux règles de masquage indépendantes :
//   1. Party : masquer si l'auteur n'est pas de ma party.
//   2. Onglet : masquer si le style du message ne correspond pas à
//      l'onglet actif (IC / OTHER / OOC). Afficher une pastille de
//      notification (#ICNotification, #OTHERNotification, etc.) pour
//      indiquer qu'il y a des messages non visibles dans cet onglet.
//
// Note : ce hook ne gère PAS le masquage initial du chat au chargement
// (c'est changeTab() qui s'en charge en itérant sur tous les messages).
// Ce hook ne gère que les NOUVEAUX messages arrivant en temps réel.
// ============================================================
function renderChatMessageHTML(message, html, messageData) {
    if (!partyFeatureEnabled("enableChatFilter")) return;

    // Masquer si l'auteur n'appartient pas à la même party que moi.
    if (!isPartyMember(message.author)) {
        $(html).hide();
    }

    // Masquer si le message n'est pas du type affiché par l'onglet actif.
    // Afficher la pastille de notification de l'onglet correct à la place.
    // La pastille est définie dans tabbedchatlog-nav.hbs, avec l'id
    // "<STYLE>Notification" (ex. "ICNotification", "OTHERNotification").
    switch (tabSelected) {
        case "IC":
            if (message.style != CONST.CHAT_MESSAGE_STYLES.IC) {
                $(html).hide();
                $('#' + Object.keys(CONST.CHAT_MESSAGE_STYLES).find(key => CONST.CHAT_MESSAGE_STYLES[key] === message.style) + "Notification").show();
            }
            break;
        case "OTHER":
            if (message.style != CONST.CHAT_MESSAGE_STYLES.OTHER) {
                $(html).hide();
                $('#' + Object.keys(CONST.CHAT_MESSAGE_STYLES).find(key => CONST.CHAT_MESSAGE_STYLES[key] === message.style) + "Notification").show();
            }
            break;
        case "OOC":
            if (message.style != CONST.CHAT_MESSAGE_STYLES.OOC) {
                $(html).hide();
                $('#' + Object.keys(CONST.CHAT_MESSAGE_STYLES).find(key => CONST.CHAT_MESSAGE_STYLES[key] === message.style) + "Notification").show();
            }
            break;
    }
}

// ============================================================
// renderChatLog — Réinjecte les onglets et les boutons GM à chaque
// re-render du ChatLog.
//
// Pourquoi réinjecter à chaque fois ?
// Foundry re-rend le ChatLog (et donc efface les éléments injectés)
// dans plusieurs situations : changement d'onglet de la sidebar,
// rechargement de la scène, etc.
//
// Guard sur '.tabbed-controls' : évite de dupliquer les onglets si
// renderChatLog fire plusieurs fois en cascade.
// ============================================================
async function renderChatLog(log, html, data) {
    if (!document.querySelector('.tabbed-controls')) {
        // renderTemplate a été déplacé dans foundry.applications.handlebars en v13.
        // On utilise l'ancienne API en fallback pour la rétrocompatibilité.
        const _rt = foundry.applications?.handlebars?.renderTemplate ?? renderTemplate;
        const htmlContent = await _rt("modules/westmarch/templates/chat/tabbedchatlog-nav.hbs", {
            activetab: tabSelected
        });
        $(html).prepend(htmlContent);

        // Câbler les clics sur les onglets. Les onglets sont dans .tabbed-controls,
        // chaque bouton a un attribut data-tab="IC" / "OTHER" / "OOC".
        $('.tabbed-controls').on('click', '.ui-control', function () {
            changeTab($(this).data('tab'));
        });

        // Afficher l'onglet IC par défaut au premier rendu.
        changeTab("IC");
    }

    // Réinjecter les boutons GM. Le délai 300ms est nécessaire car
    // #chat-controls est rendu par la Sidebar APRÈS le ChatLog.
    if (game.user?.isGM) {
        setTimeout(_injectPartyChatButtons, 300);
    }
}

// ============================================================
// _injectPartyChatButtons — Injecte les boutons GM supplémentaires
// dans la barre de contrôles du chat.
//
// Structure DOM cible dans .control-buttons après injection :
//   [boutons natifs existants]
//   [div.wm-party-break]   ← saut de ligne flex
//   [filter] [floppy] [trash]   ← boutons natifs déplacés
//   [import] [clear]            ← nos boutons ajoutés
//
// Pourquoi déplacer les boutons natifs ?
// On veut deux lignes dans la barre : les boutons de mode de jet sur
// la ligne 1, et les boutons de gestion (filter/export/delete + les
// nôtres) sur la ligne 2. Foundry n'a pas de mécanisme natif pour ça,
// donc on manipule le DOM directement et on force flex-wrap.
//
// Le bouton export natif (floppy disk, data-action="export") est
// intercepté en phase capture pour proposer un choix .txt / .json
// avant que Foundry ne traite le clic.
// ============================================================
function _injectPartyChatButtons() {
    // Supprimer les anciens boutons injectés avant de réinjecter
    // (sinon on accumule des boutons à chaque re-render).
    document.querySelectorAll('[data-wm-action]').forEach(el => el.remove());

    // Trouver le conteneur des contrôles. En Foundry v13, il est dans
    // #chat-controls .control-buttons. On cherche depuis document car le
    // footer est rendu par la Sidebar et non par le ChatLog lui-même.
    const controlButtons = document.querySelector('#chat-controls .control-buttons, .control-buttons');
    if (!controlButtons) {
        console.warn("[westmarch] Boutons party chat : .control-buttons introuvable.");
        return;
    }
    const $controlButtons = $(controlButtons);

    const $btnClear  = _makePartyBtn("clearParty",  "fa-users-slash", "Effacer les messages de ma party uniquement");
    const $btnImport = _makePartyBtn("importParty", "fa-file-import",  "Importer des messages (JSON / .txt)");

    // Forcer flex-wrap en style inline pour résister aux !important
    // des feuilles de style Foundry et des modules tiers.
    controlButtons.style.flexWrap  = 'wrap';
    controlButtons.style.height    = 'auto';
    controlButtons.style.maxHeight = 'none';
    controlButtons.style.overflow  = 'visible';
    if (controlButtons.parentElement) {
        controlButtons.parentElement.style.height    = 'auto';
        controlButtons.parentElement.style.maxHeight = 'none';
        controlButtons.parentElement.style.overflow  = 'visible';
    }

    // Créer le séparateur de ligne (div flex-basis:100% = saut de ligne).
    // Son CSS est défini dans styles/chat.css (.wm-party-break).
    const breakEl = document.createElement("div");
    breakEl.className = "wm-party-break";
    breakEl.setAttribute("data-wm-action", "break"); // marqué pour suppression au prochain inject

    // Les 3 derniers boutons natifs sont toujours filter, floppy (export), trash.
    // On les déplace après le break pour les mettre sur la ligne 2.
    // appendChild sur un nœud existant le DÉPLACE (pas copie) — pas besoin de remove().
    const nativeBtns = [...controlButtons.querySelectorAll('button:not([data-wm-action])')];
    const actionBtns = nativeBtns.slice(-3);

    controlButtons.appendChild(breakEl);
    actionBtns.forEach(btn => controlButtons.appendChild(btn));
    controlButtons.appendChild($btnImport[0]);
    controlButtons.appendChild($btnClear[0]);

    // Câbler nos boutons.
    // stopPropagation + preventDefault : empêche Foundry d'intercepter
    // le clic et d'ouvrir le FilePicker natif (comportement par défaut
    // de .ui-control dans certaines versions de Foundry v13).
    $btnClear.on("click",  (e) => { e.stopPropagation(); e.preventDefault(); _clearPartyMessages(); });
    $btnImport.on("click", (e) => { e.stopPropagation(); e.preventDefault(); _importPartyChatJSON(); });

    // Intercepter le bouton export natif (floppy disk).
    // On utilise { capture: true } pour être notifié AVANT Foundry.
    // _skipExport permet de relancer le clic natif sans boucle infinie :
    // on pose le flag, on clique, Foundry traite, on remet le flag à false.
    let _skipExport = false;
    controlButtons.addEventListener("click", async (e) => {
        const btn = e.target.closest('button[data-action="export"]');
        if (!btn || _skipExport) return;
        e.stopPropagation();
        e.preventDefault();

        const choice = await foundry.applications.api.DialogV2.wait({
            window: { title: "Exporter le chat" },
            content: `<p>Choisir le format d'export :</p>`,
            buttons: [
                { label: "Texte (.txt)",                 action: "txt",    default: true },
                { label: "JSON (mise en forme complète)", action: "json" },
                { label: "Annuler",                      action: "cancel" },
            ],
            rejectClose: false,
        });

        if (!choice || choice === "cancel") return;
        if (choice === "txt") {
            // Relancer le clic natif de Foundry pour l'export .txt standard.
            _skipExport = true;
            btn.click();
            _skipExport = false;
        } else {
            await _exportPartyChatJSON();
        }
    }, { capture: true });
}

// ============================================================
// _makePartyBtn — Crée un bouton de contrôle au format Foundry v13.
//
// En v13, les boutons de contrôle sont des <button> avec des classes
// FontAwesome directement dessus (ex. fa-trash), pas d'icône <i> enfant.
// data-wm-action permet de les retrouver et les supprimer au prochain
// inject (voir _injectPartyChatButtons).
// ============================================================
function _makePartyBtn(action, iconClass, title) {
    return $(`<button type="button" class="ui-control icon fa-solid ${iconClass} wm-party-btn" data-wm-action="${action}" data-tooltip="${title}" aria-label="${title}"></button>`);
}

// ============================================================
// _clearPartyMessages — Supprime tous les messages de la party du
// GM connecté, sans toucher aux messages des autres parties.
//
// Identifie les messages de la party via le flag "partyId" sur
// leur auteur (User). Seuls les messages dont l'auteur a le même
// partyId que le GM connecté sont supprimés.
//
// Si le GM n'a pas de party, on refuse l'opération pour éviter de
// supprimer tous les messages du monde (ce serait dangereux).
// ============================================================
async function _clearPartyMessages() {
    const myPartyId = game.user.getFlag("westmarch", "partyId");
    if (!myPartyId) {
        ui.notifications.warn("Tu n'as pas de party configurée. Utilise le bouton de suppression standard.");
        return;
    }

    // Filtrer uniquement les messages dont l'auteur est dans ma party.
    const toDelete = game.messages
        .filter(m => m.author?.getFlag("westmarch", "partyId") === myPartyId)
        .map(m => m.id);

    if (!toDelete.length) {
        ui.notifications.info("Aucun message de ta party à effacer.");
        return;
    }

    // Demander confirmation avant suppression définitive.
    const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Effacer les messages de ma party" },
        content: `<p>Supprimer <strong>${toDelete.length} message(s)</strong> de ta party uniquement ?</p>
                  <p><em>Les messages des autres parties resteront intacts.</em></p>`,
    });
    if (!confirmed) return;

    await ChatMessage.deleteDocuments(toDelete);
}

// ============================================================
// _importPartyChatJSON — Ouvre un sélecteur de fichier et importe
// un historique de chat depuis un fichier .txt ou .json.
//
// Deux formats supportés :
//
//   .json — Export WestMarch (produit par _exportPartyChatJSON).
//     Contient un tableau d'objets ChatMessage complets (style,
//     speaker, contenu formaté, timestamp...). L'import recrée
//     les messages à l'identique, sauf le champ _id (Foundry
//     génère de nouveaux IDs pour éviter les conflits).
//
//   .txt — Export natif Foundry (bouton floppy disk).
//     Format texte brut : blocs séparés par des tirets, chaque bloc
//     commence par [timestamp] NomAuteur. Parsé par _parseFoundryExport.
//     L'utilisateur choisit dans quel onglet (IC / Rolls / OOC) importer
//     car le .txt ne préserve pas le style des messages.
// ============================================================
async function _importPartyChatJSON() {
    return new Promise((resolve) => {
        // Créer un input file invisible et le déclencher programmatiquement.
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.json";
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return resolve();
            try {
                const text = await file.text();
                let data;

                if (file.name.endsWith(".json")) {
                    // Import JSON WestMarch : style et mise en forme préservés.
                    const raw = JSON.parse(text);
                    if (!Array.isArray(raw)) throw new Error("Le fichier JSON ne contient pas un tableau de messages.");
                    // Retirer les _id pour éviter les conflits avec des IDs existants.
                    data = raw.map(({ _id, ...rest }) => rest);

                    if (!data.length) { ui.notifications.warn("Aucun message trouvé."); return resolve(); }
                    await ChatMessage.createDocuments(data);
                    ui.notifications.info(`${data.length} message(s) importé(s).`);
                    return resolve();
                }

                // Import .txt natif Foundry : style inconnu, l'utilisateur choisit.
                data = _parseFoundryExport(text);
                if (!data.length) {
                    ui.notifications.warn("Aucun message trouvé dans le fichier.");
                    return resolve();
                }

                // Demander dans quel onglet placer les messages importés.
                const tab = await foundry.applications.api.DialogV2.wait({
                    window: { title: `Importer ${data.length} message(s)` },
                    content: `<p>Dans quel onglet importer les messages ?</p>`,
                    buttons: [
                        { label: "Personnages", action: "ic"              },
                        { label: "Rolls",       action: "other", default: true },
                        { label: "Joueurs",     action: "ooc"             },
                        { label: "Annuler",     action: "cancel"          },
                    ],
                    rejectClose: false,
                });
                if (!tab || tab === "cancel") return resolve();

                // Convertir le choix utilisateur en constante de style Foundry.
                const styleMap = {
                    ic:    CONST.CHAT_MESSAGE_STYLES.IC,
                    other: CONST.CHAT_MESSAGE_STYLES.OTHER,
                    ooc:   CONST.CHAT_MESSAGE_STYLES.OOC,
                };
                const toCreate = data.map(m => ({ ...m, style: styleMap[tab] ?? CONST.CHAT_MESSAGE_STYLES.OTHER }));
                await ChatMessage.createDocuments(toCreate);
                ui.notifications.info(`${toCreate.length} message(s) importé(s).`);
            } catch (err) {
                ui.notifications.error(`Erreur d'import : ${err.message}`);
                console.error("[westmarch] Import chat :", err);
            }
            resolve();
        };
        input.click();
    });
}

// ============================================================
// _exportPartyChatJSON — Exporte les messages de la party du GM
// dans un fichier .json téléchargé par le navigateur.
//
// Le JSON contient un tableau d'objets ChatMessage sérialisés
// (m.toObject()), ce qui préserve le style, le speaker, le contenu
// HTML formaté (dés, cartes d'item...) et le timestamp.
//
// Si le GM n'a pas de party, exporte TOUS les messages du monde.
// Le fichier est nommé "chat-<worldId>-<date>.json".
//
// Ce format est importable par _importPartyChatJSON (fichier .json).
// ============================================================
async function _exportPartyChatJSON() {
    const myPartyId = game.user.getFlag("westmarch", "partyId");
    const messages  = myPartyId
        ? game.messages.filter(m => m.author?.getFlag("westmarch", "partyId") === myPartyId)
        : [...game.messages];

    if (!messages.length) {
        ui.notifications.warn("Aucun message à exporter.");
        return;
    }

    const data = messages.map(m => m.toObject());
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/octet-stream" });
    const url  = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10); // format YYYY-MM-DD
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `chat-${game.world?.id ?? "world"}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url); // libérer la mémoire après le téléchargement
    ui.notifications.info(`${messages.length} message(s) exporté(s) en JSON.`);
}

// ============================================================
// _parseFoundryExport — Parse un fichier .txt produit par l'export
// natif Foundry (bouton floppy disk dans le chat).
//
// Format du fichier .txt :
//   [7/27/2026, 6:14:19 PM] NomAuteur GM
//   Contenu du message ligne 1
//   Contenu du message ligne 2
//   ---------------------------
//   [7/27/2026, 6:15:00 PM] AutreAuteur Player
//   Autre message
//   ---------------------------
//
// Retourne un tableau d'objets prêts pour ChatMessage.createDocuments().
// Le style n'est pas préservé (le .txt ne le contient pas) — il sera
// appliqué par l'appelant en fonction du choix de l'utilisateur.
// ============================================================
function _parseFoundryExport(text) {
    const messages = [];

    // Couper le fichier en blocs séparés par des lignes de tirets (---).
    const blocks = text.split(/\n-{3,}\n?/).map(b => b.trim()).filter(Boolean);

    for (const block of blocks) {
        const lines = block.split("\n");
        if (!lines.length) continue;

        // La première ligne contient le timestamp et le nom de l'auteur.
        // Format : [timestamp] NomAuteur [RoleOptional]
        const headerMatch = lines[0].match(/^\[(.+?)\]\s+(.+)$/);
        if (!headerMatch) continue;

        const [, timeStr, authorRaw] = headerMatch;

        // Foundry ajoute le rôle à la fin du nom ("Nom GM", "Nom Player"...).
        // On le supprime pour retrouver le nom pur.
        const alias = authorRaw.replace(/\s+(GM|Trusted|Player|Assistant\s+GM)$/i, "").trim() || authorRaw.trim();

        // Le contenu est tout ce qui suit la première ligne.
        const content = lines.slice(1).join("\n").trim();
        if (!content) continue;

        // Chercher l'utilisateur Foundry correspondant à cet auteur.
        // On tente d'abord une correspondance exacte, puis une correspondance
        // par préfixe (cas où le nom complet dans le .txt commence par le nom Foundry).
        const user = game.users.find(u => u.name === alias)
                  ?? game.users.find(u => authorRaw.toLowerCase().startsWith(u.name.toLowerCase()));

        messages.push({
            content,
            speaker:   { alias },                              // nom affiché dans le chat
            user:      user?.id ?? game.user.id,              // auteur Foundry (fallback : soi-même)
            timestamp: new Date(timeStr).getTime() || Date.now(),
            style:     CONST.CHAT_MESSAGE_STYLES.IC,          // style par défaut, écrasé par l'appelant
        });
    }

    return messages;
}

// ============================================================
// changeTab — Bascule l'affichage du chat sur l'onglet demandé.
//
// Actions :
//   1. Met à jour tabSelected (utilisé par renderChatMessageHTML
//      pour les nouveaux messages arrivant en temps réel).
//   2. Met à jour l'état visuel aria-pressed des boutons d'onglet.
//   3. Itère sur tous les messages actuellement dans le DOM :
//      - Affiche ceux qui correspondent à l'onglet ET à la party.
//      - Masque les autres.
//   4. Scroll jusqu'au dernier message visible.
//   5. Masque la pastille de notification de l'onglet activé
//      (les nouvelles notifs seront réactivées par renderChatMessageHTML).
//
// Paramètre tab : "IC" | "OTHER" | "OOC"
// ============================================================
function changeTab(tab) {
    tabSelected = tab;

    // Mettre à jour l'état aria des boutons de navigation.
    $('.tabbed-controls').find('.ui-control').attr('aria-pressed', "false");
    $('.tabbed-controls').find('.' + tab).attr('aria-pressed', "true");

    var lastMessage = undefined;
    $.each($('.chat-message'), function (i, item) {
        let message = game.messages.get($(item).data('message-id'));
        // Afficher le message si son style correspond à l'onglet ET si son
        // auteur appartient à notre party (ou si on n'a pas de party).
        if (Object.keys(CONST.CHAT_MESSAGE_STYLES).find(key => CONST.CHAT_MESSAGE_STYLES[key] === message.style) == tab && isPartyMember(message.author)) {
            $(item).show();
            lastMessage = message;
        } else {
            $(item).hide();
        }
    });

    // Scroll jusqu'au dernier message visible pour que le chat parte du bas.
    if (lastMessage) {
        const lastElement = $(`.chat-message[data-message-id="${lastMessage.id}"]`);
        if (lastElement.length) {
            lastElement[0].scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }

    // Masquer la pastille de notification de l'onglet qu'on vient d'activer.
    $('#' + tab + 'Notification').hide();
}

// ============================================================
// isPartyMember — Vérifie si un utilisateur Foundry appartient à
// la même party que l'utilisateur courant.
//
// Retourne true si :
//   - L'auteur a le même partyId que moi, OU
//   - Je n'ai pas de party (game.user sans partyId) → je vois tout.
//
// Le flag partyId est positionné sur le User par player.js / session.js.
// Absent (undefined/null) = pas dans une party.
//
// Utilisation : renderChatMessageHTML et changeTab.
// ============================================================
function isPartyMember(user) {
    return user.getFlag("westmarch", "partyId") == game.user.getFlag("westmarch", "partyId")
        || !game.user.getFlag("westmarch", "partyId");
}
