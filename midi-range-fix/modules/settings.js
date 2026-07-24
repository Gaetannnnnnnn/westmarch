// ============================================================
// settings.js — Paramètres + explication dans la config
// ============================================================

const MODULE = "midi-range-fix";

export function registerSettings() {
    // Toggle d'activation (permet au module d'apparaître dans la config)
    game.settings.register(MODULE, "enabled", {
        name: "Activer le fix de portée",
        hint: "Désactiver uniquement pour déboguer. Nécessite un rechargement.",
        scope:         "world",
        config:        true,
        type:          Boolean,
        default:       true,
        requiresReload: true
    });

    game.settings.register(MODULE, "rangeAdjust", {
        name: "Ajustement de portée (ft)",
        hint: "Valeur soustraite au résultat bord→bord avant comparaison avec la portée de l'arme. 2.5 ft = rayon d'un token Medium (demi-case sur grille 5 ft).",
        scope:   "world",
        config:  true,
        type:    Number,
        default: 2.5,
    });

    // Bloc d'explication injecté dans la page de config
    Hooks.on("renderSettingsConfig", (_app, html) => {
        // Foundry v13 passe un HTMLElement natif (pas jQuery) — on normalise.
        const $html = $(html);

        // Chercher le premier et le dernier setting du module
        const allSettings = $html.find(`[data-setting-id^="${MODULE}."]`);
        if (!allSettings.length) return;
        const firstSetting = allSettings.first().closest(".form-group");
        const lastSetting  = allSettings.last().closest(".form-group");

        // Bandeau version / auteur avant le premier setting
        const moduleData = game.modules.get(MODULE);
        const version = moduleData?.version ?? "?";
        firstSetting.before(`
            <div style="margin-bottom:12px;padding:10px 14px;border:1px solid #e67e22;border-radius:4px;background:rgba(230,126,34,0.08);">
                <p style="margin:0 0 4px 0;"><strong>Soruta — Midi Range Fix</strong> — v${version}</p>
                <p style="margin:0;font-size:0.9em;">Corrige le calcul de portée de midi-qol pour les tokens Large/Huge/Gargantuan.</p>
                <p style="margin:6px 0 0 0;font-size:0.85em;font-style:italic;color:#e67e22;">© 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Toute redistribution, modification ou usage commercial est strictement interdit sans autorisation écrite.</p>
            </div>
        `);

        lastSetting.after(`
        <div class="mrf-explainer">
            <div class="mrf-explainer-header">
                <i class="fas fa-ruler-combined"></i>
                Comment la portée est calculée
            </div>
            <div class="mrf-explainer-body">

                <p class="mrf-formula">
                    distance<sub>effective</sub> =
                    <strong>dist(bord attaquant → bord cible)</strong>
                    − ajustement
                </p>
                <p class="mrf-formula-sub">
                    ajustement = valeur du setting ci-dessus (défaut 2,5 ft)
                    &nbsp;—&nbsp;
                    bords = bounding box rectangulaire (nearest cell edge)
                </p>

                <div class="mrf-table-wrap">
                    <table class="mrf-table">
                        <thead>
                            <tr>
                                <th>Situation</th>
                                <th>Bord→Bord</th>
                                <th>− ajust.</th>
                                <th>Effective</th>
                                <th>À portée 5ft ?</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Medium att. vs Large cible, adjacents</td>
                                <td>0 ft</td>
                                <td>2,5 ft</td>
                                <td>0 ft</td>
                                <td class="mrf-ok">✓ Oui</td>
                            </tr>
                            <tr>
                                <td>Large att. vs Large cible, adjacents</td>
                                <td>0 ft</td>
                                <td>2,5 ft</td>
                                <td>0 ft</td>
                                <td class="mrf-ok">✓ Oui</td>
                            </tr>
                            <tr>
                                <td>Medium att. vs Large cible, 1 case de gap</td>
                                <td>5 ft</td>
                                <td>2,5 ft</td>
                                <td>2,5 ft</td>
                                <td class="mrf-ok">✓ Oui</td>
                            </tr>
                            <tr>
                                <td>Medium att. vs Large cible, 2 cases de gap</td>
                                <td>10 ft</td>
                                <td>2,5 ft</td>
                                <td>7,5 ft</td>
                                <td class="mrf-no">✗ Non</td>
                            </tr>
                            <tr>
                                <td>Medium vs Medium (inchangé)</td>
                                <td colspan="3" style="text-align:center;color:#666;font-style:italic;">
                                    court-circuit — mesure native midi-qol
                                </td>
                                <td class="mrf-ok">✓ 5 ft</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p class="mrf-note">
                    <i class="fas fa-info-circle"></i>
                    Sans midi-qol actif, ce module ne fait rien.
                    Les tokens Medium vs Medium ne sont jamais modifiés.
                </p>

            </div>
        </div>`);
    });
}
