import PostgresClient from "./PostgresClient/PostgresClient.js";


const client = new PostgresClient();

client.connect().then(() => client.testUpdate(4))
