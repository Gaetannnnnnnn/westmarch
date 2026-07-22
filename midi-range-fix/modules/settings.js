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

    // Bloc d'explication injecté dans la page de config
    Hooks.on("renderSettingsConfig", (_app, html) => {
        const section = html.find(`.tab[data-tab="system"] h2.module-header:contains("${MODULE}")`).parent();
        if (!section.length) return;

        // Chercher après le dernier setting du module
        const lastSetting = section.find(`.form-group[data-setting-id^="${MODULE}."]`).last();
        if (!lastSetting.length) return;

        lastSetting.after(`
        <div class="mrf-explainer">
            <div class="mrf-explainer-header">
                <i class="fas fa-ruler-combined"></i>
                Comment la portée est calculée
            </div>
            <div class="mrf-explainer-body">

                <p class="mrf-formula">
                    distance<sub>effective</sub> =
                    <strong>dist(centre attaquant → bord cible)</strong>
                    − bonus taille attaquant
                </p>
                <p class="mrf-formula-sub">
                    bonus taille = (cases − 1) × 2,5 ft
                    &nbsp;—&nbsp;
                    bord cible = cercle inscrit si carré, bounding box sinon
                </p>

                <div class="mrf-table-wrap">
                    <table class="mrf-table">
                        <thead>
                            <tr>
                                <th>Situation</th>
                                <th>Bord cible</th>
                                <th>Bonus att.</th>
                                <th>Effective</th>
                                <th>À portée 5ft ?</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Medium att. vs Large cible, adjacents</td>
                                <td>≈ 2,5 ft</td>
                                <td>0 ft</td>
                                <td>2,5 ft</td>
                                <td class="mrf-ok">✓ Oui</td>
                            </tr>
                            <tr>
                                <td>Large att. vs Large cible, adjacents</td>
                                <td>≈ 2,5 ft</td>
                                <td>2,5 ft</td>
                                <td>0 ft</td>
                                <td class="mrf-ok">✓ Oui</td>
                            </tr>
                            <tr>
                                <td>Huge att. vs Large cible, adjacents</td>
                                <td>≈ 2,5 ft</td>
                                <td>5 ft</td>
                                <td>0 ft</td>
                                <td class="mrf-ok">✓ Oui</td>
                            </tr>
                            <tr>
                                <td>Medium att. vs Large cible, 1 case de gap</td>
                                <td>≈ 7,5 ft</td>
                                <td>0 ft</td>
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
