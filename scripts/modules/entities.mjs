import { Filter } from './filter.mjs';
import { Renderer } from './renderer.mjs';
import { CMPBrowser } from './settings.mjs';

export default class Entities {

    constructor(settings, filters) {
        this.settings = settings;
        this.filters = filters;
    }

    /**
     * 
     * @param {String} entityType 
     * @param {*} updateLoading 
     * @returns 
     */
    async loadAndFilter(entityType = "spell", updateLoading = null) {
        console.log(`Load and Filter Items | Started loading ${entityType}s`);
        console.time("loadAndFilterItems");
        await this.checkListsLoaded();
        const Category = (entityType === 'npc') ? 'Actor' : 'Item';
        const maxLoad = game.settings.get(CMPBrowser.MODULE_NAME, "maxload") ?? CMPBrowser.MAXLOAD;
        const ActiveFilters = game.compendiumBrowser.filters.getByType(entityType).activeFilters;
        const packs = game.packs.filter((pack) => pack.metadata.entity === Category);
        //0.4.1: Load and filter just one of spells, feats, and items (specified by browserTab)
        let unfoundSpells = '';
        let numItemsLoaded = 0;
        let compactList = {
            filters: JSON.stringify(ActiveFilters),
            entities: []
        };

        //Filter the full list, but only save the core compendium information + displayed info 
        for (let pack of packs) {
            if (game.compendiumBrowser.settings.loadedCompendium[pack.metadata.entity][pack.collection].load) {
                //FIXME: How much could we do with the loaded index rather than all content? 
                //OR filter the content up front for the decoratedItem.type??               
                await pack.getContent().then(content => {
                    for (let currentEntity of content) {
                        
                        if (currentEntity.data.type != entityType && entityType != Category.toLowerCase()) continue;

                        let compactEntity = null,
                            decoratedEntity = false;

                            switch (entityType) {
                                case "spell":
                                    decoratedEntity = Entities.decorateEntity(currentEntity, entityType, this.packList, this.classList, this.subClasses);
                                    if (Filter.passesFilter(decoratedEntity, ActiveFilters)) {
                                        compactEntity = {
                                            _id: decoratedEntity._id,
                                            compendium: pack.collection,
                                            name: decoratedEntity.name,
                                            img: decoratedEntity.img,
                                            type: decoratedEntity.type,
                                            dae: decoratedEntity.effects.size || false,
                                            classRequirement: decoratedEntity.classRequirement,
                                            data: {
                                                level: decoratedEntity.data?.level,
                                                components: decoratedEntity.data?.components
                                            }
                                        };
                                    }
                                    break;

                                case "feat":
                                    decoratedEntity = Entities.decorateEntity(currentEntity, entityType, this.packList, this.classList, this.subClasses);
                                    if (["feat", "class"].includes(decoratedEntity.type) && Filter.passesFilter(decoratedEntity, ActiveFilters)) {
                                        compactEntity = {
                                            _id: decoratedEntity._id,
                                            compendium: pack.collection,
                                            name: decoratedEntity.name,
                                            img: decoratedEntity.img,
                                            type: decoratedEntity.type,
                                            dae: decoratedEntity.effects.size || false,
                                            classRequirement: decoratedEntity.classRequirement
                                        };
                                    }
                                    break;

                                case "item":
                                    decoratedEntity = Entities.decorateEntity(currentEntity, entityType, this.packList, this.classList, this.subClasses);
                                    //0.4.5: Itm type for true items could be many things (weapon, consumable, etc) so we just look for everything except spells, feats, classes
                                    if (!["spell", "feat", "class"].includes(decoratedEntity.type) && Filter.passesFilter(decoratedEntity, ActiveFilters)) {
                                        compactEntity = {
                                            _id: decoratedEntity._id,
                                            compendium: pack.collection,
                                            name: decoratedEntity.name,
                                            img: decoratedEntity.img,
                                            type: decoratedEntity.type,
                                            rarity: decoratedEntity.data?.rarity.toLowerCase().replace(/ /g, ''),
                                            dae: decoratedEntity.effects.size || false,
                                            ac: (decoratedEntity.data?.armor?.type) ? decoratedEntity.data?.armor?.value || false : false,
                                        };

                                        if (compactEntity.type == 'weapon' && (decoratedEntity.data?.range?.value)) {
                                            setProperty(compactEntity, `tags.range`, decoratedEntity.data?.range?.value + decoratedEntity.data?.range?.units);
                                        }

                                        for (let filter of Object.values(ActiveFilters)) {
                                            setProperty(compactEntity, `tags.${filter.path}`, filter.value);
                                        }
                                    }
                                    break;
                                case "npc":
                                    decoratedEntity = Entities.decorateEntity(currentEntity, entityType, this.packList, this.classList, this.subClasses);
                                    if (Filter.passesFilter(decoratedEntity, ActiveFilters)) {
                                        //0.4.2: Don't store all the details - just the display elements
                                        compactEntity = {
                                            _id: decoratedEntity._id,
                                            compendium: pack.collection,
                                            name: decoratedEntity.name,
                                            img: decoratedEntity.img,
                                            displayCR: decoratedEntity.displayCR,
                                            displaySize: decoratedEntity.displaySize,
                                            displayType: decoratedEntity.data?.details?.type,
                                            orderCR: decoratedEntity.data.details.cr,
                                            orderSize: decoratedEntity.filterSize
                                        }
                                    }
                                    break;
                                default:
                                    break;
                            }

                            if (compactEntity) {  //Indicates it passed the filters
                                compactList.entities.push(compactEntity);
                                if (numItemsLoaded++ >= maxLoad) break;
                                //0.4.2e: Update the UI (e.g. "Loading 142 spells")
                                if (updateLoading) { Renderer.updateLoading(numItemsLoaded,500,entityType); }
                            }
                    } //for item5e of content
                });
            }
            if (numItemsLoaded >= maxLoad) break;
        }//for packs

        this.itemsLoaded = true;
        console.timeEnd("loadAndFilterItems");
        console.log(`Load and Filter Items | Finished loading ${compactList.length} ${entityType}s`);
        return compactList;
    }

    static _sortList(list, entityType, orderBy) {
        if(entityType == 'npc'){
            switch (orderBy) {
                case 'name':
                    list.entities.sort((a, b) => {
                        let aName = a.name;
                        let bName = b.name;
                        if (aName < bName) return -1;
                        if (aName > bName) return 1;
                        return 0;
                    }); break;
                case 'cr':
                    list.entities.sort((a, b) => {
                        let aVal = Number(a.orderCR);
                        let bVal = Number(b.orderCR);
                        if (aVal < bVal) return -1;
                        if (aVal > bVal) return 1;
                        if (aVal == bVal) {
                            let aName = a.name;
                            let bName = b.name;
                            if (aName < bName) return -1;
                            if (aName > bName) return 1;
                            return 0;
                        }
                    }); break;
                case 'size':
                    list.entities.sort((a, b) => {
                        let aVal = a.orderSize;
                        let bVal = b.orderSize;
                        if (aVal < bVal) return -1;
                        if (aVal > bVal) return 1;
                        if (aVal == bVal) {
                            let aName = a.name;
                            let bName = b.name;
                            if (aName < bName) return -1;
                            if (aName > bName) return 1;
                            return 0;
                        }
                    }); break;
            }
        } else {
            if (orderBy) {
                list.entities.sort((a, b) => {
                    let aName = a.name;
                    let bName = b.name;
                    if (aName < bName) return -1;
                    if (aName > bName) return 1;
                    return 0;
                });
            } else {
                let defaultSort = new Map([
                    ['spell', 'level'],
                    ['feats', 'class'],
                    ['items', 'type'],
                ]);

                list.entities.sort((a, b) => {
                    let sort = defaultSort.get(entityType);
                    let aVal = a[sort];
                    let bVal = b[sort];
                    if (aVal < bVal) return -1;
                    if (aVal > bVal) return 1;
                    if (aVal == bVal) {
                        let aName = a.name;
                        let bName = b.name;
                        if (aName < bName) return -1;
                        if (aName > bName) return 1;
                        return 0;
                    }
                });
            }
        }
        return list;
    }

    /**
     * 
     * @param {item5e|Object}entity 
     * @param {Object|Iterable} packList 
     * @param {Object|Iterable} classList 
     * @param {Object|Iterable} subClasses 
     * 
     * @returns {Object} decoratedItem
     */
    static decorateEntity(entity, entityType, packList = {}, classList = {}, subClasses = {}) {
        if (!entity) return null;
        //Decorate and then filter a compendium entry - returns null or the item
        const entityData = entity.data;

        if (entityType === 'npc') {
            // cr display
            let cr = entityData.data.details.cr;
            if (cr == undefined || cr == '') cr = 0;
            else cr = Number(cr);
            if (cr > 0 && cr < 1) cr = "1/" + (1 / cr);
            entityData.displayCR = cr;
            entityData.displaySize = 'unset';
            entityData.filterSize = 2;
            if (!entityData.data.details.type.value){
                let temp = entityData.data.details.type;
                entityData.data.details.type = {value: temp};
                setProperty(entityData,'data.details.type', entityData.data.details.type);
            }
            if (CONFIG.DND5E.actorSizes[entityData.data.traits.size] !== undefined) {
                entityData.displaySize = CONFIG.DND5E.actorSizes[entityData.data.traits.size];
            }
            switch (entityData.data.traits.size) {
                case 'grg': entityData.filterSize = 5; break;
                case 'huge': entityData.filterSize = 4; break;
                case 'lg': entityData.filterSize = 3; break;
                case 'sm': entityData.filterSize = 1; break;
                case 'tiny': entityData.filterSize = 0; break;
                case 'med':
                default: entityData.filterSize = 2; break;
            }

            // getting value for HasSpells and damage types
            entityData.hasSpells = false;
            entityData.damageDealt = [];
            for (let item of entityData.items) {
                if (item.type == 'spell') {
                    entityData.hasSpells = true;
                }
                if (item.data.damage && item.data.damage.parts && item.data.damage.parts.length > 0) {
                    for (let part of item.data.damage.parts) {
                        let type = part[1];
                        if (entityData.damageDealt.indexOf(type) === -1) {
                            entityData.damageDealt.push(type);
                        }
                    }
                }
            }
        } else {
            // getting damage types (common to all Items, although some won't have any)
            entityData.damageTypes = [];
            if (entityData.data.damage && entityData.data.damage.parts.length > 0) {
                for (let part of entityData.data.damage.parts) {
                    let type = part[1];
                    if (entityData.damageTypes.indexOf(type) === -1) {
                        entityData.damageTypes.push(type);
                    }
                }
            }

            if (entityData.type === 'spell') {
                // determining classes that can use the spell
                let cleanSpellName = entityData.name.toLowerCase().replace(/[^一-龠ぁ-ゔァ-ヴーa-zA-Z0-9ａ-ｚＡ-Ｚ０-９々〆〤]/g, '').replace("'", '').replace(/ /g, '');
                //let cleanSpellName = spell.name.toLowerCase().replace(/[^a-zA-Z0-9\s:]/g, '').replace("'", '').replace(/ /g, '');
                if (classList[cleanSpellName]) {
                    let classes = classList[cleanSpellName];
                    entityData.classRequirement = classes.split(',');
                }
            } else if (entityData.type === 'feat' || entityData.type === 'class') {
                // getting class
                let reqString = entityData.data.requirements?.replace(/[0-9]/g, '').trim();
                let matchedClass = [];
                for (let c in subClasses) {
                    if (reqString && reqString.toLowerCase().indexOf(c) !== -1) {
                        matchedClass.push(c);
                    } else {
                        for (let subClass of subClasses[c]) {
                            if (reqString && reqString.indexOf(subClass) !== -1) {
                                matchedClass.push(c);
                                break;
                            }
                        }
                    }
                }
                entityData.classRequirement = matchedClass;
                entityData.classRequirementString = matchedClass.join(', ');

                // getting uses/ressources status
                entityData.usesRessources = entity.hasLimitedUses;
                entityData.hasSave = entity.hasSave;

            } else {
                // getting pack
                let matchedPacks = [];
                for (let pack of Object.keys(packList)) {
                    for (let packItem of packList[pack]) {
                        if (entityData.name.toLowerCase() === packItem.toLowerCase()) {
                            matchedPacks.push(pack);
                            break;
                        }
                    }
                }
                entityData.matchedPacks = matchedPacks;
                entityData.matchedPacksString = matchedPacks.join(', ');

                // getting uses/ressources status
                entityData.usesRessources = entity.hasLimitedUses;
            }
        }

        return entityData;

    }

    async checkListsLoaded() {
        const dataPath = '/modules/compendium-browser/data/';
        //Provides extra info not in the standard SRD, like which classes can learn a spell
        if (!this.classList) {
            this.classList = await fetch(dataPath + 'spell-classes.json').then(result => {
                return result.json();
            }).then(obj => {
                return this.classList = obj;
            });
        }

        if (!this.packList) {
            this.packList = await fetch(dataPath + 'item-packs.json').then(result => {
                return result.json();
            }).then(obj => {
                return this.packList = obj;
            });
        }

        if (!this.subClasses) {
            this.subClasses = await fetch(dataPath + 'sub-classes.json').then(result => {
                return result.json();
            }).then(obj => {
                return this.subClasses = obj;
            });
        }
    }
}