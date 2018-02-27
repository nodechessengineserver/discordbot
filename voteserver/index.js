"use strict";
// system
const fetch_ = require("node-fetch");
const uniqid = require("uniqid");
const mongodb = require("mongodb");
// local
function isDev() {
    return process.env.DISCORD_LOCAL != undefined;
}
function isProd() {
    return !isDev();
}
class User {
    constructor() {
        this.username = "";
        this.cookie = "";
        this.isBot = false;
        this.isSystem = false;
        this.registeredAt = new Date().getTime();
        this.lastSeenAt = new Date().getTime();
    }
    clone() {
        return createUserFromJson(this.toJson());
    }
    empty() {
        return this.username == "";
    }
    e(u) {
        return this.username == u.username;
    }
    toJson(secure = false) {
        let json = ({
            username: this.username,
            isBot: this.isBot,
            isSystem: this.isSystem,
            registeredAt: this.registeredAt,
            lastSeenAt: this.lastSeenAt
        });
        // don't send user cookie to client
        if (!secure) {
            json.cookie = this.cookie;
        }
        return json;
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.username != undefined)
            this.username = json.username;
        if (json.cookie != undefined)
            this.cookie = json.cookie;
        if (json.isBot != undefined)
            this.isBot = json.isBot;
        if (json.isSystem != undefined)
            this.isSystem = json.isSystem;
        if (json.registeredAt != undefined)
            this.registeredAt = json.registeredAt;
        if (json.lastSeenAt != undefined)
            this.lastSeenAt = json.lastSeenAt;
        return this;
    }
}
function createUserFromJson(json) {
    if (json == undefined)
        return new User();
    return new User().fromJson(json);
}
class UserList {
    constructor() {
        this.users = {};
        this.cookies = {};
    }
    toJson(secure = false) {
        let usersJson = {};
        for (let username in this.users) {
            usersJson[username] = this.users[username].toJson(secure);
        }
        return usersJson;
    }
    fromJson(json) {
        this.users = {};
        this.cookies = {};
        if (json == undefined)
            return this;
        for (let username in json) {
            let userJson = json[username];
            let u = createUserFromJson(userJson);
            this.users[u.username] = u;
            this.cookies[u.cookie] = u;
        }
        return this;
    }
    setUser(u) {
        this.users[u.username] = u;
        this.cookies[u.cookie] = u;
        return u;
    }
    upsertUser(u) {
        let oldu = this.users[u.username];
        if (oldu == undefined) {
            return this.setUser(u);
        }
        let cookie = oldu.cookie;
        let uclone = u.clone();
        uclone.cookie = cookie;
        return this.setUser(uclone);
    }
    getByCookie(cookie) {
        return this.cookies[cookie];
    }
    getByUsername(username) {
        return this.users[username];
    }
    iterate(callback) {
        for (let username in this.users) {
            let u = this.users[username];
            callback(u);
        }
    }
}
function logErr(err) {
    console.log("***");
    console.log(err);
    console.log("***");
}
function checkLichess(username, code, callback) {
    console.log(`checking lichess user ${username} code ${code}`);
    if (isDev()) {
        console.log(`user ${username} ok in dev`);
        callback(true);
        return;
    }
    fetch_(`https://lichess.org/@/${username}`).then((response) => response.text()).
        then((content) => {
        let index = content.indexOf(code);
        if (index < 0) {
            console.log(`lichess auth failed for ${username}`);
            callback(false);
            return;
        }
        else {
            console.log(`lichess auth success for ${username}`);
            callback(true);
            return;
        }
    }, (err) => {
        logErr(err);
        callback(false);
    });
}
let DATABASE_NAME = `mychessdb`;
let LOCAL_MONGO_URI = `mongodb://localhost:27017/${DATABASE_NAME}`;
let MONGODB_URI = isProd() ? process.env.MONGODB_URI : LOCAL_MONGO_URI;
const COLL_COMMANDS = { upsertone: true };
let db;
try {
    mongodb.connect(MONGODB_URI, function (err, conn) {
        if (err) {
            console.log(logErr(err));
        }
        else {
            db = conn.db(DATABASE_NAME);
            console.log(`votes connected to MongoDB database < ${db.databaseName} >`);
            // startup
        }
    });
}
catch (err) {
    console.log(logErr(err));
}
function mongoRequest(req, callback) {
    let res = {
        ok: true,
        status: "ok",
        req: req
    };
    try {
        let t = req.t;
        console.log(`mongo request ${t}`);
        if (db == null) {
            res.ok = false;
            res.status = "no db";
            callback(res);
            return;
        }
        if (COLL_COMMANDS[t]) {
            let collName = req.collName;
            let collection = db.collection(collName);
            let query = req.query;
            let doc = req.doc;
            if (t == "upsertone") {
                console.log("upsert one", query, doc);
                collection.updateOne(query, { "$set": doc }, { upsert: true }, (error, result) => {
                    if (error) {
                        res.ok = false;
                        res.status = "upsert failed";
                        res.err = error;
                        callback(res);
                        return;
                    }
                    else {
                        res.status = "upsert ok";
                        callback(res);
                        return;
                    }
                });
            }
        }
    }
    catch (err) {
        logErr(err);
        res.ok = false;
        res.status = "exception";
        res.err = err;
        callback(res);
    }
}
let USERS_COLL = `voteusers`;
const users = new UserList();
function setUser(u) {
    users.setUser(u);
    mongoRequest({
        t: "upsertone",
        collName: USERS_COLL,
        query: {
            username: u.username
        },
        doc: u.toJson()
    }, (res) => {
        console.log(res);
    });
}
let vercodes = {};
function sendResponse(res, responseJson) {
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(responseJson));
}
function handleAjax(req, res) {
    let json = req.body;
    console.log("ajax", json);
    let responseJson = {
        ok: true,
        req: json
    };
    try {
        let t = json.t;
        let userCookie = req.cookies.user;
        let loggedUser = users.getByCookie(userCookie);
        console.log("logged", loggedUser);
        if (t == "createverificationcode") {
            let username = json.username;
            let code = uniqid();
            console.log(`for ${username} created code ${code}`);
            vercodes[username] = code;
            responseJson.code = code;
            sendResponse(res, responseJson);
        }
        else if (t == "checkverificationcode") {
            let username = json.username;
            let code = vercodes[username];
            checkLichess(username, code, (ok) => {
                if (!ok) {
                    responseJson.ok = false;
                    console.log("check failed");
                    sendResponse(res, responseJson);
                }
                else {
                    let cookie = uniqid();
                    responseJson.cookie = cookie;
                    console.log(`check ok, created cookie ${cookie}`);
                    let u = new User();
                    u.username = username;
                    u.cookie = cookie;
                    setUser(u);
                    sendResponse(res, responseJson);
                }
            });
        }
        else if (t == "login") {
        }
    }
    catch (err) {
        responseJson.ok = false;
        logErr(err);
        sendResponse(res, responseJson);
    }
}
module.exports.handleAjax = handleAjax;
function index(req, res) {
    res.send(`
<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" href="assets/stylesheets/reset.css">
    <link rel="stylesheet" href="assets/stylesheets/builder.css">
    <link rel="stylesheet" href="assets/stylesheets/app.css">
</head>

<body>

<div id="root"></div>

<script src="client.js"></script>

</body>

</html>
`);
}
module.exports.index = index;
