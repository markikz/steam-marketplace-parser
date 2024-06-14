import express from "express";
import morgan from "morgan";
import cors from "cors";
import ProxyUtils from "../proxy-utils/proxy-utils/proxy_manager.js";
import MarketplaceParser from "./MarketplaceParser/MarketplaceParser.js";
import * as dotenv from "dotenv";
import PostgresClient from "./PostgresClient/PostgresClient.js";

dotenv.config();

const app = express();
app.use(morgan('tiny'));
app.use(cors());

const proxyKey = process.env.proxy_key;
const proxyArray = process.env.PROXY_HOSTS.split(' ');

const parsers = {};
const proxyManager = new ProxyUtils(proxyArray, proxyKey);

const onParserStop = (appid) => {
    parsers[appid] = undefined;
}

app.get('/startParseNames', (req, res) => {
    res.status(200);
    const appid = req.query.appid;
    if (parsers[appid] !== undefined) {
        res.send('{"status": false, "info": "parser with given appid already working"}');
    } else {
        const parser = new MarketplaceParser(appid, proxyManager, onParserStop, new PostgresClient());
        parsers[appid] = parser;
        parser.parseAllItems();
        res.send('{"status": true, "info": "parser of names started working"}')
    }
});

app.get('/startParseIds', (req, res) => {
    res.status(200);
    const appid = req.query.appid;
    if (parsers[appid] !== undefined) {
        res.send('{"status": false, "info": "parser with given appid already working"}');
    } else {
        const parser = new MarketplaceParser(appid, proxyManager, onParserStop, new PostgresClient());
        parsers[appid] = parser;
        parser.fillItemIds();
        res.send('{"status": true, "info": "parser of ids started working"}')
    }
})

app.get('/startFillPriceOverviews', (req, res) => {
    res.status(200);
    const appid = req.query.appid;
    if (appid && parsers[appid] !== undefined) {
        res.send('{"status": false, "info": "parser with given appid already working"}');
    } else {
        const parser = new MarketplaceParser(appid, proxyManager, onParserStop, new PostgresClient(), req.query.currency);
        parsers[appid] = parser;
        parser.fillPriceOverviews();
        res.send('{"status": true, "info": "parser of ids started working"}')
    }
})

app.get('/startFillOrders', (req, res) => {
    res.status(200);
    const appid = req.query.appid;
    if (appid && parsers[appid] !== undefined) {
        res.send('{"status": false, "info": "parser with given appid already working"}');
    } else {
        const parser = new MarketplaceParser(appid, proxyManager, onParserStop, new PostgresClient(), req.query.currency);
        parsers[appid] = parser;
        parser.fillOrders();
        res.send('{"status": true, "info": "parser of ids started working"}')
    }
})

app.get('/stop', (req, res) => {
    res.status(200);
    const appid = req.query.appid;
    if (appid !== undefined) {
        const parser = parsers[appid];
        if (parser !== undefined) {
            parser.stop();
            res.json({
                status: true,
                info: 'Stopping parser',
            });
            return;
        }
    }
    res.json({
        status: false,
        info: 'No parser with given appid = ' + appid,
    });
});

function notFound(req, res, next) {
    res.status(404);
    const error = new Error('Not Found');
    next(error);
}

function errorHandler(error, req, res, next) {
    res.status(res.statusCode || 500);
    res.json({
        message: error.message
    });
}

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5001;
app.listen(port, () => {
    console.log('Listening on port', port);
});