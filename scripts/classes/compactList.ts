import { compactEntity } from "./compactEntity";

export class compactList {
    public entities: Array<compactEntity>;  
    public activeFilters: String;

    constructor(){
        this.entities = [];
        this.activeFilters = '';
    }

    /**
     * 
     * @returns {number}
     */
    size(): number {
        return this.entities.length;
    }

    /**
     * 
     * @param {compactEntity} entity 
     * @returns {void}
     */
    addEntity(entity: compactEntity): void {
        this.entities.push(entity);
    }

    /**
     * 
     * @param {*} index 
     * @returns {compactEntity}
     */
    getEntity(index: any): compactEntity {
        return this.entities[index];
    }

    /**
     * 
     * @param {string} filters 
     */
    addActiveFilters(filters: string){
        this.activeFilters = filters;
    }

    /**
     * 
     * @returns {boolean}
     */
    hasFilters(): boolean {
        return this.activeFilters.length != 0;
    }
}