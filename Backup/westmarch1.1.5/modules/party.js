export function PartyHooks() {
    Hooks.on("renderGroupActorSheet", (application, element, context, options) => renderGroupActorSheet(application, element, context, options));
}

function renderGroupActorSheet(application, element, context, options) {
    if (game.user.isGM) return;
    
    console.log($(element).find('.member'));
    $(element).find('.member').each((i, element) => {
        if($(element).data("uuid") != 'Actor.'+game.user.character.id)
        {
            $(element).find('.hp-bar').hide();
            $(element).find('.hd-bar').hide();
            $(element).find('.stats').hide();
        }
    });

    $(element).find('.encumbrance').each((i, element) => {
        if($(element).data("uuid") != 'Actor.'+game.user.character.id)
        {
            $(element).find('.currency').hide();
        }
    });
}