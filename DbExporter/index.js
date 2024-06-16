import * as fs from "node:fs";

class DbExporter {
    constructor(dbClient) {
        this.dbClient = dbClient;
        this.dbClient.connect();
    }

    createItem(hashName, steamid, appid, id, groupName, groupId) {
        return  {
            "name": hashName,
            "name_real": hashName,
            "item_nameid": steamid,
            "appid": appid,
            "b_summ": 0,
            "s_summ": 0,
            "s_summ_steam": 0,
            "priceOnSale": "",
            "min_float": 0,
            "max_float": 1,
            "contextid": 2,
            "b_cnt": 0,
            "b_on": 0,
            "s_on": 0,
            "id_group": groupId,
            "name_group": groupName,
            "on_sale_cnt": "",
            "on_sale_cnt_stcrs": "",
            "order_cnt": "",
            "buyorderid": "",
            "priceHistory": null,
            "order_date": "",
            "resale_cnt": 0,
            "checked": false,
            "removeIds": [],
            "inv_cnt": 0,
            "cntSalesDay": "",
            "group_settings": {
                "id": 0,
                "group_id": 0,
                "algoritm": "",
                "algoritm_buy": "",
                "cancelOrderIfLow": "",
                "cntSalesMonth": "",
                "countDayHistoryGraph": "",
                "dayTrend": "",
                "dayTrend_up": "",
                "listingPlace": "",
                "minProfit": "",
                "monthTrend": "",
                "monthTrend_up": "",
                "orderPercent": "",
                "ordersPlace": "",
                "dontDeleteOrders": "",
                "profitPercent_min": "",
                "alg_sell_qoeff": "",
                "alg_buy_qoeff": "",
                "percentLimit": "",
                "profitPercent": "",
                "weekTrend": "",
                "weekTrend_up": "",
                "settings_not_null": false
            },
            "id": id,
            "CurKoefOrder": 0,
            "Date_last_sell": "",
            "convertedPriceHistory": ""
        };

    }

    createGroup(groupName, groupId) {
        return {
            "name": groupName,
            "open": 1,
            "quantity": 0,
            "order_percent": "",
            "order_percent_cnt": "",
            "order_max": "",
            "on_sale_cnt": 1,
            "order_cnt": 0,
            "id": groupId
        }
    }

    createEmptyDb() {
        return {
            "filter_stickers": [],
            "group_settings": [],
            "groups": [],
            "items": []
        }
    }

    sortSellOrders(a, b) {
        if (a[0][0] > b[0][0]) {
            return -1;
        }
        if (a[0][0] < b[0][0]) {
            return 1;
        }
        return 0;
    }

    sortBuyOrders(a, b) {
        if (a[0][0] < b[0][0]) {
            return -1;
        }
        if (a[0][0] > b[0][0]) {
            return 1;
        }
        return 0;
    }

    countProfit(sellOrders, buyOrders, depth) {
        if (!buyOrders || buyOrders.length === 0 || !sellOrders || sellOrders.length === 0) {
            return 0;
        }
        sellOrders.sort(this.sortSellOrders);
        buyOrders.sort(this.sortBuyOrders);

        return ((sellOrders[0][0] * 0.87 - buyOrders[0][0]) / buyOrders[0][0]) * 100;
    };

    async exportDb(appid,
                   minListingsSellListings,
                   minListingsSellPrice,
                   maxListingsSellPrice,
                   listingsCurrency,
                   daysFromLastListingsUpdate,
                   daysFromLastItemordershistogramUpdate,
                   itemordershistogramProfit) {
        console.log(`export db for appid: ${appid}`);
        const countOfItemsToExport = await this.dbClient.getCountOfItemsForExport(
            appid,
            minListingsSellListings,
            minListingsSellPrice,
            maxListingsSellPrice,
            listingsCurrency,
            daysFromLastListingsUpdate,
            daysFromLastItemordershistogramUpdate
        );
        if(countOfItemsToExport === 0){
            return;
        }

        let db = this.createEmptyDb();
        let groupName = "test";
        let groupId = 1;
        db.groups.push(this.createGroup(groupName, groupId))

        let page = 0;
        while (countOfItemsToExport >= page * 1000) {
            let items = await this.dbClient.getItemsForExport(
                page,
                appid,
                minListingsSellListings,
                minListingsSellPrice,
                maxListingsSellPrice,
                listingsCurrency,
                daysFromLastListingsUpdate,
                daysFromLastItemordershistogramUpdate
            );
            let profit;
            for (const item of items) {
                profit = this.countProfit(JSON.parse(item['itemordershistogram_sell_orders']), JSON.parse(item['itemordershistogram_buy_orders']))

                if (profit >= itemordershistogramProfit) {
                    //console.log(`${profit} | ${item['listings_sell_price']} | ${item['listings_sell_listings']} | ${item['hash_name']}`);
                    db.items.push(this.createItem(item['hash_name'], item['steamid'], item['appid'], item['id'], groupName, groupId))
                }
            }
            try {
                fs.writeFileSync(`./db${Date.now()}.json`, JSON.stringify(db));
                // file written successfully
                console.log("success")
            } catch (err) {
                console.error(err);
            }

            page++;
        }
    }


}

export default DbExporter;