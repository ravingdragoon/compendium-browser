var FilterTypes;
(function (FilterTypes) {
    FilterTypes[FilterTypes["text"] = 0] = "text";
    FilterTypes[FilterTypes["bool"] = 1] = "bool";
    FilterTypes[FilterTypes["select"] = 2] = "select";
    FilterTypes[FilterTypes["multiSelect"] = 3] = "multiSelect";
    FilterTypes[FilterTypes["numberCompare"] = 4] = "numberCompare";
})(FilterTypes || (FilterTypes = {}));
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
    constructor(path, label, type, possibleValues = null, valIsArray = false) {
        this.path = '';
        this.label = '';
        this.type = '';
        this.valIsArray = false;
        this.possibleValues = null;
        this.is_text = false;
        this.is_bool = false;
        this.is_select = false;
        this.is_multiSelect = false;
        this.is_numberCompare = false;
        this.path = path;
        this.label = label;
        if (type in FilterTypes) {
            this.type = type;
            setProperty(this, `is_${type}`, true);
        }
        this.possibleValues = possibleValues;
        this.valIsArray = valIsArray;
    }
}
