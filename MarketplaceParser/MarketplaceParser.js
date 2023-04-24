
class MarketplaceParser {
    //https://steamcommunity.com/market/search/render/?search_descriptions=1&sort_column=hash_name&sort_dir=desc&appid=730&norender=2&count=1&start=10
    static baseItemsListUrl = 'https://steamcommunity.com/market/search/render/?search_descriptions=1&sort_column=popular&sort_dir=desc&norender=2'
    //https://steamcommunity.com/market/listings/730/Revolution%20Case
    static baseItemUrl = 'https://steamcommunity.com/market/listings';

    static pageTimeout = 5000;
    constructor(appid, proxy, onParserStop, dbClient, pageTimeout) {
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
    }

    sendRequest(marketUrl) {
        return this.proxyManager.fetch(marketUrl);
    }

    sendRequestText(marketUrl) {
        return this.proxyManager.fetchText(marketUrl);
    }

    getItemsCount() {
        return this.sendRequest(this.appUrl + '&count=1&start=0')
            .then(json => {
                console.log(json);
                return json['total_count']
            });
    }

    parsePage(page) {
        return this.sendRequest(`${this.appUrl}&count=${this.itemsPerPage}&start=${page * this.itemsPerPage}`);
    }

    parseAllItems() {
        this.getItemsCount().then(count => {
            this.intervalId = setInterval(async () => {
                if (this.currentPage < (count / this.itemsPerPage)) {

                    await this.parsePage(this.currentPage++).then(response => {
                        if (response['success'] === true) {
                            return this.writePageToDB(response['results']);
                        } else {
                            console.log('------------------success false');
                            console.log(response);
                            this.stop();
                        }
                    });
                } else {
                    console.log('---------------------all items fetched');
                    this.stop();
                }
            }, this.pageTimeout ?? MarketplaceParser.pageTimeout);
        }).then(() => this.stop(), () => this.stop());
    }

    stop() {
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
        for (let item of resultArray) {
            await this.dbClient.insertOrUpdateItem(item);
        }
    }

    getItemId(hashName) {
        return this.sendRequestText(`${MarketplaceParser.baseItemUrl}/${this.appid}/${encodeURIComponent(hashName)}`)
            .then(page => page.match(/Market_LoadOrderSpread\( *(\d+) *\)/)?.[1])
            .catch(err => {
                console.error(err);
                return undefined;
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

                let page = 0;
                while (page < count / 1000) {

                    await this.dbClient.getItemsByApp(this.appid, page).then(async items => {
                        for (let item of items) {
                            await this.fillItemId(item).then(() => this.timeout(250)).catch(err => {
                                console.error('error getting steamid for ' + item['id']);
                                console.error(err);
                                throw err;
                            });
                        }
                    });
                    page++;
                }
            }).then(() => this.stop(), () => this.stop());
    }
}

export default MarketplaceParser;