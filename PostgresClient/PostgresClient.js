import pg from "pg";
const {Client} = pg;

class PostgresClient {
    static selectQuery = {
        name: 'select item count',
        text: "select id from steam_info.item where hash_name=$1 and appid=$2",
        values: [],
    };

    //todo не заполняется listings_update_date
    static insertListingsQuery = {
        name: 'insert new item',
        text: "insert into steam_info.item(hash_name, listings_sell_price, listings_currency, listings_sell_listings, appid) values($1, $2, $3, $4, $5)",
        values: [],
    };

    static updateListingsQuery = {
        name: 'update item',
        text: "update steam_info.item set listings_sell_price=$1, listings_currency=$2, listings_sell_listings=$3,  listings_update_date=CURRENT_TIMESTAMP where id=$4",
        values: [],
    };

    static countByAppQuery = {
        name: 'select count of items by app id',
        text: "select count(*) as count from steam_info.item where appid=$1",
        values: [],
    };

    static countByAppIdAndSteamIdIsNotNullQuery = {
        name: 'select count of items by app id',
        text: "select count(*) as count from steam_info.item where appid=$1 and steamid is not null",
        values: [],
    };

    static getItemsByAppQuery = {
        name: 'select items by appid',
        text: "select id, hash_name from steam_info.item where appid=$1 order by hash_name limit 1000 offset 1000*$2",
        values: [],
    };

    static getItemsByAppAndSteamIdIsNotNullQuery = {
        name: 'select items by appid',
        text: "select id, hash_name from steam_info.item where appid=$1 and steamid is not null order by hash_name limit 1000 offset 1000*$2",
        values: [],
    };

    static updateItemIdQuery = {
        name: 'update item id',
        text: "update steam_info.item set steamid=$1 where id=$2",
        values: [],
    };

    static updatePriceOverviewQuery = {
        name: 'update price overview',
        text: "update steam_info.item set priceoverview_volume=$2, priceoverview_median_price=$3, priceoverview_currency=$4, priceoverview_update_date=CURRENT_TIMESTAMP where id=$1",
        values: [],
    };

    static updateOrdersQuery = {
        name: 'update orders',
        text: "update steam_info.item set itemordershistogram_sell_orders=$2, itemordershistogram_buy_orders=$3, itemordershistogram_currency=$4, itemordershistogram_update_date=CURRENT_TIMESTAMP where id=$1",
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

    async insertOrUpdateItem(itemJson) {
        await this.client.query({...PostgresClient.selectQuery, values: [itemJson['hash_name'], itemJson['asset_description']['appid']]})
            .then(async res => {
                //todo не правильно заполняется currency
                const currency = itemJson['sell_price_text'].indexOf('$') !== -1 ? 1 : 0;
                if (res.rows.length === 0) {
                    return this.client.query({
                        ...PostgresClient.insertListingsQuery, values: [
                            itemJson['hash_name'],
                            itemJson['sell_price'],
                            currency,
                            itemJson['sell_listings'],
                            itemJson['asset_description']['appid'],
                        ]
                    });
                }
                return this.client.query({
                    ...PostgresClient.updateListingsQuery, values: [
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
        }).then(res => {
            console.log(res);
            return res.rows[0]['count'];
        }).catch(console.error);
    }

    getCountOfItemsByAppIdAndSteamIdIsNotNull(appid) {
        return this.client.query({
            ...PostgresClient.countByAppIdAndSteamIdIsNotNullQuery, values: [appid],
        }).then(res => {
            console.log(res);
            return res.rows[0]['count'];
        }).catch(console.error);
    }

    getItemsByAppAndSteamIdIsNotNull(appid, page) {
        return this.client.query({
            ...PostgresClient.getItemsByAppAndSteamIdIsNotNullQuery, values: [appid, page],
        }).then(res => res.rows);
    }

    getItemsByApp(appid, page) {
        return this.client.query({
            ...PostgresClient.getItemsByAppQuery, values: [appid, page],
        }).then(res => res.rows);
    }

    updateItemId(steamId, itemId) {
        console.log({updateId: {steamId, itemId}});
        return this.client.query({
            ...PostgresClient.updateItemIdQuery, values: [steamId, itemId],
        });
    }

    updatePriceOverview(id, volume, median, currency) {
        return this.client.query({
            ...PostgresClient.updatePriceOverviewQuery, values: [id, volume, median, currency],
        });
    }

    updateOrders(id, sellOrders, buyOrders, currency) {
        return this.client.query({
            ...PostgresClient.updateOrdersQuery, values: [id, sellOrders, buyOrders, currency],
        });
    }

    testSelect(hashName, appid) {
        return this.client.query({ ...PostgresClient.selectQuery, values: [hashName ?? 'test', appid ?? 1]} )
            .then(console.log)
            .catch(console.log)
    }

    testInsert() {
        this.client.query({ ...PostgresClient.insertListingsQuery, values: ['test', 1, 1, 1, 1]} )
            .then(console.log)
            .catch(console.log)
    }

    testUpdate(id) {
        this.client.query({ ...PostgresClient.updateListingsQuery, values: [2, 2, 2, id]} )
            .then(console.log)
            .catch(console.log)
    }

    testJsonInsert(object) {
        return this.client.query("insert into steam_info.item(sell_orders) values($1)", [object])
            .then(console.log)
            .catch(console.log)
    }

    testJsonSelect() {
        return this.client.query("select * from steam_info.item where hash_name is null", [])
            .then(console.log)
            .catch(console.log)
    }
}

export default PostgresClient;