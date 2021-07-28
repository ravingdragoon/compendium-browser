import { compactEntity } from "../classes/compactEntity";
import { CompendiumBrowser } from "../compendium-browser";

export class Renderer {
    /**
     * 
     * @param {Array<string>} templateStrings 
     */
    static async loadTemplates(templateStrings: Array<string>) {
        return await loadTemplates(templateStrings);
    }

    /**
     * Render the Information section
     * 
     * @param {HTMLElement} messageElement 
     * @param entityType 
     * @param numLoaded 
     * @param maxLoaded 
     * 
     */
    static async renderLoading(messageElement: HTMLElement, entityType: string, numLoaded: any, numPacks: number, maxLoaded = false): Promise<void> {
        if (!messageElement) return;

        let loadingHTML = await renderTemplate("modules/compendium-browser/template/loading.hbs", { numLoaded: numLoaded, entityType: entityType, numPacks: numPacks, maxLoaded: maxLoaded });
        messageElement.innerHTML = "" + loadingHTML;
    }

    /**
     * Update Loading Message for the given entity
     * 
     * @param {string} entityType
     * @param {number} numLoaded 
     * @param {number} maxLoad  
     */
    static async updateLoading(entityType: string, numLoaded: number = 0, numPacks = 1, maxLoad: number = 500): Promise<void> {
        let loader = document.getElementById('CBInfoMessage');
        if (loader) { Renderer.renderLoading(loader, entityType, numLoaded, numPacks, numLoaded >= maxLoad); }
    }

    /**
     * 
     * @param {String} entityType 
     * @param {Boolean|null} updateLoading
     * 
     */
    static async renderEntityList(entityList: compactEntity[], entityType: string, updateLoading: boolean | null = null): Promise<HTMLElement> {
        return await renderTemplate(`modules/compendium-browser/template/entity-list.hbs`, { entityItems: entityList, entityType: entityType });
    }

    /**
     * 
     * @param {Object} filters 
     * @param {String} entityType 
     * @returns {String} hmtl
     */
    static async renderFilters(filters: object, entityType: string): Promise<HTMLElement> {
        return await renderTemplate(`modules/compendium-browser/template/filter-container.hbs`, { entityType: entityType, filters: filters });
    }

    /* Hook to load the first data */
    /**
     * 
     * @param CompendiumBrowserApp 
     * @param html 
     * @returns {Promise<void>}
     */
    static async afterRender(CompendiumBrowserApp: CompendiumBrowser, html: HTMLDocument):Promise<void> {
        if (!CompendiumBrowserApp?.refreshList) { return; }
        await CompendiumBrowserApp.replaceList(html, CompendiumBrowserApp.refreshList);
        CompendiumBrowserApp.refreshList = undefined;
    }
}