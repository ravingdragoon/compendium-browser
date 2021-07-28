export class compactEntity {
    constructor() {
        this._id = '';
        this.name = '';
        this.compendium = '';
        this.classRequirementString = '';
        this.data = {};
        this.flags = {};
        this.dae = false;
        this.img = 'icons/svg/daze.svg';
        this.type = '';
        this.usesRessources = false;
        this.hasSave = false;
    }
    hasDAE() {
        return this.dae;
    }
}
