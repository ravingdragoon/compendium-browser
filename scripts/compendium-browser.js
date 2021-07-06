import { ModuleSettings , CMPBrowser } from './modules/settings.mjs';
import Exporter from './modules/exporter.mjs';
import Entities from './modules/entities.mjs';
import { Filter } from './modules/filter.mjs';

//import Exporter from './modules/exporter.mjs';
/* eslint-disable valid-jsdoc */
/* eslint-disable complexity */

export class CompendiumBrowser extends Application {

    constructor() {
        super();
        let moduleSettings = new ModuleSettings();
        this.settings = moduleSettings.initSettings();
        
        this.filters = new Filter();

        this.currentLists = {};
    }

    /**
     * 
     */
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            title: "CMPBrowser.compendiumBrowser",
            tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "spell" }],
            classes: options.classes.concat('compendium-browser'),
            template: "modules/compendium-browser/template/template.html",
            width: 800,
            height: 700,
            resizable: true,
            minimizable: true
        });
        return options;
    }

    async initialize() {
        // load settings
        if (this.settings === undefined) {
            ModuleSettings.initSettings();
        }

        await loadTemplates([
            "modules/compendium-browser/template/spell-browser.html",
            "modules/compendium-browser/template/npc-browser.html",
            "modules/compendium-browser/template/feat-browser.html",
            "modules/compendium-browser/template/item-browser.html",
            "modules/compendium-browser/template/entity-browser-list.html",
            "modules/compendium-browser/template/filter-container.html",
            "modules/compendium-browser/template/settings.html",
            "modules/compendium-browser/template/loading.html"
        ]);

        this.hookCompendiumList();
    }


    /** override */
    _onChangeTab(event, tabs, active) {
        super._onChangeTab(event, tabs, active);
        const html = this.element;
        this.replaceList(html, active, { reload: false })
    }

    /**
     * 
     * @returns {Obejct} data
     */
    async getData() {

        //0.4.1 Filter as we load to support new way of filtering
        //Previously loaded all data and filtered in place; now loads minimal (preload) amount, filtered as we go
        //First time (when you press Compendium Browser button) is called with filters unset

        //0.4.1k: Don't do any item/npc loading until tab is visible
        let data = {
            items: [],
            npcs: [],
            spellFilters: this.filters.getByName('spellFilters'),
            showSpellBrowser: (game.user.isGM || this.settings.allowSpellBrowser),
            featFilters: this.filters.getByName('featFilters'),
            showFeatBrowser: (game.user.isGM || this.settings.allowFeatBrowser),
            itemFilters: this.filters.getByName('itemFilters'),
            showItemBrowser: (game.user.isGM || this.settings.allowItemBrowser),
            npcFilters: this.filters.getByName('npcFilters'),
            showNpcBrowser: (game.user.isGM || this.settings.allowNpcBrowser),
            settings: this.settings,
            isGM: game.user.isGM
        };


        return data;
    }

    activateItemListListeners(html) {
        // show entity sheet
        html.find('*[data-action="openSheet"]').click(async e => {
            let itemId = e.currentTarget.parentNode.dataset.entryId;
            let compendium = e.currentTarget.parentNode.dataset.entryCompendium;
            let pack = game.packs.find(p => p.collection === compendium);
            await pack.getEntity(itemId).then(entity => {
                entity.sheet.render(true);
            });
        });

        // make draggable
        //0.4.1: Avoid the game.packs lookup
        html.find('.draggable').each((i, li) => {
            li.setAttribute("draggable", true);
            li.addEventListener('dragstart', event => {
                let packName = li.getAttribute("data-entry-compendium");
                let pack = game.packs.find(p => p.collection === packName);
                if (!pack) {
                    event.preventDefault();
                    return false;
                }
                event.dataTransfer.setData("text/plain", JSON.stringify({
                    type: pack.entity,
                    pack: pack.collection,
                    id: li.getAttribute("data-entry-id")
                }));
            }, false);
        });
    }

    /** override */
    activateListeners(html) {
        super.activateListeners(html);

        this.observer = new IntersectionObserver((entries, observer) => {
            for (let e of entries) {
                if (!e.isIntersecting) continue;
                const img = e.target;
                // Avatar image
                //const img = li.querySelector("img");
                if (img && img.dataset.src) {
                    img.src = img.dataset.src;
                    delete img.dataset.src;
                }

                // No longer observe the target
                observer.unobserve(e.target);
            }
        });

        this.activateItemListListeners(html);

        // toggle visibility of filter containers
        html.find('.filtercontainer h3, .multiselect label').click(async ev => {
            await $(ev.target.nextElementSibling).toggle(100);
        });

        html.find('.multiselect label').trigger('click');

        // reset filters and re-rendes
        html.find('button[data-action="reset-filters"]').click(ev => {
            this.filters.resetFilters();
            this.refreshList = ev.target.closest('.tab').dataset.tab;
            this.render();
        });

        html.find('button[data-action="export"]').click(e => {
            let items = document.querySelectorAll('.content .tab.active .cb_entities .item'),
                tableItems = [];

            items.forEach(item => {
                let obj = {};
                Object.assign(obj, item.dataset);
                tableItems.push(obj);
            });
            
            Exporter.createTableFromSelection('testtable',tableItems);
        });

        // settings
        html.find('.settings input').on('change', e => {
            let setting = e.target.dataset.setting,
                value = e.target.checked,
                key = e.target.dataset.key,
                category = (e.dataset.type === 'npc')? 'Actor' : 'Item';

            this.settings.loadedCompendium[category][key].load = value;
            this.render();

            ui.notifications.info("Settings Saved. Compendiums are being reloaded.");

            if (setting === 'allow-spell-browser') {
                this.settings.allowSpellBrowser = value;
            }
            if (setting === 'allow-feat-browser') {
                this.settings.allowFeatBrowser = value;
            }
            if (setting === 'allow-item-browser') {
                this.settings.allowItemBrowser = value;
            }
            if (setting === 'allow-npc-browser') {
                this.settings.allowNpcBrowser = value;
            }
            ModuleSettings.saveSettings();
        });


        // activating or deactivating filters
        //0.4.1: Now does a re-load and updates just the data side
        // text filters
        html.find('.filter[data-type=text] input, .filter[data-type=text] select').on('keyup change paste', ev => {
            const path = $(ev.target).parents('.filter').data('path');
            const key = path.replace(/\./g, '');
            const value = ev.target.value;
            const entityType = $(ev.target).parents('.tab').data('tab');

            const filterTarget = `${entityType}Filters`;

            if (value === '' || value === undefined) {
                delete this[filterTarget].activeFilters[key];
            } else {
                this[filterTarget].activeFilters[key] = {
                    path: path,
                    type: 'text',
                    valIsArray: false,
                    value: ev.target.value
                }
            }

            this.replaceList(html, entityType);
        });

        // select filters
        html.find('.filter[data-type=select] select, .filter[data-type=bool] select').on('change', ev => {
            const path = $(ev.target).parents('.filter').data('path');
            const key = path.replace(/\./g, '');
            const filterType = $(ev.target).parents('.filter').data('type');
            const browserTab = $(ev.target).parents('.tab').data('tab');
            let valIsArray = $(ev.target).parents('.filter').data('valisarray');
            if (valIsArray === 'true') valIsArray = true;
            let value = ev.target.value;
            if (value === 'false') value = false;
            if (value === 'true') value = true;

            const filterTarget = `${browserTab}Filters`;

            if (value === "null") {
                delete this.filters[filterTarget].activeFilters[key];
            } else {
                this.filters[filterTarget].activeFilters[key] = {
                    path: path,
                    type: filterType,
                    valIsArray: valIsArray,
                    value: value
                }
            }
            this.replaceList(html, browserTab);
        });

        // multiselect filters
        html.find('.filter[data-type=multiSelect] input').on('change', ev => {
            const path = $(ev.target).parents('.filter').data('path');
            const key = path.replace(/\./g, '');
            const filterType = 'multiSelect';
            const browserTab = $(ev.target).parents('.tab').data('tab');
            let valIsArray = $(ev.target).parents('.filter').data('valisarray');
            if (valIsArray === 'true') valIsArray = true;
            let value = $(ev.target).data('value');

            const filterTarget = `${browserTab}Filters`;
            const filter = this[filterTarget].activeFilters[key];

            if (ev.target.checked === true) {
                if (filter === undefined) {
                    this[filterTarget].activeFilters[key] = {
                        path: path,
                        type: filterType,
                        valIsArray: valIsArray,
                        values: [value]
                    }
                } else {
                    this[filterTarget].activeFilters[key].values.push(value);
                }
            } else {
                delete this[filterTarget].activeFilters[key].values.splice(this[filterTarget].activeFilters[key].values.indexOf(value), 1);
                if (this[filterTarget].activeFilters[key].values.length === 0) {
                    delete this[filterTarget].activeFilters[key];
                }
            }

            this.replaceList(html, browserTab);
        });


        html.find('.filter[data-type=numberCompare] select, .filter[data-type=numberCompare] input').on('change keyup paste', ev => {
            const path = $(ev.target).parents('.filter').data('path');
            const key = path.replace(/\./g, '');
            const filterType = 'numberCompare';
            const browserTab = $(ev.target).parents('.tab').data('tab');
            let valIsArray = false;

            const operator = $(ev.target).parents('.filter').find('select').val();
            const value = $(ev.target).parents('.filter').find('input').val();

            const filterTarget = `${browserTab}Filters`;

            if (value === '' || operator === 'null') {
                delete this[filterTarget].activeFilters[key]
            } else {
                this[filterTarget].activeFilters[key] = {
                    path: path,
                    type: filterType,
                    valIsArray: valIsArray,
                    operator: operator,
                    value: value
                }
            }

            this.replaceList(html, browserTab);
        });

        //Just for the loading image
        if (this.observer) {
            html.find("img").each((i, img) => this.observer.observe(img));
        }
    }        

    hookCompendiumList() {
        Hooks.on('renderCompendiumDirectory', (app, html, data) => {
            this.hookCompendiumList();
        });

        let html = $('#compendium');
        if (this.settings === undefined) {
            this.initSettings();
        }
        if (game.user.isGM || this.settings.allowSpellBrowser || this.settings.allowNpcBrowser) {
            const cbButton = $(`<button class="compendium-browser-btn"><i class="fas fa-fire"></i> ${game.i18n.localize("CMPBrowser.compendiumBrowser")}</button>`);
            html.find('.compendium-browser-btn').remove();

            // adding to directory-list since the footer doesn't exist if the user is not gm
            html.find('.directory-footer').append(cbButton);

            // Handle button clicks
            cbButton.click(ev => {
                ev.preventDefault();
                //0.4.1: Reset filters when you click button
                this.filters.resetFilters();
                //0.4.3: Reset everything (including data) when you press the button - calls afterRender() hook

                if (game.user.isGM || this.settings.allowSpellBrowser) {
                    this.refreshList = "spell";
                } else if (this.settings.allowFeatBrowser) {
                    this.refreshList = "feat";
                } else if (this.settings.allowItemBrowser) {
                    this.refreshList = "item";
                } else if (this.settings.allowNPCBrowser) {
                    this.refreshList = "npc";
                }
                this.render(true);
            });
        }
    }


    /* Hook to load the first data */
    static afterRender(cb, html) {
        //0.4.3: Because a render always resets ALL the displayed filters (on all tabs) to unselected , we have to blank all the lists as well
        // (because the current HTML template doesn't set the selected filter values)
        if (!cb?.refreshList) { return; }

        cb.replaceList(html, cb.refreshList);

        cb.refreshList = null;
    }

    async replaceList(html, browserTab, options = { reload: true }) {
        //After rendering the first time or re-rendering trigger the load/reload of visible data

        let elements = null;
        //0.4.2 Display a Loading... message while the data is being loaded and filtered
        let loadingMessage = null;
        if (browserTab === 'spell') {
            elements = html.find("ul#CBSpells");
            loadingMessage = html.find("#CBSpellsMessage");
        } else if (browserTab === 'npc') {
            elements = html.find("ul#CBNPCs");
            loadingMessage = html.find("#CBNpcsMessage");
        } else if (browserTab === 'feat') {
            elements = html.find("ul#CBFeats");
            loadingMessage = html.find("#CBFeatsMessage");
        } else if (browserTab === 'item') {
            elements = html.find("ul#CBItems");
            loadingMessage = html.find("#CBItemsMessage");
        }
        if (elements?.length) {
            //0.4.2b: On a tab-switch, only reload if there isn't any data already 
            if (options?.reload || !elements[0].children.length) {

                const maxLoad = game.settings.get(CMPBrowser.MODULE_NAME, "maxload") ?? CMPBrowser.MAXLOAD;
                const updateLoading = async numLoaded => {
                    if (loadingMessage.length) { this.renderLoading(loadingMessage[0], browserTab, numLoaded, numLoaded >= maxLoad); }
                };
                updateLoading(0);

                //Uses loadAndFilterItems to read compendia for items which pass the current filters and render on this tab
                const newItemsHTML = await this.renderItemData(browserTab, updateLoading);
                elements[0].innerHTML = newItemsHTML;

                //Lazy load images
                if (this.observer) {
                    $(elements).find("img").each((i, img) => this.observer.observe(img));
                }

                //Reactivate listeners for clicking and dragging
                this.activateItemListListeners($(elements));
            }
        }

    }

    async renderLoading(messageElement, itemType, numLoaded, maxLoaded = false) {
        if (!messageElement) return;

        let loadingHTML = await renderTemplate("modules/compendium-browser/template/loading.html", { numLoaded: numLoaded, itemType: itemType, maxLoaded: maxLoaded });
        messageElement.innerHTML = loadingHTML;
    }

    async renderItemData(entityType, updateLoading = null) {
        const entityHelper = new Entities(this.settings, this.filters);
        let entityList = await entityHelper.loadAndFilter(entityType, updateLoading);

        this.currentLists[entityType] = Entities._sortList(entityList, entityType);

        const html = await renderTemplate(`modules/compendium-browser/template/entity-browser-list.html`, { listItems: this.currentLists[entityType] });

        return html;
    }

    //SORTING
    triggerSort(html, entityType) {
        html.find('.' + entityType + '-browser select[name=sortorder]').trigger('change');
    }

    _sortEntities(html, entityType) {
        html.find('.' + entityType + '-browser select[name=sortorder]').on('change', ev => {
            let entityList = html.find('.' + entityType + '-browser .cb_entities li');
            let byName = ev.target.value;
            let sortedList = (entityType != 'npc')? this.sortEntity(entityList, entityType, byName) : this.sortNpcs(entityList, byName);
            let ol = $(html.find('.' + entityType + '-browser .cb_entities'));
            ol[0].innerHTML = [];
            for (let element of sortedList) {
                ol[0].append(element);
            }
        });
        this.triggerSort(html, entityType);
    }

    decorateItem(item5e) {
        if (!item5e) return null;
        //Decorate and then filter a compendium entry - returns null or the item
        const item = item5e.data;
        
        // getting damage types (common to all Items, although some won't have any)
        item.damageTypes = [];
        if (item.data.damage && item.data.damage.parts.length > 0) {
            for (let part of item.data.damage.parts) {
                let type = part[1];
                if (item.damageTypes.indexOf(type) === -1) {
                    item.damageTypes.push(type);
                }
            }
        }

        if (item.type === 'spell') {
            // determining classes that can use the spell
            let cleanSpellName = item.name.toLowerCase().replace(/[^一-龠ぁ-ゔァ-ヴーa-zA-Z0-9ａ-ｚＡ-Ｚ０-９々〆〤]/g, '').replace("'", '').replace(/ /g, '');
            //let cleanSpellName = spell.name.toLowerCase().replace(/[^a-zA-Z0-9\s:]/g, '').replace("'", '').replace(/ /g, '');
            if (this.classList[cleanSpellName]) {
                let classes = this.classList[cleanSpellName];
                item.data.classes = classes.split(',');
            } else {
                //FIXME: unfoundSpells += cleanSpellName + ',';
            }
        } else if (item.type === 'feat' || item.type === 'class') {
            // getting class
            let reqString = item.data.requirements?.replace(/[0-9]/g, '').trim();
            let matchedClass = [];
            for (let c in this.subClasses) {
                if (reqString && reqString.toLowerCase().indexOf(c) !== -1) {
                    matchedClass.push(c);
                } else {
                    for (let subClass of this.subClasses[c]) {
                        if (reqString && reqString.indexOf(subClass) !== -1) {
                            matchedClass.push(c);
                            break;
                        }
                    }
                }
            }
            item.classRequirement = matchedClass;
            item.classRequirementString = matchedClass.join(', ');

            // getting uses/ressources status
            item.usesRessources = item5e.hasLimitedUses;
            item.hasSave = item5e.hasSave;

        } else {
            // getting pack
            let matchedPacks = [];
            for (let pack of Object.keys(this.packList)) {
                for (let packItem of this.packList[pack]) {
                    if (item.name.toLowerCase() === packItem.toLowerCase()) {
                        matchedPacks.push(pack);
                        break;
                    }
                }
            }
            item.matchedPacks = matchedPacks;
            item.matchedPacksString = matchedPacks.join(', ');

            // getting uses/ressources status
            item.usesRessources = item5e.hasLimitedUses
        }
        return item;
    }

    decorateNpc(npc) {
        //console.log('%c '+npc.name, 'background: white; color: red')
        const entityData = npc.data;

        
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

    passesFilter(subject, filters) {
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

    clearObject(obj) {
        let newObj = {};
        for (let key in obj) {
            if (obj[key] == true) {
                newObj[key] = true;
            }
        }
        return newObj;
    }

    saveSettings() {
        game.settings.set(CMPBrowser.MODULE_NAME, 'settings', this.settings);
    }

    async addFilters(){
        await this.filters.addSpellFilters();
        await this.filters.addFeatFilters();
        await this.filters.addItemFilters();
        await this.filters.addNpcFilters();
    }    
}