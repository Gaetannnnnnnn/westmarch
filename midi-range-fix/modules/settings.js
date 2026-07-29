/**
 * @file        modules/settings.js
 * @module      midi-range-fix
 * @version     1.4.3
 * @author      Soruta (Discord : s0ruta)
 * @license     © 2026 Soruta — Tous droits réservés.
 *              Usage personnel autorisé. Toute redistribution, modification
 *              ou usage commercial est strictement interdit sans autorisation écrite.
 *
 * @description Enregistrement des settings du module et injection du bloc
 *              explicatif dans la page de configuration Foundry.
 */

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
        name: "Marge depuis le bord (ft)",
        hint: "Marge soustraite à la portée de l'arme pour le calcul bord→bord. Plus la valeur est élevée, plus la distance autorisée depuis le bord est réduite. Pour une arme de 5 ft : 0 = jusqu'à 5 ft de bord (trop permissif) · 2.5 = jusqu'à 2.5 ft (défaut D&D 5e, demi-case) · 5 = tokens qui se touchent seulement (très strict). Ne pas dépasser la portée de l'arme concernée (max 5 pour une arme 5 ft).",
        scope:   "world",
        config:  true,
        type:    Number,
        default: 2.5,
    });

    // Bloc d'explication injecté dans la page de config
    Hooks.on("renderSettingsConfig", (_app, html) => {
        // Foundry v13 passe un HTMLElement natif (pas jQuery) — on normalise.
        const $html = $(html);

        // Sélecteur robuste v12/v13 : data-setting-id (v12) ou name sur l'input (v13).
        let allSettings = $html.find(`[data-setting-id^="${MODULE}."]`);
        if (!allSettings.length) {
            allSettings = $html.find(`[name^="${MODULE}."]`).map(function() {
                return $(this).closest(".form-group")[0];
            });
        }
        if (!allSettings.length) return;

        const firstSetting = $(allSettings[0]).closest(".form-group");
        const lastSetting  = $(allSettings[allSettings.length - 1]).closest(".form-group");

        // Bandeau version / auteur avant le premier setting
        const version = game.modules.get(MODULE)?.version ?? "?";
        firstSetting.before(`
            <div style="margin-bottom:12px;padding:10px 14px;border:1px solid #e67e22;border-radius:4px;background:rgba(230,126,34,0.08);">
                <p style="margin:0 0 6px 0;font-size:1em;"><strong>Soruta — Midi Range Fix</strong> — v${version}</p>

                <p style="margin:0 0 6px 0;font-size:0.9em;"><strong>Pourquoi ce module ?</strong><br>
                Midi-qol mesure la portée depuis le <em>centre</em> de l'attaquant jusqu'aux <em>coins</em> du token cible.
                Pour un PJ face à un Ours (Large), ça donne souvent 6–8 ft alors que les tokens se touchent — et l'attaque échoue à tort.</p>

                <p style="margin:0 0 6px 0;font-size:0.9em;"><strong>Ce que fait le module :</strong><br>
                Il mesure <strong>de bord à bord</strong> entre les deux tokens, puis ajoute un buffer (réglable ci-dessous).
                Ce buffer correspond à la portée effective depuis le bord de l'attaquant :<br>
                &bull; Arme 5 ft → touche jusqu'à <strong>2,5 ft</strong> depuis votre bord (tokens adjacents = toujours OK).<br>
                &bull; Arme 10 ft → touche jusqu'à <strong>7,5 ft</strong> depuis votre bord.<br>
                &bull; La règle Foundry affiche cette même distance corrigée quand vous tracez une ligne entre deux tokens.</p>

                <p style="margin:0;font-size:0.8em;font-style:italic;color:#e67e22;">© 2026 Soruta — Tous droits réservés. Usage personnel autorisé. Toute redistribution, modification ou usage commercial est strictement interdit sans autorisation écrite.</p>
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
