// ============================================================
// mejrestock.js — Réapprovisionnement automatique des boutiques MEJ
//
// Quand un article tombe à 0 en boutique (Monk's Enhanced Journal),
// un timer est lancé (en jours de calendrier). Au bout du délai,
// l'article repasse automatiquement à 1.
// Le décompte restant est affiché en petit et en grisé à côté
// de la quantité dans la vue boutique.
//
// Paramètre : "Réapprovisionnement automatique des boutiques (jours)"
//   → 0 = fonctionnalité désactivée
//
// Stockage : page.flags["westmarch"]["restock"] = { itemId: worldTime }
// ============================================================

// IDs des pages en cours de mise à jour par westmarch — évite la récursion
// dans le hook updateJournalEntryPage sans dépendre des options Foundry.
const _restockingPages = new Set();

// Retourne le nombre de secondes dans un jour de calendrier.
// Utilise le calendrier natif Foundry v13 si disponible, sinon 86400.
function getSecondsPerDay() {
    try {
        const cal = game.time?.calendar;
        if (!cal) return 86400;
        if (cal.secondsPerDay) return cal.secondsPerDay;
        const t = cal.time ?? {};
        return (t.hoursInDay ?? 24) * (t.minutesInHour ?? 60) * (t.secondsInMinute ?? 60);
    } catch(e) {
        return 86400;
    }
}

function getRestockDays() {
    return game.settings.get("westmarch", "shopRestockDays") ?? 7;
}

// ============================================================
export function MejRestockHooks() {

    // ----------------------------------------------------------
    // 1. Détecter le passage à 0 lors d'une mise à jour de page
    //    (déclenché quand MEJ enregistre un achat)
    // ----------------------------------------------------------
    Hooks.on("updateJournalEntryPage", async (page, change, options, userId) => {
        if (!game.user.isGM) return;
        // Un seul GM traite l'évènement
        const activeGM = game.users.activeGM;
        if (activeGM && activeGM.id !== game.user.id) return;
        // Éviter la récursion : on ignore les updates posées par westmarch lui-même
        if (_restockingPages.has(page.id)) return;

        if (page.flags?.["monks-enhanced-journal"]?.type !== "shop") return;

        const days = getRestockDays();
        if (days <= 0) return;

        const items   = page.flags?.["monks-enhanced-journal"]?.items ?? {};
        const timers  = foundry.utils.deepClone(page.flags?.["westmarch"]?.restock ?? {});
        const spd     = getSecondsPerDay();
        let   changed = false;

        for (const [itemId, item] of Object.entries(items)) {
            const qty = item.flags?.["monks-enhanced-journal"]?.quantity ?? 1;

            if (qty === 0 && !(itemId in timers)) {
                // Démarrer le timer
                timers[itemId] = game.time.worldTime + days * spd;
                changed = true;
                console.log(`westmarch | MejRestock : timer lancé pour "${item.name}" (${days} j)`);
            } else if (qty > 0 && (itemId in timers)) {
                // Remis en stock manuellement → annuler le timer
                delete timers[itemId];
                changed = true;
                console.log(`westmarch | MejRestock : timer annulé pour "${item.name}" (remis manuellement)`);
            }
        }

        if (changed) {
            _restockingPages.add(page.id);
            try {
                await page.update({ "flags.westmarch.restock": timers });
            } finally {
                _restockingPages.delete(page.id);
            }
        }
    });

    // ----------------------------------------------------------
    // 2. Vérifier les timers expirés à chaque avancement du temps
    // ----------------------------------------------------------
    Hooks.on("updateWorldTime", async (worldTime) => {
        if (!game.user.isGM) return;
        const activeGM = game.users.activeGM;
        if (activeGM && activeGM.id !== game.user.id) return;

        if (getRestockDays() <= 0) return;

        for (const journal of game.journal.contents) {
            for (const page of journal.pages.contents) {
                if (page.flags?.["monks-enhanced-journal"]?.type !== "shop") continue;

                const timers = page.flags?.["westmarch"]?.restock ?? {};
                if (Object.keys(timers).length === 0) continue;

                const newTimers  = foundry.utils.deepClone(timers);
                const updates    = {};
                let   anyExpired = false;

                for (const [itemId, restockAt] of Object.entries(timers)) {
                    if (worldTime < restockAt) continue;

                    // Remettre à 1
                    updates[`flags.monks-enhanced-journal.items.${itemId}.flags.monks-enhanced-journal.quantity`] = 1;
                    delete newTimers[itemId];
                    anyExpired = true;

                    const itemName = page.flags?.["monks-enhanced-journal"]?.items?.[itemId]?.name ?? itemId;
                    console.log(`westmarch | MejRestock : réapprovisionnement de "${itemName}" dans "${journal.name}"`);
                }

                if (anyExpired) {
                    _restockingPages.add(page.id);
                    try {
                        await page.update({ "flags.westmarch.restock": newTimers, ...updates });
                    } finally {
                        _restockingPages.delete(page.id);
                    }
                }
            }
        }
    });

    // ----------------------------------------------------------
    // 3. Afficher le décompte restant dans la vue boutique MEJ
    //    Petit texte grisé à côté du chiffre de quantité.
    // ----------------------------------------------------------
    Hooks.on("renderApplicationV2", (application, element) => {
        // MEJ stocke l'ID de la page courante dans application.options.pageId
        // (application.document est undefined dans EnhancedJournal)
        const pageId = application.options?.pageId;
        if (!pageId) return;

        let shopPage = null;
        for (const journal of game.journal.contents) {
            const p = journal.pages.get(pageId);
            if (p) { shopPage = p; break; }
        }
        if (!shopPage) return;

        const mejType = foundry.utils.getProperty(shopPage, "flags.monks-enhanced-journal.type");
        if (mejType !== "shop") return;

        const timers = shopPage.getFlag("westmarch", "restock") ?? {};
        if (Object.keys(timers).length === 0) return;

        const spd = getSecondsPerDay();
        const now = game.time.worldTime;

        // Sélecteur précis basé sur la structure DOM réelle de MEJ
        element.querySelectorAll(".items-list .item[data-id]").forEach(row => {
            const itemId    = row.dataset.id;
            const restockAt = timers[itemId];
            if (restockAt === undefined) return;

            // Éviter les doublons si le hook se déclenche plusieurs fois
            if (row.querySelector(".wm-restock-countdown")) return;

            const daysLeft = Math.ceil((restockAt - now) / spd);
            const label    = daysLeft <= 0 ? "réapro imminent" : `réapro dans ${daysLeft} j`;

            const span = document.createElement("span");
            span.className = "wm-restock-countdown";
            span.style.cssText = "color:#888; font-size:0.75em; white-space:nowrap; font-style:italic; display:block; text-align:center; line-height:1.2;";
            span.textContent = label;

            // La quantité est dans .item-detail.item-quantity
            const qtyDiv = row.querySelector(".item-detail.item-quantity");
            if (qtyDiv) qtyDiv.appendChild(span);
            else row.appendChild(span);
        });
    });
}
