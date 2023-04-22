import ProxyUtils from "../proxy-utils/proxy-utils/proxy_manager.js";
import * as dotenv from "dotenv";
import MarketplaceParser from "./MarketplaceParser/MarketplaceParser.js";
import PostgresClient from "./PostgresClient/PostgresClient.js";

dotenv.config();

const proxyKey = process.env.proxy_key;
const proxyArray = ['https://web-production-0dc19.up.railway.app'];

const proxyManager = new ProxyUtils(proxyArray, proxyKey);

const onParserStop = (appid) => {}

const parser = new MarketplaceParser(730, proxyManager, onParserStop, new PostgresClient());

console.log(await parser.getItemId('Souvenir SSG 08 | Tropical Storm (Well-Worn)'))