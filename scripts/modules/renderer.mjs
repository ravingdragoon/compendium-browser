export class Renderer {
    constructor() {
        this.currentLists = {};
    }

    /**
     * Render the Information section
     * 
     * @param messageElement 
     * @param itemType 
     * @param numLoaded 
     * @param maxLoaded 
     * @returns 
     */
    static async renderLoading(messageElement, itemType, numLoaded, maxLoaded = false) {
        if (!messageElement) return;

        let loadingHTML = await renderTemplate("modules/compendium-browser/template/loading.html", { numLoaded: numLoaded, itemType: itemType, maxLoaded: maxLoaded });
        messageElement.innerHTML = loadingHTML;
    }

    static async updateLoading(numLoaded = 0, maxLoad = 500, entityType) {
        let loader = document.getElementById('CBInfoMessage');
        if (loader) { Renderer.renderLoading(loader, entityType, numLoaded, numLoaded >= maxLoad); }
    }

    /**
     * 
     * @param entityType 
     * @param updateLoading 
     * @returns {html} html rendered List of entities
     */
    static async renderEntityList(entityList, updateLoading = null) {
        return await renderTemplate(`modules/compendium-browser/template/entity-browser-list.html`, { listItems: entityList, });
    }
    
    static async renderFilters(filters){
        return await renderTemplate(`modules/compendium-browser/template/filter-container.html`, {filters: filters});
    }
}