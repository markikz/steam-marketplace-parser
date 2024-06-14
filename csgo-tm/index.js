import {WebSocket} from 'ws';
import request from 'request';
import util from 'util';
import events from 'events';
import queue from '../apiqueue/index.js';
import fetch from 'fetch';

const empty = x => true;

class CSGOTM {
    constructor(opts) {
        if (typeof opts === 'string') this.apikey = opts; else this.apikey = opts.apikey;
        if (!opts && !opts.apikey) throw new Error('Specify your API KEY');
        this.q = new queue({interval: 200, name: "csgo.tm api calls"});

    }

    get api() {
        let self = this;
        return {
            call: function (market, method, callback = empty) {
                let f = function () {
                    request(self.api.url.build(method, market), function (err, response, body) {
                        if (err) {
                            console.error(market + "/api/" + method + "/err " + err);
                            return callback(err);
                        }
                        if (response) {
                            if (response.statusCode !== 200) {
                                console.error(market + "/api/" + method + "/response.statusCode: " + response.statusCode);
                                return callback(response.statusCode);
                            }
                        } else {
                            console.error(market + "/api/" + method + "/response: null");
                            return callback(-1);
                        }
                        let data = JSON.parse(body);
                        if (data.error) {
                            console.error(market + "/api/" + method + "/body.error: " + data.error);
                            return callback(body);
                        }
                        callback(null, data);
                    })
                };
                self.q.addTask(f);
            },
            callAsinc: function (market, method, callback = empty) {
                let t = async function () {
                    await fetch(self.api.url.build(method, market))
                        .then(res => {
                            if (!res) throw Error("statusCode: " + res.status + " statusText: " + res.statusText);
                            if (res.status !== 200) throw Error("statusCode: " + res.status + " statusText: " + res.statusText);
                            return res.json();
                        })
                        .then((json) => {
                            if (json.error) throw Error("json.error: " + json.error);
                            return callback(null, json);
                        })
                        .catch(error => {
                            console.error(market + "/"+method + "/" + error);
                            return callback(error, null);
                        })
                }
                self.q.addTask(t);
            },
            BuyItem: function (item, price, callback = empty) {
                let f = function () {
                    let market = "d2";
                    request('https://market.dota2.net/api/Buy/' + item + '/' + price + '/' + '/?key=' + self.apikey,
                        function (err, response, body) {
                            if (err) {
                                console.error(market + "/api/BuyItem/err " + err);
                                return callback(err);
                            }
                            if (response) {
                                if (response.statusCode !== 200) {
                                    console.error(market + "/api/BuyItem/id" + item + "/price" + price + "/response.statusCode: " + response.statusCode);
                                    return callback(response.statusCode);
                                }
                            } else {
                                console.error(market + "/api/BuyItem/response: null");
                                return callback(-1);
                            }
                            let data = JSON.parse(body);
                            if (data.error) {
                                console.error(market + "/api/call/body.error: " + data.error);
                                return callback(body);
                            }
                            callback(null, data);
                        });
                };
                self.q.addTask(f);
            },
            url: {
                basecs: 'https://market.csgo.com/api/',
                based2: 'https://market.dota2.net/api/',
                //на кс нет проверки чтобы не переписывать старый код,
                // если буду переписывать бизнеслогику то нужжно добавить
                build(method, market) {
                    if (market === 'd2') {
                        //console.log('d2');
                        return this.based2 + method + '/?key=' + self.apikey;
                    }
                    return this.basecs + method + '/?key=' + self.apikey;
                }
            }
        }
    }

    get socket() {
        let self = this;
        return {
            connect: function () {
                self.ws = new WebSocket('wss://wsn.dota2.net/wsn/');
                self.ws.on('open', () => {
                    self.emit('connected');
                    self.api.call("d2", 'PingPong');
                });
                self.ws.on('message', function (message) {
                    if (message !== 'pong') {
                        try {
                            message = JSON.parse(message);
                            self.emit(message.type, JSON.parse(message.data));
                        } catch (e) {
                            console.error(e);
                        }
                    } else {
                        //console.log(message);
                    }
                });
                self.ws.on('error', (err) => {
                    console.error(err);
                    setTimeout(() => this.connect(), 15000);
                    //process.exit(1);
                });
                self.ws.on('close', (code, reason) => {
                    console.error("code: " + code + "reason: " + reason);
                    setTimeout(() => this.connect(), 8000);
                    //process.exit(1);
                });
                setInterval(this.ping, 60 * 1000);
            },
            auth: function (callback) {
                request.post({
                    url: 'https://market.csgo.com/api/GetWSAuth/?key=' + self.apikey,
                    json: true
                }, function (err, res, body) {
                    if (err) {
                        console.error("socket/auth/err: " + err.toString());
                        return callback(err);
                    }
                    if (res.statusCode !== 200) {
                        console.error("socket/auth/res.statusCode: " + res.statusCode);
                        return callback('Wrong HTTP code when trying to auth');
                    }
                    if (body.error) {
                        console.error("socket/auth/body.error: " + body.error);
                        return callback(body.error);
                    }
                    let auth = body.wsAuth;
                    self.ws.send(auth);
                    callback();
                })
            },
            subscribe: function (channel, handler) {
                this.send(channel);
            },
            send: function (data) {
                self.ws.send(data);
            },
            ping: function () {
                self.ws.send('ping');
            }
        }
    }
}

util.inherits(CSGOTM, events.EventEmitter);

export default CSGOTM;