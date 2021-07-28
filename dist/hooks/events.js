import { Exporter } from "../scripts/modules/exporter.js";
import { Renderer } from "../scripts/modules/renderer.js";
import { ModuleSettings } from "../scripts/modules/settings.js";
export class Events {
    constructor() {
        return this;
    }
    /**
     * Reload Filters for a given entity
     *
     * @param {HTMLCollection} html
     * @param {String} entityType
     */
    static async reloadFilters(html, entityType) {
        let entityBrowserHtml = await Renderer.renderFilters(game.compendiumBrowser.filters[entityType], entityType), filterWrapper = document.querySelector('.tab.active .browser .control-area');
        filterWrapper.innerHTML = entityBrowserHtml;
        Events.activateFilterListeners(html);
    }
    /**
     *
     * @param {HTMLCollection} app
     */
    static async activateActionListener(app = document.getElementsByClassName('window-app')) {
        app = app.get(0);
        app.querySelector('button[data-action="export"]').addEventListener('click', async (e) => {
            let items = app.querySelectorAll('.content .tab.active .cb_entities .entity'), entityType = app.querySelector('.content .tab.active').dataset.tab, filters = JSON.parse(app.querySelector('.tab.active .cb_entities').dataset.activeFilters), tableItems = [], tableName = entityType + 'table: ';
            items.forEach(item => {
                let obj = {};
                Object.assign(obj, item.dataset);
                tableItems.push(obj);
            });
            let filterKeys = Object.keys(filters);
            if (filterKeys.length > 0) {
                for (let key of filterKeys) {
                    tableName = tableName + '_' + filters[key].path + '-' + filters[key].value;
                }
            }
            let d = Dialog.confirm({
                title: "Export subset to table",
                content: "<p>Choose wisely.</p>",
                yes: () => Exporter.createTableFromSelection(tableName, tableItems),
                no: () => console.log("You chose ... poorly"),
                defaultYes: false
            });
        });
    }
    static async activateItemListListeners(app = document.getElementsByClassName('window-app')) {
        app = app[0];
        // open entity sheet on click
        app.querySelectorAll('*[data-action="openSheet"]').forEach(async (el) => {
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
        app.querySelectorAll('.draggable').forEach(async (li) => {
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
    static async observeListElement(list, tag) {
        for (let element of list.getElementsByTagName(tag)) {
            game.compendiumBrowser.observer.observe(element);
        }
    }
    static async activateFilterListeners(html, app = document.getElementsByClassName('window-app')) {
        app = app[0];
        // toggle visibility of filter containers
        html.find('.filtercontainer h3, .multiselect label').click(async (ev) => {
            await $(ev.target.nextElementSibling).toggle(100);
        });
        html.find('.multiselect label').trigger('click');
        // reset filters and re-rendes
        app.querySelectorAll('.button[data-action="reset-filters').forEach(async (el) => {
            el.addEventListener('click', async (e) => {
                game.compendiumBrowser.filters.resetFilters();
                game.compendiumBrowser.refreshList = e.target.closest('.tab').dataset.tab;
                game.compendiumBrowser.render();
            });
        });
        // select filters
        app.querySelectorAll('.settings input').forEach(async (el) => {
            el.addEventListener('keyup change paste', async (e) => {
                let target = e.target, setting = target.dataset.setting, value = target.checked, key = target.dataset.key, category = (target.dataset.type === 'Spell' || target.dataset.type === 'Feat') ? 'Item' : target.dataset.type;
                if (key)
                    game.compendiumBrowser.settings.loadedCompendium[category][key].load = value;
                ui.notifications.info("Settings Saved. Compendiums are being reloaded.");
                switch (setting) {
                    case 'allow-spell-browser':
                        game.compendiumBrowser.settings.allowSpellBrowser = value;
                        break;
                    case 'allow-feat-browser':
                        game.compendiumBrowser.settings.allowFeatBrowser = value;
                        break;
                    case 'allow-item-browser':
                        game.compendiumBrowser.settings.allowItemBrowser = value;
                        break;
                    case 'allow-actor-browser':
                        game.compendiumBrowser.settings.allowActorBrowser = value;
                        break;
                    case 'allow-rolltable-browser':
                        game.compendiumBrowser.settings.allowRollTableBrowser = value;
                        break;
                    case 'allow-journalentry-browser':
                        game.compendiumBrowser.settings.allowJournalEntryBrowser = value;
                        break;
                    default:
                        break;
                }
                ModuleSettings.saveSettings();
                game.compendiumBrowser.render();
            });
        });
        // select filters
        app.querySelectorAll('.filter[data-type=text] input, .filter[data-type=text] select').forEach(async (el) => {
            el.addEventListener('keyup change paste', async (e) => {
                const path = e.target.closest('.filter').dataset.path, key = path.replace(/\./g, ''), entityType = app.querySelector('.content .tab.active').dataset.tab;
                if (e.target.value === '' || e.target.value === undefined) {
                    delete game.compendiumBrowser.filters[entityType].activeFilters[key];
                }
                else {
                    game.compendiumBrowser.filters[entityType].activeFilters[key] = {
                        path: path,
                        type: 'text',
                        valIsArray: false,
                        value: e.target.value
                    };
                }
                game.compendiumBrowser.replaceList(html, entityType);
            });
        });
        // select filters
        app.querySelectorAll('.filter[data-type=select] select, .filter[data-type=bool] select').forEach(async (el) => {
            el.addEventListener('change', async (e) => {
                const path = e.target.closest('.filter').dataset.path, key = path.replace(/\./g, ''), filterType = e.target.closest('.filter').dataset.type, entityType = app.querySelector('.content .tab.active').dataset.tab;
                let valIsArray = e.target.closest('.filter').dataset.valIsArray === 'true', value = e.target.options[e.target.selectedIndex].value;
                if (value === "null") {
                    delete game.compendiumBrowser.filters[entityType].activeFilters[key];
                }
                else {
                    game.compendiumBrowser.filters[entityType].activeFilters[key] = {
                        path: path,
                        type: filterType,
                        valIsArray: valIsArray,
                        value: value
                    };
                }
                game.compendiumBrowser.replaceList(html, entityType);
            });
        });
        // multiselect
        app.querySelectorAll('.filter[data-type=multiSelect] input').forEach(async (el) => {
            el.addEventListener('change', async (e) => {
                const path = e.target.closest('.filter').dataset.path, key = path.replace(/\./g, ''), filterType = 'multiSelect', entityType = app.querySelector('.content .tab.active').dataset.tab, filter = game.compendiumBrowser.filters[entityType].activeFilters[key];
                let valIsArray = e.target.closest('.filter').dataset.valIsArray, value = e.target.dataset.value;
                if (e.target.checked === true) {
                    if (filter === undefined) {
                        game.compendiumBrowser.filters[entityType].activeFilters[key] =
                            { path: path, type: filterType, valIsArray: valIsArray, values: [value] };
                    }
                    else {
                        game.compendiumBrowser.filters[entityType].activeFilters[key].values.push(value);
                    }
                }
                else {
                    delete game.compendiumBrowser.filters[entityType].activeFilters[key].values.splice(game.compendiumBrowser.filters[entityType].activeFilters[key].values.indexOf(value), 1);
                    if (game.compendiumBrowser.filters[entityType].activeFilters[key].values.length === 0)
                        delete game.compendiumBrowser.filters[entityType].activeFilters[key];
                }
                game.compendiumBrowser.replaceList(html, entityType);
            });
        });
        app.querySelectorAll('.filter[data-type=numberCompare] select, .filter[data-type=numberCompare] input').forEach(async (el) => {
            el.addEventListener('change keyup paste', async (e) => {
                const path = e.target.closest('.filter').dataset.path, key = path.replace(/\./g, ''), filterType = 'numberCompare', entityType = app.querySelector('.content .tab.active').dataset.tab, operator = e.target.closest('.filter').getElementsByTagName('select').val, value = e.target.closest('.filter').getElementsByTagName('input').val;
                if (value === '' || operator === 'null') {
                    delete game.compendiumBrowser.filters[entityType].activeFilters[key];
                }
                else {
                    game.compendiumBrowser.filters[entityType].activeFilters[key] = {
                        path: path,
                        type: filterType,
                        valIsArray: false,
                        operator: operator,
                        value: value
                    };
                }
                game.compendiumBrowser.replaceList(html, browserTab);
            });
        });
    }
}
