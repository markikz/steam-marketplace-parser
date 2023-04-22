import PostgresClient from "./PostgresClient/PostgresClient.js";


const client = new PostgresClient();

await client.connect().then(() => {

}).catch(console.log);

const start = Date.now();

const names = ['MP9 | Rose Iron (Minimal Wear)', 'Souvenir SSG 08 | Tropical Storm (Well-Worn)', 'StatTrak™ SG 553 | Triarch (Factory New)', 'MP7 | Special Delivery (Battle-Scarred)'];

for (let name in names) {
    await client.testSelect(name, 730).then(console.log, console.log);
}
console.log(Date.now() - start);