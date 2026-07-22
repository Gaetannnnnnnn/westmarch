import { registerSettings } from './modules/settings.js';
import { RageHooks } from './modules/rage.js';
import { GoliathHooks } from './modules/goliath.js';
import { PolymorphHooks } from './modules/polymorph.js';
import { TokenHooks } from './modules/token.js';
import { ItemHooks } from './modules/items.js';
import { TgcmHooks } from './modules/tgcm.js';
import { FolderMoveHooks } from './modules/foldermove.js';
import { MejShopHooks } from './modules/mejshop.js';
import { MejRestockHooks } from './modules/mejrestock.js';
import { ExportDialogHooks } from './modules/export-dialog.js';

Hooks.on("init", async () => {
    registerSettings();
    RageHooks();
    GoliathHooks();
    PolymorphHooks();
    TokenHooks();
    ItemHooks();
    TgcmHooks();
    FolderMoveHooks();
    MejShopHooks();
    MejRestockHooks();
    ExportDialogHooks();
});
