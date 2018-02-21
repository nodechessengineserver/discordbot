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
// local
const atombot = require("./discordbot/atombot");
const testbot = require("./discordbot/testbot");
const tourney = require("./discordbot/tourney");
const api = require("./discordbot/api");
const GLOBALS = require("./discordbot/globals");
let EPOCH = 1517443200000; // 2018-2-1
class User {
    constructor() {
        this.username = "";
        this.cookie = "";
        this.rating = 1500;
        this.rd = 350;
        this.registeredAt = EPOCH;
        this.lastSeenAt = EPOCH;
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
    smartNameHtml() {
        return this.username == "" ? `<span class="anonuser">${this.smartName()}</span>` : this.username;
    }
    toJson(secure = false) {
        let json = ({
            username: this.username,
            rating: this.rating,
            rd: this.rd,
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
        if (json.rating != undefined)
            this.rating = json.rating;
        if (json.rd != undefined)
            this.rd = json.rd;
        if (json.registeredAt != undefined)
            this.registeredAt = json.registeredAt;
        if (json.lastSeenAt != undefined)
            this.lastSeenAt = json.lastSeenAt;
        return this;
    }
}
class SystemUser extends User {
    smartNameHtml() {
        return `<span class="systemuser">system</span>`;
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
        for (let userJson of json) {
            let u = new User().fromJson(userJson);
            this.users[u.username] = u;
            this.cookies[u.cookie] = u;
        }
        return this;
    }
    setUser(u) {
        this.users[u.username] = u;
        this.cookies[u.cookie] = u;
    }
    getByCookie(cookie) {
        return this.cookies[cookie];
    }
    getByUsername(username) {
        return this.users[username];
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
    constructor() {
        this.u = new User();
        this.color = BLACK;
        this.time = 0;
        this.seatedAt = new Date().getTime();
        this.canPlay = true;
        this.canOfferDraw = false;
        this.canAcceptDraw = false;
        this.canResign = false;
        this.canStand = false;
    }
    colorName() {
        return this.color == WHITE ? "white" : "black";
    }
    toJson() {
        let json = ({
            u: this.u.toJson(true),
            color: this.color,
            time: this.time,
            seatedAt: this.seatedAt,
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
            this.u = new User().fromJson(json.u);
        if (json.color != undefined)
            this.color = json.color;
        if (json.time != undefined)
            this.time = json.time;
        if (json.seatedAt != undefined)
            this.seatedAt = json.seatedAt;
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
        return this.playersinfo[0];
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
    iterate(iterfunc) {
        for (let pi of this.playersinfo)
            iterfunc(pi);
    }
}
class GameStatus {
    constructor() {
        // game status
        this.score = "*";
        this.scoreReason = "";
        this.started = false;
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
    }
    toJson() {
        let json = ({
            score: this.score,
            scoreReason: this.scoreReason,
            started: this.started,
            isStaleMate: this.isStaleMate,
            isMate: this.isMate,
            isFiftyMoveRule: this.isFiftyMoveRule,
            isThreeFoldRepetition: this.isThreeFoldRepetition,
            isResigned: this.isResigned,
            isDrawAgreed: this.isDrawAgreed,
            playersinfo: this.playersinfo.toJson()
        });
        return json;
    }
    fromJson(json) {
        if (json == undefined)
            return this;
        this.score = json.score;
        this.scoreReason = json.scoreReason;
        this.started = json.started;
        this.isStaleMate = json.isStaleMate;
        this.isMate = json.isMate;
        this.isFiftyMoveRule = json.isFiftyMoveRule;
        this.isThreeFoldRepetition = json.isThreeFoldRepetition;
        this.isResigned = json.isResigned;
        this.isDrawAgreed = json.isDrawAgreed;
        this.isFlagged = json.isFlagged;
        this.playersinfo = new PlayersInfo().fromJson(json.playersinfo);
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
        this.pi = new PlayerInfo();
    }
    clear() {
        this.kind = "";
        this.reason = "";
    }
    toJson() {
        return ({
            kind: this.kind,
            reason: this.reason,
            pi: this.pi.toJson()
        });
    }
    fromJson(json) {
        if (json.kind != undefined)
            this.kind = json.kind;
        if (json.reason != undefined)
            this.reason = json.reason;
        if (json.pi != undefined)
            this.pi = new PlayerInfo().fromJson(json.pi);
        return this;
    }
}
class Board {
    constructor(variant = DEFAULT_VARIANT) {
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
        if (clearHist)
            this.hist = [this.toGameNode()];
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
        this.gameStatus.score = "*";
        this.gameStatus.scoreReason = "";
        this.gameStatus.isStaleMate = false;
        this.gameStatus.isMate = false;
        this.gameStatus.isFiftyMoveRule = false;
        this.gameStatus.isThreeFoldRepetition = false;
        this.gameStatus.isResigned = false;
        this.gameStatus.isDrawAgreed = false;
        this.gameStatus.isFlagged = false;
        this.setFromFen();
    }
    obtainStatus() {
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
    isPrestart() {
        return (!this.gameStatus.started) && (!this.isTerminated());
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
            let isprom = promdist == 1;
            let targetKinds = ["p"];
            if (isprom)
                targetKinds = ALL_PROMOTION_PIECES;
            function createPawnMoves(targetSq) {
                for (let targetKind of targetKinds) {
                    let m = new Move(sq, targetSq);
                    if (isprom)
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
        // update history        
        this.hist.push(this.toGameNode(algeb));
        // position changed callback
        this.posChanged();
        return true;
    }
    actualizeHistory() {
        this.hist[this.hist.length - 1] = this.toGameNode(this.genAlgeb);
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
        let index = CASTLING_RIGHTS.findIndex(cr => cr.kingFrom.e(m.fromSq));
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
        let pi = this.gameStatus.playersinfo.standPlayer(color);
        this.actualizeHistory();
        this.changeLog.kind = "standplayer";
        this.changeLog.pi = pi;
        return this;
    }
    iteratePlayersinfo(iterfunc) {
        this.gameStatus.playersinfo.iterate(iterfunc);
    }
    clearChangeLog() { this.changeLog.clear(); }
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
function checkCookie(cookie, callback) {
    console.log(`checking cookie ${cookie}`);
    let u = users.getByCookie(cookie);
    callback(u == undefined ?
        { ok: false } :
        { ok: true, user: u });
}
let SOCKET_TIMEOUT = GLOBALS.ONE_SECOND * 60;
let SOCKET_MAINTAIN_INTERVAL = GLOBALS.ONE_SECOND * 60;
let UNSEAT_TIMEOUT = GLOBALS.ONE_MINUTE * 2;
let BOARD_MAINTAIN_INTERVAL = GLOBALS.ONE_SECOND * 10;
let b = new Board().setFromFen();
let sockets = {};
setInterval(maintainBoard, BOARD_MAINTAIN_INTERVAL);
function maintainBoard() {
    if (!b.isPrestart())
        return;
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
                        socket.close(1000);
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
            //console.log("sockets",sockets)
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
    return ({
        t: "setboard",
        boardJson: b.getCurrentGameNode().toJson(),
        changeLog: b.changeLog.toJson()
    });
}
function sendUserlist(ws) {
    send(ws, {
        t: "userlist",
        userlist: users.toJson(true) // don't send cookies
    });
}
function sendBoard(ws) { send(ws, setBoardJson()); }
function broadcastBoard() {
    broadcast(setBoardJson());
    b.clearChangeLog();
}
function handleWs(ws, req) {
    try {
        let ru = req.url;
        let sri = "unknown sri";
        console.log("websocket connected", ru);
        let parts = ru.split("sri=");
        if (parts.length > 1) {
            // valid socket connected
            sri = parts[1];
            let now = new Date().getTime();
            sockets[sri] = {
                ws: ws,
                ping: now
            };
            // send board for first time
            sendBoard(ws);
        }
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
                //console.log(cookies)
            }
        }
        let loggedUser;
        function setUser() {
            console.log("setting user", loggedUser);
            send(ws, ({
                t: "setuser",
                u: loggedUser.toJson()
            }));
        }
        let userCookie = cookies["user"];
        checkCookie(userCookie, (result) => {
            if (result.ok) {
                loggedUser = result.user;
                console.log(`logged user`, loggedUser);
                setUser();
            }
        });
        sendUserlist(ws);
        ws.on('message', (message) => {
            try {
                //console.log(message)
                let json = JSON.parse(message);
                let t = json.t;
                //console.log("action",t)
                if (t == "ping") {
                    send(ws, {
                        t: "pong",
                        time: json.time
                    });
                    sockets[sri]["ping"] = new Date().getTime();
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
                    let algeb = json.algeb;
                    console.log("makemove", algeb);
                    let ok = b.makeAlgebMove(algeb);
                    if (ok) {
                        console.log("legal");
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
                    broadcastBoard();
                }
                else if (t == "chat") {
                    console.log("chat");
                    broadcast(json);
                }
                else if (t == "sitplayer") {
                    let u = new User().fromJson(json.u);
                    console.log("sit player", u);
                    let color = json.color;
                    b.sitPlayer(color, u);
                    broadcastBoard();
                }
                else if (t == "standplayer") {
                    let color = json.color;
                    console.log("stand player", color);
                    b.standPlayer(color);
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
    .use('/chess', express.static(path.join(__dirname, 'chessclient/public')))
    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')
    .get('/', (req, res) => res.render('pages/index'))
    .post("/ajax", (req, res) => api.handleApi(req, res));
const server = http.createServer(app);
const wss = new WebSocket_.Server({ server });
wss.on("connection", (ws, req) => {
    handleWs(ws, req);
});
server.listen(PORT, () => console.log(`Listening on ${PORT}`));
//////////////////////////////////////// 
