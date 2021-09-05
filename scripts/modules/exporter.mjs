export default class Exporter {

    /**
     * Create a new RollTable by extracting entries from a compendium.
     *  
     * @param {string} tableName the name of the table entity that will be created
     * @param {string} compendiumName the name of the compendium to use for the table generation
     * @param {function(Entity)} weightPredicate a function that returns a weight (number) that will be used 
     * for the tableResult weight for that given entity. returning 0 will exclude the entity from appearing in the table
     */
    static async createTableFromSelection(tableName, itemSubset, { weightPredicate = null } = {}) {
        let data = { name: tableName },
            tableArray = [];

        if (itemSubset && (itemSubset.length > 0)) {
            const newTable = await RollTable.create(data);

            ui.notifications.info(`Starting generation of a rolltable with ${itemSubset.length} entries.`);

            for (let item of itemSubset) {
                let weight = 1;
                if (weightPredicate) {
                    weight = weightPredicate(item);
                }
                if (weight == 0) continue;

                let tableEntryData = {};
                tableEntryData.type = 2;
                tableEntryData.collection = item.entryCompendium;
                tableEntryData.text = item.entryName;
                tableEntryData.img = item.entryImage;
                tableEntryData.weight = weight;
                tableEntryData.range = [1, 1];

                tableArray.push(tableEntryData);
            }

            await newTable.createEmbeddedDocuments("TableResult", tableArray);
            await newTable.normalize();

            ui.notifications.info(`Rolltable ${tableName} with ${tableArray.length} entries was generated.`);
        } else {
            ui.notifications.warn(`Compendium named ${item.packName} not found`);
        }
    }
}