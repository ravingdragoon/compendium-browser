import { ModuleSettings , CMPBrowser } from './modules/settings.mjs';
import Exporter from './modules/exporter.mjs';
import Entities from './modules/entities.mjs';
import { Events } from '../hooks/events.mjs';
import { Filter } from './modules/filter.mjs';
import { Renderer } from './modules/renderer.mjs';

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
            this.settings = ModuleSettings.initModuleSettings();
        }

        await loadTemplates([
            "modules/compendium-browser/template/spell-browser.html",
            "modules/compendium-browser/template/entity-browser.html",
            "modules/compendium-browser/template/entity-browser-list.html",
            "modules/compendium-browser/template/filter-container.html",
            "modules/compendium-browser/template/settings.html",
            "modules/compendium-browser/template/loading.html"
        ]);
        this.filters.addEntityFilters();
        this.hookCompendiumList();
    }


    /** override */
    _onChangeTab(event, tabs, active) {
        super._onChangeTab(event, tabs, active);
        const html = this.element;
        this.refreshFilters(html,active);
        this.replaceList(html, active, { reload: false });
    }
    
    async refreshFilters(html,entityType){
        let entityBrowserHtml = await Renderer.renderFilters(game.compendiumBrowser.filters[entityType +'Filters']),
            filterWrapper = document.querySelector('.tab.active .browser .control-area');
            filterWrapper.innerHTML = filterWrapper.firstElementChild.outerHTML + entityBrowserHtml;
            Events.activateFilterListeners(html);
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

    /** override */
    activateListeners(html) {
        super.activateListeners(html);

        this.observer = new IntersectionObserver((entries, observer) => {
            for (let [i, e] of entries.entries()) {
                if (!e.isIntersecting) break;
                const img = e.target;
                // Avatar image
                //const img = li.querySelector("img");
                if (img && img.dataset.src) {
                    img.src = img.dataset.src;
                    delete img.dataset.src;
                }

                // pre load more elements if there are any
                if (i + 2 < entries.length) {
                    let next = entries[i+1]?.target,
                        evenmore = entries[i+2].target;
                    if((next && next.dataset.src) && (evenmore && evenmore.dataset.src)){
                        next.src = next.dataset.src;
                        evenmore.src = evenmore.dataset.src;
                        delete next.dataset.src;
                        delete evenmore.dataset.src;
                        observer.unobserve(next);
                        observer.unobserve(evenmore);
                    }                    
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

    async replaceList(html, entityType, options = { reload: true }) {
        //After rendering the first time or re-rendering trigger the load/reload of visible data
        let entityListElement =  document.querySelector('.tab.active .browser .cb_entities');

        if (entityListElement.childElementCount !== undefined) {
            //0.4.2b: On a tab-switch, only reload if there isn't any data already 
            if (options?.reload || entityListElement.childElementCount < 1) {

                const maxLoad = game.settings.get(CMPBrowser.MODULE_NAME, "maxload") ?? CMPBrowser.MAXLOAD;
                await Renderer.updateLoading(0,maxLoad,entityType);

                // loadItems
                const entityHelper = new Entities(this.settings, this.filters);
                let entityList = await entityHelper.loadAndFilter(entityType,true);
                //
                this.currentLists[entityType] = entityList = Entities._sortList(entityList, entityType);
                //Uses loadAndFilterItems to read compendia for items which pass the current filters and render on this tab
                const newEntitiesHTML = await Renderer.renderEntityList(entityList.entities, true);
                entityListElement.setAttribute('data-active-filters', entityList.filters);
                entityListElement.innerHTML = newEntitiesHTML;

                await Events.observeListElement(entityListElement,'img');

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