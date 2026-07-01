// ============================================================
// caldate.js — Notification Discord lors d'un changement de date
// (Simple Calendar). Envoie un message sur le webhook dédié
// "temps morts" uniquement quand le jour change, pas à chaque
// seconde. Un seul client envoie le message : le GM actif.
// ============================================================

let lastSentDate = null;

export function CalDateHooks() {

    // Initialiser la date connue dès que Simple Calendar est prêt,
    // pour éviter un envoi parasite au simple chargement du monde.
    Hooks.once("ready", () => {
        try {
            const d = SimpleCalendar?.api?.currentDateTime?.();
            if (d) lastSentDate = `${d.year}-${d.month}-${d.day}`;
        } catch(e) {}
    });

    Hooks.on("simple-calendar.dateTimeChange", (data) => {
        // Un seul client envoie le webhook : le GM actif
        if (!game.user.isGM) return;
        if (game.users.activeGM?.id !== game.user.id) return;

        const webhookUrl = game.settings.get("westmarch", "downtimeWebhookUrl");
        if (!webhookUrl) return;

        const d = data?.date;
        if (!d) return;

        // N'envoyer qu'en cas de changement de jour (pas à chaque seconde/minute)
        const dateKey = `${d.year}-${d.month}-${d.day}`;
        if (dateKey === lastSentDate) return;
        lastSentDate = dateKey;

        // Préférer la chaîne formatée de Simple Calendar si disponible
        const dateStr = d.display?.date ?? `${(d.day ?? 0) + 1}/${(d.month ?? 0) + 1}/${d.year ?? 0}`;

        fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: `📅 La date est maintenant le **${dateStr}**.` })
        }).catch(err => console.error("westmarch | Webhook date Discord :", err));
    });
}
