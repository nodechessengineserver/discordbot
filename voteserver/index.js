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
const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ONE_WEEK = ONE_DAY * 7;
const ONE_MONTH = ONE_DAY * 30;
const ONE_YEAR = ONE_DAY * 365;
const USER_COOKIE_VALIDITY = ONE_YEAR * 50;
class User {
    constructor() {
        this.username = "";
        this.cookie = "";
        this.bio = "";
        this.isBot = false;
        this.isSystem = false;
        this.registeredAt = new Date().getTime();
        this.lastSeenAt = new Date().getTime();
        //////////////////////////////////////////
        // profiling
        this.lastProfiledAt = 0;
        this.overallStrength = 1500;
        this.overallGames = 0;
        this.playTime = 0;
        this.membershipAge = 0;
        this.title = "none";
    }
    //////////////////////////////////////////
    membershipAgeF() {
        return "" + Math.floor(this.membershipAge / ONE_DAY);
    }
    playtimeF() {
        return "" + Math.floor(this.playTime / 3600);
    }
    overallStrengthF() {
        return "" + Math.floor(this.overallStrength);
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
            lastSeenAt: this.lastSeenAt,
            //////////////////////////////////////////
            // profiling
            lastProfiledAt: this.lastProfiledAt,
            overallStrength: this.overallStrength,
            overallGames: this.overallGames,
            playTime: this.playTime,
            membershipAge: this.membershipAge,
            title: this.title
            //////////////////////////////////////////
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
        //////////////////////////////////////////
        // profiling
        if (json.lastProfiledAt != undefined)
            this.lastProfiledAt = json.lastProfiledAt;
        if (json.overallStrength != undefined)
            this.overallStrength = json.overallStrength;
        if (json.overallGames != undefined)
            this.overallGames = json.overallGames;
        if (json.playTime != undefined)
            this.playTime = json.playTime;
        if (json.membershipAge != undefined)
            this.membershipAge = json.membershipAge;
        if (json.title != undefined)
            this.title = json.title;
        //////////////////////////////////////////
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
const MAX_USERVOTES_PER_VOTE = 6;
const MAX_VOTES_PER_WEEK = 3;
const MAX_OPTIONS_PER_WEEK = 9;
class UserVote {
    constructor() {
        this.u = new User();
        this.stars = 1;
    }
    toJson() {
        return ({
            u: this.u.toJson(),
            stars: this.stars
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
        this.owner = new User();
        this.userVotes = [];
    }
    cumulStars() {
        let sum = 0;
        for (let userVote of this.userVotes) {
            sum += userVote.stars;
        }
        return sum;
    }
    getUserVoteIndexByUsername(username) {
        for (let i = 0; i < this.userVotes.length; i++) {
            let uv = this.userVotes[i];
            if (uv.u.username == username)
                return i;
        }
        return -1;
    }
    toJson() {
        return ({
            option: this.option,
            id: this.id,
            owner: this.owner.toJson(),
            userVotes: this.userVotes.map(userVote => userVote.toJson())
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.option != undefined)
            this.option = json.option;
        if (json.id != undefined)
            this.id = json.id;
        if (json.owner != undefined)
            this.owner = createUserFromJson(json.owner);
        if (json.userVotes != undefined)
            this.userVotes =
                json.userVotes.map((userVoteJson) => new UserVote().fromJson(userVoteJson));
        return this;
    }
    collectVoters() {
        return this.userVotes.map(userVote => userVote.u);
    }
}
class Vote {
    constructor() {
        this.invalid = false;
        this.question = "Vote question";
        this.id = "voteid";
        this.owner = new User();
        this.options = [];
        this.voteCredits = {};
    }
    sortByCumulStars() {
        this.options.sort((a, b) => b.cumulStars() - a.cumulStars());
        return this;
    }
    getVoteCredits(username) {
        let vc = this.voteCredits[username];
        if (vc == undefined) {
            this.voteCredits[username] = MAX_USERVOTES_PER_VOTE;
            return MAX_USERVOTES_PER_VOTE;
        }
        return vc;
    }
    castVote(u, optionId, stars, dry = false) {
        if (u.empty())
            return "not authorized";
        let oi = this.getOptionIndexById(optionId);
        if (oi < 0)
            return "no such option";
        let o = this.options[oi];
        let credits = this.getVoteCredits(u.username);
        let uvi = o.getUserVoteIndexByUsername(u.username);
        if (stars > 0) {
            if (stars > credits)
                return "not enough credits to vote";
            if (dry)
                return "ok";
            if (uvi < 0) {
                let uv = new UserVote();
                uv.u = u;
                uv.stars = stars;
                o.userVotes.push(uv);
            }
            else {
                let uv = o.userVotes[uvi];
                uv.stars += stars;
            }
            this.voteCredits[u.username] -= stars;
            return "ok";
        }
        else {
            if (uvi < 0)
                return "no user votes on this option";
            let uv = o.userVotes[uvi];
            if ((uv.stars + stars) < 0)
                return "not enough votes to un upvote";
            if (dry)
                return "ok";
            uv.stars += stars;
            if (uv.stars <= 0) {
                o.userVotes.splice(uvi, 1);
            }
            this.voteCredits[u.username] -= stars;
            return "ok";
        }
    }
    empty() {
        return this.options.length <= 0;
    }
    addOption(o) {
        this.options.push(o);
        return this;
    }
    getOptionIndexById(optionId) {
        for (let i = 0; i < this.options.length; i++)
            if (this.options[i].id == optionId)
                return i;
        return -1;
    }
    toJson() {
        return ({
            invalid: this.invalid,
            question: this.question,
            id: this.id,
            owner: this.owner.toJson(),
            options: this.options.map((option) => option.toJson())
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.invalid != undefined)
            this.invalid = json.invalid;
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
    collectVoters() {
        let votersHash = {};
        for (let option of this.options) {
            let us = option.collectVoters();
            us.map(u => votersHash[u.username] = u);
        }
        let voters = [];
        for (let username in votersHash) {
            voters.push(votersHash[username]);
        }
        return voters;
    }
}
class VoteTransaction {
    constructor() {
        this.t = "createvote";
        this.time = new Date().getTime();
        this.u = new User();
        this.voteId = "voteid";
        this.optionId = "optionid";
        this.text = "Vote content";
        this.stars = MAX_USERVOTES_PER_VOTE;
    }
    toJson() {
        return ({
            t: this.t,
            time: this.time,
            u: this.u.toJson(),
            voteId: this.voteId,
            optionId: this.optionId,
            text: this.text,
            stars: this.stars
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.t != undefined)
            this.t = json.t;
        if (json.time != undefined)
            this.time = json.time;
        if (json.u != undefined)
            this.u = createUserFromJson(json.u);
        if (json.voteId != undefined)
            this.voteId = json.voteId;
        if (json.optionId != undefined)
            this.optionId = json.optionId;
        if (json.text != undefined)
            this.text = json.text;
        if (json.stars != undefined)
            this.stars = json.stars;
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
let usersStartupDone = false;
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
            usersStartupDone = true;
        }
    });
}
const PROFILE_EXPIRY = isDev() ? ONE_MINUTE * 3 : ONE_DAY * 1;
let PROFILING_INTERVAL = isDev() ? ONE_SECOND * 60 : ONE_MINUTE * 5;
if (isProd()) {
    setInterval(profilingFunc, PROFILING_INTERVAL);
    if (isDev())
        setTimeout(profilingFunc, ONE_SECOND * 10);
}
function getProfile(username, callback) {
    console.log(`getting lichess profile for ${username}`);
    fetch_(`https://lichess.org/api/user/${username}`).then((response) => response.text().then((content) => {
        try {
            let json = JSON.parse(content);
            callback(json);
        }
        catch (err) {
            logErr(err);
        }
    }, (err) => logErr(err)), (err) => logErr(err));
}
function profilingFunc() {
    try {
        for (let username in users.users) {
            let u = users.users[username];
            let now = new Date().getTime();
            let elapsed = now - u.lastProfiledAt;
            if (elapsed > PROFILE_EXPIRY) {
                getProfile(username, (json) => {
                    console.log(json);
                    console.log(`profiling ${username}`);
                    let title = json.title == undefined ? "none" : json.title;
                    console.log(`title ${title}`);
                    let registeredAt = json.createdAt;
                    if (registeredAt == undefined)
                        registeredAt = now;
                    let membershipAge = now - registeredAt;
                    console.log(`registered at ${registeredAt} membership age ${membershipAge}`);
                    let perfs = json.perfs;
                    let totalgames = 0;
                    let cumrating = 0;
                    if (perfs != undefined) {
                        for (let variant in perfs) {
                            let perf = perfs[variant];
                            let rating = perf.rating;
                            let games = perf.games;
                            if (games > 0) {
                                totalgames += games;
                                cumrating += games * rating;
                                console.log(`variant ${variant} games ${games} rating ${rating} totalgames ${totalgames} cumavgrating ${cumrating / totalgames}`);
                            }
                        }
                    }
                    else {
                        console.log(`no perfs`);
                    }
                    let playTime = json.playTime.total;
                    if (playTime == undefined)
                        playTime = 0;
                    console.log(`playtime ${playTime}`);
                    u.lastProfiledAt = now;
                    u.title = title;
                    u.overallGames = totalgames;
                    u.playTime = playTime;
                    u.overallStrength = (totalgames > 0) ? cumrating / totalgames : 1500;
                    u.membershipAge = membershipAge;
                    setUser(u);
                });
                return;
            }
        }
    }
    catch (err) {
        logErr(err);
    }
}
const VOTE_TRANSACTIONS_COLL = "votetransactions";
let votes = [];
let voteTransactions = [];
class Credit {
    constructor(action, unaction, timeFrame, credit) {
        this.action = "createvote";
        this.unaction = "deletevote";
        this.timeFrame = ONE_WEEK;
        this.credit = MAX_VOTES_PER_WEEK;
        this.action = action;
        this.unaction = unaction;
        this.timeFrame = timeFrame;
        this.credit = credit;
    }
    check() {
        let now = new Date().getTime();
        let sum = aggregateTransactions((whileParams) => (now - whileParams.vt.time) < this.timeFrame, (aggregParams) => (aggregParams.vt.t == this.action ? 1 : 0) -
            (aggregParams.vt.t == this.unaction ? 1 : 0));
        return sum < this.credit;
    }
}
let CREATE_VOTE_WEEKLY_CREDIT = new Credit("createvote", "deletevote", ONE_WEEK, MAX_VOTES_PER_WEEK);
let CREATE_OPTION_WEEKLY_CREDIT = new Credit("createoption", "deleteoption", ONE_WEEK, MAX_OPTIONS_PER_WEEK);
let CREATE_VOTE_CREDITS = [CREATE_VOTE_WEEKLY_CREDIT];
let CREATE_OPTION_CREDITS = [CREATE_OPTION_WEEKLY_CREDIT];
function checkCredits(credits) {
    for (let credit of credits)
        if (!credit.check())
            return false;
    return true;
}
function aggregateTransactions(whileFunc, aggregFunc) {
    let sum = 0;
    for (let i = voteTransactions.length - 1; i >= 0; i--) {
        let vt = voteTransactions[i];
        let whileParams = {
            vt: vt
        };
        if (!whileFunc(whileParams))
            return sum;
        let aggregParams = {
            vt: vt
        };
        sum += aggregFunc(aggregParams);
    }
    return sum;
}
function someVote(iterfunc) {
    for (let v of votes) {
        if (iterfunc(v))
            return true;
    }
    return false;
}
function someOption(v, iterfunc) {
    for (let o of v.options) {
        if (iterfunc(o))
            return true;
    }
    return false;
}
function hasQuestion(question) {
    return someVote((v) => v.question == question);
}
function hasOption(v, option) {
    return someOption(v, (o) => o.option == option);
}
function findIndexById(id) {
    for (let i = 0; i < votes.length; i++) {
        if (votes[i].id == id)
            return i;
    }
    return -1;
}
function execTransaction(vt) {
    let t = vt.t;
    if (t == "createvote") {
        let v = new Vote();
        v.id = vt.voteId;
        v.owner = vt.u;
        v.question = vt.text;
        votes.push(v);
    }
    else if (t == "deletevote") {
        let vi = findIndexById(vt.voteId);
        if (vi >= 0) {
            votes.splice(vi, 1);
        }
    }
    else if (t == "createoption") {
        let o = new VoteOption();
        o.id = vt.optionId;
        o.owner = vt.u;
        o.option = vt.text;
        let vi = findIndexById(vt.voteId);
        if (vi >= 0) {
            let v = votes[vi];
            if (v.getOptionIndexById(o.id) < 0) {
                v.addOption(o);
            }
        }
    }
    else if (t == "deleteoption") {
        let vi = findIndexById(vt.voteId);
        if (vi >= 0) {
            let v = votes[vi];
            let oi = v.getOptionIndexById(vt.optionId);
            if (oi >= 0) {
                v.options.splice(oi, 1);
            }
        }
    }
    else if (t == "castvote") {
        let vi = findIndexById(vt.voteId);
        if (vi >= 0) {
            let v = votes[vi];
            v.castVote(vt.u, vt.optionId, vt.stars);
        }
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
            voteTransactions.push(vt);
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
let patchVotesDone = false;
function patchVotes() {
    if (!patchVotesDone) {
        if (!usersStartupDone) {
            console.log(`patch votes requested but users startup is not ready`);
            return;
        }
        for (let vote of votes) {
            console.log(`patching vote ${vote.question}`);
            for (let option of vote.options) {
                console.log(`patching option ${option.option}`);
                for (let userVote of option.userVotes) {
                    let u = users.users[userVote.u.username];
                    if (u != undefined) {
                        let uc = users.users[userVote.u.username].clone();
                        userVote.u = uc;
                    }
                }
            }
        }
        patchVotesDone = true;
    }
}
let vercodes = {};
function sendResponse(res, responseJson) {
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(responseJson));
    console.log("req", responseJson.req, "status", res.status);
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
            patchVotes();
            responseJson.votes = votes.map((vote) => vote.toJson());
            sendResponse(res, responseJson);
        }
        else if (t == "createvote") {
            let question = json.question;
            console.log("create vote", question, loggedUser);
            if (loggedUser.empty()) {
                responseJson.ok = false;
                responseJson.status = "have to be logged in to create vote";
                sendResponse(res, responseJson);
            }
            else {
                if (hasQuestion(question)) {
                    responseJson.ok = false;
                    responseJson.status = "question already exists";
                    sendResponse(res, responseJson);
                }
                else if (!checkCredits(CREATE_VOTE_CREDITS)) {
                    responseJson.ok = false;
                    responseJson.status = "vote creation credits surpassed";
                    sendResponse(res, responseJson);
                }
                else {
                    let vt = new VoteTransaction();
                    vt.t = "createvote";
                    vt.u = loggedUser;
                    vt.text = question;
                    vt.voteId = uniqid();
                    storeAndExecTransaction(vt, (mongores) => {
                        responseJson.ok = mongores.ok;
                        responseJson.status = mongores.status;
                        sendResponse(res, responseJson);
                    });
                }
            }
        }
        else if (t == "createoption") {
            let option = json.option;
            let voteId = json.voteId;
            console.log("create option", option, voteId, loggedUser);
            let vi = findIndexById(voteId);
            if (vi < 0) {
                responseJson.ok = false;
                responseJson.status = "no such vote";
                sendResponse(res, responseJson);
                return;
            }
            let v = votes[vi];
            if (loggedUser.empty()) {
                responseJson.ok = false;
                responseJson.status = "have to be logged in to create option";
                sendResponse(res, responseJson);
            }
            else {
                if (hasOption(v, option)) {
                    responseJson.ok = false;
                    responseJson.status = "option already exists";
                    sendResponse(res, responseJson);
                }
                else if (!checkCredits(CREATE_OPTION_CREDITS)) {
                    responseJson.ok = false;
                    responseJson.status = "option creation credits surpassed";
                    sendResponse(res, responseJson);
                }
                else {
                    let vt = new VoteTransaction();
                    vt.t = "createoption";
                    vt.u = loggedUser;
                    vt.voteId = voteId;
                    vt.optionId = uniqid();
                    vt.text = option;
                    storeAndExecTransaction(vt, (mongores) => {
                        responseJson.ok = mongores.ok;
                        responseJson.status = mongores.status;
                        sendResponse(res, responseJson);
                    });
                }
            }
        }
        else if (t == "deletevote") {
            let voteId = json.voteId;
            console.log("delete vote", voteId);
            let vi = findIndexById(voteId);
            if (vi < 0) {
                responseJson.ok = false;
                responseJson.status = "no such vote";
                sendResponse(res, responseJson);
                return;
            }
            let v = votes[vi];
            if (!v.empty()) {
                responseJson.ok = false;
                responseJson.status = "vote is not empty";
                sendResponse(res, responseJson);
            }
            else if (v.owner.e(loggedUser)) {
                let vt = new VoteTransaction();
                vt.t = "deletevote";
                vt.voteId = voteId;
                storeAndExecTransaction(vt, (mongores) => {
                    responseJson.ok = mongores.ok;
                    responseJson.status = mongores.status;
                    sendResponse(res, responseJson);
                });
            }
            else {
                responseJson.ok = false;
                responseJson.status = "not authorized to delete vote";
                sendResponse(res, responseJson);
            }
        }
        else if (t == "deleteoption") {
            let voteId = json.voteId;
            let optionId = json.optionId;
            console.log("delete option", voteId, optionId);
            let vi = findIndexById(voteId);
            if (vi < 0) {
                responseJson.ok = false;
                responseJson.status = "no such vote";
                sendResponse(res, responseJson);
                return;
            }
            let v = votes[vi];
            let oi = v.getOptionIndexById(optionId);
            if (oi < 0) {
                responseJson.ok = false;
                responseJson.status = "no such option";
                sendResponse(res, responseJson);
                return;
            }
            let o = v.options[oi];
            if (o.cumulStars() > 0) {
                responseJson.ok = false;
                responseJson.status = "option not empty";
                sendResponse(res, responseJson);
                return;
            }
            if (v.owner.e(loggedUser)) {
                let vt = new VoteTransaction();
                vt.t = "deleteoption";
                vt.voteId = voteId;
                vt.optionId = optionId;
                storeAndExecTransaction(vt, (mongores) => {
                    responseJson.ok = mongores.ok;
                    responseJson.status = mongores.status;
                    sendResponse(res, responseJson);
                });
            }
            else {
                responseJson.ok = false;
                responseJson.status = "not authorized to delete option";
                sendResponse(res, responseJson);
            }
        }
        else if (t == "castvote") {
            let voteId = json.voteId;
            let optionId = json.optionId;
            let stars = json.stars;
            console.log("cast vote", voteId, optionId, stars);
            let vi = findIndexById(voteId);
            if (vi < 0) {
                responseJson.ok = false;
                responseJson.status = "no such vote";
                sendResponse(res, responseJson);
                return;
            }
            let v = votes[vi];
            let voteCastResult = v.castVote(loggedUser, optionId, stars, true);
            if (voteCastResult == "ok") {
                let vt = new VoteTransaction();
                vt.t = "castvote";
                vt.u = loggedUser;
                vt.voteId = voteId;
                vt.optionId = optionId;
                vt.stars = stars;
                storeAndExecTransaction(vt, (mongores) => {
                    responseJson.ok = mongores.ok;
                    responseJson.status = mongores.status;
                    sendResponse(res, responseJson);
                });
            }
            else {
                responseJson.ok = false;
                responseJson.status = voteCastResult;
                sendResponse(res, responseJson);
                return;
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
    <title>Lichess Vote</title>
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
