
class MarketplaceParser {
    //https://steamcommunity.com/market/search/render/?search_descriptions=1&sort_column=hash_name&sort_dir=desc&appid=730&norender=2&count=1&start=10
    static baseUrl = 'https://steamcommunity.com/market/search/render/?search_descriptions=1&sort_column=hash_name&sort_dir=desc&norender=2'

    constructor(appid, proxy, onParserStop) {
        if (!appid || !proxy)
            throw new Error('Missing required parameter[s]');
        this.appid = appid;
        this.proxyManager = proxy;
        this.appUrl = MarketplaceParser.baseUrl + '&appid=' + appid;
        this.itemsPerPage = 100;
        this.currentPage = 0;
        this.intervalId = undefined;
        this.onParserStop = onParserStop;
    }

    sendRequest(marketUrl) {
        return this.proxyManager.fetch(marketUrl);
    }

    getItemsCount() {
        return this.sendRequest(this.appUrl + '&count=1&start=0')
            .then(json => {
                console.log(json);
                return json['total_count']
            });
    }

    parsePage(page) {
        return this.sendRequest(`${this.appUrl}&count=${this.itemsPerPage}&start=${page}`);
    }

    parseAllItems() {
        this.getItemsCount().then(count => {
            this.intervalId = setInterval(() => {
                if (this.currentPage < (count / this.itemsPerPage)) {
                    this.parsePage(this.currentPage++).then(response => {
                        if (response['success'] === true) {
                            this.writePageToDB(response['results']);
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
            }, 5000);
        });
    }

    stop() {
        console.log('Stopping parser for appid = ' + this.appid);
        clearInterval(this.intervalId);
        if (this.onParserStop !== undefined) {
            this.onParserStop();
        }
    }

    writePageToDB(resultArray) {
        //resultArray.forEach(console.log);
    }
}

export default MarketplaceParser;