// ============================================================
// caldate.js — Notification Discord lors d'un changement de date
// (Simple Calendar). Envoie un message sur le webhook dédié
// "changement de date" uniquement quand le jour change, pas à
// chaque seconde. Un seul client envoie le message : le GM actif.
// ============================================================

let lastSentDate = null;

export function CalDateHooks() {

    // Initialiser la date connue dès que Simple Calendar est prêt,
    // pour éviter un envoi parasite au simple chargement du monde.
    Hooks.once("ready", () => {
        try {
            const d = SimpleCalendar?.api?.currentDateTime?.();
            if (d) {
                lastSentDate = `${d.year}-${d.month}-${d.day}`;
                console.log(`westmarch | CalDate : date initiale mémorisée = ${lastSentDate}`);
            }
        } catch(e) {
            console.warn("westmarch | CalDate : impossible de lire la date initiale Simple Calendar", e);
        }
    });

    Hooks.on("simple-calendar.dateTimeChange", (data) => {
        if (!game.user.isGM) return;

        // Déduplication multi-GM : si un GM actif est détecté ET que ce n'est
        // pas nous, on laisse l'autre envoyer. Si activeGM est null (Foundry ne
        // détecte personne d'actif), on envoie quand même pour ne pas perdre
        // le message.
        const activeGM = game.users.activeGM;
        if (activeGM && activeGM.id !== game.user.id) return;

        const webhookUrl = game.settings.get("westmarch", "downtimeWebhookUrl");
        if (!webhookUrl) {
            console.log("westmarch | CalDate : pas de webhook configuré, envoi ignoré.");
            return;
        }

        // Simple Calendar v2 met la date dans data.date ; certaines versions
        // l'exposent directement à la racine de data — on accepte les deux.
        const d = data?.date ?? data;
        if (!d || d.year === undefined) {
            console.warn("westmarch | CalDate : structure de données Simple Calendar inattendue", data);
            return;
        }

        // N'envoyer qu'en cas de changement de jour (pas à chaque seconde/minute)
        const dateKey = `${d.year}-${d.month}-${d.day}`;
        if (dateKey === lastSentDate) return;
        lastSentDate = dateKey;

        // Préférer la chaîne formatée de Simple Calendar si disponible
        const dateStr = d.display?.date ?? `${(d.day ?? 0) + 1}/${(d.month ?? 0) + 1}/${d.year ?? 0}`;

        console.log(`westmarch | CalDate : envoi webhook Discord pour ${dateKey} (${dateStr})`);

        fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: `📅 La date est maintenant le **${dateStr}**.` })
        }).catch(err => console.error("westmarch | Webhook date Discord :", err));
    });
}
