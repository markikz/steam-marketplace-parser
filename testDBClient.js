import PostgresClient from "./PostgresClient/PostgresClient.js";
import * as dotenv from "dotenv";

dotenv.config();

const client = new PostgresClient();

await client.connect().then(() => {

}).catch(console.log);

const start = Date.now();

const names = ['MP9 | Rose Iron (Minimal Wear)', 'Souvenir SSG 08 | Tropical Storm (Well-Worn)', 'StatTrak™ SG 553 | Triarch (Factory New)', 'MP7 | Special Delivery (Battle-Scarred)'];


// await client.testJsonInsert({ array: [[{key: 'value'}], [{keyTwo: 'valueTwo'}]]});
await client.testJsonSelect();

console.log(Date.now() - start);