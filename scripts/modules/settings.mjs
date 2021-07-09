export const CMPBrowser = {
    MODULE_NAME: "compendium-browser",
    MODULE_VERSION: "0.5.1",
    MAXLOAD: 500,      //Default for the maximum number to load before displaying a message that you need to filter to see more    
};

const SETTINGS = 'settings';

export class ModuleSettings {

    constructor() {
        this.gs = game.settings;
    }

    /**
     * constructs and returns defaults settings
     */
    static _getDefaults() {
        let defaultSettings = {
            loadedCompendium: {
                Actor: {},
                Item: {},
                JournalEntry: {}
            }
        };

        for (let compendium of game.packs) {
            if(defaultSettings.loadedCompendium[compendium.metadata.entity]){
                defaultSettings.loadedCompendium[compendium.metadata.entity][compendium.collection] = {
                    load: true,
                    name: `${compendium.metadata.label} (${compendium.collection})`
                };
            }
        }

        return defaultSettings;
    }

    /**
     * 
     * @returns {Array} Settings
     */
    static initModuleSettings() {
        let defaultSettings = ModuleSettings._getDefaults();
        // load settings from container and apply to default settings (available compendia might have changed)
        let settings = game.settings.get(CMPBrowser.MODULE_NAME, SETTINGS);
        for (let compKey in defaultSettings.loadedSpellCompendium) {
            if (settings.loadedSpellCompendium[compKey] !== undefined) {
                defaultSettings.loadedSpellCompendium[compKey].load = settings.loadedSpellCompendium[compKey].load;
            }
        }
        for (let compKey in defaultSettings.loadedNpcCompendium) {
            if (settings.loadedNpcCompendium[compKey] !== undefined) {
                defaultSettings.loadedNpcCompendium[compKey].load = settings.loadedNpcCompendium[compKey].load;
            }
        }
        defaultSettings.allowSpellBrowser = settings.allowSpellBrowser ? true : false;
        defaultSettings.allowFeatBrowser = settings.allowFeatBrowser ? true : false;
        defaultSettings.allowItemBrowser = settings.allowItemBrowser ? true : false;
        defaultSettings.allowNpcBrowser = settings.allowNpcBrowser ? true : false;

        if (game.user.isGM) {
            game.settings.set(CMPBrowser.MODULE_NAME, SETTINGS, defaultSettings);
            console.log("New default settings set");
            console.log(defaultSettings);
        }

        return defaultSettings;
    }

    static registerGameSettings(){
        // creating game setting container
        game.settings.register(CMPBrowser.MODULE_NAME, SETTINGS, {
            name: "Compendium Browser Settings",
            hint: "Settings to exclude packs from loading and visibility of the browser",
            default: ModuleSettings._getDefaults(),
            type: Object,
            scope: 'world',
            onChange: settings => {
                this.settings = settings;
            }
        });

        game.settings.register(CMPBrowser.MODULE_NAME, "maxload", {
            name: game.i18n.localize("CMPBrowser.SETTING.Maxload.NAME"),
            hint: game.i18n.localize("CMPBrowser.SETTING.Maxload.HINT"),
            scope: "world",
            config: true,
            default: CMPBrowser.MAXLOAD,
            type: Number,
            range: {             // If range is specified, the resulting setting will be a range slider
                min: 200,
                max: 5000,
                step: 100
            }
        });
    }

    static saveSettings() {
        game.settings.set(CMPBrowser.MODULE_NAME, 'settings', this.settings);
    }

        filterElements(list, subjects, filters) {
        for (let element of list) {
            let subject = subjects[element.dataset.entryId];
            if (this.passesFilter(subject, filters) == false) {
                $(element).hide();
            } else {
                $(element).show();
            }
        }
    }
}