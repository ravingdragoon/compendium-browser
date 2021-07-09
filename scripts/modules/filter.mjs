export class Filter {

    constructor() {
        //Reset the filters used in the dialog
        this.spellFilters = this._getInitialFilters();
        this.npcFilters = this._getInitialFilters();
        this.featFilters = this._getInitialFilters();
        this.itemFilters = this._getInitialFilters();
    }

    /**
     * 
     * @param {Object} subject 
     * @param {Obj} filters 
     * @returns 
     */
    static passesFilter(subject, filters) {
        for (let filter of Object.values(filters)) {
            let prop = getProperty(subject, filter.path);
            if (filter.type === 'numberCompare') {

                switch (filter.operator) {
                    case '=': if (prop != filter.value) { return false; } break;
                    case '<': if (prop >= filter.value) { return false; } break;
                    case '>': if (prop <= filter.value) { return false; } break;
                }

                continue;
            }
            if (filter.valIsArray === false) {
                if (filter.type === 'text') {
                    if (prop === undefined) return false;
                    if (prop.toLowerCase().indexOf(filter.value.toLowerCase()) === -1) {
                        return false;
                    }
                } else {
                    if (filter.value !== undefined && prop !== undefined && prop != filter.value && !(filter.value === true && prop)) {
                        return false;
                    }
                    if (filter.values && filter.values.indexOf(prop) === -1) {
                        return false;
                    }
                }
            } else {
                if (prop === undefined) return false;
                if (typeof prop === 'object') {
                    if (filter.value) {
                        if (prop.indexOf(filter.value) === -1) {
                            return false;
                        }
                    } else if (filter.values) {
                        for (let val of filter.values) {
                            if (prop.indexOf(val) !== -1) {
                                continue;
                            }
                            return false;
                        }
                    }
                } else {
                    for (let val of filter.values) {
                        if (prop === val) {
                            continue;
                        }
                    }
                    return false;
                }
            }
        }

        return true;
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

    getByName(name) {
        return getProperty(this, name);
    }
    
    getByType(type){
        return getProperty(this, type+'Filters');
    }

    resetFilters() {
        this.spellFilters.activeFilters = {};
        this.featFilters.activeFilters = {};
        this.itemFilters.activeFilters = {};
        this.npcFilters.activeFilters = {};
    }

    _getInitialFilters() {
        return {
            registeredFilterCategorys: {},
            activeFilters: {}
        };
    }

    async addEntityFilters(){
        await this.addSpellFilters();
        await this.addFeatFilters();
        await this.addItemFilters();
        await this.addNpcFilters();
    }

    /**
     * Used to add custom filters to the Spell-Browser
     * @param {String} entityType type of entity for the filter
     * @param {String} category - Title of the category
     * @param {String} label - Title of the filter
     * @param {String} path - path to the data that the filter uses. uses dotnotation. example: data.abilities.dex.value
     * @param {String} type - type of filter
     *                      possible filter:
     *                          text:           will give a textinput (or use a select if possibleValues has values) to compare with the data. will use objectData.indexOf(searchedText) to enable partial matching
     *                          bool:           will see if the data at the path exists and not false.
     *                          select:         exactly matches the data with the chosen selector from possibleValues
     *                          multiSelect:    enables selecting multiple values from possibleValues, any of witch has to match the objects data
     *                          numberCompare:  gives the option to compare numerical values, either with =, < or the > operator
     * @param {Boolean} possibleValues - predetermined values to choose from. needed for select and multiSelect, can be used in text filters
     * @param {Boolean} valIsArray - if the objects data is an object use this. the filter will check each property in the object (not recursive). if no match is found, the object will be hidden
     */
    async addFilter(entityType, category, label, path, type, possibleValues = null, valIsArray = false) {
        let target = `${entityType}Filters`;
        let filter = {};
        filter.path = path;
        filter.label = label;
        filter.type = 'text';
        if (['text', 'bool', 'select', 'multiSelect', 'numberCompare'].indexOf(type) !== -1) {
            filter[`is${type}`] = true;
            filter.type = type;
        }
        if (possibleValues !== null) {
            filter.possibleValues = possibleValues;
        }
        filter.valIsArray = valIsArray;

        let catId = category.replace(/\W/g, '');
        if (this[target].registeredFilterCategorys[catId] === undefined) {
            this[target].registeredFilterCategorys[catId] = { label: category, filters: [] };
        }
        this[target].registeredFilterCategorys[catId].filters.push(filter);

    }

    async addSpellFilters() {
        const SPELL = 'spell';
        // Spellfilters
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("DND5E.Source"), 'data.source', 'text');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.lvl"), 'data.level', 'multiSelect', [game.i18n.localize("CMPBrowser.cantip"), 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.school"), 'data.school', 'select', CONFIG.DND5E.spellSchools);
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.castingTime"), 'data.activation.type', 'select',
            {
                action: game.i18n.localize("DND5E.Action"),
                bonus: game.i18n.localize("CMPBrowser.bonusAction"),
                reaction: game.i18n.localize("CMPBrowser.reaction"),
                minute: game.i18n.localize("DND5E.TimeMinute"),
                hour: game.i18n.localize("DND5E.TimeHour"),
                day: game.i18n.localize("DND5E.TimeDay")
            }
        );
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.spellType"), 'data.actionType', 'select', CONFIG.DND5E.itemActionTypes);
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.damageType"), 'damageTypes', 'select', CONFIG.DND5E.damageTypes);
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.class"), 'data.classes', 'select',
            {
                artificer: game.i18n.localize("CMPBrowser.artificer"),
                bard: game.i18n.localize("CMPBrowser.bard"),
                cleric: game.i18n.localize("CMPBrowser.cleric"),
                druid: game.i18n.localize("CMPBrowser.druid"),
                paladin: game.i18n.localize("CMPBrowser.paladin"),
                ranger: game.i18n.localize("CMPBrowser.ranger"),
                sorcerer: game.i18n.localize("CMPBrowser.sorcerer"),
                warlock: game.i18n.localize("CMPBrowser.warlock"),
                wizard: game.i18n.localize("CMPBrowser.wizard"),
            }, true
        );
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.ritual"), 'data.components.ritual', 'bool');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.concentration"), 'data.components.concentration', 'bool');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.verbal"), 'data.components.vocal', 'bool');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.somatic"), 'data.components.somatic', 'bool');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.material"), 'data.components.material', 'bool');
    }

    async addItemFilters() {
        let ITEM = 'item';
        // Item Filters

        await this.addFilter(ITEM, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("DND5E.Source"), 'data.source', 'text');
        await this.addFilter(ITEM, game.i18n.localize("CMPBrowser.general"), "Item Type", 'type', 'select', {
            consumable: game.i18n.localize("DND5E.ItemTypeConsumable"),
            backpack: game.i18n.localize("DND5E.ItemTypeContainer"),
            equipment: game.i18n.localize("DND5E.ItemTypeEquipment"),
            loot: game.i18n.localize("DND5E.ItemTypeLoot"),
            tool: game.i18n.localize("DND5E.ItemTypeTool"),
            weapon: game.i18n.localize("DND5E.ItemTypeWeapon")
        });
        await this.addFilter(ITEM, game.i18n.localize("CMPBrowser.general"), "Packs", 'matchedPacks', 'select',
            {
                burglar: "Burglar's Pack",
                diplomat: "Diplomat's Pack",
                dungeoneer: "Dungeoneer's Pack",
                entertainer: "Entertainer's Pack",
                explorer: "Explorer's Pack",
                monsterhunter: "Monster Hunter's Pack",
                priest: "Priest's Pack",
                scholar: "Scholar's Pack",
            }, true
        );
        await this.addFilter(ITEM, "Game Mechanics", game.i18n.localize("DND5E.ItemActivationCost"), 'data.activation.type', 'select', CONFIG.DND5E.abilityActivationTypes);
        await this.addFilter(ITEM, "Game Mechanics", game.i18n.localize("CMPBrowser.damageType"), 'damageTypes', 'select', CONFIG.DND5E.damageTypes);
        await this.addFilter(ITEM, "Game Mechanics", "Uses Resources", 'usesRessources', 'bool');

        await this.addFilter(ITEM, "Item Subtype", "Weapon", 'data.weaponType', 'text', CONFIG.DND5E.weaponTypes);
        await this.addFilter(ITEM, "Item Subtype", "Equipment", 'data.armor.type', 'text', CONFIG.DND5E.equipmentTypes);
        await this.addFilter(ITEM, "Item Subtype", "Consumable", 'data.consumableType', 'text', CONFIG.DND5E.consumableTypes);

        await this.addFilter(ITEM, "Magic Items", "Rarity", 'data.rarity', 'select',
            {
                Common: "Common",
                Uncommon: "Uncommon",
                Rare: "Rare",
                "Very rare": "Very Rare",
                Legendary: "Legendary"
            });
    }

    async addFeatFilters() {
        const FEAT = 'feat';
        // Feature Filters

        this.addFilter(FEAT, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("DND5E.Source"), 'data.source', 'text');
        this.addFilter(FEAT,game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.class"), 'classRequirement', 'select',
            {
                artificer: game.i18n.localize("CMPBrowser.artificer"),
                barbarian: "Barbarian",
                bard: game.i18n.localize("CMPBrowser.bard"),
                cleric: game.i18n.localize("CMPBrowser.cleric"),
                druid: game.i18n.localize("CMPBrowser.druid"),
                fighter: "Fighter",
                monk: "Monk",
                paladin: game.i18n.localize("CMPBrowser.paladin"),
                ranger: game.i18n.localize("CMPBrowser.ranger"),
                rogue: "Rogue",
                sorcerer: game.i18n.localize("CMPBrowser.sorcerer"),
                warlock: game.i18n.localize("CMPBrowser.warlock"),
                wizard: game.i18n.localize("CMPBrowser.wizard")
            }, true);
            
        this.addFilter(FEAT,"Game Mechanics", game.i18n.localize("DND5E.ItemActivationCost"), 'data.activation.type', 'select', CONFIG.DND5E.abilityActivationTypes);
        this.addFilter(FEAT,"Game Mechanics", game.i18n.localize("CMPBrowser.damageType"), 'damageTypes', 'select', CONFIG.DND5E.damageTypes);
        this.addFilter(FEAT,"Game Mechanics", "Uses Resources", 'usesRessources', 'bool');

    }

    async addNpcFilters() {
        const isFoundryV8 = game.data.version.startsWith("0.8"),
            NPC = 'npc';
        // NPC Filters

        this.addFilter(NPC, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("DND5E.Source"), 'data.details.source', 'text');
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.size"), 'data.traits.size', 'select', CONFIG.DND5E.actorSizes);
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.hasSpells"), 'hasSpells', 'bool');
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.hasLegAct"), 'data.resources.legact.max', 'bool');
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.hasLegRes"), 'data.resources.legres.max', 'bool');
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.cr"), 'data.details.cr', 'numberCompare');

        //Foundry 0.8.x: Creature type (data.details.type) is now a structure, so we check data.details.types.value instead
        let npcDetailsPath;
        if (isFoundryV8) {
            npcDetailsPath = "data.details.type.value";
        } else {//0.7.x
            npcDetailsPath = "data.details.type";
        }

        this.addFilter(NPC, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.creatureType"), npcDetailsPath, 'text', {
            aberration: game.i18n.localize("CMPBrowser.aberration"),
            beast: game.i18n.localize("CMPBrowser.beast"),
            celestial: game.i18n.localize("CMPBrowser.celestial"),
            construct: game.i18n.localize("CMPBrowser.construct"),
            dragon: game.i18n.localize("CMPBrowser.dragon"),
            elemental: game.i18n.localize("CMPBrowser.elemental"),
            fey: game.i18n.localize("CMPBrowser.fey"),
            fiend: game.i18n.localize("CMPBrowser.fiend"),
            giant: game.i18n.localize("CMPBrowser.giant"),
            humanoid: game.i18n.localize("CMPBrowser.humanoid"),
            monstrosity: game.i18n.localize("CMPBrowser.monstrosity"),
            ooze: game.i18n.localize("CMPBrowser.ooze"),
            plant: game.i18n.localize("CMPBrowser.plant"),
            undead: game.i18n.localize("CMPBrowser.undead")
        });

        this.addFilter(NPC, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityStr"), 'data.abilities.str.value', 'numberCompare');
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityDex"), 'data.abilities.dex.value', 'numberCompare');
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityCon"), 'data.abilities.con.value', 'numberCompare');
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityInt"), 'data.abilities.int.value', 'numberCompare');
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityWis"), 'data.abilities.wis.value', 'numberCompare');
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityCha"), 'data.abilities.cha.value', 'numberCompare');

        this.addFilter(NPC, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("DND5E.DamImm"), 'data.traits.di.value', 'multiSelect', CONFIG.DND5E.damageTypes, true);
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("DND5E.DamRes"), 'data.traits.dr.value', 'multiSelect', CONFIG.DND5E.damageTypes, true);
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("DND5E.DamVuln"), 'data.traits.dv.value', 'multiSelect', CONFIG.DND5E.damageTypes, true);
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("DND5E.ConImm"), 'data.traits.ci.value', 'multiSelect', CONFIG.DND5E.conditionTypes, true);
        this.addFilter(NPC, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("CMPBrowser.dmgDealt"), 'damageDealt', 'multiSelect', CONFIG.DND5E.damageTypes, true);

    }
}