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
        this.bio = "";
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
            bio: this.bio,
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
        if (json.bio != undefined)
            this.bio = json.bio;
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
    getByCookie(cookie) {
        let u = this.cookies[cookie];
        if (u == undefined)
            return new User();
        return u;
    }
    getByUsername(username) {
        let u = this.users[username];
        if (u == undefined)
            return new User();
        return u;
    }
    iterate(callback) {
        for (let username in this.users) {
            let u = this.users[username];
            callback(u);
        }
    }
}
const MAX_STARS = 3;
class UserVote {
    constructor() {
        this.u = new User();
        this.stars = MAX_STARS;
    }
    toJson() {
        return ({
            u: this.u,
            starts: this.stars
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.u != undefined)
            this.u = createUserFromJson(json.u);
        if (json.stars != undefined)
            this.stars = json.stars;
        return this;
    }
}
class VoteOption {
    constructor() {
        this.option = "Vote option";
        this.id = "optionid";
        this.userVotes = [];
    }
    toJson() {
        return ({
            option: this.option,
            id: this.id,
            votes: this.userVotes.map(userVote => userVote.toJson())
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.option != undefined)
            this.option = json.option;
        if (json.id != undefined)
            this.id = json.id;
        if (json.userVotes != undefined)
            this.userVotes =
                json.userVotes.map((userVoteJson) => new UserVote().fromJson(userVoteJson));
        return this;
    }
}
class Vote {
    constructor() {
        this.question = "Vote question";
        this.id = "voteid";
        this.owner = new User();
        this.options = [];
    }
    toJson() {
        return ({
            question: this.question,
            id: this.id,
            owner: this.owner.toJson(),
            options: this.options.map((option) => option.toJson())
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.question != undefined)
            this.question = json.question;
        if (json.id != undefined)
            this.id = json.id;
        if (json.owner != undefined)
            this.owner = createUserFromJson(json.owner);
        if (json.options != undefined)
            this.options =
                json.options.map((optionJson) => new VoteOption().fromJson(optionJson));
        return this;
    }
}
class VoteTransaction {
    constructor() {
        this.t = "createvote";
        this.id = "transactionid";
        this.voteId = "voteid";
        this.voteOptionId = "voteoptionid";
        this.time = new Date().getTime();
        this.u = new User();
        this.userVote = new UserVote();
        this.text = "Vote content";
    }
    toJson() {
        return ({
            t: this.t,
            id: this.id,
            voteId: this.voteId,
            voteOptionId: this.voteOptionId,
            time: this.time,
            u: this.u.toJson(),
            text: this.text
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.t != undefined)
            this.t = json.t;
        if (json.id != undefined)
            this.id = json.id;
        if (json.voteId != undefined)
            this.voteId = json.voteId;
        if (json.voteOptionId != undefined)
            this.voteOptionId = json.voteOptionId;
        if (json.time != undefined)
            this.time = json.time;
        if (json.u != undefined)
            this.u = createUserFromJson(json.u);
        if (json.text != undefined)
            this.text = json.text;
        return this;
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
const COLL_COMMANDS = {
    upsertone: true,
    insertone: true,
    findaslist: true
};
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
            usersStartup();
            voteTransactionsStartup();
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
            else if (t == "insertone") {
                console.log("insert one", doc);
                collection.insertOne(doc, (error, result) => {
                    if (error) {
                        res.ok = false;
                        res.status = "insert failed";
                        res.err = error;
                        callback(res);
                        return;
                    }
                    else {
                        res.status = "insert ok";
                        callback(res);
                        return;
                    }
                });
            }
            else if (t == "findaslist") {
                console.log("find as list", query);
                collection.find(query).toArray((error, docs) => {
                    if (error) {
                        res.ok = false;
                        res.status = "find as list failed";
                        res.err = error;
                        callback(res);
                        return;
                    }
                    else {
                        res.docs = docs;
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
let users = new UserList();
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
function usersStartup() {
    console.log(`users startup`);
    mongoRequest({
        t: "findaslist",
        collName: USERS_COLL,
        query: {}
    }, (res) => {
        if (!res.ok) {
            logErr(`users startup failed: ${res.status}`);
        }
        else {
            console.log(`users has ${res.docs.length} records`);
            users = new UserList();
            for (let doc of res.docs) {
                users.setUser(createUserFromJson(doc));
            }
        }
    });
}
const VOTE_TRANSACTIONS_COLL = "votetransactions";
let votes = [];
let voteTransactions = [];
function execTransaction(vt) {
    let t = vt.t;
    if (t == "createvote") {
        let v = new Vote();
        v.question = vt.text;
        votes.push(v);
    }
}
function storeAndExecTransaction(vt, callback) {
    const t = "insertone";
    mongoRequest({
        t: t,
        collName: VOTE_TRANSACTIONS_COLL,
        doc: vt.toJson()
    }, (res) => {
        console.log("insert result", res);
        if (res.ok) {
            execTransaction(vt);
            callback(res);
        }
        else {
            callback(res);
        }
    });
}
function voteTransactionsStartup() {
    votes = [];
    voteTransactions = [];
    console.log(`vote transactions startup`);
    mongoRequest({
        t: "findaslist",
        collName: VOTE_TRANSACTIONS_COLL,
        query: {}
    }, (res) => {
        if (!res.ok) {
            logErr(`vote transactions startup failed: ${res.status}`);
        }
        else {
            console.log(`vote transactions has ${res.docs.length} records`);
            for (let doc of res.docs) {
                let vt = new VoteTransaction().fromJson(doc);
                voteTransactions.push(vt);
                execTransaction(vt);
            }
        }
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
        status: "ok",
        req: json
    };
    try {
        let t = json.t;
        let userCookie = req.cookies.user;
        console.log("user cookie", userCookie);
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
                    let oldu = users.getByUsername(username);
                    let cookie = uniqid();
                    responseJson.cookie = cookie;
                    console.log(`check ok, created cookie ${cookie}`);
                    let u = new User();
                    u.username = username;
                    if (!oldu.empty()) {
                        console.log(`user ${username} already exists`);
                        u = oldu;
                    }
                    u.cookie = cookie;
                    setUser(u);
                    sendResponse(res, responseJson);
                }
            });
        }
        else if (t == "login") {
            responseJson.u = loggedUser.toJson();
            sendResponse(res, responseJson);
        }
        else if (t == "updateuser") {
            let u = createUserFromJson(json.u);
            let oldu = users.getByUsername(u.username);
            if (!oldu.empty()) {
                u.cookie = oldu.cookie;
                setUser(u);
                responseJson.u = u.toJson();
                sendResponse(res, responseJson);
            }
            else {
                responseJson.u = new User();
                sendResponse(res, responseJson);
            }
        }
        else if (t == "loadvotes") {
            console.log("load votes", loggedUser);
            responseJson.votes = votes.map((vote) => vote.toJson());
            sendResponse(res, responseJson);
        }
        else if (t == "createvote") {
            let question = json.question;
            console.log("create vote", question, loggedUser);
            let v = new Vote();
            v.question = question;
            if (votes.some((v) => v.question == question)) {
                // question already exists
                res.ok = false;
                res.status = "question already exists";
                sendResponse(res, responseJson);
            }
            else {
                let vt = new VoteTransaction();
                vt.t = "createvote";
                vt.u = loggedUser;
                vt.text = question;
                storeAndExecTransaction(vt, (mongores) => {
                    res.ok = mongores.ok;
                    res.status = mongores.status;
                    sendResponse(res, responseJson);
                });
            }
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
