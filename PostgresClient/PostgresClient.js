import pg from "pg";
const {Client} = pg;

class PostgresClient {
    static selectQuery = {
        name: 'select item count',
        text: "select id from item where hash_name=$1 and appid=$2",
        values: [],
    };

    static insertQuery = {
        name: 'insert new item',
        text: "insert into item(hash_name, sell_price, currency, sell_listings, appid) values($1, $2, $3, $4, $5)",
        values: [],
    };

    static updateQuery = {
        name: 'update item',
        text: "update item set sell_price=$1, currency=$2, sell_listings=$3, update_date=CURRENT_TIMESTAMP where id=$4",
        values: [],
    };

    static countByAppQuery = {
        name: 'select count of items by app id',
        text: "select count(*) from item where appid=$1",
        values: [],
    };

    static getItemsByAppQuery = {
        name: 'select items by appid',
        text: "select id, hash_name from item where appid=$1 and steamid is null order by hash_name limit 1000 offset 1000*$2",
        values: [],
    };

    static updateItemIdQuery = {
        name: 'update item id',
        text: "update item set steamid=$1 where id=$2",
        values: [],
    };

    constructor() {
        this.client = new Client();
    }

    connect() {
        return this.client.connect();
    }

    disconnect() {
        return this.client.end();
    }

    testSelect(hashName, appid) {
        return this.client.query({ ...PostgresClient.selectQuery, values: [hashName ?? 'test', appid ?? 1]} )
            .then(console.log)
            .catch(console.log)
    }

    testInsert() {
        this.client.query({ ...PostgresClient.insertQuery, values: ['test', 1, 1, 1, 1]} )
            .then(console.log)
            .catch(console.log)
    }

    testUpdate(id) {
        this.client.query({ ...PostgresClient.updateQuery, values: [2, 2, 2, id]} )
            .then(console.log)
            .catch(console.log)
    }

    async insertOrUpdateItem(itemJson) {
        await this.client.query({...PostgresClient.selectQuery, values: [itemJson['hash_name'], itemJson['asset_description']['appid']]})
            .then(async res => {
                const currency = itemJson['sell_price_text'].indexOf('$') !== -1 ? 1 : 0;
                if (res.rows.length === 0) {
                    return this.client.query({
                        ...PostgresClient.insertQuery, values: [
                            itemJson['hash_name'],
                            itemJson['sell_price'],
                            currency,
                            itemJson['sell_listings'],
                            itemJson['asset_description']['appid'],
                        ]
                    });
                }
                return this.client.query({
                    ...PostgresClient.updateQuery, values: [
                        itemJson['sell_price'],
                        currency,
                        itemJson['sell_listings'],
                        res.rows[0]['id'],
                    ]
                });
            })
            .catch(console.log)
    }

    getCountOfItems(appid) {
        return this.client.query({
            ...PostgresClient.countByAppQuery, values: [appid],
        }).then(res => res.rows[0]['count']);
    }

    getItemsByApp(appid, page) {
        return this.client.query({
            ...PostgresClient.getItemsByAppQuery, values: [appid, page],
        }).then(res => res.rows);
    }

    updateItemId(steamId, itemId) {
        return this.client.query({
            ...PostgresClient.updateItemIdQuery, values: [steamId, itemId],
        });
    }
}

export default PostgresClient;