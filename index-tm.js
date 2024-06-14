import CSGOTM from "./csgo-tm/index.js"
import dotenv from "dotenv"

dotenv.config();

let market = new CSGOTM(process.env.TM_API_KEY);

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
                    market.socket.subscribe('history_go');
                    market.socket.subscribe('newitems_go');
                    market.socket.subscribe('newitems_cs');

                })
            }, 25000);
            console.log('socket authorization error:');
            return console.error("err: " + err);
        }
        console.log('Authorization successful');
        market.socket.subscribe('history_go'); // слушаем канал проданных вещей
    });
});

market.on('history_go', function (mess) {
    console.log(mess)
})

market.on('newitems_go', function (mess) {
    console.log(mess)
})

market.on('newitems_cs', function (mess) {
    console.log(mess)
})

