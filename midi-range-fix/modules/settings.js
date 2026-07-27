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
        name: "Portée depuis le bord (ft)",
        hint: "Portée effective depuis le bord de l'attaquant pour une arme de 5 ft. Chaque tranche de 5 ft supplémentaire de l'arme ajoute 5 ft. Défaut : 2.5 ft (demi-case Medium sur grille 5 ft).",
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
                <p style="margin:0;font-size:0.9em;">Remplace la mesure midi-qol par une mesure bord→bord pour tous les tokens. La portée se calcule depuis le bord de l'attaquant, pas son centre.</p>
                <p style="margin:6px 0 0 0;font-size:0.85em;font-style:italic;color:#e67e22;">© 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Toute redistribution, modification ou usage commercial est strictement interdit sans autorisation écrite.</p>
            </div>
        `);

        lastSetting.after(`
        <div class="mrf-explainer">
            <div class="mrf-explainer-header">
                <i class="fas fa-ruler-combined"></i>
                Quand est-ce que ça touche ?
            </div>
            <div class="mrf-explainer-body">

                <p class="mrf-formula">
                    distance<sub>midi</sub> =
                    <strong>bord attaquant → bord cible</strong>
                    + ajustement
                </p>
                <p class="mrf-formula-sub">
                    Touche si bord→bord ≤ portée arme − ajustement
                </p>

                <div class="mrf-table-wrap">
                    <table class="mrf-table">
                        <thead>
                            <tr>
                                <th>Arme</th>
                                <th>Portée depuis le bord</th>
                                <th>Adjacents</th>
                                <th>1 case de gap</th>
                                <th>2 cases de gap</th>
                                <th>3 cases de gap</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>5 ft</strong></td>
                                <td>≤ 2,5 ft</td>
                                <td class="mrf-ok">✓</td>
                                <td class="mrf-no">✗</td>
                                <td class="mrf-no">✗</td>
                                <td class="mrf-no">✗</td>
                            </tr>
                            <tr>
                                <td><strong>10 ft</strong></td>
                                <td>≤ 7,5 ft</td>
                                <td class="mrf-ok">✓</td>
                                <td class="mrf-ok">✓</td>
                                <td class="mrf-no">✗</td>
                                <td class="mrf-no">✗</td>
                            </tr>
                            <tr>
                                <td><strong>15 ft</strong></td>
                                <td>≤ 12,5 ft</td>
                                <td class="mrf-ok">✓</td>
                                <td class="mrf-ok">✓</td>
                                <td class="mrf-ok">✓</td>
                                <td class="mrf-no">✗</td>
                            </tr>
                            <tr>
                                <td><strong>20 ft</strong></td>
                                <td>≤ 17,5 ft</td>
                                <td class="mrf-ok">✓</td>
                                <td class="mrf-ok">✓</td>
                                <td class="mrf-ok">✓</td>
                                <td class="mrf-ok">✓</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p class="mrf-note">
                    <i class="fas fa-info-circle"></i>
                    Le tableau ci-dessus utilise l'ajustement par défaut (2,5 ft). Les valeurs sont calculées dynamiquement depuis le setting.
                </p>

                <p class="mrf-note">
                    <i class="fas fa-border-none"></i>
                    Le buffer de 2,5 ft couvre aussi les tokens <strong>hors-grille</strong> : un token visuellement adjacent mais décalé de quelques pixels ne rate pas à tort.
                </p>

                <p class="mrf-note">
                    <i class="fas fa-exclamation-triangle"></i>
                    Sans midi-qol actif, ce module ne fait rien.
                </p>

            </div>
        </div>`);
    });
}
