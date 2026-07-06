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

    // ---- Interception des dégâts (post-update) ----
    // On laisse les dégâts s'appliquer normalement (affichage OK),
    // puis on restaure les PV à 1 dès qu'ils passent à 0 ou moins.
    // L'option tgcmProtect évite la boucle infinie.
    Hooks.on("updateActor", async (actor, changes, options) => {
        if (options?.tgcmProtect) return;
        const newHP = changes?.system?.attributes?.hp?.value;
        if (newHP === undefined || newHP >= 1) return;
        if (!_isActorProtected(actor)) return;
        // Délai pour laisser l'animation de dégâts s'afficher en rouge
        await new Promise(r => setTimeout(r, 500));
        await actor.update(
            { "system.attributes.hp.value": 1 },
            { tgcmProtect: true, animate: false }
        );
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
    // Acteur synthétique (token non-lié) : actor.token pointe directement au TokenDocument
    if (actor.token) {
        return actor.token.getFlag("westmarch", "tgcm") ?? false;
    }
    // Acteur lié : parcourir tous les tokens de la scène courante
    return (canvas?.tokens?.placeables ?? [])
        .filter(t => t.actor?.id === actor.id)
        .some(t => t.document?.getFlag("westmarch", "tgcm") ?? false);
}

function _refreshTgcmShield(token) {
    if (token._tgcmShield) {
        token._tgcmShield.destroy({ children: true });
        token._tgcmShield = null;
    }

    if (!game.user.isGM) return;
    if (!token.document?.getFlag("westmarch", "tgcm")) return;

    // Dessine un petit bouclier héraldique vectoriel (pas d'emoji)
    // Forme : pentagone pointu en bas — w=7, h=9 → badge ~14×18 px
    const g = new PIXI.Graphics();
    const w = 4, h = 5;

    // Bouclier minimaliste — fond doré
    g.beginFill(0xf1c40f, 0.95);
    g.lineStyle(1, 0x000000, 0.5);
    g.drawPolygon([-w, -h,  w, -h,  w, 0,  0, h,  -w, 0]);
    g.endFill();

    // Centré en haut du token
    g.x = token.w / 2;
    g.y = h;

    token.addChild(g);
    token._tgcmShield = g;
}
