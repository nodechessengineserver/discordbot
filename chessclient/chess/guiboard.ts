let PIECE_TO_STYLE:{[id:string]:string}={"p":"pawn","n":"knight","b":"bishop","r":"rook","q":"queen","k":"king"}
let COLOR_TO_STYLE:{[id:number]:string}={0:"black",1:"white"}

class GuiBoard extends DomElement<GuiBoard>{
    b:Board

    MARGIN=5
    SQUARE_SIZE=50
    PIECE_MARGIN=4
    PIECE_SIZE=this.SQUARE_SIZE-2*this.PIECE_MARGIN

    boardSquareDiv:Div
    boardArrowDiv:Div
    boardPieceDiv:Div

    dragstart:Vect
	dragstartst:Vect
    dragd:Vect

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

    createPDiv(p:Piece,f:number,r:number):Div{
        let pDiv=new Div().pa().r(f*this.SQUARE_SIZE+this.PIECE_MARGIN,r*this.SQUARE_SIZE+this.PIECE_MARGIN,this.PIECE_SIZE,this.PIECE_SIZE)
              
        if(!p.empty()){
            let cn=PIECE_TO_STYLE[p.kind]+" "+COLOR_TO_STYLE[p.color]
            pDiv.ac(cn)
        }

        return pDiv
    }

    drawBoardArrow(algeb:string){
        let m=this.b.moveFromAlgeb(algeb)
        let fSqR=this.rotateSquare(m.fromSq,this.flip)
        let tSqR=this.rotateSquare(m.toSq,this.flip)
        let fSqV=new Vect(fSqR.f*this.SQUARE_SIZE,fSqR.r*this.SQUARE_SIZE).p(this.HALF_SQUARE_SIZE_VECT())
        let tSqV=new Vect(tSqR.f*this.SQUARE_SIZE,tSqR.r*this.SQUARE_SIZE).p(this.HALF_SQUARE_SIZE_VECT())
        let arrow=new Arrow(fSqV,tSqV,{
            constantwidth:8
        })
        let aDiv=new Div().pa().op(0.75).o(arrow.svgorig.x,arrow.svgorig.y).
            h(arrow.svg)
        this.boardArrowDiv.x.a([aDiv])        
    }

    build():GuiBoard{
        let term=this.b.isTerminated()

        this.x.pr().z(this.totalBoardWidth(),this.totalBoardHeight()).
            burl("assets/images/backgrounds/wood.jpg")

        this.boardSquareDiv=new Div().pa().r(this.MARGIN,this.MARGIN,this.boardWidth(),this.boardHeight()).
            burl("assets/images/backgrounds/wood.jpg")

        this.boardArrowDiv=new Div().pa().r(this.MARGIN,this.MARGIN,this.boardWidth(),this.boardHeight())

        this.boardPieceDiv=new Div().pa().r(this.MARGIN,this.MARGIN,this.boardWidth(),this.boardHeight())

        this.pDivs=[]

        for(let nr=0;nr<this.b.BOARD_WIDTH;nr++){
            for(let nf=0;nf<this.b.BOARD_HEIGHT;nf++){                
                let sq=new Square(nf,nr)
                let rotSq=this.rotateSquare(sq,this.flip)
                let f=rotSq.f
                let r=rotSq.r

                let sqDiv=new Div().pa().r(f*this.SQUARE_SIZE,r*this.SQUARE_SIZE,this.SQUARE_SIZE,this.SQUARE_SIZE)

                sqDiv.e.style.opacity="0.1"
                sqDiv.e.style.backgroundColor=((r+f)%2)==0?"#fff":"#777"

                let p=this.b.getFR(nf,nr)
                
                let pDiv=this.createPDiv(p,f,r)

                pDiv.e.setAttribute("draggable","true")                

                // don't allow drag in prom mode, or if game has terminated
                if((!this.promMode)&&(!term)) pDiv.addEventListener("dragstart",this.piecedragstart.bind(this,sq,pDiv))

                let dopush=true

                if(this.promMode){
                    if(sq.e(this.promMove.fromSq)) dopush=false
                    if(this.promCr!=undefined) dopush=dopush&&(!sq.e(this.promCr.rookFrom))
                }
                
                this.boardSquareDiv.a([sqDiv])

                if(dopush) this.boardPieceDiv.a([pDiv])

                if(this.promMode){
                    if(this.promCr!=undefined){
                        let kingToSqFlipped=this.rotateSquare(this.promCr.kingTo,this.flip)
                        let kDiv=this.createPDiv(new Piece(KING,this.b.turn),kingToSqFlipped.f,kingToSqFlipped.r)
                        this.boardPieceDiv.a([kDiv])
                    }
                    let promToSq=this.promMove.toSq
                    if(this.promCr!=undefined){
                        promToSq=this.promCr.rookTo
                    }
                    let promToSqFlipped=this.rotateSquare(promToSq,this.flip)
                    let f=promToSqFlipped.f
                    let r=promToSqFlipped.r
                    let dir=r<4?1:-1                    
                    let i
                    for(i=0;i<this.proms.length;i++){
                        let promSqDiv=new Div().pa().r(
                            f*this.SQUARE_SIZE,(r+i*dir)*this.SQUARE_SIZE,
                            this.SQUARE_SIZE,this.SQUARE_SIZE
                        ).bcol("#ff7").zIndexNumber(200)
                        let pkind=this.proms[i]                        
                        let cn=PIECE_TO_STYLE[pkind]+" "+COLOR_TO_STYLE[this.b.turn]
                        let promPDiv=new Div().pa().r(
                            f*this.SQUARE_SIZE+this.PIECE_MARGIN,(r+i*dir)*this.SQUARE_SIZE+this.PIECE_MARGIN,
                            this.PIECE_SIZE,this.PIECE_SIZE
                        ).cp().ac(cn).addEventListener("mousedown",this.promDivClicked.bind(this,pkind)).zIndexNumber(200)
                        
                        this.boardPieceDiv.a([promSqDiv])
                        this.boardPieceDiv.a([promPDiv])
                    }
                    let cancelDiv=new Div().pa().cp().r(
                        f*this.SQUARE_SIZE,(r+i*dir)*this.SQUARE_SIZE,
                        this.SQUARE_SIZE,this.SQUARE_SIZE
                    ).bcol("#f77").zIndexNumber(200).ta("center").
                    addEventListener("mousedown",this.cancelDivClicked.bind(this)).a([
                        new Div().mt(this.SQUARE_SIZE/3).h("Cancel").cp()
                    ])

                    this.boardPieceDiv.a([cancelDiv])
                }
            }
        }

        this.a([
            this.boardSquareDiv,
            this.boardArrowDiv,
            this.boardPieceDiv
        ])

        this.boardPieceDiv.addEventListener("mousemove",this.boardmousemove.bind(this))
        this.boardPieceDiv.addEventListener("mouseup",this.boardmouseup.bind(this))

        let genAlgeb=this.b.genAlgeb
        let genMove=this.b.moveFromAlgeb(genAlgeb)

        if(!genMove.invalid()){
            this.drawBoardArrow(genAlgeb)
        }

        return this
    }

    promMode:boolean=false
    proms:string[]=[]
    promMove:Move
    promOrig:string
    promCr:CastlingRight

    resetPromMode(){
        this.promMode=false
        this.proms=[]
        delete this.promMove
        delete this.promOrig
        delete this.promCr
    }

    cancelDivClicked(){
        this.resetPromMode()
        this.build()
    }

    promDivClicked(kind:string,e:Event){
        let m=this.promMove
        if(kind!=this.promOrig) m.promPiece=new Piece(kind)

        this.resetPromMode()

        if(this.dragMoveCallback==undefined){
            this.b.makeMove(m)
        }else{
            this.dragMoveCallback(this.b.moveToAlgeb(m))
        }
    }

    draggedSq:Square
    draggedPDiv:Div
    dragunderway:boolean

    piecedragstart(sq:Square,pDiv:Div,e:Event){        
        let me=<MouseEvent>e
        me.preventDefault()
        this.draggedSq=sq
        this.dragstart=new Vect(me.clientX,me.clientY)            
        
        this.draggedPDiv=pDiv
        this.dragstartst=new Vect(pDiv.getLeftPx(),pDiv.getTopPx())               
        this.dragunderway=true

        for(let pd of this.pDivs){
            pd.zIndexNumber(0)
        }
        pDiv.zIndexNumber(100)
    }
    boardmousemove(e:Event){
        let me=<MouseEvent>e          
        if(this.dragunderway){            
            let client=new Vect(me.clientX,me.clientY)
            this.dragd=client.m(this.dragstart)            
            let nsv=this.dragstartst.p(this.dragd)            
            this.draggedPDiv.
                leftPx(nsv.x).
                topPx(nsv.y)
        }
    }
    
    HALF_SQUARE_SIZE_VECT(){
        return new Vect(this.SQUARE_SIZE/2,this.SQUARE_SIZE/2)
    }
    SQUARE_SIZE_PX(){
        return this.SQUARE_SIZE/SCALE_FACTOR()
    }
    screenvectortosquare(sv:Vect):Square{
        let f = Math.floor( sv.x / this.SQUARE_SIZE_PX() )
        let r = Math.floor( sv.y / this.SQUARE_SIZE_PX() )
        return new Square(f,r)
    }    
    squaretoscreenvector(sq:Square):Vect{
        let x = sq.f * this.SQUARE_SIZE_PX()
        let y = sq.r * this.SQUARE_SIZE_PX()
        return new Vect(x,y)
    }
    flip:number=0
    rotateSquare(sq:Square,flip:number):Square{
        if(flip==0) return new Square(sq.f,sq.r)
        return new Square(this.b.BOARD_WIDTH-1-sq.f,this.b.BOARD_HEIGHT-1-sq.r)
    }
    doFlip(){
        this.setFlip(1-this.flip)
        this.build()
    }
    boardmouseup(e:Event){        
        let me=<MouseEvent>e
        if(this.dragunderway){
            this.dragunderway=false
            let dragdcorr=this.dragd.p(this.HALF_SQUARE_SIZE_VECT())
            let dragdnom=dragdcorr
            let dsq=this.screenvectortosquare(dragdnom)
            let dsv=this.squaretoscreenvector(dsq)
            let nsv=this.dragstartst.p(dsv)
            this.draggedPDiv.
                leftPx(nsv.x).
                topPx(nsv.y)            
            let fromsqorig=this.rotateSquare(this.draggedSq,this.flip)
            let tosq=this.rotateSquare(fromsqorig.p(dsq),-this.flip)            
            let m=new Move(this.draggedSq,tosq)     
            let algeb=this.b.moveToAlgeb(m)            
            if(this.dragMoveCallback!=undefined){
                let cr=this.b.getCastlingRight(m)
                if(this.b.isMoveCapture(m)){
                    this.dragMoveCallback(algeb)
                }
                else if(cr!=undefined){                    
                    this.promCr=cr
                    this.promMode=true
                    this.proms=["n","r","q"]
                    this.promOrig="r"
                    this.promMove=m
                    this.build()
                }else{
                    let legalAlgebs=this.b.legalAlgebMoves().filter(talgeb=>talgeb.substring(0,4)==algeb)                
                    let p=this.b.getSq(this.draggedSq)
                    this.proms=legalAlgebs.map(lalgeb=>(lalgeb+p.kind).substring(4,5))
                    if(this.proms.length>1){
                        this.promMode=true
                        this.promOrig=p.kind
                        this.promMove=m
                        this.build()
                    }else{
                        this.dragMoveCallback(algeb)
                    }     
                }           
            }else{
                this.b.makeAlgebMove(algeb)
            }
        }
    }

    dragMoveCallback:any
    setDragMoveCallback(dragMoveCallback:any):GuiBoard{this.dragMoveCallback=dragMoveCallback;return this}

    flipCallback:any    
    setFlipCallback(flipCallback:any):GuiBoard{this.flipCallback=flipCallback;return this}

    setFlip(flip:number):GuiBoard{
        this.flip=flip
        if(this.flipCallback!=undefined) this.flipCallback()
        return this
    }
}

