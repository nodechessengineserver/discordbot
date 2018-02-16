let PIECE_TO_STYLE:{[id:string]:string}={"p":"pawn","n":"knight","b":"bishop","r":"rook","q":"queen","k":"king"}
let COLOR_TO_STYLE:{[id:number]:string}={0:"black",1:"white"}

class GuiBoard extends DomElement<GuiBoard>{
    b:Board

    MARGIN=5
    SQUARE_SIZE=50
    PIECE_MARGIN=4
    PIECE_SIZE=this.SQUARE_SIZE-2*this.PIECE_MARGIN

    bDiv:Div

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

    build():GuiBoard{
        this.x.pr().z(this.totalBoardWidth(),this.totalBoardHeight()).
            burl("assets/images/backgrounds/wood.jpg")

        this.bDiv=new Div().pa().r(this.MARGIN,this.MARGIN,this.boardWidth(),this.boardHeight()).
            burl("assets/images/backgrounds/wood.jpg")

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
                let pDiv=new Div().pa().r(f*this.SQUARE_SIZE+this.PIECE_MARGIN,r*this.SQUARE_SIZE+this.PIECE_MARGIN,this.PIECE_SIZE,this.PIECE_SIZE)
              
                if(!p.empty()){
                    let cn=PIECE_TO_STYLE[p.kind]+" "+COLOR_TO_STYLE[p.color]
                    pDiv.ac(cn)
                }

                pDiv.e.setAttribute("draggable","true")

                pDiv.addEventListener("dragstart",this.piecedragstart.bind(this,sq,pDiv))

                this.pDivs.push(pDiv)

                this.bDiv.a([sqDiv,pDiv])
            }
        }

        this.a([
            this.bDiv
        ])

        this.bDiv.addEventListener("mousemove",this.boardmousemove.bind(this))
        this.bDiv.addEventListener("mouseup",this.boardmouseup.bind(this))

        return this
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
        this.flip=1-this.flip        
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
            //console.log(algeb)
            if(this.dragMoveCallback!=undefined){
                this.dragMoveCallback(algeb)
            }else{
                this.b.makeAlgebMove(algeb)
            }
        }
    }
    dragMoveCallback:any
    setDragMoveCallback(dragMoveCallback:any){
        this.dragMoveCallback=dragMoveCallback
    }
}

