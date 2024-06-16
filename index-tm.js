import CSGOTM from "./csgo-tm/index.js"
import dotenv from "dotenv"
import PostgresClient from "./PostgresClient/PostgresClient.js";

dotenv.config();

let market = new CSGOTM(process.env.TM_API_KEY);
let postgres = new PostgresClient();

market.socket.connect();

market.on('connected', function () {
    console.log('Connected to websocket');
    market.socket.auth(function (err) {
        if (err) {
            setTimeout(() => {
                market.socket.auth(function (err) {

                    if (err) {
                        console.log('socket authorization error:');
                        return console.error("err: " + err);
                    }
                    console.log('Authorization successful');
                    market.socket.subscribe('newitems_go');

                })
            }, 25000);
            console.log('socket authorization error:');
            return console.error("err: " + err);
        }
        console.log('Authorization successful');
        market.socket.subscribe('newitems_go'); // слушаем канал проданных вещей
    });
});

market.on('newitems_go', function (mess) {
    console.log(mess)
})

