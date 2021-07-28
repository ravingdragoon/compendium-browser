import { Filter as FilterEntity } from "../classes/filter.js";
export class Filter {
    constructor() {
        this.Spell = this._getInitialFilters();
        this.Actor = this._getInitialFilters();
        this.Feat = this._getInitialFilters();
        this.Item = this._getInitialFilters();
        this.RollTable = this._getInitialFilters();
        this.JournalEntry = this._getInitialFilters();
    }
    /**
     *
     * @param {any} subject
     * @param {any} filters
     *
     * @returns {boolean}
     */
    static passesFilter(subject, filters) {
        for (let filter of Object.values(filters)) {
            let prop = getProperty(subject, `data.${filter.path}`) || getProperty(subject, filter.path);
            if (prop === undefined)
                return false;
            if (filter.type === 'numberCompare') {
                switch (filter.operator) {
                    case '=':
                        if (prop != filter.value) {
                            return false;
                        }
                        break;
                    case '<':
                        if (prop >= filter.value) {
                            return false;
                        }
                        break;
                    case '>':
                        if (prop <= filter.value) {
                            return false;
                        }
                        break;
                }
                continue;
            }
            if (filter.valIsArray === false) {
                if (filter.type === 'text') {
                    if (prop.toLowerCase().indexOf(filter.value.toLowerCase()) === -1) {
                        return false;
                    }
                }
                else {
                    if (filter.value !== undefined && prop !== undefined && prop != filter.value && !(filter.value === true && prop)) {
                        return false;
                    }
                    if (filter.values && filter.values.indexOf(prop) === -1) {
                        return false;
                    }
                }
            }
            else {
                if (prop === undefined)
                    return false;
                if (typeof prop === 'object') {
                    if (filter.value) {
                        if (prop.indexOf(filter.value) === -1) {
                            return false;
                        }
                    }
                    else if (filter.values) {
                        for (let val of filter.values) {
                            if (prop.indexOf(val) !== -1) {
                                continue;
                            }
                            return false;
                        }
                    }
                }
                else {
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
    /**
     *
     * @param name
     * @returns any
     */
    getByName(name) {
        return getProperty(this, name);
    }
    /**
     *
     * @param {string} entityType
     * @returns {Iterable|undefined}
     */
    getByEntityType(entityType) {
        return getProperty(this, entityType);
    }
    resetFilters() {
        this.Spell.activeFilters = {};
        this.Feat.activeFilters = {};
        this.Item.activeFilters = {};
        this.Actor.activeFilters = {};
        this.RollTable.activeFilters = {};
        this.JournalEntry.activeFilters = {};
    }
    /**
     *
     * @returns {Object}
     */
    _getInitialFilters() {
        return {
            registeredFilterCategorys: {},
            activeFilters: {}
        };
    }
    /**
     * add entityfilters
     */
    async addEntityFilters() {
        await this.addSpellFilters();
        await this.addFeatFilters();
        await this.addItemFilters();
        await this.addActorFilters();
        await this.addRollTableFilters();
    }
    /**
     * Used to add custom filters to the Spell-Browser
     * @param {string} entityType type of entity for the filter
     * @param {string} category - Title of the category
     * @param {string} label - Title of the filter
     * @param {string} path - path to the data that the filter uses. uses dotnotation. example: data.abilities.dex.value
     * @param {string} type - type of filter
     *                      possible filter:
     *                          text:           will give a textinput (or use a select if possibleValues has values) to compare with the data. will use objectData.indexOf(searchedText) to enable partial matching
     *                          bool:           will see if the data at the path exists and not false.
     *                          select:         exactly matches the data with the chosen selector from possibleValues
     *                          multiSelect:    enables selecting multiple values from possibleValues, any of witch has to match the objects data
     *                          numberCompare:  gives the option to compare numerical values, either with =, < or the > operator
     * @param {null|boolean} possibleValues - predetermined values to choose from. needed for select and multiSelect, can be used in text filters
     * @param {boolean} valIsArray - if the objects data is an object use this. the filter will check each property in the object (not recursive). if no match is found, the object will be hidden
     */
    async addFilter(entityType, category, label, path, type, possibleValues = null, valIsArray = false) {
        let filter = new FilterEntity(path, label, type, possibleValues, valIsArray), catId = category.replace(/\W/g, ''), target = this.getByName(entityType).registeredFilterCategorys;
        if (target[catId] === undefined) {
            target[catId] = { label: category, filters: [] };
        }
        target[catId].filters.push(filter);
    }
    /**
     * Add all spellfilters
     *
     * @todo convert this to read and use an iteratable object that can be stored in an extra file
     */
    async addSpellFilters() {
        const SPELL = 'Spell';
        // Spellfilters
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("DND5E.Source"), 'data.source', 'text');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.lvl"), 'data.level', 'multiSelect', [game.i18n.localize("CMPBrowser.cantrip"), 1, 2, 3, 4, 5, 6, 7, 8, 9]);
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.school"), 'data.school', 'select', CONFIG.DND5E.spellSchools);
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.castingTime"), 'data.activation.type', 'select', {
            action: game.i18n.localize("DND5E.Action"),
            bonus: game.i18n.localize("CMPBrowser.bonusAction"),
            reaction: game.i18n.localize("CMPBrowser.reaction"),
            minute: game.i18n.localize("DND5E.TimeMinute"),
            hour: game.i18n.localize("DND5E.TimeHour"),
            day: game.i18n.localize("DND5E.TimeDay")
        });
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.spellType"), 'data.actionType', 'select', CONFIG.DND5E.itemActionTypes);
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.damageType"), 'damageTypes', 'select', CONFIG.DND5E.damageTypes);
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.class"), 'data.classes', 'select', {
            artificer: game.i18n.localize("CMPBrowser.artificer"),
            bard: game.i18n.localize("CMPBrowser.bard"),
            cleric: game.i18n.localize("CMPBrowser.cleric"),
            druid: game.i18n.localize("CMPBrowser.druid"),
            paladin: game.i18n.localize("CMPBrowser.paladin"),
            ranger: game.i18n.localize("CMPBrowser.ranger"),
            sorcerer: game.i18n.localize("CMPBrowser.sorcerer"),
            warlock: game.i18n.localize("CMPBrowser.warlock"),
            wizard: game.i18n.localize("CMPBrowser.wizard"),
        }, true);
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.ritual"), 'data.components.ritual', 'bool');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.concentration"), 'data.components.concentration', 'bool');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.vocal"), 'data.components.vocal', 'bool');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.somatic"), 'data.components.somatic', 'bool');
        this.addFilter(SPELL, game.i18n.localize("CMPBrowser.components"), game.i18n.localize("CMPBrowser.material"), 'data.components.material', 'bool');
    }
    async addItemFilters() {
        const ITEM = 'Item';
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
        await this.addFilter(ITEM, game.i18n.localize("CMPBrowser.general"), "Packs", 'matchedPacks', 'select', {
            burglar: "Burglar's Pack",
            diplomat: "Diplomat's Pack",
            dungeoneer: "Dungeoneer's Pack",
            entertainer: "Entertainer's Pack",
            explorer: "Explorer's Pack",
            monsterhunter: "Monster Hunter's Pack",
            priest: "Priest's Pack",
            scholar: "Scholar's Pack",
        }, true);
        await this.addFilter(ITEM, "Game Mechanics", game.i18n.localize("DND5E.ItemActivationCost"), 'data.activation.type', 'select', CONFIG.DND5E.abilityActivationTypes);
        await this.addFilter(ITEM, "Game Mechanics", game.i18n.localize("CMPBrowser.damageType"), 'damageTypes', 'select', CONFIG.DND5E.damageTypes);
        await this.addFilter(ITEM, "Game Mechanics", "Uses Resources", 'usesRessources', 'bool');
        await this.addFilter(ITEM, "Item Subtype", "Weapon", 'data.weaponType', 'text', CONFIG.DND5E.weaponTypes);
        await this.addFilter(ITEM, "Item Subtype", "Equipment", 'data.armor.type', 'text', CONFIG.DND5E.equipmentTypes);
        await this.addFilter(ITEM, "Item Subtype", "Consumable", 'data.consumableType', 'text', CONFIG.DND5E.consumableTypes);
        await this.addFilter(ITEM, "Magic Items", "Rarity", 'data.rarity', 'select', {
            Common: "Common",
            Uncommon: "Uncommon",
            Rare: "Rare",
            "Very rare": "Very Rare",
            Legendary: "Legendary"
        });
    }
    async addFeatFilters() {
        const FEAT = 'Feat';
        this.addFilter(FEAT, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("DND5E.Source"), 'data.source', 'text');
        this.addFilter(FEAT, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.class"), 'classRequirement', 'select', {
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
        this.addFilter(FEAT, "Game Mechanics", game.i18n.localize("DND5E.ItemActivationCost"), 'data.activation.type', 'select', CONFIG.DND5E.abilityActivationTypes);
        this.addFilter(FEAT, "Game Mechanics", game.i18n.localize("CMPBrowser.damageType"), 'damageTypes', 'select', CONFIG.DND5E.damageTypes);
        this.addFilter(FEAT, "Game Mechanics", "Uses Resources", 'usesRessources', 'bool');
    }
    async addActorFilters() {
        const isFoundryV8 = game.data.version.startsWith("0.8"), ACTOR = 'Actor';
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("DND5E.Source"), 'data.details.source', 'text');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.size"), 'data.traits.size', 'select', CONFIG.DND5E.actorSizes);
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.hasSpells"), 'hasSpells', 'bool');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.hasLegAct"), 'data.resources.legact.max', 'bool');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.hasLegRes"), 'data.resources.legres.max', 'bool');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.cr"), 'data.details.cr', 'numberCompare');
        //Foundry 0.8.x: Creature type (data.details.type) is now a structure, so we check data.details.types.value instead
        let actorDetailsPath;
        if (isFoundryV8) {
            actorDetailsPath = "data.details.type.value";
        }
        else { //0.7.x
            actorDetailsPath = "data.details.type";
        }
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.creatureType"), actorDetailsPath, 'text', {
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
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityStr"), 'data.abilities.str.value', 'numberCompare');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityDex"), 'data.abilities.dex.value', 'numberCompare');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityCon"), 'data.abilities.con.value', 'numberCompare');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityInt"), 'data.abilities.int.value', 'numberCompare');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityWis"), 'data.abilities.wis.value', 'numberCompare');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.abilities"), game.i18n.localize("DND5E.AbilityCha"), 'data.abilities.cha.value', 'numberCompare');
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("DND5E.DamImm"), 'data.traits.di.value', 'multiSelect', CONFIG.DND5E.damageTypes, true);
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("DND5E.DamRes"), 'data.traits.dr.value', 'multiSelect', CONFIG.DND5E.damageTypes, true);
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("DND5E.DamVuln"), 'data.traits.dv.value', 'multiSelect', CONFIG.DND5E.damageTypes, true);
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("DND5E.ConImm"), 'data.traits.ci.value', 'multiSelect', CONFIG.DND5E.conditionTypes, true);
        this.addFilter(ACTOR, game.i18n.localize("CMPBrowser.dmgInteraction"), game.i18n.localize("CMPBrowser.dmgDealt"), 'damageDealt', 'multiSelect', CONFIG.DND5E.damageTypes, true);
    }
    async addRollTableFilters() {
        const RT = 'RollTable';
        this.addFilter(RT, game.i18n.localize("CMPBrowser.general"), game.i18n.localize("CMPBrowser.TableType"), 'flags.better-rolltables.table-type', 'select', {
            none: "FoundryVTT default",
            better: "Better",
            loot: "Loot",
            story: "Story",
        });
    }
}
