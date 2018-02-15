let PIECE_TO_STYLE:{[id:string]:string}={"p":"pawn","n":"knight","b":"bishop","r":"rook","q":"queen","k":"king"}
let COLOR_TO_STYLE:{[id:number]:string}={0:"black",1:"white"}

class GuiBoard extends DomElement<GuiBoard>{
    b:Board

    MARGIN=5
    SQUARE_SIZE=50
    PIECE_MARGIN=4
    PIECE_SIZE=this.SQUARE_SIZE-2*this.PIECE_MARGIN

    bDiv:Div

    boardWidth(){return this.b.BOARD_WIDTH*this.SQUARE_SIZE}
    boardHeight(){return this.b.BOARD_HEIGHT*this.SQUARE_SIZE}
    totalBoardWidth(){return this.boardWidth()+2*this.MARGIN}
    totalBoardHeight(){return this.boardHeight()+2*this.MARGIN}

    posChangedCallback:any

    setPosChangedCallback(posChangedCallback:any):GuiBoard{
        this.posChangedCallback=posChangedCallback
        return this
    }

    posChanged(){        
        this.build()
        if(this.posChangedCallback!=undefined){            
            this.posChangedCallback()
        }
    }

    constructor(){
        super("div")
        this.b=new Board().setFromFen().setPosChangedCallback(this.posChanged.bind(this))        
    }

    setVariant(variant:string=DEFAULT_VARIANT):GuiBoard{
        this.b=new Board(variant).setFromFen()
        return this.build()
    }

    pDivs:Div[]=[]

    build():GuiBoard{
        this.x.pr().z(this.totalBoardWidth(),this.totalBoardHeight()).
            burl("assets/images/backgrounds/wood.jpg")

        this.bDiv=new Div().pa().r(this.MARGIN,this.MARGIN,this.boardWidth(),this.boardHeight()).
            burl("assets/images/backgrounds/wood.jpg")

        this.pDivs=[]

        for(let r=0;r<this.b.BOARD_WIDTH;r++){
            for(let f=0;f<this.b.BOARD_HEIGHT;f++){
                let sqDiv=new Div().pa().r(f*this.SQUARE_SIZE,r*this.SQUARE_SIZE,this.SQUARE_SIZE,this.SQUARE_SIZE)

                sqDiv.e.style.opacity="0.1"
                sqDiv.e.style.backgroundColor=((r+f)%2)==0?"#fff":"#777"

                let p=this.b.getFR(f,r)
                let pDiv=new Div().pa().r(f*this.SQUARE_SIZE+this.PIECE_MARGIN,r*this.SQUARE_SIZE+this.PIECE_MARGIN,this.PIECE_SIZE,this.PIECE_SIZE)

                this.pDivs.push(pDiv)
              
                if(!p.empty()){
                    let cn=PIECE_TO_STYLE[p.kind]+" "+COLOR_TO_STYLE[p.color]
                    pDiv.ac(cn)
                }

                pDiv.e.setAttribute("draggable","true")

                this.bDiv.a([sqDiv,pDiv])
            }
        }

        this.a([
            this.bDiv
        ])

        return this
    }
}

