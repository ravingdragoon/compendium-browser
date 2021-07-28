enum FilterTypes {
    'text',
    'bool',
    'select',
    'multiSelect',
    'numberCompare'
}

/**
 * Used to add custom filters to the Spell-Browser
 * @param {string} path - path to the data that the filter uses. uses dotnotation. example: data.abilities.dex.value
 * @param {string} label - Title of the filter
 * @param {string} type - type of filter
 *                      possible types:
 *                          text:           will give a textinput (or use a select if possibleValues has values) to compare with the data. will use objectData.indexOf(searchedText) to enable partial matching
 *                          bool:           will see if the data at the path exists and not false.
 *                          select:         exactly matches the data with the chosen selector from possibleValues
 *                          multiSelect:    enables selecting multiple values from possibleValues, any of witch has to match the objects data
 *                          numberCompare:  gives the option to compare numerical values, either with =, < or the > operator
 * @param {null|boolean} possibleValues - predetermined values to choose from. needed for select and multiSelect, can be used in text filters
 * @param {boolean} valIsArray - if the objects data is an object use this. the filter will check each property in the object (not recursive). if no match is found, the object will be hidden
 */
export class Filter {
    public path: string = '';
    public label: string = '';
    public type: string = '';
    public valIsArray: boolean = false;
    public possibleValues: any = null;
    public is_text: boolean = false;
    public is_bool: boolean = false;
    public is_select: boolean = false;
    public is_multiSelect: boolean = false;
    public is_numberCompare: boolean = false;

    constructor(path: string, label: string, type: string, possibleValues: any = null, valIsArray: boolean = false) {
        this.path = path;
        this.label = label;

        if (type in FilterTypes) {
            this.type = type;
            setProperty(this,`is_${type}`,true);
        }

        this.possibleValues = possibleValues;
        this.valIsArray = valIsArray;
    }
}
