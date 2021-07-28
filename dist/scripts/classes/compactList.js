export class compactList {
    constructor() {
        this.entities = [];
        this.activeFilters = '';
    }
    /**
     *
     * @returns {number}
     */
    size() {
        return this.entities.length;
    }
    /**
     *
     * @param {compactEntity} entity
     * @returns {void}
     */
    addEntity(entity) {
        this.entities.push(entity);
    }
    /**
     *
     * @param {*} index
     * @returns {compactEntity}
     */
    getEntity(index) {
        return this.entities[index];
    }
    /**
     *
     * @param {string} filters
     */
    addActiveFilters(filters) {
        this.activeFilters = filters;
    }
    /**
     *
     * @returns {boolean}
     */
    hasFilters() {
        return this.activeFilters.length != 0;
    }
}
