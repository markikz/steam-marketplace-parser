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
const proxyArray = [ 'https://proxy-production-047b.up.railway.app', 'https://web-production-0dc19.up.railway.app', 'https://jolly-flowers-production.up.railway.app', 'https://fabulous-observation-production.up.railway.app', 'https://proxy4-production.up.railway.app', 'https://rare-drain-production.up.railway.app', 'https://web-production-e587.up.railway.app', 'https://proxy-production-3763.up.railway.app', 'https://abandoned-prose-production.up.railway.app', 'https://direct-mailbox-production.up.railway.app', ];

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