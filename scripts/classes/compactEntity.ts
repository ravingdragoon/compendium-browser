export class compactEntity {
    public _id: string = '';
    public name: string = '';
    public compendium: string = '';
    public classRequirement: any;
    public classRequirementString: string = '';
    public data: { [name: string]: any } = {};
    public flags: { [name: string]: any } = {};
    public dae: boolean = false;
    public img: string = 'icons/svg/daze.svg';
    public rarity: string|undefined;
    public type: string = '';
    public ac: string|undefined;
    public displayCR: any;
    public displaySize: any;
    public displayType: any;
    public orderCR!: number;
    public orderSize!: number;
    public effects: any;
    public usesRessources: boolean = false;
    public hasSave: boolean = false;

    hasDAE(): boolean {
        return this.dae;
    }
}