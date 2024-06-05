class MarketplaceParser {
    //https://steamcommunity.com/market/search/render/?search_descriptions=1&sort_column=hash_name&sort_dir=desc&appid=730&norender=2&count=1&start=10
    static baseItemsListUrl = 'https://steamcommunity.com/market/search/render/?search_descriptions=1&sort_column=name&sort_dir=desc&norender=2'
    //https://steamcommunity.com/market/listings/730/Revolution%20Case
    static baseItemUrl = 'https://steamcommunity.com/market/listings';
    //https://steamcommunity.com/market/priceoverview/?currency=5&appid=730&market_hash_name=Operation%20Riptide%20Case
    static basePriceOverviewUrl = 'https://steamcommunity.com/market/priceoverview/?';
    //https://steamcommunity.com/market/itemordershistogram?country=EN&language=english&currency=1&item_nameid=176288467
    static baseOrdersUrl = 'https://steamcommunity.com/market/itemordershistogram?country=EN&language=english'

    static pageTimeout = 5000;

    constructor(appid, proxy, onParserStop, dbClient, pageTimeout, currency) {
        if (!appid || !proxy)
            throw new Error('Missing required parameter[s]');
        this.appid = appid;
        this.proxyManager = proxy;
        this.appUrl = MarketplaceParser.baseItemsListUrl + '&appid=' + appid;
        this.itemsPerPage = 100;
        this.currentPage = 0;
        this.intervalId = undefined;
        this.onParserStop = onParserStop;
        this.dbClient = dbClient;
        this.dbClient.connect();
        this.pageTimeout = pageTimeout;
        this.currency = currency ?? 1;
    }

    parsePrice(price) {
        if (price) {
            return parseFloat(price.replace(',', '.').replace(/[^\d.]/g, ''))
                .toFixed(2)
                .toString()
                .replace('.', '')
        }

        return undefined;
    }

    sendRequest(marketUrl) {
        return this.proxyManager.fetch(marketUrl);
    }

    sendRequestText(marketUrl) {
        return this.proxyManager.fetchText(marketUrl).then(response => {
            if (response['success'])
                return response['text'];
            return undefined;
        });
    }

    getItemsCount() {
        return this.sendRequest(this.appUrl + '&count=1&start=0')
            .then(json => {
                console.log(json);
                return json['total_count']
            });
    }

    parsePage(page) {
        return this.sendRequest(`${this.appUrl}&count=${this.itemsPerPage}&start=${page * this.itemsPerPage}`)
            .then(response => {
                if (response['success']) {
                    return response['results'];
                }

                if (response['error']) {
                    throw response["error"]
                } else {
                    throw response;
                }
            }).catch(error => {
                console.error(`Error parsing page: ${page}, appid: ${this.appid}`);
                console.error(error);
                return undefined;
            });
    }

    parseAllItems() {
        this.getItemsCount()
            .then(async (count) => {
                while (true) {
                    if (this.currentPage < (count / this.itemsPerPage)) {
                        const page = await this.parsePage(this.currentPage);
                        if (page !== undefined) {
                            this.currentPage++;
                            await this.writePageToDB(page).then(() => this.timeout(1));
                        }
                    } else {
                        console.log('---------------------all items fetched for appid=' + this.appid);
                        this.stop();
                        return
                    }
                }
            })
            .catch((error) => this.stop(error));
    }

    stop(err) {
        console.log(err);
        console.log('Stopping parser for appid = ' + this.appid);

        if (this.intervalId !== undefined) {
            clearInterval(this.intervalId);
        }
        this.dbClient.disconnect();

        if (this.onParserStop !== undefined) {
            this.onParserStop(this.appid);
        }
    }

    async writePageToDB(resultArray) {
        console.log(resultArray.length);
        for (let item of resultArray) {
            await this.dbClient.insertOrUpdateItem(item);
        }
    }

    getItemId(hashName) {
        return this.sendRequestText(`${MarketplaceParser.baseItemUrl}/${this.appid}/${encodeURIComponent(hashName)}`)
            .then(page => {
                if (!page)
                    throw new Error('Error getting item id by hashName: ' + hashName);
                return page.match(/Market_LoadOrderSpread\( *(\d+) *\)/)?.[1];
            })
    }

    fillItemId(item) {
        return this.getItemId(item['hash_name']).then(steamId => this.dbClient.updateItemId(steamId, item['id']));
    }

    timeout(ms) {
        return (new Promise(resolve => setTimeout(resolve, ms)));
    }

    fillItemIds() {
        this.dbClient.getCountOfItems(this.appid)
            .then(async count => {
                console.log(`Count of items to process: ${ count }`);

                let page = 0;
                while (page < (count / 1000)) {
                    const items = await this.dbClient.getItemsByApp(this.appid, page);
                    let item_counter = 0;
                    while (item_counter < items.length) {
                        let item = items[item_counter];
                        if (!item['steamid']) {
                            const success = await this.fillItemId(item)
                                .then(() => this.timeout(250))
                                .catch(err => {
                                    console.error(`error getting steamid for  ${item['id']} appid: ${this.appid}`);
                                    console.error(err);
                                    return false;
                                });
                        }
                        item_counter++;
                    }
                    page++;
                }
            }).then(() => this.stop(), () => this.stop());
    }

    getItemPriceOverview(hash_name) {
        return this.sendRequest(`${MarketplaceParser.basePriceOverviewUrl}currency=${this.currency}&appid=${this.appid}&market_hash_name=${encodeURIComponent(hash_name)}`)
            .then(json => {
                if (!json || !json['success']) {
                    const err = json['error'] ?? json;
                    throw new Error(`Error getting price overview for hashName: ${hash_name}: ${err}`,)
                }
                return json;
            })
    }

    fillItemPriceOverview(item) {
        return this.getItemPriceOverview(item['hash_name'])
            .then(priceOverview => this.dbClient.updatePriceOverview(item['id'], priceOverview['volume'] ? priceOverview['volume'] : 0, this.parsePrice(priceOverview['median_price']), this.currency));
    }

    fillPriceOverviews() {
        this.dbClient.getCountOfItemsWithSteamID(this.appid)
            .then(async count => {
                console.log(`Count of items to process: ${ count }`);
                let page = 0;
                while (page < (count / 1000)) {

                    const items = await this.dbClient.getItemsByAppWithSteamID(this.appid, page);
                    let item_counter = 0;
                    while (item_counter < items.length) {
                        const item = items[item_counter];
                        const success = await this.fillItemPriceOverview(item)
                            .then(() => this.timeout(100))
                            .then(() => true)
                            .catch(err => {
                                this.timeout(100)
                                console.error(`error filling price overview for dbId: ${item['id']}, appid: ${this.appid}`);
                                console.error(err);
                                console.log(page * 1000 + item_counter);
                                return false;
                            });
                        item_counter++;
                    }
                    page++;
                }
            });
    }

    getItemOrders(itemId) {
        return this.sendRequest(`${MarketplaceParser.baseOrdersUrl}&currency=${this.currency}&item_nameid=${itemId}`)
            .then(json => {
                if (!json || !json['success']) {
                    const err = json['error'] ?? json;
                    throw new Error(`Error getting orders for steamid: ${itemId}: ${err}`,)
                }
                return json;
            });
    }

    fillItemOrders(item) {
        return this.getItemOrders(item['steamid'])
            .then(orders => this.dbClient.updateOrders(item['id'], JSON.stringify(orders['sell_order_graph']), JSON.stringify(orders['buy_order_graph']), this.currency));
    }

    fillOrders() {
        this.dbClient.getCountOfItemsWithSteamID(this.appid)
            .then(async count => {
                console.log(`Count of items to process: ${ count }`);
                let page = 0;
                while (page < (count / 1000)) {

                    const items = await this.dbClient.getItemsByAppAndSteamIdIsNotNull(this.appid, page);
                    let item_counter = 0;
                    while (item_counter < items.length) {
                        const item = items[item_counter];
                        const success = await this.fillItemOrders(item).then(() => this.timeout(250))
                            .then(() => true)
                            .catch(err => {
                                console.error(`error filling orders for dbId: ${item['id']}, appid: ${this.appid}`);
                                console.error(err);
                                return false;
                            });
                        item_counter++;
                    }
                    page++;
                }
            });
    }
}

export default MarketplaceParser;