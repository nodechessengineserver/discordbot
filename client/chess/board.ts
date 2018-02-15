let WHITE=1
let BLACK=0

let EMPTY="-"
let PAWN="p"
let KNIGHT="n"
let BISHOP="b"
let ROOK="r"
let QUEEN="q"
let KING="k"

let IS_PIECE:{[id:string]:boolean}={"p":true,"n":true,"b":true,"r":true,"q":true,"k":true}

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
    
    constructor(kind:string=EMPTY,color:number=BLACK){
        this.kind=kind
        this.color=color
    }

    empty():boolean{return this.kind==EMPTY}
}

class Board{
    variant:string

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

    frOk(f:number,r:number){
        if((f<0)||(f>=this.BOARD_WIDTH)) return false
        if((r<0)||(r>=this.BOARD_HEIGHT)) return false
        return true
    }

    setFR(f:number,r:number,p:Piece=new Piece()){
        if(this.frOk(f,r)) this.rep[r*8+f]=p
    }

    getFR(f:number,r:number):Piece{
        if(!this.frOk(f,r)) return new Piece()
        return this.rep[r*8+f]
    }

    setFromFenChecked(fen:string=this.START_FEN):boolean{
        let b=new Board(this.variant)
        let parts=fen.split(" ")
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
        this.rep=b.rep
        return true
    }

    setFromFen(fen:string=this.START_FEN):Board{
        this.setFromFenChecked(fen)
        return this
    }
}