import {Client} from "pg";

class PostgresClient {
    async constructor() {
        this.client = new Client();
        await this.client.connect();
    }

    insertOrUpdateItem(itemJson) {

    }
}