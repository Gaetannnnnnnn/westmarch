// ============================================================
// tgcm.js — "Protégé TGCM" : token immunisé à la mort
//
// Un token marqué "Protégé TGCM" ne peut jamais passer à 0 PV :
// tout dégât qui l'amènerait à 0 ou moins le laisse à 1 PV.
// Les dégâts s'affichent normalement côté joueurs, l'ennemi reste
// debout — idéal pour les mises en scène dramatiques.
//
// Fonctionnement :
//   • Bouton "Protégé TGCM" dans le HUD du token (GM uniquement).
//   • Indicateur visuel : bouclier doré centré au-dessus du token
//     (rendu uniquement sur le client GM).
//   • Hook preUpdateActor : si les PV résultants seraient ≤ 0 et
//     que le token est protégé, on les force à 1 avant l'écriture.
//
// Le flag est posé sur le TokenDocument (pas sur l'acteur), ce qui
// permet de protéger une instance précise sans affecter l'acteur lié.
// ============================================================

export function TgcmHooks() {

    // ---- Bouton HUD (GM uniquement) ----
    Hooks.on("renderTokenHUD", (hud, html) => {
        _injectTgcmButton(hud, html);
    });

    // ---- Indicateur visuel : bouclier au-dessus du token (GM uniquement) ----
    Hooks.on("drawToken", (token) => {
        _refreshTgcmShield(token);
    });

    Hooks.on("refreshToken", (token) => {
        _refreshTgcmShield(token);
    });

    // ---- Interception des dégâts ----
    // Fires avant l'écriture en base sur tous les clients.
    // On force les PV à 1 si l'acteur est protégé TGCM.
    Hooks.on("preUpdateActor", (actor, changes) => {
        const newHP = changes?.system?.attributes?.hp?.value;
        if (newHP === undefined || newHP > 0) return;

        const isProtected = _isActorProtected(actor);
        if (!isProtected) return;

        changes.system.attributes.hp.value = 1;
    });
}

// ============================================================
// Helpers
// ============================================================

function _injectTgcmButton(hud, html) {
    if (!game.user.isGM) return;

    // v13 ApplicationV2 : hud.document | v12 : hud.object.document | fallback : hud.token
    const tokenDoc = hud.document ?? hud.object?.document ?? hud.token ?? null;
    if (!tokenDoc) return;

    const isActive = tokenDoc.getFlag("westmarch", "tgcm") ?? false;

    // Normaliser en HTMLElement
    const root = (html instanceof HTMLElement) ? html : (html[0] ?? null);
    if (!root) return;

    // Éviter le doublon si le hook fire deux fois
    if (root.querySelector(".tgcm-btn")) return;

    // Trouver le bon conteneur — essayer plusieurs sélecteurs
    const target =
        root.querySelector(".col.right") ??
        root.querySelector(".controls-right") ??
        root.querySelector(".right") ??
        root;

    const btn = document.createElement("div");
    btn.className = `control-icon tgcm-btn${isActive ? " active" : ""}`;
    btn.title = `Protégé TGCM${isActive ? " (actif)" : ""}`;
    btn.innerHTML = `<i class="fas fa-shield-alt"></i>`;

    btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const current = tokenDoc.getFlag("westmarch", "tgcm") ?? false;
        await tokenDoc.setFlag("westmarch", "tgcm", !current);
        hud.render();
    });

    target.appendChild(btn);
}

function _isActorProtected(actor) {
    // Acteur synthétique (token non-lié) : l'acteur porte une ref directe au token
    if (actor.isToken) {
        return actor.token?.getFlag("westmarch", "tgcm") ?? false;
    }
    // Acteur lié : vérifier tous ses tokens actifs sur la scène courante
    return actor.getActiveTokens(false, true)
        .some(t => t.document?.getFlag("westmarch", "tgcm"));
}

function _refreshTgcmShield(token) {
    // Supprimer l'indicateur existant
    if (token._tgcmShield) {
        token._tgcmShield.destroy({ children: true });
        token._tgcmShield = null;
    }

    if (!game.user.isGM) return;
    if (!token.document?.getFlag("westmarch", "tgcm")) return;

    // Fond doré arrondi
    const g = new PIXI.Graphics();
    g.beginFill(0xf39c12, 0.92);
    g.lineStyle(2, 0xffffff, 0.95);
    g.drawRoundedRect(-11, -11, 22, 22, 5);
    g.endFill();

    // Icône bouclier (emoji — rendu PIXI natif)
    const icon = new PIXI.Text("🛡", { fontSize: 14 });
    icon.anchor.set(0.5, 0.5);
    icon.x = 0;
    icon.y = 1;

    const container = new PIXI.Container();
    container.addChild(g);
    container.addChild(icon);

    // Centré horizontalement, au-dessus du token
    container.x = token.w / 2;
    container.y = -14;

    token.addChild(container);
    token._tgcmShield = container;
}
