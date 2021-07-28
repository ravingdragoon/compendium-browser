export class Renderer {
    /**
     *
     * @param {Array<string>} templateStrings
     */
    static async loadTemplates(templateStrings) {
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
    static async renderLoading(messageElement, entityType, numLoaded, numPacks, maxLoaded = false) {
        if (!messageElement)
            return;
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
    static async updateLoading(entityType, numLoaded = 0, numPacks = 1, maxLoad = 500) {
        let loader = document.getElementById('CBInfoMessage');
        if (loader) {
            Renderer.renderLoading(loader, entityType, numLoaded, numPacks, numLoaded >= maxLoad);
        }
    }
    /**
     *
     * @param {String} entityType
     * @param {Boolean|null} updateLoading
     *
     */
    static async renderEntityList(entityList, entityType, updateLoading = null) {
        return await renderTemplate(`modules/compendium-browser/template/entity-list.hbs`, { entityItems: entityList, entityType: entityType });
    }
    /**
     *
     * @param {Object} filters
     * @param {String} entityType
     * @returns {String} hmtl
     */
    static async renderFilters(filters, entityType) {
        return await renderTemplate(`modules/compendium-browser/template/filter-container.hbs`, { entityType: entityType, filters: filters });
    }
    /* Hook to load the first data */
    /**
     *
     * @param CompendiumBrowserApp
     * @param html
     * @returns {Promise<void>}
     */
    static async afterRender(CompendiumBrowserApp, html) {
        if (!CompendiumBrowserApp?.refreshList) {
            return;
        }
        await CompendiumBrowserApp.replaceList(html, CompendiumBrowserApp.refreshList);
        CompendiumBrowserApp.refreshList = undefined;
    }
}
