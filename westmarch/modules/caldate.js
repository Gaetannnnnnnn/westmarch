// ============================================================
// caldate.js — Notification Discord lors d'un changement de date
// Simple Calendar ne déclenche pas "simple-calendar.dateTimeChange"
// sur cette installation — il passe par le hook Foundry natif
// "updateWorldTime". On écoute ce hook et on interroge l'API SC
// pour savoir si le jour a changé.
// ============================================================

let lastSentDate = null;

export function CalDateHooks() {

    // Mémoriser la date au chargement du monde pour ne pas envoyer
    // un message parasite dès le premier updateWorldTime au démarrage.
    Hooks.once("ready", () => {
        try {
            const d = SimpleCalendar?.api?.currentDateTime?.();
            if (d) {
                lastSentDate = `${d.year}-${d.month}-${d.day}`;
                console.log(`westmarch | CalDate : date initiale mémorisée = ${lastSentDate}`);
            }
        } catch(e) {
            console.warn("westmarch | CalDate : impossible de lire la date initiale", e);
        }
    });

    Hooks.on("updateWorldTime", () => {
        if (!game.user.isGM) return;

        // Déduplication multi-GM
        const activeGM = game.users.activeGM;
        if (activeGM && activeGM.id !== game.user.id) return;

        const webhookUrl = game.settings.get("westmarch", "downtimeWebhookUrl");
        if (!webhookUrl) return;

        try {
            const d = SimpleCalendar?.api?.currentDateTime?.();
            if (!d || d.year === undefined) return;

            // N'envoyer qu'en cas de changement de jour
            const dateKey = `${d.year}-${d.month}-${d.day}`;
            if (dateKey === lastSentDate) return;
            lastSentDate = dateKey;

            // Chaîne formatée depuis l'API SC si disponible
            const display = SimpleCalendar?.api?.currentDateTimeDisplay?.();
            const dateStr = display?.date
                ?? `${(d.day ?? 0) + 1}/${(d.month ?? 0) + 1}/${d.year ?? 0}`;

            console.log(`westmarch | CalDate : envoi webhook Discord pour ${dateKey} (${dateStr})`);

            fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: `📅 La date est maintenant le **${dateStr}**.` })
            }).catch(err => console.error("westmarch | Webhook date Discord :", err));

        } catch(e) {
            console.error("westmarch | CalDate : erreur lors du traitement", e);
        }
    });
}
