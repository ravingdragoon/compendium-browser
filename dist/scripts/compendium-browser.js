import { ModuleSettings, CMPBrowser } from './modules/settings.js';
import { Entities } from './modules/entities.js';
import { Events } from '../hooks/events.js';
import { Filter } from './modules/filter.js';
import { Renderer } from './modules/renderer.js';
//import Exporter from './modules/exporter.mjs';
/* eslint-disable valid-jsdoc */
/* eslint-disable complexity */
export class CompendiumBrowser extends Application {
    constructor() {
        super();
        ModuleSettings.registerGameSettings();
        this.settings = ModuleSettings.initModuleSettings();
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
            tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "Item" }],
            classes: options.classes.concat('compendium-browser'),
            template: "modules/compendium-browser/template/template.hbs",
            width: 900,
            height: 800,
            resizable: true,
            minimizable: true
        });
        return options;
    }
    async initialize() {
        // load settings
        if (this.settings === undefined) {
            this.settings = ModuleSettings.initModuleSettings();
        }
        Renderer.loadTemplates([
            "modules/compendium-browser/template/template.hbs",
            "modules/compendium-browser/template/entity-browser.hbs",
            "modules/compendium-browser/template/entity-list.hbs",
            "modules/compendium-browser/template/filter-container.hbs",
            "modules/compendium-browser/template/settings.hbs",
            "modules/compendium-browser/template/loading.hbs"
        ]);
        this.filters.addEntityFilters();
        this.hookCompendiumList();
    }
    /** override */
    _onChangeTab(event, tabs, active) {
        super._onChangeTab(event, tabs, active);
        const html = this.element;
        if (active != 'setting') {
            Events.reloadFilters(html, active);
            this.replaceList(html, active, { reload: false });
        }
    }
    /**
     *
     * @returns {Obejct} data
     */
    async getData() {
        let data = {
            items: [],
            actors: [],
            filters: {
                Spell: this.filters.getByName('Spell'),
                Item: this.filters.getByName('Item'),
                Actor: this.filters.getByName('Actor'),
                RollTable: this.filters.getByName('RollTable'),
                JournalEntry: this.filters.getByName('RollTable')
            },
            showSpellBrowser: (game.user.isGM) || this.settings.allowSpellBrowser,
            showFeatBrowser: (game.user.isGM) || this.settings.allowFeatBrowser,
            showItemBrowser: (game.user.isGM) || this.settings.allowItemBrowser,
            showActorBrowser: (game.user.isGM) || this.settings.allowActorBrowser,
            showRollTableBrowser: (game.user.isGM) || this.settings.allowRollTableBrowser,
            showJournalEntryBrowser: (game.user.isGM) || this.settings.allowJournalEntryBrowser,
            settings: this.settings,
            isGM: game.user.isGM
        };
        return data;
    }
    /** override */
    activateListeners(html) {
        super.activateListeners(html);
        this.observer = new IntersectionObserver((entries, observer) => {
            for (let [i, e] of entries.entries()) {
                if (!e.isIntersecting)
                    break;
                const el = e.target;
                // Avatar image
                //const img = li.querySelector("img");
                if (el && el.dataset.src) {
                    el.style['background-image'] = `url(${el.dataset.src})`;
                    delete el.dataset.src;
                }
                // No longer observe the target
                observer.unobserve(e.target);
            }
        });
        Events.activateActionListener(html);
        Events.activateItemListListeners(html);
        Events.activateFilterListeners(html);
        //Just for the loading image
        if (this.observer) {
            html.find(".entity-image").each((i, imageElement) => this.observer.observe(imageElement));
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
        if (game.user.isGM || this.settings.allowItemBrowser || this.settings.allowSpellBrowser || this.settings.allowActorBrowser) {
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
                    this.refreshList = "Spell";
                }
                else if (this.settings.allowFeatBrowser) {
                    this.refreshList = "Feat";
                }
                else if (this.settings.allowItemBrowser) {
                    this.refreshList = "Item";
                }
                else if (this.settings.allowActorBrowser) {
                    this.refreshList = "Actor";
                }
                else if (this.settings.allowJournalEntryBrowser) {
                    this.refreshList = "JournalEntry";
                }
                else if (this.settings.allowRollTableBrowser) {
                    this.refreshList = "RollTable";
                }
                this.render(true);
            });
        }
    }
    /**
     *
     * @param {*} html
     * @param {*} entityType
     * @param {*} options
     */
    async replaceList(html, entityType, options = { reload: true }) {
        //After rendering the first time or re-rendering trigger the load/reload of visible data
        let entityListElement = document.querySelector('.tab.active .browser .cb_entities');
        if (entityListElement.childElementCount !== undefined) {
            //0.4.2b: On a tab-switch, only reload if there isn't any data already 
            if (options?.reload || entityListElement.childElementCount < 1) {
                const maxLoad = game.settings.get(CMPBrowser.MODULE_NAME, "maxload") ?? CMPBrowser.MAXLOAD;
                await Renderer.updateLoading(entityType, 0, maxLoad);
                // loadItems
                const entityHelper = new Entities();
                let entityList = await entityHelper.loadAndFilter(entityType, true);
                this.currentLists[entityType] = entityList = Entities._sortList(entityList, entityType);
                //Uses loadAndFilterItems to read compendia for items which pass the current filters and render on this tab
                const newEntitiesHTML = await Renderer.renderEntityList(entityList.entities, entityType, true);
                entityListElement.setAttribute('data-active-filters', entityList.activeFilters);
                entityListElement.innerHTML = newEntitiesHTML;
                await Events.observeListElement(entityListElement, 'aside');
                //Reactivate listeners for clicking and dragging
                Events.activateItemListListeners(html);
            }
        }
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
}
