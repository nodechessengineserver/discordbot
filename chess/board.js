"use strict";
let DOM_DEFINED = false;
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
class Board {
    constructor(variant = DEFAULT_VARIANT) {
        this.rights = [true, true, true, true];
        this.hist = [];
        this.test = false;
        this.plms = [];
        this.lms = [];
        this.debug = false;
        this.fullmoveNumber = 1;
        this.halfmoveClock = 0;
        this.epSquare = INVALID_SQUARE;
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
        this.hist = [];
        this.fullmoveNumber = 1;
        this.halfmoveClock = 0;
        this.rights = [true, true, true, true];
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
            this.hist = [fen];
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
                    }
                }
            }
        }
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
    makeMove(m, check = true) {
        if (check)
            if (!this.isMoveLegal(m))
                return false;
        let fSq = m.fromSq;
        let tSq = m.toSq;
        let deltaR = tSq.r - fSq.r;
        let deltaF = tSq.f - fSq.f;
        let fp = this.getSq(fSq);
        let tp = this.getSq(tSq);
        this.setSq(fSq);
        let normal = tp.empty();
        if ((fp.kind == PAWN) && (m.toSq.e(this.epSquare))) {
            // ep capture
            normal = false;
            let epCaptSq = this.epSquare.p(new Square(0, -deltaR));
            this.setSq(epCaptSq);
        }
        if (normal) {
            if (m.promPiece.empty()) {
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
        if (fp.kind == KING) {
            if (this.turn == WHITE) {
                this.rights[0] = false;
                this.rights[1] = false;
            }
            else {
                this.rights[2] = false;
                this.rights[3] = false;
            }
        }
        for (let i = 0; i < 4; i++) {
            let cr = CASTLING_RIGHTS[i];
            if (cr.color == this.turn) {
                if (fSq.e(cr.rookFrom) || tSq.e(cr.rookFrom))
                    this.rights[i] = false;
                if (this.isSqEmpty(cr.rookFrom))
                    this.rights[i] = false;
            }
        }
        if ((fp.kind == KING) && (Math.abs(deltaF) > 1)) {
            // castling
            let crs = CASTLING_RIGHTS.filter(cr => cr.kingTo.e(tSq));
            if (crs.length == 1) {
                let cr = crs[0];
                this.setSq(cr.rookFrom);
                this.setSq(cr.rookTo, new Piece(ROOK, this.turn));
            }
            else {
                console.log("invalid castling");
            }
        }
        this.turn = INV_COLOR(this.turn);
        if (this.turn == WHITE)
            this.fullmoveNumber++;
        this.halfmoveClock++;
        if (fp.kind == PAWN)
            this.halfmoveClock = 0;
        if (tp.kind != EMPTY)
            this.halfmoveClock = 0;
        this.epSquare = INVALID_SQUARE;
        if ((fp.kind == PAWN) && (Math.abs(deltaR) == 2)) {
            let epsq = new Square(m.fromSq.f, m.fromSq.r + (deltaR / 2));
            this.epSquare = epsq;
        }
        let fen = this.reportFen();
        this.hist.push(fen);
        this.posChanged();
        return true;
    }
    del() {
        //console.log("del",this.hist)
        if (this.hist.length > 1) {
            this.hist.pop();
            let fen = this.hist[this.hist.length - 1];
            this.setFromFen(fen, false);
        }
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
        if (this.kingsAdjacent())
            return false;
        if (this.isExploded(color))
            return true;
        return this.isSquareInCheck(this.whereIsKing(color), color);
    }
}
if (!DOM_DEFINED) {
    module.exports.Piece = Piece;
    module.exports.Board = Board;
}
