"use strict";
// system
const express = require('express');
const WebSocket_ = require("ws");
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const fetch_ = require("node-fetch");
const uniqid = require("uniqid");
const mongodb = require("mongodb");
const cookieParser = require("cookie-parser");
// local
const atombot = require("./discordbot/atombot");
const testbot = require("./discordbot/testbot");
const tourney = require("./discordbot/tourney");
const api = require("./discordbot/api");
const GLOBALS = require("./discordbot/globals");
const voteserver = require("./voteserver/index");
var Glicko;
(function (Glicko) {
    const VERBOSE = false;
    ///////////////////////////////////////////
    // Constants and utility functions
    Glicko.RATING0 = 1500;
    Glicko.RD0 = 350;
    const TYPICAL_RD = 50;
    const TIME_CONSTANT = 1000;
    const RATING_DIFFERENCE_DIVISOR = 400;
    const MIN_RATING = 100;
    const MAX_RATING = 3500;
    const PI = Math.PI;
    const Q = Math.log(10) / RATING_DIFFERENCE_DIVISOR;
    const MONTH_MS = 1000 * 60 * 60 * 24 * 30;
    const C2 = (sq(Glicko.RD0) - sq(TYPICAL_RD)) / MONTH_MS;
    function sqrt(x) { return Math.sqrt(x); }
    function sq(x) { return x * x; }
    function pow10(x) { return Math.pow(10, x); }
    function min(x, y) { return Math.min(x, y); }
    ///////////////////////////////////////////
    // Glick sub calculations
    function g(rdi) {
        return 1.0 / sqrt(1.0 + 3.0 * sq(Q * rdi / PI));
    }
    function E(r, ri, rdi) {
        return 1.0 / (1.0 + pow10(g(rdi) * (r - ri) / -RATING_DIFFERENCE_DIVISOR));
    }
    function d2(r, ri, rdi) {
        return 1.0 / (sq(Q) * sq(g(rdi)) * E(r, ri, rdi) * (1 - E(r, ri, rdi)));
    }
    function r(r, rd, ri, rdi, si) {
        let newr = r + Q / ((1 / sq(rd) + (1 / d2(r, ri, rdi)))) * (si - E(r, ri, rdi));
        if (newr < MIN_RATING)
            newr = MIN_RATING;
        if (newr > MAX_RATING)
            newr = MAX_RATING;
        return newr;
    }
    function getrdt(rd, t) {
        return min(sqrt(sq(rd) + C2 * t), Glicko.RD0);
    }
    function rd(r, rd, ri, rdi) {
        return sqrt(1 / ((1 / sq(rd)) + (1 / d2(r, ri, rdi))));
    }
    function calc(g, gi, si) {
        const now = new Date().getTime();
        const rdt = getrdt(g.rd, now - g.lastrated);
        if (VERBOSE) {
            console.log("***********************************");
            console.log("Glicko calculation");
            console.log("***********************************");
            console.log("Player ", g);
            console.log("Opponent ", gi);
            console.log("***********************************");
            console.log("Result ", si);
            console.log("Expected result ", E(g.rating, gi.rating, gi.rd));
            console.log("***********************************");
        }
        const result = new GlickoData();
        result.rating = r(g.rating, rdt, gi.rating, gi.rd, si),
            result.rd = rd(g.rating, rdt, gi.rating, gi.rd),
            result.lastrated = now;
        if (VERBOSE) {
            console.log("New rating ", result);
            console.log("***********************************");
        }
        return result;
    }
    Glicko.calc = calc;
})(Glicko || (Glicko = {}));
let EPOCH = 1517443200000; // 2018-2-1
let CHAT_CAPACITY = 100;
function createUserFromJson(json) {
    if (json == undefined)
        return new User();
    if (json.isBot)
        return new BotUser().fromJson(json);
    if (json.isSystem)
        return new SystemUser().fromJson(json);
    return new User().fromJson(json);
}
class GlickoData {
    constructor() {
        this.rating = Glicko.RATING0;
        this.rd = Glicko.RD0;
        this.lastrated = new Date().getTime();
    }
    ratingF() { return "" + Math.floor(this.rating); }
    rdF() { return "" + Math.floor(this.rd); }
    toJson() {
        return ({
            rating: this.rating,
            rd: this.rd,
            lastrated: this.lastrated
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.rating != undefined)
            this.rating = json.rating;
        if (json.rd != undefined)
            this.rd = json.rd;
        if (json.lastrated != undefined)
            this.lastrated = json.lastrated;
        return this;
    }
}
class User {
    constructor() {
        this.username = "";
        this.cookie = "";
        this.isBot = false;
        this.isSystem = false;
        this.registeredAt = new Date().getTime();
        this.lastSeenAt = new Date().getTime();
        this.glicko = new GlickoData();
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
    smartName() {
        return this.username == "" ? "Anonymous" : this.username;
    }
    smartNameHtml(innerclass = "") {
        return `<span class="${this.empty() ? "modeluser anonuser" : "modeluser"}"><span class="${innerclass}">${this.smartName()}</span></span>`;
    }
    toJson(secure = false) {
        let json = ({
            username: this.username,
            isBot: this.isBot,
            isSystem: this.isSystem,
            registeredAt: this.registeredAt,
            lastSeenAt: this.lastSeenAt,
            glicko: this.glicko.toJson()
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
        if (json.glicko != undefined)
            this.glicko = new GlickoData().fromJson(json.glicko);
        return this;
    }
}
class SystemUser extends User {
    constructor() {
        super();
        this.username = "#System";
        this.isSystem = true;
    }
    smartNameHtml() {
        return `<span class="modeluser systemuser">system</span>`;
    }
}
class BotUser extends User {
    constructor() {
        super();
        this.username = "#Bot";
        this.isBot = true;
    }
    smartNameHtml(innerclass) {
        return `<span class="modeluser botuser"><span class="${innerclass}">Bot</span></span>`;
    }
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
class ChatItem {
    constructor(user = new User(), text = "") {
        this.user = new User();
        this.text = "";
        this.time = new Date().getTime();
        this.user = user;
        this.text = text;
        this.time = new Date().getTime();
    }
    toJson() {
        return ({
            user: this.user.toJson(),
            text: this.text,
            time: this.time
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.user != undefined)
            this.user = createUserFromJson(json.user);
        if (json.text != undefined)
            this.text = json.text;
        if (json.time != undefined)
            this.time = json.time;
        return this;
    }
}
class Chat {
    constructor() {
        this.items = [];
    }
    add(chi) {
        this.items.unshift(chi);
        while (this.items.length > 100)
            this.items.pop();
    }
    asHtml() {
        return this.items.map(item => `<span class="chattime">${new Date(item.time).toLocaleString()}</span> ${item.user.smartNameHtml()} : <span class="chattext">${item.text}</span>`).join("<br>");
    }
    toJson() {
        return (this.items.map((item) => item.toJson()));
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json != undefined) {
            this.items = json.map((itemJson) => new ChatItem().fromJson(itemJson));
        }
        return this;
    }
}
let loggedUser = new User();
let THREEFOLD_REPETITION = 3;
let FIFTYMOVE_RULE = 50;
let WHITE = 1;
let BLACK = 0;
let NO_COL = -1;
function INV_COLOR(color) {
    if (color == NO_COL)
        return NO_COL;
    return color == WHITE ? BLACK : WHITE;
}
let EMPTY = "-";
let PAWN = "p";
let KNIGHT = "n";
let BISHOP = "b";
let ROOK = "r";
let QUEEN = "q";
let KING = "k";
let IS_PIECE = { "p": true, "n": true, "b": true, "r": true, "q": true, "k": true };
let ALL_PIECES = Object.keys(IS_PIECE);
let ALL_CHECK_PIECES = ["p", "n", "b", "r", "q"];
let IS_PROM_PIECE = { "n": true, "b": true, "r": true, "q": true };
let ALL_PROMOTION_PIECES = Object.keys(IS_PROM_PIECE);
let ALL_INTERIM_PROMOTION_PIECES = ["b", "n", "r", "q"];
let MOVE_LETTER_TO_TURN = { "w": WHITE, "b": BLACK };
let VARIANT_PROPERTIES = {
    "promoatomic": {
        DISPLAY: "Promotion Atomic",
        BOARD_WIDTH: 8,
        BOARD_HEIGHT: 8,
        START_FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
};
let DEFAULT_VARIANT = "promoatomic";
let ONE_SECOND = 1000;
let ONE_MINUTE = 60 * ONE_SECOND;
class TimeControl {
    constructor(time = ONE_MINUTE * 5, inc = ONE_SECOND * 8) {
        this.time = ONE_MINUTE * 5;
        this.inc = ONE_SECOND * 8;
        this.time = time;
        this.inc = inc;
    }
}
class Piece {
    constructor(kind = EMPTY, color = NO_COL) {
        this.kind = kind;
        this.color = color;
    }
    empty() { return this.kind == EMPTY; }
    inv() { return new Piece(this.kind, INV_COLOR(this.color)); }
    e(p) {
        return (this.kind == p.kind) && (this.color == p.color);
    }
}
class Square {
    constructor(f, r) {
        this.f = f;
        this.r = r;
    }
    p(sq) {
        return new Square(this.f + sq.f, this.r + sq.r);
    }
    e(sq) {
        return (sq.f == this.f) && (sq.r == this.r);
    }
    invalid() { return (this.f < 0) || (this.r < 0); }
}
const INVALID_SQUARE = new Square(-1, -1);
class Move {
    constructor(fromSq, toSq, promPiece = new Piece()) {
        this.fromSq = fromSq;
        this.toSq = toSq;
        this.promPiece = promPiece;
    }
    e(m) {
        if (!m.fromSq.e(this.fromSq))
            return false;
        if (!m.toSq.e(this.toSq))
            return false;
        return m.promPiece.kind == this.promPiece.kind;
    }
    invalid() {
        return this.fromSq.invalid() || this.toSq.invalid();
    }
}
const INVALID_MOVE = new Move(INVALID_SQUARE, INVALID_SQUARE);
class CastlingRight {
    constructor(color, kingFrom, kingTo, rookFrom, rookTo, emptySqs, fenLetter) {
        this.color = color;
        this.kingFrom = kingFrom;
        this.kingTo = kingTo;
        this.rookFrom = rookFrom;
        this.rookTo = rookTo;
        this.emptySqs = emptySqs;
        this.fenLetter = fenLetter;
    }
}
const CASTLING_RIGHTS = [
    new CastlingRight(WHITE, new Square(4, 7), new Square(6, 7), new Square(7, 7), new Square(5, 7), [new Square(5, 7), new Square(6, 7)], "K"),
    new CastlingRight(WHITE, new Square(4, 7), new Square(2, 7), new Square(0, 7), new Square(3, 7), [new Square(3, 7), new Square(2, 7), new Square(1, 7)], "Q"), new CastlingRight(BLACK, new Square(4, 0), new Square(6, 0), new Square(7, 0), new Square(5, 0), [new Square(5, 0), new Square(6, 0)], "k"),
    new CastlingRight(BLACK, new Square(4, 0), new Square(2, 0), new Square(0, 0), new Square(3, 0), [new Square(3, 0), new Square(2, 0), new Square(1, 0)], "q")
];
class PlayerInfo {
    constructor(valid = true) {
        this.u = new User();
        this.color = BLACK;
        this.time = 0;
        this.showTime = 0;
        this.seatedAt = new Date().getTime();
        this.startedThinkingAt = new Date().getTime();
        this.canPlay = true;
        this.canOfferDraw = false;
        this.canAcceptDraw = false;
        this.canResign = false;
        this.canStand = false;
        this.valid = true;
        this.valid = valid;
    }
    colorName() {
        return this.color == WHITE ? "white" : "black";
    }
    toJson() {
        let json = ({
            u: this.u.toJson(true),
            color: this.color,
            time: this.time,
            showTime: this.showTime,
            seatedAt: this.seatedAt,
            startedThinkingAt: this.startedThinkingAt,
            canPlay: this.canPlay,
            canOfferDraw: this.canOfferDraw,
            canAcceptDraw: this.canAcceptDraw,
            canResign: this.canResign,
            canStand: this.canStand
        });
        return json;
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.u != undefined)
            this.u = createUserFromJson(json.u);
        if (json.color != undefined)
            this.color = json.color;
        if (json.time != undefined)
            this.time = json.time;
        if (json.showTime != undefined)
            this.showTime = json.showTime;
        if (json.seatedAt != undefined)
            this.seatedAt = json.seatedAt;
        if (json.startedThinkingAt != undefined)
            this.startedThinkingAt = json.startedThinkingAt;
        if (json.canPlay != undefined)
            this.canPlay = json.canPlay;
        if (json.canOfferDraw != undefined)
            this.canOfferDraw = json.canOfferDraw;
        if (json.canAcceptDraw != undefined)
            this.canAcceptDraw = json.canAcceptDraw;
        if (json.canResign != undefined)
            this.canResign = json.canResign;
        if (json.canStand != undefined)
            this.canStand = json.canStand;
        return this;
    }
    sitPlayer(u) {
        this.u = u;
        this.canAcceptDraw = false;
        this.canOfferDraw = false;
        this.canPlay = false;
        this.canResign = false;
        this.canStand = true;
        this.seatedAt = new Date().getTime();
        return this;
    }
    standPlayer() {
        this.u = new User();
        this.canAcceptDraw = false;
        this.canOfferDraw = false;
        this.canPlay = true;
        this.canResign = false;
        this.canStand = false;
        return this;
    }
}
class PlayersInfo {
    constructor() {
        this.playersinfo = [
            new PlayerInfo().fromJson({ color: BLACK }),
            new PlayerInfo().fromJson({ color: WHITE })
        ];
    }
    numSeated() {
        let num = 0;
        for (let pi of this.playersinfo)
            if (!pi.u.empty())
                num++;
        return num;
    }
    noneSeated() { return this.numSeated() == 0; }
    someSeated() { return this.numSeated() == 1; }
    allSeated() { return this.numSeated() == 2; }
    toJson() {
        let json = this.playersinfo.map(pi => pi.toJson());
        return json;
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        this.playersinfo = json.map((piJson) => new PlayerInfo().fromJson(piJson));
        return this;
    }
    getByColor(color) {
        for (let pi of this.playersinfo) {
            if (pi.color == color)
                return pi;
        }
        return new PlayerInfo(false);
    }
    getByUser(u) {
        for (let pi of this.playersinfo) {
            if (pi.u.e(u))
                return pi;
        }
        return new PlayerInfo(false);
    }
    sitPlayer(color, u) {
        for (let pi of this.playersinfo) {
            if (pi.u.username == u.username)
                pi.standPlayer();
        }
        let pi = this.getByColor(color);
        pi.sitPlayer(u);
        return pi;
    }
    standPlayer(color) {
        for (let pi of this.playersinfo) {
            if (pi.color == color) {
                pi.standPlayer();
                return pi;
            }
        }
        return new PlayerInfo();
    }
    standPlayers() {
        this.iterate((pi) => pi.standPlayer());
        return this;
    }
    iterate(iterfunc) {
        for (let pi of this.playersinfo)
            iterfunc(pi);
    }
}
class RatingCalculation {
    constructor() {
        this.username = "";
        this.isBot = false;
        this.oldRating = 1500;
        this.newRating = 1500;
    }
    ratingDifferenceF() {
        let diff = Math.floor(this.newRating - this.oldRating);
        return (diff > 0 ? "+" : "") + diff;
    }
    oldRatingF() { return "" + Math.floor(this.oldRating); }
    newRatingF() { return "" + Math.floor(this.newRating); }
    toJson() {
        return ({
            username: this.username,
            isBot: this.isBot,
            oldRating: this.oldRating,
            newRating: this.newRating
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.username != undefined)
            this.username = json.username;
        if (json.isBot != undefined)
            this.isBot = json.isBot;
        if (json.oldRating != undefined)
            this.oldRating = json.oldRating;
        if (json.newRating != undefined)
            this.newRating = json.newRating;
        return this;
    }
}
class GameStatus {
    constructor() {
        // game status
        this.score = "*";
        this.scoreReason = "";
        this.started = false;
        this.calculated = false;
        // termination by rules
        this.isStaleMate = false;
        this.isMate = false;
        this.isFiftyMoveRule = false;
        this.isThreeFoldRepetition = false;
        // termination by player
        this.isResigned = false;
        this.isDrawAgreed = false;
        this.isFlagged = false;
        // players info    
        this.playersinfo = new PlayersInfo();
        // rating calc
        this.ratingCalcWhite = new RatingCalculation();
        this.ratingCalcBlack = new RatingCalculation();
    }
    toJson() {
        let json = ({
            score: this.score,
            scoreReason: this.scoreReason,
            started: this.started,
            calculated: this.calculated,
            isStaleMate: this.isStaleMate,
            isMate: this.isMate,
            isFiftyMoveRule: this.isFiftyMoveRule,
            isThreeFoldRepetition: this.isThreeFoldRepetition,
            isResigned: this.isResigned,
            isDrawAgreed: this.isDrawAgreed,
            isFlagged: this.isFlagged,
            playersinfo: this.playersinfo.toJson(),
            ratingCalcWhite: this.ratingCalcWhite.toJson(),
            ratingCalcBlack: this.ratingCalcBlack.toJson()
        });
        return json;
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        this.score = json.score;
        this.scoreReason = json.scoreReason;
        this.started = json.started;
        this.calculated = json.calculated;
        this.isStaleMate = json.isStaleMate;
        this.isMate = json.isMate;
        this.isFiftyMoveRule = json.isFiftyMoveRule;
        this.isThreeFoldRepetition = json.isThreeFoldRepetition;
        this.isResigned = json.isResigned;
        this.isDrawAgreed = json.isDrawAgreed;
        this.isFlagged = json.isFlagged;
        this.playersinfo = new PlayersInfo().fromJson(json.playersinfo);
        this.ratingCalcWhite = new RatingCalculation().fromJson(json.ratingCalcWhite);
        this.ratingCalcBlack = new RatingCalculation().fromJson(json.ratingCalcBlack);
        return this;
    }
}
class GameNode {
    constructor() {
        this.status = new GameStatus();
        this.genAlgeb = "";
        this.fen = "";
        this.tfen = "";
    }
    toJson() {
        return ({
            status: this.status.toJson(),
            genAlgeb: this.genAlgeb,
            fen: this.fen,
            tfen: this.tfen
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        this.status = new GameStatus().fromJson(json.status);
        this.genAlgeb = json.genAlgeb;
        this.fen = json.fen;
        this.tfen = json.tfen;
        return this;
    }
}
class ChangeLog {
    constructor() {
        this.kind = "";
        this.reason = "";
        this.fromPieceKind = "";
        this.toPieceKind = "";
        this.isCapture = false;
        this.pi = new PlayerInfo();
        this.u = new User();
    }
    clear() {
        this.kind = "";
        this.reason = "";
    }
    toJson() {
        return ({
            kind: this.kind,
            reason: this.reason,
            fromPieceKind: this.fromPieceKind,
            toPieceKind: this.toPieceKind,
            isCapture: this.isCapture,
            pi: this.pi.toJson(),
            u: this.u.toJson()
        });
    }
    fromJson(json) {
        if (json.kind != undefined)
            this.kind = json.kind;
        if (json.reason != undefined)
            this.reason = json.reason;
        if (json.fromPieceKind != undefined)
            this.fromPieceKind = json.fromPieceKind;
        if (json.toPieceKind != undefined)
            this.toPieceKind = json.toPieceKind;
        if (json.isCapture != undefined)
            this.isCapture = json.isCapture;
        if (json.pi != undefined)
            this.pi = new PlayerInfo().fromJson(json.pi);
        if (json.u != undefined)
            this.u = createUserFromJson(json.u);
        return this;
    }
}
class Board {
    constructor(variant = DEFAULT_VARIANT) {
        this.timecontrol = new TimeControl();
        this.rights = [true, true, true, true];
        this.hist = [];
        this.test = false;
        this.plms = [];
        this.lms = [];
        this.debug = false;
        this.gameStatus = new GameStatus();
        this.genAlgeb = "";
        this.fullmoveNumber = 1;
        this.halfmoveClock = 0;
        this.epSquare = INVALID_SQUARE;
        this.changeLog = new ChangeLog();
        this.savedWhite = new User();
        this.savedBlack = new User();
        this.variant = variant;
        this.PROPS = VARIANT_PROPERTIES[variant];
        this.BOARD_WIDTH = this.PROPS.BOARD_WIDTH;
        this.BOARD_HEIGHT = this.PROPS.BOARD_HEIGHT;
        this.BOARD_SIZE = this.BOARD_WIDTH * this.BOARD_HEIGHT;
        this.START_FEN = this.PROPS.START_FEN;
        this.rep = new Array(this.BOARD_SIZE);
        this.reset();
    }
    reset() {
        for (let i = 0; i < this.BOARD_SIZE; i++) {
            this.rep[i] = new Piece();
        }
        this.turn = WHITE;
        this.rights = [false, false, false, false];
        this.epSquare = INVALID_SQUARE;
        this.fullmoveNumber = 1;
        this.halfmoveClock = 0;
        this.hist = [];
    }
    setTest(test) {
        this.test = test;
        return this;
    }
    frOk(f, r) {
        if ((f < 0) || (f >= this.BOARD_WIDTH))
            return false;
        if ((r < 0) || (r >= this.BOARD_HEIGHT))
            return false;
        return true;
    }
    setFR(f, r, p = new Piece()) {
        if (this.frOk(f, r))
            this.rep[r * 8 + f] = p;
    }
    setSq(sq, p = new Piece()) { this.setFR(sq.f, sq.r, p); }
    getFR(f, r) {
        if (!this.frOk(f, r))
            return new Piece();
        return this.rep[r * 8 + f];
    }
    setFromFenChecked(fen = this.START_FEN, clearHist = true) {
        let b = new Board(this.variant);
        let parts = fen.split(" ");
        if (parts.length != 6)
            return false;
        let rawfen = parts[0];
        let ranks = rawfen.split("/");
        if (ranks.length != 8)
            return false;
        for (let r = 0; r < 8; r++) {
            let pieces = ranks[r].split("");
            let f = 0;
            for (let p of pieces) {
                if ((p >= "1") && (p <= "8")) {
                    for (let pc = 0; pc < parseInt(p); pc++) {
                        b.setFR(f++, r);
                    }
                }
                else {
                    let kind = p.toLowerCase();
                    if (!IS_PIECE[kind])
                        return false;
                    b.setFR(f++, r, new Piece(kind, p != kind ? WHITE : BLACK));
                }
            }
            if (f != this.BOARD_WIDTH)
                return false;
        }
        let turnfen = parts[1];
        let turn = MOVE_LETTER_TO_TURN[turnfen];
        if (turn == undefined)
            return false;
        let castlefen = parts[2];
        b.rights = [false, false, false, false];
        if (castlefen != "-")
            for (let i = 0; i < 4; i++) {
                if ("KQkq".indexOf(castlefen.charAt(i)) < 0)
                    return false;
                if (castlefen.indexOf(CASTLING_RIGHTS[i].fenLetter) >= 0) {
                    b.rights[i] = true;
                }
            }
        let epfen = parts[3];
        if (epfen == "-") {
            b.epSquare = INVALID_SQUARE;
        }
        else {
            let sq = this.squareFromAlgeb(epfen);
            if (sq.invalid())
                return false;
            b.epSquare = sq;
        }
        b.turn = turn;
        let halfmoveFen = parts[4];
        let hmc = parseInt(halfmoveFen);
        if (isNaN(hmc))
            return false;
        if (hmc < 0)
            return false;
        b.halfmoveClock = hmc;
        let fullmoveFen = parts[5];
        let fmn = parseInt(fullmoveFen);
        if (isNaN(fmn))
            return false;
        if (fmn < 1)
            return false;
        b.fullmoveNumber = fmn;
        this.rep = b.rep;
        this.turn = b.turn;
        this.rights = b.rights;
        this.epSquare = b.epSquare;
        this.fullmoveNumber = b.fullmoveNumber;
        this.halfmoveClock = b.halfmoveClock;
        if (!this.test) {
            if (clearHist)
                this.hist = [this.toGameNode()];
        }
        this.posChanged();
        return true;
    }
    setFromFen(fen = this.START_FEN, clearHist = true) {
        this.setFromFenChecked(fen, clearHist);
        return this;
    }
    pawnDir(color) {
        return color == WHITE ? new Square(0, -1) : new Square(0, 1);
    }
    sqOk(sq) { return this.frOk(sq.f, sq.r); }
    getSq(sq) {
        if (!this.sqOk)
            return new Piece();
        return this.getFR(sq.f, sq.r);
    }
    isSqEmpty(sq) {
        if (!this.sqOk(sq))
            return false;
        return this.getSq(sq).empty();
    }
    isSqOpp(sq, color) {
        if (!this.sqOk(sq))
            return false;
        let col = this.getSq(sq).color;
        if (col == NO_COL)
            return false;
        return col != color;
    }
    isSqSame(sq, color) {
        if (!this.sqOk(sq))
            return false;
        let col = this.getSq(sq).color;
        if (col == NO_COL)
            return false;
        return col == color;
    }
    pawnFromStart(sq, color) {
        return color == WHITE ? this.BOARD_HEIGHT - 1 - sq.r : sq.r;
    }
    pawnFromProm(sq, color) {
        return this.BOARD_HEIGHT - 1 - this.pawnFromStart(sq, color);
    }
    posChanged() {
        if (!this.test) {
            this.genLegalMoves();
        }
        if (this.posChangedCallback != undefined) {
            this.posChangedCallback();
        }
    }
    newGame() {
        this.timecontrol = new TimeControl();
        this.gameStatus.score = "*";
        this.gameStatus.scoreReason = "";
        this.gameStatus.started = false;
        this.gameStatus.calculated = false;
        this.gameStatus.isStaleMate = false;
        this.gameStatus.isMate = false;
        this.gameStatus.isFiftyMoveRule = false;
        this.gameStatus.isThreeFoldRepetition = false;
        this.gameStatus.isResigned = false;
        this.gameStatus.isDrawAgreed = false;
        this.gameStatus.isFlagged = false;
        this.gameStatus.playersinfo.iterate((pi) => {
            pi.time = this.timecontrol.time;
        });
        this.setFromFen();
        this.genAlgeb = "";
        return this;
    }
    startGame() {
        this.gameStatus.started = true;
        this.gameStatus.calculated = false;
        this.gameStatus.playersinfo.iterate((pi) => {
            pi.canStand = false;
            pi.canResign = true;
            pi.canOfferDraw = true;
        });
        this.actualizeHistory();
    }
    obtainStatus() {
        if (this.isTerminated())
            return;
        this.gameStatus.isStaleMate = false;
        this.gameStatus.isMate = false;
        if (this.gameStatus.isResigned || this.gameStatus.isFlagged) {
            let reason = this.gameStatus.isResigned ? "resigned" : "flagged";
            if (this.turn == WHITE) {
                this.gameStatus.score = "0-1";
                this.gameStatus.scoreReason = "white " + reason;
            }
            else {
                this.gameStatus.score = "1-0";
                this.gameStatus.scoreReason = "black " + reason;
            }
        }
        else if (this.gameStatus.isDrawAgreed) {
            this.gameStatus.score = "1/2-1/2";
            this.gameStatus.scoreReason = "draw agreed";
        }
        else if (this.lms.length <= 0) {
            if (this.isInCheck(this.turn)) {
                this.gameStatus.isMate = true;
                if (this.turn == WHITE) {
                    this.gameStatus.score = "0-1";
                    this.gameStatus.scoreReason = "white mated";
                }
                else {
                    this.gameStatus.score = "1-0";
                    this.gameStatus.scoreReason = "black mated";
                }
            }
            else {
                this.gameStatus.isStaleMate = true;
                this.gameStatus.score = "1/2-1/2";
                this.gameStatus.scoreReason = "stalemate";
            }
        }
        else if (this.isDrawByThreefoldRepetition()) {
            this.gameStatus.isThreeFoldRepetition = true;
            this.gameStatus.score = "1/2-1/2";
            this.gameStatus.scoreReason = "threefold repetition";
        }
        else if (this.halfmoveClock >= (FIFTYMOVE_RULE * 2)) {
            this.gameStatus.isFiftyMoveRule = true;
            this.gameStatus.score = "1/2-1/2";
            this.gameStatus.scoreReason = "fifty move rule";
        }
    }
    isDrawByThreefoldRepetition() {
        let tfens = {};
        for (let gn of this.hist) {
            let tfen = gn.tfen;
            if (tfens[tfen] == undefined) {
                tfens[tfen] = 1;
            }
            else {
                let cnt = tfens[tfen];
                cnt++;
                tfens[tfen] = cnt;
                if (cnt >= THREEFOLD_REPETITION) {
                    return true;
                }
            }
        }
        return false;
    }
    isTerminated() {
        return this.gameStatus.isStaleMate ||
            this.gameStatus.isMate ||
            this.gameStatus.isFiftyMoveRule ||
            this.gameStatus.isThreeFoldRepetition ||
            this.gameStatus.isResigned ||
            this.gameStatus.isDrawAgreed ||
            this.gameStatus.isFlagged;
    }
    genLegalMoves() {
        this.genPseudoLegalMoves();
        this.lms = [];
        for (let m of this.plms) {
            let b = new Board().setTest(true).setFromFen(this.reportFen());
            b.makeMove(m, false);
            if (!b.isInCheck(this.turn)) {
                this.lms.push(m);
            }
        }
        for (let i = 0; i < 4; i++) {
            let cr = CASTLING_RIGHTS[i];
            if ((cr.color == this.turn) && (this.rights[i])) {
                if ((cr.emptySqs.filter(sq => !this.isSqEmpty(sq))).length <= 0) {
                    if (!(this.isSquareInCheck(cr.kingFrom, this.turn) ||
                        this.isSquareInCheck(cr.kingTo, this.turn) ||
                        this.isSquareInCheck(cr.rookTo, this.turn))) {
                        let cm = new Move(cr.kingFrom, cr.kingTo);
                        this.lms.push(cm);
                        let cmpn = new Move(cr.kingFrom, cr.kingTo, new Piece(KNIGHT, this.turn));
                        this.lms.push(cmpn);
                        let cmpq = new Move(cr.kingFrom, cr.kingTo, new Piece(QUEEN, this.turn));
                        this.lms.push(cmpq);
                    }
                }
            }
        }
        // obtain status
        this.obtainStatus();
    }
    genPseudoLegalMoves() {
        this.plms = [];
        for (let f = 0; f < this.BOARD_WIDTH; f++) {
            for (let r = 0; r < this.BOARD_HEIGHT; r++) {
                let p = this.getFR(f, r);
                if (p.color == this.turn) {
                    let pms = this.pseudoLegalMovesForPieceAt(p, new Square(f, r));
                    for (let m of pms) {
                        this.plms.push(m);
                    }
                }
            }
        }
        let ams = [];
        for (let m of this.plms) {
            let fp = this.getSq(m.fromSq);
            if (IS_PROM_PIECE[fp.kind]) {
                if (fp.kind == BISHOP) {
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(KNIGHT)));
                }
                if (fp.kind == KNIGHT) {
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(BISHOP)));
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(ROOK)));
                }
                if (fp.kind == ROOK) {
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(KNIGHT)));
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(QUEEN)));
                }
                if (fp.kind == QUEEN) {
                    ams.push(new Move(m.fromSq, m.toSq, new Piece(ROOK)));
                }
            }
        }
        for (let m of ams) {
            this.plms.push(m);
        }
    }
    squareToAlgeb(sq) {
        return `${String.fromCharCode(sq.f + "a".charCodeAt(0))}${this.BOARD_HEIGHT - sq.r}`;
    }
    moveToAlgeb(m) {
        let raw = `${this.squareToAlgeb(m.fromSq)}${this.squareToAlgeb(m.toSq)}`;
        return `${raw}${m.promPiece.empty() ? "" : m.promPiece.kind}`;
    }
    pseudoLegalMovesForPieceAt(p, sq) {
        let moves = [];
        if (p.kind == PAWN) {
            let pdir = this.pawnDir(p.color);
            let pushOne = sq.p(pdir);
            let promdist = this.pawnFromProm(sq, p.color);
            let isprom = promdist < 5;
            let targetKinds = ["p"];
            if (isprom)
                targetKinds = ALL_INTERIM_PROMOTION_PIECES.slice(0, 5 - promdist);
            if ((isprom) && (promdist > 1))
                targetKinds.unshift("p");
            function createPawnMoves(targetSq) {
                for (let targetKind of targetKinds) {
                    let m = new Move(sq, targetSq);
                    if (isprom && (targetKind != "p"))
                        m.promPiece = new Piece(targetKind);
                    moves.push(m);
                }
            }
            if (this.isSqEmpty(pushOne)) {
                createPawnMoves(pushOne);
                let pushTwo = pushOne.p(pdir);
                if (this.isSqEmpty(pushTwo) && (this.pawnFromStart(sq, p.color) == 1)) {
                    let m = new Move(sq, pushTwo);
                    moves.push(m);
                }
            }
            for (let df = -1; df <= 1; df += 2) {
                let csq = sq.p(pdir).p(new Square(df, 0));
                if (this.isSqOpp(csq, p.color)) {
                    createPawnMoves(csq);
                }
                else if (csq.e(this.epSquare)) {
                    let m = new Move(sq, csq);
                    moves.push(m);
                }
            }
        }
        else {
            for (let df = -2; df <= 2; df++) {
                for (let dr = -2; dr <= 2; dr++) {
                    let multAbs = Math.abs(df * dr);
                    let sumAbs = Math.abs(df) + Math.abs(dr);
                    let ok = true;
                    let f = sq.f;
                    let r = sq.r;
                    do {
                        let knightOk = (multAbs == 2);
                        let bishopOk = (multAbs == 1);
                        let rookOk = ((multAbs == 0) && (sumAbs == 1));
                        let pieceOk = (knightOk && (p.kind == KNIGHT)) ||
                            (bishopOk && (p.kind == BISHOP)) ||
                            (rookOk && (p.kind == ROOK)) ||
                            ((rookOk || bishopOk) && ((p.kind == QUEEN) || (p.kind == KING)));
                        if (pieceOk) {
                            f += df;
                            r += dr;
                            if (this.frOk(f, r)) {
                                let tp = this.getFR(f, r);
                                if (tp.color == p.color) {
                                    ok = false;
                                }
                                else {
                                    let m = new Move(sq, new Square(f, r));
                                    moves.push(m);
                                    if (!tp.empty())
                                        ok = false;
                                    if ((p.kind == KING) || (p.kind == KNIGHT))
                                        ok = false;
                                }
                            }
                            else {
                                ok = false;
                            }
                        }
                        else {
                            ok = false;
                        }
                    } while (ok);
                }
            }
        }
        return moves;
    }
    legalAlgebMoves() {
        return this.lms.map(m => this.moveToAlgeb(m));
    }
    isMoveLegal(m) {
        let flms = this.lms.filter((tm) => tm.e(m));
        return flms.length > 0;
    }
    clearCastlingRights(color) {
        if (color == WHITE) {
            this.rights[0] = false;
            this.rights[1] = false;
        }
        else {
            this.rights[2] = false;
            this.rights[3] = false;
        }
    }
    makeMove(m, check = true) {
        if (check)
            if (!this.isMoveLegal(m))
                return false;
        if (this.isTerminated())
            return false;
        // calculate some useful values
        let algeb = this.moveToAlgeb(m);
        let fSq = m.fromSq;
        let tSq = m.toSq;
        let deltaR = tSq.r - fSq.r;
        let deltaF = tSq.f - fSq.f;
        let fp = this.getSq(fSq);
        let tp = this.getSq(tSq);
        let cr = this.getCastlingRight(m);
        let isCastling = (cr != undefined);
        let normal = tp.empty();
        let playerToMoveInfo = this.gameStatus.playersinfo.getByColor(this.turn);
        let nextPlayerToMoveInfo = this.gameStatus.playersinfo.getByColor(INV_COLOR(this.turn));
        // remove from piece
        this.setSq(fSq);
        // ep capture
        if ((fp.kind == PAWN) && (m.toSq.e(this.epSquare))) {
            normal = false;
            let epCaptSq = this.epSquare.p(new Square(0, -deltaR));
            this.setSq(epCaptSq);
        }
        // set target piece
        if (normal) {
            if (m.promPiece.empty() || isCastling) {
                this.setSq(tSq, fp);
            }
            else {
                this.setSq(tSq, new Piece(m.promPiece.kind, fp.color));
            }
        }
        else {
            for (let df = -1; df <= 1; df++) {
                for (let dr = -1; dr <= 1; dr++) {
                    let testSq = tSq.p(new Square(df, dr));
                    if (this.sqOk(testSq)) {
                        let tp = this.getSq(testSq);
                        if (tp.kind != PAWN)
                            this.setSq(testSq);
                    }
                }
            }
            this.setSq(tSq);
        }
        // castling        
        if (cr != undefined) {
            this.setSq(cr.rookFrom);
            this.setSq(cr.rookTo, new Piece(ROOK, this.turn));
            if (!m.promPiece.empty()) {
                this.setSq(cr.rookTo, new Piece(m.promPiece.kind, this.turn));
            }
        }
        // update castling rights
        if (fp.kind == KING)
            this.clearCastlingRights(this.turn);
        if (this.isExploded(WHITE))
            this.clearCastlingRights(WHITE);
        if (this.isExploded(BLACK))
            this.clearCastlingRights(BLACK);
        for (let i = 0; i < 4; i++) {
            let cr = CASTLING_RIGHTS[i];
            if (cr.color == this.turn) {
                if (fSq.e(cr.rookFrom) || tSq.e(cr.rookFrom))
                    this.rights[i] = false;
                if (this.isSqEmpty(cr.rookFrom))
                    this.rights[i] = false;
            }
        }
        // advance turn
        this.turn = INV_COLOR(this.turn);
        // advance fullmove number
        if (this.turn == WHITE)
            this.fullmoveNumber++;
        // advance halfmove clock
        this.halfmoveClock++;
        if (fp.kind == PAWN)
            this.halfmoveClock = 0;
        if (tp.kind != EMPTY)
            this.halfmoveClock = 0;
        // set ep square
        this.epSquare = INVALID_SQUARE;
        if ((fp.kind == PAWN) && (Math.abs(deltaR) == 2)) {
            let epsq = new Square(m.fromSq.f, m.fromSq.r + (deltaR / 2));
            this.epSquare = epsq;
        }
        // remove draw offer
        if (playerToMoveInfo.canAcceptDraw) {
            playerToMoveInfo.canAcceptDraw = false;
            playerToMoveInfo.canOfferDraw = true;
            nextPlayerToMoveInfo.canOfferDraw = true;
        }
        // update history        
        if (!this.test) {
            this.genAlgeb = algeb;
            this.hist.push(this.toGameNode(algeb));
        }
        // position changed callback
        this.posChanged();
        return true;
    }
    actualizeHistory() {
        this.hist[this.hist.length - 1] = this.toGameNode(this.genAlgeb);
        return this;
    }
    getCurrentGameNode() {
        return this.hist[this.hist.length - 1];
    }
    del() {
        if (this.hist.length > 1) {
            this.hist.pop();
            this.fromGameNode(this.getCurrentGameNode());
        }
    }
    reportTruncFen() {
        let fen = this.reportFen();
        let parts = fen.split(" ");
        let tfen = parts.slice(0, 4).join(" ");
        return tfen;
    }
    reportFen() {
        let fen = "";
        for (let r = 0; r < this.BOARD_HEIGHT; r++) {
            let acc = 0;
            for (let f = 0; f < this.BOARD_WIDTH; f++) {
                let p = this.getFR(f, r);
                if (p.empty()) {
                    acc++;
                }
                else {
                    if (acc) {
                        fen += acc;
                        acc = 0;
                    }
                    fen += p.color == WHITE ? p.kind.toUpperCase() : p.kind;
                }
            }
            if (acc) {
                fen += acc;
                acc = 0;
            }
            if (r < (this.BOARD_HEIGHT - 1))
                fen += "/";
        }
        let crs = "";
        for (let i = 0; i < 4; i++) {
            if (this.rights[i])
                crs += CASTLING_RIGHTS[i].fenLetter;
        }
        if (crs == "")
            crs = "-";
        return `${fen} ${(this.turn == WHITE ? "w" : "b")} ${crs} ${this.epSquare.invalid() ? "-" : this.squareToAlgeb(this.epSquare)} ${this.halfmoveClock} ${this.fullmoveNumber}`;
    }
    squareFromAlgeb(algeb) {
        if (algeb.length != 2)
            return INVALID_SQUARE;
        let fc = algeb.charAt(0);
        let f = fc.charCodeAt(0) - "a".charCodeAt(0);
        let r = this.BOARD_HEIGHT - parseInt(algeb.charAt(1));
        if (isNaN(r))
            return INVALID_SQUARE;
        if (this.frOk(f, r))
            return new Square(f, r);
        return INVALID_SQUARE;
    }
    moveFromAlgeb(algeb) {
        if (algeb.length < 4)
            return INVALID_MOVE;
        if (algeb.length > 5)
            return INVALID_MOVE;
        let fromSq = this.squareFromAlgeb(algeb.substring(0, 2));
        if (!this.sqOk(fromSq))
            return INVALID_MOVE;
        let toSq = this.squareFromAlgeb(algeb.substring(2, 4));
        if (!this.sqOk(toSq))
            return INVALID_MOVE;
        let rm = new Move(fromSq, toSq);
        if (algeb.length == 4)
            return rm;
        let pk = algeb.charAt(4);
        if (!IS_PROM_PIECE[pk])
            return INVALID_MOVE;
        rm.promPiece = new Piece(pk, NO_COL);
        return rm;
    }
    makeAlgebMove(algeb) {
        let m = this.moveFromAlgeb(algeb);
        if (m.invalid())
            return false;
        return this.makeMove(m);
    }
    setPosChangedCallback(posChangedCallback) {
        this.posChangedCallback = posChangedCallback;
        return this;
    }
    isAlgebMoveLegal(algeb) {
        return this.isMoveLegal(this.moveFromAlgeb(algeb));
    }
    isSquareAttackedByPiece(sq, p) {
        let tp = p.inv();
        if (p.kind == PAWN) {
            let pdir = this.pawnDir(tp.color);
            for (let df = -1; df <= 1; df += 2) {
                let tsq = sq.p(new Square(df, pdir.r));
                if (this.sqOk(tsq)) {
                    let ap = this.getSq(tsq);
                    if (ap.e(p))
                        return true;
                }
            }
        }
        else {
            let plms = this.pseudoLegalMovesForPieceAt(tp, sq);
            for (let m of plms) {
                let ap = this.getSq(m.toSq);
                if (ap.e(p))
                    return true;
            }
        }
        return false;
    }
    isSquareAttackedByColor(sq, color) {
        for (let kind of ALL_CHECK_PIECES) {
            if (this.isSquareAttackedByPiece(sq, new Piece(kind, color)))
                return true;
        }
        return false;
    }
    isSquareInCheck(sq, color) {
        return this.isSquareAttackedByColor(sq, INV_COLOR(color));
    }
    whereIsKing(color) {
        for (let f = 0; f < this.BOARD_WIDTH; f++) {
            for (let r = 0; r < this.BOARD_HEIGHT; r++) {
                let p = this.getFR(f, r);
                if ((p.kind == KING) && (p.color == color)) {
                    return new Square(f, r);
                }
            }
        }
        return INVALID_SQUARE;
    }
    kingsAdjacent() {
        let ww = this.whereIsKing(WHITE);
        let wb = this.whereIsKing(BLACK);
        if (ww.invalid())
            return false;
        if (wb.invalid())
            return false;
        return this.isSquareAttackedByPiece(ww, new Piece(KING, BLACK));
    }
    isExploded(color) {
        let wk = this.whereIsKing(color);
        if (wk.invalid())
            return true;
        return false;
    }
    isInCheck(color = this.turn) {
        // adjacent kings - no check
        if (this.kingsAdjacent())
            return false;
        // I'm exploded - always bad
        if (this.isExploded(color))
            return true;
        // I'm not exploded, opponent exploded - no check there
        if (this.isExploded(INV_COLOR(color)))
            return false;
        // none of the above, fall back to regular check
        return this.isSquareInCheck(this.whereIsKing(color), color);
    }
    getCastlingRight(m) {
        let fp = this.getSq(m.fromSq);
        if (fp.kind != KING)
            return undefined;
        let deltaF = m.toSq.f - m.fromSq.f;
        if (Math.abs(deltaF) < 2)
            return undefined;
        let index = CASTLING_RIGHTS.findIndex(cr => cr.kingTo.e(m.toSq));
        if (index < 0)
            return undefined; // this should not happen
        return CASTLING_RIGHTS[index];
    }
    isMoveCapture(m) {
        if (!this.getSq(m.toSq).empty())
            return true;
        return false;
    }
    toGameNode(genAlgeb = "") {
        let fen = this.reportFen();
        let tfen = this.reportTruncFen();
        let gn = new GameNode();
        gn.fen = fen;
        gn.tfen = tfen;
        gn.genAlgeb = genAlgeb;
        gn.status = new GameStatus().fromJson(this.gameStatus.toJson());
        return gn;
    }
    fromGameNode(gn, clearHist = false) {
        let fen = gn.fen;
        this.gameStatus = gn.status;
        this.genAlgeb = gn.genAlgeb;
        // set from fen has to be called last so that the callback has correct status
        this.setFromFen(fen, clearHist);
        return this;
    }
    sitPlayer(color, u) {
        let pi = this.gameStatus.playersinfo.sitPlayer(color, u);
        this.actualizeHistory();
        this.changeLog.kind = "sitplayer";
        this.changeLog.pi = pi;
        return this;
    }
    standPlayer(color) {
        let pi = this.gameStatus.playersinfo.getByColor(color);
        if (pi.u.empty())
            return this;
        let u = pi.u.clone();
        this.gameStatus.playersinfo.standPlayer(color);
        this.actualizeHistory();
        this.changeLog.kind = "standplayer";
        this.changeLog.u = u;
        return this;
    }
    resignPlayer(color) {
        this.savePlayers();
        this.gameStatus.playersinfo.standPlayers();
        this.gameStatus.isResigned = true;
        this.gameStatus.started = false;
        if (color == WHITE) {
            this.gameStatus.score = "0-1";
            this.gameStatus.scoreReason = "white resigned";
        }
        else {
            this.gameStatus.score = "1-0";
            this.gameStatus.scoreReason = "black resigned";
        }
        this.actualizeHistory();
        return this;
    }
    terminateByRules() {
        this.savePlayers();
        this.gameStatus.playersinfo.standPlayers();
        this.gameStatus.started = false;
        this.actualizeHistory();
    }
    flagPlayer(color) {
        this.savePlayers();
        this.gameStatus.playersinfo.standPlayers();
        this.gameStatus.isFlagged = true;
        this.gameStatus.started = false;
        if (color == WHITE) {
            this.gameStatus.score = "0-1";
            this.gameStatus.scoreReason = "white flagged";
        }
        else {
            this.gameStatus.score = "1-0";
            this.gameStatus.scoreReason = "black flagged";
        }
        this.actualizeHistory();
        return this;
    }
    iteratePlayersinfo(iterfunc) {
        this.gameStatus.playersinfo.iterate(iterfunc);
    }
    clearChangeLog() { this.changeLog.clear(); }
    noneSeated() { return this.gameStatus.playersinfo.noneSeated(); }
    someSeated() { return this.gameStatus.playersinfo.someSeated(); }
    allSeated() { return this.gameStatus.playersinfo.allSeated(); }
    makeRandomMove() {
        let n = this.lms.length;
        if (n > 0) {
            let i = Math.floor(Math.random() * n);
            if (i >= n)
                i = 0;
            this.makeMove(this.lms[i]);
            return true;
        }
        return false;
    }
    actualizeShowTime() {
        this.gameStatus.playersinfo.iterate((pi) => {
            if ((this.turn != pi.color) || (!this.gameStatus.started)) {
                pi.showTime = pi.time;
            }
            else {
                pi.showTime = pi.time - (new Date().getTime() - pi.startedThinkingAt);
                if (pi.showTime < 0)
                    pi.showTime = 0;
            }
        });
        return this.actualizeHistory();
    }
    gameScore() {
        let score = 0.5;
        if (this.gameStatus.score == "1-0")
            score = 1;
        else if (this.gameStatus.score == "0-1")
            score = 0;
        else if (this.gameStatus.score == "1/2-1/2")
            score = 0.5;
        return score;
    }
    savePlayers() {
        let pw = this.gameStatus.playersinfo.getByColor(WHITE).u;
        let pb = this.gameStatus.playersinfo.getByColor(BLACK).u;
        this.savedWhite = pw.clone();
        this.savedBlack = pb.clone();
    }
    wasRatedGame() {
        return !((this.gameStatus.ratingCalcWhite.isBot) || (this.gameStatus.ratingCalcBlack.isBot));
    }
    calculateRatings() {
        let pw = this.savedWhite;
        let pb = this.savedBlack;
        let rcw = new RatingCalculation();
        rcw.username = pw.username;
        rcw.isBot = pw.isBot;
        rcw.oldRating = pw.glicko.rating;
        let rcb = new RatingCalculation();
        rcb.username = pb.username;
        rcb.isBot = pb.isBot;
        rcb.oldRating = pb.glicko.rating;
        let s = this.gameScore();
        let pwng = Glicko.calc(pw.glicko, pb.glicko, s);
        let pbng = Glicko.calc(pb.glicko, pw.glicko, 1 - s);
        if (!((pw.isBot) || (pb.isBot))) {
            pw.glicko = pwng;
            pb.glicko = pbng;
            rcw.newRating = pwng.rating;
            rcb.newRating = pbng.rating;
        }
        this.changeLog.kind = "ratingscalculated";
        this.gameStatus.ratingCalcWhite = rcw;
        this.gameStatus.ratingCalcBlack = rcb;
        console.log("rating calcs", rcw, rcb);
        this.gameStatus.calculated = true;
        this.actualizeHistory();
        this.timecontrol = new TimeControl();
        return [pw, pb];
    }
    offerDraw(color) {
        let offer = this.gameStatus.playersinfo.getByColor(color);
        let accept = this.gameStatus.playersinfo.getByColor(INV_COLOR(color));
        offer.canOfferDraw = false;
        accept.canAcceptDraw = true;
        accept.canOfferDraw = false;
        this.actualizeHistory();
    }
    drawByAgreement() {
        this.savePlayers();
        this.gameStatus.playersinfo.standPlayers();
        this.gameStatus.isDrawAgreed = true;
        this.gameStatus.started = false;
        this.gameStatus.score = "1/2-1/2";
        this.gameStatus.scoreReason = "draw agreed";
        this.actualizeHistory();
        return this;
    }
    getPlayer(color) {
        return this.gameStatus.playersinfo.getByColor(color).u;
    }
    isCapture(m) {
        if (m.invalid())
            return false;
        if (!this.getSq(m.toSq).empty())
            return true;
        if ((this.getSq(m.fromSq).kind == "p") && (this.epSquare.e(m.toSq)))
            return true;
        return false;
    }
}
function checkLichess(username, code, callback) {
    console.log(`checking lichess code ${username} ${code}`);
    if (GLOBALS.isDev()) {
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
        console.log(GLOBALS.handledError(err));
        callback(false);
    });
}
let DATABASE_NAME = `mychessdb`;
let USERS_COLL = `actusers`;
let CHESSLOG_COLL = `chesslog`;
let LOCAL_MONGO_URI = `mongodb://localhost:27017/${DATABASE_NAME}`;
let MONGODB_URI = GLOBALS.isProd() ? process.env.MONGODB_URI : LOCAL_MONGO_URI;
let db;
try {
    mongodb.connect(MONGODB_URI, function (err, conn) {
        if (err) {
            console.log(GLOBALS.handledError(err));
        }
        else {
            db = conn.db(DATABASE_NAME);
            console.log(`chess connected to MongoDB database < ${db.databaseName} >`);
            dbUsersStartup();
            dbChesslogStartup();
        }
    });
}
catch (err) {
    console.log(GLOBALS.handledError(err));
}
function dbFindAsArray(collectionName, query, callback) {
    try {
        const collection = db.collection(collectionName);
        // Find documents
        collection.find(query).toArray(function (err, docs) {
            callback([err, docs]);
        });
    }
    catch (err) {
        callback([err, []]);
    }
}
let users = new UserList();
function dbUsersStartup() {
    users = new UserList();
    if (db != null) {
        dbFindAsArray(USERS_COLL, {}, function (result) {
            if (result[0]) {
                console.log("users startup failed", GLOBALS.handledError(result[0]));
            }
            else {
                console.log(`users startup ok, ${result[1].length} user(s)`);
                users.fromJson(result[1]);
            }
        });
    }
}
function dbSetUser(user) {
    if (db != null) {
        try {
            const collection = db.collection(USERS_COLL);
            console.log(`updating user`, user);
            collection.updateOne({ username: user.username }, { "$set": user.toJson() }, { upsert: true }, (error, result) => {
                console.log(`updating user ${user.username} error = `, error);
            });
        }
        catch (err) {
            console.log(GLOBALS.handledError(err));
        }
    }
}
function createLogin(username, callback) {
    let code = uniqid();
    console.log(`creating login ${username} ${code}`);
    callback(code);
}
function registerUser(username, callback) {
    let cookie = uniqid();
    let u = new User();
    u.username = username;
    u.cookie = cookie;
    users.setUser(u);
    dbSetUser(u);
    callback(cookie);
}
function storeUsers(us) {
    console.log("storing users");
    for (let u of us) {
        let uclone = users.upsertUser(u);
        dbSetUser(uclone);
    }
}
function checkCookie(cookie, callback) {
    console.log(`checking cookie ${cookie}`);
    let u = users.getByCookie(cookie);
    callback(u == undefined ?
        { ok: false } :
        { ok: true, user: u });
}
let CHESSLOG_MAX_AGE = GLOBALS.ONE_DAY * 30;
class ChessLogItem {
    constructor(username = "", action = "") {
        this.time = new Date().getTime();
        this.username = "";
        this.action = "";
        this.username = username;
        this.action = action;
    }
    toJson() {
        return ({
            time: this.time,
            username: this.username,
            action: this.action
        });
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        if (json.time != undefined)
            this.time = json.time;
        if (json.username != undefined)
            this.username = json.username;
        if (json.action != undefined)
            this.action = json.action;
        return this;
    }
}
class ChessLog {
    constructor() {
        this.items = [];
    }
    add(item) {
        this.items.unshift(item);
    }
    fromJson(json) {
        this.items = [];
        if (json == undefined)
            return this;
        for (let key in json) {
            let valueJson = json[key];
            let item = new ChessLogItem().fromJson(valueJson);
            this.add(item);
        }
        return this;
    }
    asHtml() {
        let rows = this.items.map(item => `
<tr>
<td>
<span class="logtime">${new Date(item.time).toLocaleString()}</span>
</td>
<td>
<span class="loguser">${item.username}</span>
</td>
<td>
<span class="logaction">${item.action}</span>
</td>
</tr>`).join("\n");
        return `
<table>
${rows}
</table>`;
    }
}
function dbInsertChessLogItem(cli) {
    if (db != null) {
        try {
            const collection = db.collection(CHESSLOG_COLL);
            let doc = cli.toJson();
            //console.log(`updating chesslog`,doc)            
            collection.insertOne(doc, (error, result) => {
                //console.log(`updating chesslog item error = `,error)
            });
            let forget = new Date().getTime() - CHESSLOG_MAX_AGE;
            collection.deleteMany({ time: { "$lt": forget } }, (error, result) => {
                //console.log(`deleting old chesslog error = `,error)
                //console.log(`deleted ${result.result.n} item(s)`)
            });
        }
        catch (err) {
            console.log(GLOBALS.handledError(err));
        }
    }
}
let chessLog = new ChessLog();
function sendLogPage(req, res) {
    let content = `
<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" href="stylesheets/reset.css">
    <link rel="stylesheet" href="stylesheets/app.css">
</head>

<body>
    ${chessLog.asHtml()}
</body>

</html>`;
    res.send(content);
}
function dbChesslogStartup() {
    chessLog = new ChessLog();
    if (db != null) {
        dbFindAsArray(CHESSLOG_COLL, {}, function (result) {
            if (result[0]) {
                console.log("chesslog startup failed", GLOBALS.handledError(result[0]));
            }
            else {
                console.log(`chesslog startup ok, ${result[1].length} item(s)`);
                chessLog.fromJson(result[1]);
            }
        });
    }
}
function logChess(item) {
    chessLog.add(item);
    dbInsertChessLogItem(item);
}
let SOCKET_TIMEOUT = GLOBALS.ONE_SECOND * 60;
let SOCKET_MAINTAIN_INTERVAL = GLOBALS.ONE_SECOND * 60;
let UNSEAT_TIMEOUT = GLOBALS.ONE_MINUTE * 2;
let BOARD_MAINTAIN_INTERVAL = GLOBALS.ONE_SECOND * 1;
let USERS_MAINTAIN_INTERVAL = GLOBALS.ONE_SECOND * 5;
let b = new Board().newGame();
class Socket {
    constructor(ws) {
        this.ping = new Date().getTime();
        this.u = new User();
        this.ws = ws;
    }
}
let sockets = {};
let chat = new Chat();
function updateUsers(us) {
    storeUsers(us);
    broadcastUserList();
}
setInterval(maintainUsers, USERS_MAINTAIN_INTERVAL);
setInterval(maintainBoard, BOARD_MAINTAIN_INTERVAL);
let userpoolOld = [];
let userpoolCurrent = [];
function uniqueStrings(items) {
    let hash = {};
    for (let str of items) {
        hash[str] = true;
    }
    return Object.keys(hash);
}
function numSockets() { return Object.keys(sockets).length; }
function broadcastOnlineUsers() {
    broadcast({
        t: "setonline",
        pool: uniqueStrings(userpoolCurrent),
        ns: numSockets()
    });
    userpoolOld = userpoolCurrent;
}
function maintainUsers() {
    userpoolCurrent = Object.keys(sockets).map((sri) => sockets[sri].u.username);
    for (let username of userpoolCurrent) {
        if (userpoolOld.indexOf(username) < 0) {
            broadcastOnlineUsers();
            return;
        }
    }
    for (let username of userpoolOld) {
        if (userpoolCurrent.indexOf(username) < 0) {
            broadcastOnlineUsers();
            return;
        }
    }
}
function maintainBoard() {
    let refresh = false;
    b.iteratePlayersinfo((pi) => {
        let now = new Date().getTime();
        let elapsed = now - pi.seatedAt;
        if ((elapsed > UNSEAT_TIMEOUT) && (pi.canStand)) {
            b.standPlayer(pi.color);
            b.changeLog.reason = "( timeout )";
            refresh = true;
        }
    });
    if (refresh)
        broadcastBoard();
    if (b.gameStatus.started) {
        b.gameStatus.playersinfo.iterate((pi) => {
            if (b.turn == pi.color) {
                let diff = new Date().getTime() - pi.startedThinkingAt;
                if (diff > pi.time) {
                    b.flagPlayer(pi.color);
                    let us = b.calculateRatings();
                    updateUsers(us);
                    pi.time = 0;
                    broadcastBoard();
                }
            }
        });
    }
}
function maintainSockets() {
    try {
        let delsris = [];
        for (let sri in sockets) {
            let socket = sockets[sri];
            let now = new Date().getTime();
            let lastping = socket.ping || 0;
            let elapsed = now - lastping;
            if (elapsed > SOCKET_TIMEOUT) {
                try {
                    let ws = socket.ws;
                    if (isOpen(ws)) {
                        ws.close(1000);
                    }
                    delsris.push(sri);
                }
                catch (err) {
                    console.log("socket close", err);
                }
            }
        }
        if (delsris.length > 0) {
            console.log("sockets to delete", delsris);
            for (let sri of delsris) {
                delete sockets[sri];
            }
        }
    }
    catch (err) {
        console.log(err);
    }
}
setInterval(maintainSockets, SOCKET_MAINTAIN_INTERVAL);
function isOpen(ws) {
    return ws.readyState == WebSocket_.OPEN;
}
function send(ws, json) {
    try {
        if (isOpen(ws)) {
            let jsontext = JSON.stringify(json);
            //console.log("sending",jsontext)
            ws.send(jsontext);
        }
    }
    catch (err) {
        console.log(err);
    }
}
function broadcast(json) {
    for (let sri in sockets) {
        let socket = sockets[sri];
        let ws = socket.ws;
        send(ws, json);
    }
}
function setBoardJson() {
    b.actualizeShowTime();
    return ({
        t: "setboard",
        boardJson: b.getCurrentGameNode().toJson(),
        changeLog: b.changeLog.toJson()
    });
}
function setUserListJson() {
    return ({
        t: "userlist",
        userlist: users.toJson(true) // don't send cookies
    });
}
function sendUserlist(ws) { send(ws, setUserListJson()); }
function broadcastUserList() {
    broadcast(setUserListJson());
}
function sendBoard(ws) { send(ws, setBoardJson()); }
function chatJson() {
    return ({
        t: "setchat",
        chat: chat.toJson()
    });
}
function sendChat(ws) {
    send(ws, chatJson());
}
function broadcastChat() {
    broadcast(chatJson());
}
function broadcastBoard() {
    if (b.changeLog.kind == "ratingscalculated") {
        chat.add(new ChatItem(new SystemUser(), `${b.gameStatus.ratingCalcWhite.username} - ${b.gameStatus.ratingCalcBlack.username} game ended ${b.gameStatus.score} ${b.gameStatus.scoreReason}`));
        broadcastChat();
    }
    broadcast(setBoardJson());
    b.clearChangeLog();
}
function handleWs(ws, req) {
    try {
        let ru = req.url;
        let sri = "unknownsri";
        let parts = ru.split("sri=");
        if (parts.length > 1) {
            sri = parts[1];
        }
        sockets[sri] = new Socket(ws);
        console.log("websocket connected", ru, sri);
        logChess(new ChessLogItem("sri # " + sri, "socket connected"));
        let headers = req.headers;
        let cookies = {};
        if (headers != undefined) {
            let cookieAll = headers.cookie;
            if (cookieAll != undefined) {
                let cookiesAll = cookieAll.split(/;\s*/);
                for (let cookieStr of cookiesAll) {
                    let parts = cookieStr.split("=");
                    let name = parts[0];
                    let value = parts[1];
                    cookies[name] = value;
                }
            }
        }
        let loggedUser = new User();
        function hasLoggedUser() {
            for (let sri in sockets) {
                let socket = sockets[sri];
                if (socket.u.e(loggedUser)) {
                    return true;
                }
            }
            return false;
        }
        function setUser() {
            console.log("setting user", loggedUser);
            if (!hasLoggedUser()) {
                // novel user
                chat.add(new ChatItem(new SystemUser(), `welcome ${loggedUser.smartNameHtml()}`));
                broadcastChat();
            }
            sockets[sri].u = loggedUser;
            send(ws, ({
                t: "setuser",
                u: loggedUser.toJson()
            }));
            sendBoard(ws);
        }
        let userCookie = cookies["user"];
        checkCookie(userCookie, (result) => {
            if (result.ok) {
                loggedUser = result.user;
                console.log(`logged user`, loggedUser);
                logChess(new ChessLogItem(loggedUser.username, "user logged in"));
                setUser();
            }
        });
        // send state for first time        
        sendBoard(ws);
        sendUserlist(ws);
        sendChat(ws);
        broadcastOnlineUsers();
        ws.on('message', (message) => {
            try {
                let json = JSON.parse(message);
                let t = json.t;
                if (t != "ping") {
                    logChess(new ChessLogItem(loggedUser.username, t));
                }
                if (t == "ping") {
                    send(ws, {
                        t: "pong",
                        time: json.time
                    });
                    sockets[sri].ping = new Date().getTime();
                }
                else if (t == "lichesslogin") {
                    console.log(t);
                    let username = json.username;
                    createLogin(username, (code) => {
                        console.log(`sending code for ${username} ${code}`);
                        send(ws, {
                            t: "lichesscode",
                            username: username,
                            code: code
                        });
                    });
                }
                else if (t == "checklichesscode") {
                    console.log(t);
                    let username = json.username;
                    let code = json.code;
                    checkLichess(username, code, (ok) => {
                        console.log(`check result = ${ok}`);
                        if (ok) {
                            registerUser(username, (cookie) => {
                                send(ws, {
                                    t: "userregistered",
                                    username: username,
                                    cookie: cookie
                                });
                                sendUserlist(ws);
                            });
                        }
                        else {
                            send(ws, {
                                t: "usercheckfailed",
                                username: username
                            });
                        }
                    });
                }
                else if (t == "userloggedin") {
                    loggedUser = users.getByCookie(json.cookie);
                    console.log("logged in", loggedUser);
                    setUser();
                }
                else if (t == "makemove") {
                    if (b.someSeated() || b.allSeated()) {
                        let pic = b.gameStatus.playersinfo.getByColor(b.turn);
                        if (!pic.u.empty()) {
                            let pi = b.gameStatus.playersinfo.getByUser(loggedUser);
                            if (!((pi.color == b.turn) && (pi.u.e(loggedUser)))) {
                                console.log("not eligible");
                                broadcastBoard();
                                return;
                            }
                        }
                    }
                    let algeb = json.algeb;
                    console.log("makemove", algeb);
                    let oldTurn = b.turn;
                    let m = b.moveFromAlgeb(algeb);
                    let fromPieceKind = "";
                    let toPieceKind = "";
                    let isCapture = false;
                    if (!m.invalid()) {
                        fromPieceKind = b.getSq(m.fromSq).kind;
                        isCapture = b.isCapture(m);
                    }
                    let ok = b.makeAlgebMove(algeb);
                    if (ok) {
                        console.log("legal");
                        b.changeLog.kind = "movemade";
                        toPieceKind = b.getSq(m.toSq).kind;
                        b.changeLog.fromPieceKind = fromPieceKind;
                        b.changeLog.toPieceKind = toPieceKind;
                        b.changeLog.isCapture = isCapture;
                        if (b.isTerminated()) {
                            console.log("game terminated");
                            b.terminateByRules();
                            let us = b.calculateRatings();
                            updateUsers(us);
                            broadcastBoard();
                            return;
                        }
                        if (b.gameStatus.started) {
                            let picold = b.gameStatus.playersinfo.getByColor(oldTurn);
                            picold.time = picold.time - (new Date().getTime() - picold.startedThinkingAt) + b.timecontrol.inc;
                            if (picold.time < 0) {
                                b.del();
                                b.flagPlayer(oldTurn);
                                let us = b.calculateRatings();
                                updateUsers(us);
                                picold.time = 0;
                                broadcastBoard();
                                return;
                            }
                        }
                        let pic = b.gameStatus.playersinfo.getByColor(b.turn);
                        pic.startedThinkingAt = new Date().getTime();
                        if (pic.u.isBot) {
                            b.makeRandomMove();
                            let picafter = b.gameStatus.playersinfo.getByColor(b.turn);
                            picafter.startedThinkingAt = new Date().getTime();
                        }
                        if (!b.gameStatus.started) {
                            if (b.allSeated()) {
                                if (b.fullmoveNumber >= 2)
                                    b.startGame();
                            }
                        }
                        b.actualizeHistory();
                    }
                    broadcastBoard();
                }
                else if (t == "delmove") {
                    console.log("del move");
                    b.del();
                    broadcastBoard();
                }
                else if (t == "reset") {
                    console.log("reset board");
                    b.newGame();
                    b.changeLog.kind = "boardreset";
                    broadcastBoard();
                }
                else if (t == "chat") {
                    let chi = new ChatItem().fromJson(json.chatitem);
                    console.log("chat", chi);
                    chat.add(chi);
                    broadcastChat();
                }
                else if (t == "sitplayer") {
                    let u = createUserFromJson(json.u);
                    console.log("sit player", u);
                    let color = json.color;
                    b.sitPlayer(color, u);
                    if (b.allSeated()) {
                        b.newGame();
                        let pi = b.gameStatus.playersinfo.getByColor(WHITE);
                        if (pi.u.isBot) {
                            b.makeRandomMove();
                        }
                    }
                    broadcastBoard();
                }
                else if (t == "standplayer") {
                    let color = json.color;
                    console.log("stand player", color);
                    b.standPlayer(color);
                    broadcastBoard();
                }
                else if (t == "resign") {
                    let color = json.color;
                    console.log("resign", color);
                    b.resignPlayer(color);
                    let us = b.calculateRatings();
                    updateUsers(us);
                    broadcastBoard();
                }
                else if (t == "offerdraw") {
                    let color = json.color;
                    console.log("offer draw", color);
                    b.offerDraw(color);
                    broadcastBoard();
                }
                else if (t == "acceptdraw") {
                    console.log("draw accepted");
                    b.drawByAgreement();
                    let us = b.calculateRatings();
                    updateUsers(us);
                    broadcastBoard();
                }
            }
            catch (err) {
                console.log(err);
            }
        });
        ws.on('error', (error) => {
            console.log(error);
        });
        ws.on('close', function () {
            console.log("websocket closed", sri);
            delete sockets[sri];
        });
    }
    catch (err) {
        console.log(err);
    }
}
const PORT = process.env.PORT || 5000;
////////////////////////////////////////
// Discord startup
atombot.startBot();
testbot.startBot();
testbot.connectDb();
if (GLOBALS.isProd())
    setInterval(testbot.purgeTestChannel, 10 * GLOBALS.ONE_MINUTE);
////////////////////////////////////////
////////////////////////////////////////
// Server startup
const app = express()
    .use('/ajax', bodyParser.json({ limit: '1mb' }))
    .use('/vote/ajax', bodyParser.json({ limit: '1mb' }))
    .use('/chess', express.static(path.join(__dirname, 'chessclient/public')))
    .use('/vote', express.static(path.join(__dirname, 'voteserver')))
    .use(express.static(path.join(__dirname, 'public')))
    .use(cookieParser())
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .get('/', (req, res) => res.render('pages/index'))
    .get('/chesslog', (req, res) => sendLogPage(req, res))
    .get('/vote', (req, res) => voteserver.index(req, res))
    .post("/ajax", (req, res) => api.handleApi(req, res))
    .post("/vote/ajax", (req, res) => voteserver.handleAjax(req, res));
const server = http.createServer(app);
const wss = new WebSocket_.Server({ server });
wss.on("connection", (ws, req) => {
    handleWs(ws, req);
});
server.listen(PORT, () => console.log(`Listening on ${PORT}`));
//////////////////////////////////////// 
