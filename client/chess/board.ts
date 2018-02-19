let THREEFOLD_REPETITION=3
let FIFTYMOVE_RULE=50

let WHITE=1
let BLACK=0
let NO_COL=-1

function INV_COLOR(color:number){
    if(color==NO_COL) return NO_COL
    return color==WHITE?BLACK:WHITE
}

let EMPTY="-"
let PAWN="p"
let KNIGHT="n"
let BISHOP="b"
let ROOK="r"
let QUEEN="q"
let KING="k"

let IS_PIECE:{[id:string]:boolean}={"p":true,"n":true,"b":true,"r":true,"q":true,"k":true}
let ALL_PIECES=Object.keys(IS_PIECE)
let ALL_CHECK_PIECES=["p","n","b","r","q"]
let IS_PROM_PIECE:{[id:string]:boolean}={"n":true,"b":true,"r":true,"q":true}
let ALL_PROMOTION_PIECES=Object.keys(IS_PROM_PIECE)
let MOVE_LETTER_TO_TURN:{[id:string]:number}={"w":WHITE,"b":BLACK}

let VARIANT_PROPERTIES:{[id:string]:any}={
    "promoatomic":{
        DISPLAY:"Promotion Atomic",
        BOARD_WIDTH:8,
        BOARD_HEIGHT:8,
        START_FEN:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
}

let DEFAULT_VARIANT="promoatomic"

class Piece{
    kind:string
    color:number
    
    constructor(kind:string=EMPTY,color:number=NO_COL){
        this.kind=kind
        this.color=color
    }

    empty():boolean{return this.kind==EMPTY}

    inv():Piece{return new Piece(this.kind,INV_COLOR(this.color))}

    e(p:Piece):boolean{
        return (this.kind==p.kind)&&(this.color==p.color)
    }
}

class Square{
    f:number
    r:number

    constructor(f:number,r:number){
        this.f=f
        this.r=r
    }    

    p(sq:Square):Square{
        return new Square(this.f+sq.f,this.r+sq.r)
    }

    e(sq:Square):boolean{
        return (sq.f==this.f)&&(sq.r==this.r)
    }

    invalid():boolean{return (this.f<0)||(this.r<0)}
}

const INVALID_SQUARE=new Square(-1,-1)

class Move{
    fromSq:Square
    toSq:Square
    promPiece:Piece

    constructor(fromSq:Square,toSq:Square,promPiece:Piece=new Piece()){
        this.fromSq=fromSq
        this.toSq=toSq
        this.promPiece=promPiece
    }

    e(m:Move):boolean{
        if(!m.fromSq.e(this.fromSq)) return false
        if(!m.toSq.e(this.toSq)) return false
        return m.promPiece.kind==this.promPiece.kind
    }

    invalid():boolean{
        return this.fromSq.invalid()||this.toSq.invalid()
    }
}

const INVALID_MOVE=new Move(INVALID_SQUARE,INVALID_SQUARE)

class CastlingRight{
    color:number
    kingFrom:Square
    kingTo:Square
    rookFrom:Square
    rookTo:Square
    emptySqs:Square[]
    passingSq:Square
    fenLetter:string

    constructor(color:number,
    kingFrom:Square,
    kingTo:Square,
    rookFrom:Square,
    rookTo:Square,
    emptySqs:Square[],    
    fenLetter:string){
        this.color=color
        this.kingFrom=kingFrom
        this.kingTo=kingTo
        this.rookFrom=rookFrom
        this.rookTo=rookTo
        this.emptySqs=emptySqs        
        this.fenLetter=fenLetter
    }
}

const CASTLING_RIGHTS:CastlingRight[]=[
    new CastlingRight(
        WHITE,
        new Square(4,7),
        new Square(6,7),
        new Square(7,7),
        new Square(5,7),
        [new Square(5,7),new Square(6,7)],        
        "K"
    ),
    new CastlingRight(
        WHITE,
        new Square(4,7),
        new Square(2,7),
        new Square(0,7),
        new Square(3,7),
        [new Square(3,7),new Square(2,7),new Square(1,7)],        
        "Q"
    ),new CastlingRight(
        BLACK,
        new Square(4,0),
        new Square(6,0),
        new Square(7,0),
        new Square(5,0),
        [new Square(5,0),new Square(6,0)],        
        "k"
    ),
    new CastlingRight(
        BLACK,
        new Square(4,0),
        new Square(2,0),
        new Square(0,0),
        new Square(3,0),
        [new Square(3,0),new Square(2,0),new Square(1,0)],        
        "q"
    )
]

class GameStatus{
    // game status
    score:string="*"
    scoreReason:string=""

    // termination by rules
    isStaleMate=false
    isMate=false
    isFiftyMoveRule=false
    isThreeFoldRepetition=false

    // termination by player
    isResigned=false
    isDrawAgreed=false
    isFlagged=false

    toJson():any{
        return JSON.parse(JSON.stringify(this))
    }

    fromJson(json:any):GameStatus{
        this.score=json.score
        this.scoreReason=json.scoreReason
        this.isStaleMate=json.isStaleMate
        this.isMate=json.isMate
        this.isFiftyMoveRule=json.isFiftyMoveRule
        this.isThreeFoldRepetition=json.isThreeFoldRepetition
        this.isResigned=json.isResigned
        this.isDrawAgreed=json.isDrawAgreed
        this.isFlagged=json.isFlagged
        return this
    }
}

class GameNode{
    status:GameStatus=new GameStatus()
    genAlgeb=""
    fen:string=""
    tfen:string=""

    toJson():any{
        return ({
            status:this.status.toJson(),
            genAlgeb:this.genAlgeb,
            fen:this.fen,
            tfen:this.tfen
        })
    }

    fromJson(json:any):GameNode{
        this.status=new GameStatus().fromJson(json.status)
        this.genAlgeb=json.genAlgeb
        this.fen=json.fen
        this.tfen=json.tfen
        return this
    }
}

class Board{
    variant:string

    turn:number

    rights:boolean[]=[true,true,true,true]

    hist:GameNode[]=[]

    PROPS:any
    BOARD_WIDTH:number
    BOARD_HEIGHT:number
    BOARD_SIZE:number    
    START_FEN:string

    rep:Piece[]

    reset(){
        for(let i=0;i<this.BOARD_SIZE;i++){
            this.rep[i]=new Piece()
        }

        this.turn=WHITE        
        this.rights=[false,false,false,false]
        this.epSquare=INVALID_SQUARE
        this.fullmoveNumber=1
        this.halfmoveClock=0        

        this.hist=[]
    }

    constructor(variant:string=DEFAULT_VARIANT){
        this.variant=variant
        this.PROPS=VARIANT_PROPERTIES[variant]
        this.BOARD_WIDTH=this.PROPS.BOARD_WIDTH
        this.BOARD_HEIGHT=this.PROPS.BOARD_HEIGHT
        this.BOARD_SIZE=this.BOARD_WIDTH*this.BOARD_HEIGHT
        this.START_FEN=this.PROPS.START_FEN
        this.rep=new Array(this.BOARD_SIZE)
        this.reset()
    }

    test:boolean=false
    setTest(test:boolean):Board{
        this.test=test
        return this
    }

    frOk(f:number,r:number){
        if((f<0)||(f>=this.BOARD_WIDTH)) return false
        if((r<0)||(r>=this.BOARD_HEIGHT)) return false
        return true
    }

    setFR(f:number,r:number,p:Piece=new Piece()){
        if(this.frOk(f,r)) this.rep[r*8+f]=p
    }

    setSq(sq:Square,p:Piece=new Piece()){this.setFR(sq.f,sq.r,p)}

    getFR(f:number,r:number):Piece{
        if(!this.frOk(f,r)) return new Piece()
        return this.rep[r*8+f]
    }

    setFromFenChecked(fen:string=this.START_FEN,clearHist:boolean=true):boolean{
        let b=new Board(this.variant)
        let parts=fen.split(" ")
        if(parts.length!=6) return false
        let rawfen=parts[0]
        let ranks=rawfen.split("/")
        if(ranks.length!=8) return false
        for(let r=0;r<8;r++){
            let pieces=ranks[r].split("")            
            let f=0
            for(let p of pieces){
                if((p>="1")&&(p<="8")){
                    for(let pc=0;pc<parseInt(p);pc++){
                        b.setFR(f++,r)
                    }
                }else{
                    let kind=p.toLowerCase()
                    if(!IS_PIECE[kind]) return false
                    b.setFR(f++,r,new Piece(kind,p!=kind?WHITE:BLACK))
                }
            }
            if(f!=this.BOARD_WIDTH) return false
        }

        let turnfen=parts[1]
        let turn=MOVE_LETTER_TO_TURN[turnfen]

        if(turn==undefined) return false

        let castlefen=parts[2]

        b.rights=[false,false,false,false]

        if(castlefen!="-") for(let i=0;i<4;i++){
            if("KQkq".indexOf(castlefen.charAt(i))<0) return false
            if(castlefen.indexOf(CASTLING_RIGHTS[i].fenLetter)>=0){
                b.rights[i]=true
            }
        }

        let epfen=parts[3]
        if(epfen=="-"){
            b.epSquare=INVALID_SQUARE
        }else{
            let sq=this.squareFromAlgeb(epfen)            
            if(sq.invalid()) return false
            b.epSquare=sq
        }

        b.turn=turn

        let halfmoveFen=parts[4]
        let hmc=parseInt(halfmoveFen)
        if(isNaN(hmc)) return false
        if(hmc<0) return false

        b.halfmoveClock=hmc

        let fullmoveFen=parts[5]
        let fmn=parseInt(fullmoveFen)
        if(isNaN(fmn)) return false
        if(fmn<1) return false

        b.fullmoveNumber=fmn
        
        this.rep=b.rep
        this.turn=b.turn
        this.rights=b.rights
        this.epSquare=b.epSquare
        this.fullmoveNumber=b.fullmoveNumber
        this.halfmoveClock=b.halfmoveClock

        if(clearHist) this.hist=[this.toGameNode()]
        this.posChanged()
        return true
    }

    setFromFen(fen:string=this.START_FEN,clearHist:boolean=true):Board{
        this.setFromFenChecked(fen,clearHist)
        return this
    }

    pawnDir(color:number):Square{
        return color==WHITE?new Square(0,-1):new Square(0,1)
    }

    sqOk(sq:Square){return this.frOk(sq.f,sq.r)}

    getSq(sq:Square):Piece{
        if(!this.sqOk) return new Piece()
        return this.getFR(sq.f,sq.r)
    }

    isSqEmpty(sq:Square){
        if(!this.sqOk(sq)) return false
        return this.getSq(sq).empty()
    }

    isSqOpp(sq:Square,color:number){
        if(!this.sqOk(sq)) return false
        let col=this.getSq(sq).color
        if(col==NO_COL) return false
        return col!=color
    }

    isSqSame(sq:Square,color:number){
        if(!this.sqOk(sq)) return false
        let col=this.getSq(sq).color
        if(col==NO_COL) return false
        return col==color
    }

    pawnFromStart(sq:Square,color:number){
        return color==WHITE?this.BOARD_HEIGHT-1-sq.r:sq.r
    }

    pawnFromProm(sq:Square,color:number){
        return this.BOARD_HEIGHT-1-this.pawnFromStart(sq,color)
    }

    plms:Move[]=[]
    lms:Move[]=[]

    posChanged(){              
        if(!this.test){            
            this.genLegalMoves()            
        }
        if(this.posChangedCallback!=undefined){
            this.posChangedCallback()
        }
    }

    debug:boolean=false

    gameStatus:GameStatus=new GameStatus()

    newGame(){

        this.gameStatus.score="*"
        this.gameStatus.scoreReason=""

        this.gameStatus.isStaleMate=false
        this.gameStatus.isMate=false
        this.gameStatus.isFiftyMoveRule=false

        this.gameStatus.isThreeFoldRepetition=false
        this.gameStatus.isResigned=false
        this.gameStatus.isDrawAgreed=false
        this.gameStatus.isFlagged=false

        this.setFromFen()

    }

    obtainStatus(){

        this.gameStatus.isStaleMate=false
        this.gameStatus.isMate=false        

        if(this.gameStatus.isResigned||this.gameStatus.isFlagged){
            let reason=this.gameStatus.isResigned?"resigned":"flagged"
            if(this.turn==WHITE){
                this.gameStatus.score="0-1"
                this.gameStatus.scoreReason="white "+reason
            }else{
                this.gameStatus.score="1-0"
                this.gameStatus.scoreReason="black "+reason
            }
        }else if(this.gameStatus.isDrawAgreed){
            this.gameStatus.score="1/2-1/2"
            this.gameStatus.scoreReason="draw agreed"
        }
        else if(this.lms.length<=0){            
            if(this.isInCheck(this.turn)){
                this.gameStatus.isMate=true      
                if(this.turn==WHITE)          {
                    this.gameStatus.score="0-1"
                    this.gameStatus.scoreReason="white mated"
                }else{
                    this.gameStatus.score="1-0"
                    this.gameStatus.scoreReason="black mated"
                }                
            }else{
                this.gameStatus.isStaleMate=true
                this.gameStatus.score="1/2-1/2"
                this.gameStatus.scoreReason="stalemate"
            }
        }else if(this.isDrawByThreefoldRepetition()){
            this.gameStatus.isThreeFoldRepetition=true
            this.gameStatus.score="1/2-1/2"
            this.gameStatus.scoreReason="threefold repetition"
        }else if(this.halfmoveClock>=(FIFTYMOVE_RULE*2)){
            this.gameStatus.isFiftyMoveRule=true
            this.gameStatus.score="1/2-1/2"
            this.gameStatus.scoreReason="fifty move rule"
        }

    }

    isDrawByThreefoldRepetition(){
        let tfens:any={}
        for(let gn of this.hist){
            let tfen=gn.tfen
            if(tfens[tfen]==undefined){
                tfens[tfen]=1
            }else{
                let cnt=tfens[tfen]
                cnt++
                tfens[tfen]=cnt
                if(cnt>=THREEFOLD_REPETITION){
                    return true
                }
            }
        }        
        return false
    }

    isTerminated():boolean{
        return this.gameStatus.isStaleMate||
            this.gameStatus.isMate||
            this.gameStatus.isFiftyMoveRule||
            this.gameStatus.isThreeFoldRepetition||
            this.gameStatus.isResigned||
            this.gameStatus.isDrawAgreed||
            this.gameStatus.isFlagged
    }

    genLegalMoves(){        
        this.genPseudoLegalMoves()
        this.lms=[]                
        for(let m of this.plms){            
            let b=new Board().setTest(true).setFromFen(this.reportFen())            
            b.makeMove(m,false)                        
            if(!b.isInCheck(this.turn)){
                this.lms.push(m)
            }
        }
        for(let i=0;i<4;i++){
            let cr=CASTLING_RIGHTS[i]
            if((cr.color==this.turn)&&(this.rights[i])){
                if((cr.emptySqs.filter(sq=>!this.isSqEmpty(sq))).length<=0){
                    if(!(
                        this.isSquareInCheck(cr.kingFrom,this.turn)||
                        this.isSquareInCheck(cr.kingTo,this.turn)||
                        this.isSquareInCheck(cr.rookTo,this.turn)
                    )){
                        let cm=new Move(cr.kingFrom,cr.kingTo)
                        this.lms.push(cm)
                        let cmpn=new Move(cr.kingFrom,cr.kingTo,new Piece(KNIGHT,this.turn))
                        this.lms.push(cmpn)
                        let cmpq=new Move(cr.kingFrom,cr.kingTo,new Piece(QUEEN,this.turn))
                        this.lms.push(cmpq)
                    }
                }
            }
        }

        // obtain status
        this.obtainStatus()
    }

    genPseudoLegalMoves(){                
        this.plms=[]                
        for(let f=0;f<this.BOARD_WIDTH;f++){
            for(let r=0;r<this.BOARD_HEIGHT;r++){
                let p=this.getFR(f,r)                
                if(p.color==this.turn){                    
                    let pms=this.pseudoLegalMovesForPieceAt(p,new Square(f,r))
                    for(let m of pms){
                        this.plms.push(m)
                    }
                }
            }
        }
        let ams=[]
        for(let m of this.plms){
            let fp=this.getSq(m.fromSq)
            if(IS_PROM_PIECE[fp.kind]){
                if(fp.kind==BISHOP){
                    ams.push(new Move(m.fromSq,m.toSq,new Piece(KNIGHT)))
                }
                if(fp.kind==KNIGHT){
                    ams.push(new Move(m.fromSq,m.toSq,new Piece(BISHOP)))
                    ams.push(new Move(m.fromSq,m.toSq,new Piece(ROOK)))
                }
                if(fp.kind==ROOK){
                    ams.push(new Move(m.fromSq,m.toSq,new Piece(KNIGHT)))
                    ams.push(new Move(m.fromSq,m.toSq,new Piece(QUEEN)))
                }
                if(fp.kind==QUEEN){                    
                    ams.push(new Move(m.fromSq,m.toSq,new Piece(ROOK)))
                }
            }
        }
        for(let m of ams){
            this.plms.push(m)
        }
    }

    squareToAlgeb(sq:Square):string{
        return `${String.fromCharCode(sq.f+"a".charCodeAt(0))}${this.BOARD_HEIGHT-sq.r}`
    }

    moveToAlgeb(m:Move):string{
        let raw=`${this.squareToAlgeb(m.fromSq)}${this.squareToAlgeb(m.toSq)}`
        return `${raw}${m.promPiece.empty()?"":m.promPiece.kind}`
    }

    pseudoLegalMovesForPieceAt(p:Piece,sq:Square):Move[]{
        let moves:Move[]=[]
        if(p.kind==PAWN){
            let pdir=this.pawnDir(p.color)
            let pushOne=sq.p(pdir)
            let promdist=this.pawnFromProm(sq,p.color)
            let isprom=promdist==1
            let targetKinds=["p"]
            if(isprom) targetKinds=ALL_PROMOTION_PIECES
            function createPawnMoves(targetSq:Square){
                for(let targetKind of targetKinds){
                    let m=new Move(sq,targetSq)
                    if(isprom) m.promPiece=new Piece(targetKind)
                    moves.push(m)
                }
            }
            if(this.isSqEmpty(pushOne)){
                createPawnMoves(pushOne)
                let pushTwo=pushOne.p(pdir)
                if(this.isSqEmpty(pushTwo)&&(this.pawnFromStart(sq,p.color)==1)){
                    let m=new Move(sq,pushTwo)
                    moves.push(m)                    
                }
            }
            for(let df=-1;df<=1;df+=2){
                let csq=sq.p(pdir).p(new Square(df,0))
                if(this.isSqOpp(csq,p.color)){                    
                    createPawnMoves(csq)
                }else if(csq.e(this.epSquare)){
                    let m=new Move(sq,csq)
                    moves.push(m)                    
                }
            }
        }else{
            for(let df=-2;df<=2;df++){
                for(let dr=-2;dr<=2;dr++){
                    let multAbs=Math.abs(df*dr)
                    let sumAbs=Math.abs(df)+Math.abs(dr)
                    let ok=true
                    let f=sq.f
                    let r=sq.r
                    do{
                        let knightOk=(multAbs==2)
                        let bishopOk=(multAbs==1)
                        let rookOk=((multAbs==0)&&(sumAbs==1))
                        let pieceOk=
                            (knightOk&&(p.kind==KNIGHT))||
                            (bishopOk&&(p.kind==BISHOP))||
                            (rookOk&&(p.kind==ROOK))||
                            ((rookOk||bishopOk)&&((p.kind==QUEEN)||(p.kind==KING)))
                        if(pieceOk){
                            f+=df
                            r+=dr
                            if(this.frOk(f,r)){
                                let tp=this.getFR(f,r)
                                if(tp.color==p.color){
                                    ok=false
                                }else{
                                    let m=new Move(sq,new Square(f,r))
                                    moves.push(m)
                                    if(!tp.empty()) ok=false
                                    if((p.kind==KING)||(p.kind==KNIGHT)) ok=false
                                }
                            }else{
                                ok=false
                            }
                        }else{
                            ok=false
                        }
                    }while(ok)
                }
            }        
        }
        return moves
    }

    legalAlgebMoves(){
        return this.lms.map(m=>this.moveToAlgeb(m))
    }

    isMoveLegal(m:Move){
        let flms=this.lms.filter((tm:Move)=>tm.e(m))        
        return flms.length>0
    }

    fullmoveNumber=1
    halfmoveClock=0

    clearCastlingRights(color:number){
        if(color==WHITE){
            this.rights[0]=false
            this.rights[1]=false
        }else{
            this.rights[2]=false
            this.rights[3]=false
        }
    }

    makeMove(m:Move,check:boolean=true):boolean{
        if(check) if(!this.isMoveLegal(m)) return false

        if(this.isTerminated()) return false

        // calculate some useful values
        let algeb=this.moveToAlgeb(m)
        let fSq=m.fromSq
        let tSq=m.toSq
        let deltaR=tSq.r-fSq.r
        let deltaF=tSq.f-fSq.f
        let fp=this.getSq(fSq)
        let tp=this.getSq(tSq)
        let cr=this.getCastlingRight(m)
        let isCastling=(cr!=undefined)
        let normal=tp.empty()                

        // remove from piece
        this.setSq(fSq)

        // ep capture
        if((fp.kind==PAWN)&&(m.toSq.e(this.epSquare))){
            normal=false
            let epCaptSq=this.epSquare.p(new Square(0,-deltaR))
            this.setSq(epCaptSq)
        }

        // set target piece
        if(normal){
            if(m.promPiece.empty()||isCastling){
                this.setSq(tSq,fp)
            }else{
                this.setSq(tSq,new Piece(m.promPiece.kind,fp.color))
            }            
        }else{
            for(let df=-1;df<=1;df++){
                for(let dr=-1;dr<=1;dr++){
                    let testSq=tSq.p(new Square(df,dr))
                    if(this.sqOk(testSq)){
                        let tp=this.getSq(testSq)
                        if(tp.kind!=PAWN) this.setSq(testSq)
                    }
                }
            }
            this.setSq(tSq)
        }        

        // castling
        if(cr!=undefined){            
            this.setSq(cr.rookFrom)
            this.setSq(cr.rookTo,new Piece(ROOK,this.turn))
            if(!m.promPiece.empty()){
                this.setSq(cr.rookTo,new Piece(m.promPiece.kind,this.turn))
            }
        }

        // update castling rights
        if(fp.kind==KING) this.clearCastlingRights(this.turn)

        if(this.isExploded(WHITE)) this.clearCastlingRights(WHITE)
        if(this.isExploded(BLACK)) this.clearCastlingRights(BLACK)

        for(let i=0;i<4;i++){
            let cr=CASTLING_RIGHTS[i]
            if(cr.color==this.turn){
                if(fSq.e(cr.rookFrom)||tSq.e(cr.rookFrom)) this.rights[i]=false
                if(this.isSqEmpty(cr.rookFrom)) this.rights[i]=false
            }
        }        

        // advance turn
        this.turn=INV_COLOR(this.turn)

        // advance fullmove number
        if(this.turn==WHITE) this.fullmoveNumber++

        // advance halfmove clock
        this.halfmoveClock++
        if(fp.kind==PAWN) this.halfmoveClock=0
        if(tp.kind!=EMPTY) this.halfmoveClock=0        

        // set ep square
        this.epSquare=INVALID_SQUARE
        if((fp.kind==PAWN)&&(Math.abs(deltaR)==2)){
            let epsq=new Square(m.fromSq.f,m.fromSq.r+(deltaR/2))
            this.epSquare=epsq
        }

        // update history        
        this.hist.push(this.toGameNode(algeb))

        // position changed callback
        this.posChanged()
        return true
    }

    epSquare:Square=INVALID_SQUARE

    getCurrentGameNode():GameNode{
        return this.hist[this.hist.length-1]
    }

    del(){        
        if(this.hist.length>1){

            this.hist.pop()            

            this.fromGameNode(this.getCurrentGameNode())

        }
    }

    reportTruncFen():string{
        let fen=this.reportFen()
        let parts=fen.split(" ")
        let tfen=parts.slice(0,4).join(" ")
        return tfen
    }

    reportFen():string{
        let fen=""
        for(let r=0;r<this.BOARD_HEIGHT;r++){
            let acc=0
            for(let f=0;f<this.BOARD_WIDTH;f++){                
                let p=this.getFR(f,r)
                if(p.empty()){
                    acc++
                }else{
                    if(acc){
                        fen+=acc
                        acc=0
                    }                    
                    fen+=p.color==WHITE?p.kind.toUpperCase():p.kind                    
                }
            }
            if(acc){
                fen+=acc
                acc=0
            }                    
            if(r<(this.BOARD_HEIGHT-1)) fen+="/"
        }

        let crs=""
        for(let i=0;i<4;i++){
            if(this.rights[i]) crs+=CASTLING_RIGHTS[i].fenLetter
        }

        if(crs=="") crs="-"

        return `${fen} ${(this.turn==WHITE?"w":"b")} ${crs} ${this.epSquare.invalid()?"-":this.squareToAlgeb(this.epSquare)} ${this.halfmoveClock} ${this.fullmoveNumber}`
    }

    squareFromAlgeb(algeb:string):Square{
        if(algeb.length!=2) return INVALID_SQUARE
        let fc=algeb.charAt(0)
        let f=fc.charCodeAt(0)-"a".charCodeAt(0)
        let r=this.BOARD_HEIGHT-parseInt(algeb.charAt(1))
        if(isNaN(r)) return INVALID_SQUARE
        if(this.frOk(f,r)) return new Square(f,r)
        return INVALID_SQUARE
    }

    moveFromAlgeb(algeb:string):Move{
        if(algeb.length<4) return INVALID_MOVE
        if(algeb.length>5) return INVALID_MOVE
        let fromSq=this.squareFromAlgeb(algeb.substring(0,2))
        if(!this.sqOk(fromSq)) return INVALID_MOVE
        let toSq=this.squareFromAlgeb(algeb.substring(2,4))
        if(!this.sqOk(toSq)) return INVALID_MOVE
        let rm=new Move(fromSq,toSq)
        if(algeb.length==4) return rm
        let pk=algeb.charAt(4)
        if(!IS_PROM_PIECE[pk]) return INVALID_MOVE
        rm.promPiece=new Piece(pk,NO_COL)
        return rm
    }

    makeAlgebMove(algeb:string):boolean{
        let m=this.moveFromAlgeb(algeb)
        if(m.invalid()) return false
        return this.makeMove(m)
    }

    posChangedCallback:any

    setPosChangedCallback(posChangedCallback:any):Board{
        this.posChangedCallback=posChangedCallback
        return this
    }

    isAlgebMoveLegal(algeb:string){
        return this.isMoveLegal(this.moveFromAlgeb(algeb))
    }

    isSquareAttackedByPiece(sq:Square,p:Piece):boolean{                
        let tp=p.inv()        
        if(p.kind==PAWN){
            let pdir=this.pawnDir(tp.color)
            for(let df=-1;df<=1;df+=2){
                let tsq=sq.p(new Square(df,pdir.r))                
                if(this.sqOk(tsq)){
                    let ap=this.getSq(tsq)
                    if(ap.e(p)) return true
                }
            }
        }else{
            let plms=this.pseudoLegalMovesForPieceAt(tp,sq)
            for(let m of plms){
                let ap=this.getSq(m.toSq)                      
                if(ap.e(p)) return true
            }
        }
        return false
    }

    isSquareAttackedByColor(sq:Square,color:number):boolean{
        for(let kind of ALL_CHECK_PIECES){
            if(this.isSquareAttackedByPiece(sq,new Piece(kind,color))) return true
        }
        return false
    }

    isSquareInCheck(sq:Square,color:number){        
        return this.isSquareAttackedByColor(sq,INV_COLOR(color))
    }

    whereIsKing(color:number):Square{
        for(let f=0;f<this.BOARD_WIDTH;f++){
            for(let r=0;r<this.BOARD_HEIGHT;r++){
                let p=this.getFR(f,r)
                if((p.kind==KING)&&(p.color==color)){
                    return new Square(f,r)
                }
            }
        }
        return INVALID_SQUARE
    }

    kingsAdjacent():boolean{
        let ww=this.whereIsKing(WHITE)
        let wb=this.whereIsKing(BLACK)
        if(ww.invalid()) return false
        if(wb.invalid()) return false
        return this.isSquareAttackedByPiece(ww,new Piece(KING,BLACK))
    }

    isExploded(color:number){
        let wk=this.whereIsKing(color)
        if(wk.invalid()) return true
        return false
    }

    isInCheck(color:number=this.turn){
        // adjacent kings - no check
        if(this.kingsAdjacent()) return false
        // I'm exploded - always bad
        if(this.isExploded(color)) return true
        // I'm not exploded, opponent exploded - no check there
        if(this.isExploded(INV_COLOR(color))) return false
        // none of the above, fall back to regular check
        return this.isSquareInCheck(this.whereIsKing(color),color)
    }

    getCastlingRight(m:Move){
        let fp=this.getSq(m.fromSq)
        if(fp.kind!=KING) return undefined
        let deltaF=m.toSq.f-m.fromSq.f
        if(Math.abs(deltaF)<2) return undefined        
        let index=CASTLING_RIGHTS.findIndex(cr=>cr.kingFrom.e(m.fromSq))
        if(index<0) return undefined // this should not happen
        return CASTLING_RIGHTS[index]
    }

    isMoveCapture(m:Move){
        if(!this.getSq(m.toSq).empty()) return true
        return false
    }

    toGameNode(genAlgeb:string=""):any{
        let fen=this.reportFen()        
        let tfen=this.reportTruncFen()

        let gn=new GameNode()

        gn.fen=fen
        gn.tfen=tfen
        gn.genAlgeb=genAlgeb
        gn.status=new GameStatus().fromJson(this.gameStatus.toJson())        

        return gn
    }

    genAlgeb:string=""

    fromGameNode(gn:GameNode,clearHist:boolean=false):Board{        
        let fen=gn.fen        

        this.gameStatus=gn.status

        this.genAlgeb=gn.genAlgeb
        
        // set from fen has to be called last so that the callback has correct status
        this.setFromFen(fen,clearHist)                

        return this
    }
}
