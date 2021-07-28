export class Exporter {

    /**
     * Create a new RollTable from a given Set of entitites.
     *  
     * @param {string} tableName the name of the table entity that will be created
     * @param {Array<any>} entities a set of 
     * @param {function(Entity)} weightPredicate a function that returns a weight (number) that will be used 
     * for the tableResult weight for that given entity. returning 0 will exclude the entity from appearing in the table
     */
    static async createTableFromSelection(
        tableName: string = new Date().valueOf().toString(),
        entities: Array<any>,
        weightPredicate: Function|null = null,
        options: Array<any> | null = null
    ): Promise<boolean> {
        let data = { name: tableName },
            tableArray = [];

        if (!entities || !(entities.length > 0)) return false;

        const newTable: any = await RollTable.create(data);

        ui.notifications.info(`Starting generation of a rolltable with ${entities.length} entries.`);

        for (let entity of entities) {
            let weight = weightPredicate != null ? weightPredicate(entity) : 1;
            if (weight <= 0) continue;

            let tableRowData: any = {};
            tableRowData.type = 2;
            tableRowData.collection = entity.entryCompendium;
            tableRowData.text = entity.entryName;
            tableRowData.img = entity.entryImage;
            tableRowData.weight = weight;
            tableRowData.range = [1, 1];

            tableArray.push(tableRowData);
        }

        await newTable.createEmbeddedDocuments('TableResult', tableArray);
        await newTable.normalize();

        ui.notifications.info(`Rolltable ${tableName} with ${tableArray.length} entries was generated.`);

        return true;
    }
}