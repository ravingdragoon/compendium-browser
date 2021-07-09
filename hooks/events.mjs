import Exporter from "../scripts/modules/exporter.mjs";

export class Events {
    constructor(){
        return this;
    }

    static async activateActionListener(app = document.getElementsByClassName('window-app')){
        app = app.get(0);
        app.querySelector('button[data-action="export"]').addEventListener('click', async (e)=> {
            let items = app.querySelectorAll('.content .tab.active .cb_entities .entity'),
                entityType = app.querySelector('.content .tab.active').dataset.tab,
                filters = JSON.parse(app.querySelector('.tab.active .cb_entities').dataset.activeFilters),
                tableItems = [],
                tableName = entityType + 'table: ';

            items.forEach(item => {
                let obj = {};
                Object.assign(obj, item.dataset);
                tableItems.push(obj);
            });
            
            let filterKeys = Object.keys(filters);
            if (filterKeys.length > 0){
                for (let key of filterKeys) {
                    tableName = tableName + '_' + filters[key].path + '-' + filters[key].value;
                }
            }

            Exporter.createTableFromSelection(tableName,tableItems);
        });
    }

    static async activateItemListListeners(app = document.getElementsByClassName('window-app')) {
        app = app.get(0);

        // open entity sheet on click
        app.querySelectorAll('*[data-action="openSheet"]').forEach(async el => {
            el.addEventListener('click', async (e) => {
                let itemId = e.currentTarget.parentNode.dataset.entryId;
                let compendium = e.currentTarget.parentNode.dataset.entryCompendium;
                let pack = game.packs.find(p => p.collection === compendium);
                await pack.getEntity(itemId).then(entity => {
                    entity.sheet.render(true);
                });
            });                
        });

        // make draggable
        //0.4.1: Avoid the game.packs lookup
        app.querySelectorAll('.draggable').forEach(async li => {
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

    static async observeListElement(list,tag) {     
        for (let img of list.getElementsByTagName(tag)) {
            game.compendiumBrowser.observer.observe(img);
        }
    }

    static async activateFilterListeners(html){
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
                delete game.compendiumBrowser.filters[filterTarget].activeFilters[key];
            } else {
                game.compendiumBrowser.filters[filterTarget].activeFilters[key] = {
                    path: path,
                    type: 'text',
                    valIsArray: false,
                    value: ev.target.value
                }
            }

            game.compendiumBrowser.replaceList(html, entityType);
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
                delete game.compendiumBrowser.filters[filterTarget].activeFilters[key];
            } else {
                game.compendiumBrowser.filters[filterTarget].activeFilters[key] = {
                    path: path,
                    type: filterType,
                    valIsArray: valIsArray,
                    value: value
                }
            }
            game.compendiumBrowser.replaceList(html, browserTab);
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

            game.compendiumBrowser.replaceList(html, browserTab);
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

            game.compendiumBrowser.replaceList(html, browserTab);
        });
    }
}