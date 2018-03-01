class DraggableWindow extends DomElement<DraggableWindow>{
    left:number=-1
    top:number=-1

    width:number=getCssFloatProperty("--draggablewindowwidth",400)
    height:number=getCssFloatProperty("--draggablewindowheight",200)
    titleBarHeight=getCssFloatProperty("--draggablewindowtitlebarheight",25)
    closeBoxWidth=getCssFloatProperty("--draggablewindowcloseboxwidth",this.titleBarHeight)
    bottomBarHeight=getCssFloatProperty("--draggablewindowbottombarheight",44)    
    resizeBoxHeight=getCssFloatProperty("--draggablewindowresizeboxheight",this.titleBarHeight)
    resizeBoxWidth=getCssFloatProperty("--draggablewindowresizeboxwidth",this.resizeBoxHeight)
    minTop=getCssFloatProperty("--draggablewindowmintop",10)
    maxTop=getCssFloatProperty("--draggablewindowmaxtop",500)
    minLeft=getCssFloatProperty("--draggablewindowminleft",10)
    maxLeft=getCssFloatProperty("--draggablewindowmaxleft",1000)
    minWidth=getCssFloatProperty("--draggablewindowminwidth",200)
    minHeight=getCssFloatProperty("--draggablewindowminheight",100)
    dragPadding=getCssFloatProperty("--draggablewindowdragpadding",50)
    containerPadding=getCssFloatProperty("--draggablewindowcontainerpadding",5)
    resizeBoxPadding=(this.bottomBarHeight-this.resizeBoxHeight)/2
    buttonBarHeight=getCssFloatProperty("--draggablewindowbuttonbarheight",36)
    buttonBarPadding=(this.bottomBarHeight-this.buttonBarHeight)/2
    buttonBarButtonHeight=getCssFloatProperty("--draggablewindowbuttonbarbuttonheight",28)
    buttonBarButtonPadding=(this.buttonBarHeight-this.buttonBarButtonHeight)/2
    contentPadding=getCssFloatProperty("--draggablewindowcontentpadding",3)
    contentHPadding=getCssFloatProperty("--draggablewindowcontenthpadding",25)
    contentHeight():number{
        return this.height-2*this.contentPadding-this.titleBarHeight-this.bottomBarHeight
    }

    title="Window"
    info:string
    canClose=true
    canResize=true

    layer:Div
    titleBar:Div
    bottomBar:Div
    buttonBar:Div
    resizeBox:Div
    titleLabel:Div
    dragBar:Div
    resizeBar:Div    
    closeBox:Div
    contentTable:Table
    infotd:Td
    contenttd:Td
    content:DomElement<any>
    
    dragstart:Vect
    dragd:Vect
    dragdunsc:Vect
    dragunderway:boolean=false

    okcallback:any
    cancelcallback:any

    buttons:Button[]=[]

    setCanClose(canClose:boolean):DraggableWindow{
        this.canClose=canClose
        return this
    }

    setCanResize(canResize:boolean):DraggableWindow{
        this.canResize=canResize
        return this
    }

    setInfo(info:string):DraggableWindow{
        this.info=info
        return this
    }

    setContent(content:DomElement<any>):DraggableWindow{
        this.content=content
        return this
    }

    setOkCallback(okcallback:any):DraggableWindow{
        this.okcallback=okcallback
        return this
    }

    setCancelCallback(cancelcallback:any):DraggableWindow{
        this.cancelcallback=cancelcallback
        return this
    }

    constructor(id:string|null=null){
        super("div")        
        this.id=id        
        this.fromStored
        this.
            pa()            
        Layers.pushCover()
        this.layer=Layers.pushContent()
        this.layer.a([this])        
        this.buttons=[
            new Button("Ok").ok.onClick(this.okClicked.bind(this)),
            new Button("Cancel").cancel.onClick(this.cancelClicked.bind(this))
        ]
    }    

    okClicked(e:Event){        
        this.close()
        if(this.okcallback!=undefined) this.okcallback()
    }

    cancelClicked(e:Event){
        this.close()
        if(this.cancelcallback!=undefined) this.cancelcallback
    }
    
    setTitle(title:string):DraggableWindow{
        this.title=title
        return this
    }
    middleLeft():number{
        return (window.innerWidth/SCALE_FACTOR()-this.width)/2
    }
    middleTop():number{
        return (window.innerHeight/SCALE_FACTOR()-this.height)/2
    }
    build():DraggableWindow{
        if(this.left<this.minLeft) this.left=this.middleLeft()
        if(this.left>this.maxLeft) this.left=this.middleLeft()
        if(this.top<this.minTop) this.top=this.middleTop()
        if(this.top>this.maxTop) this.top=this.middleTop()
        if(this.width<this.minWidth) this.width=this.minWidth
        if(this.height<this.minHeight) this.height=this.minHeight
        this.layer.r(this.left-this.containerPadding,this.top-this.containerPadding,this.width+2*this.containerPadding,this.height+2*this.containerPadding)
        this.x.r(0,0,this.width+2*this.containerPadding,this.height+2*this.containerPadding).
            burl("assets/images/backgrounds/wood.jpg").
            c("draggablewindow")
        this.titleBar=new Div().pa().
            sa("draggable","true").
            r(0,0,this.width,this.titleBarHeight).
            c("titlebar").
            ae("dragstart",this.windowdragstart.bind(this)).            
            a([
                this.titleLabel=new Div().pa().o(6,3).fs(FONT_SIZE*1.2).h(this.title),
                this.dragBar=new Div().pa().r(0,0,0,0).c("dragbar").
                ae("mousemove",this.windowmousemove.bind(this)).
                ae("mouseout",this.windowmouseout.bind(this)).
                ae("mouseup",this.windowmouseup.bind(this))
            ])        
        this.closeBox=new Div().pa().
            r(this.width-this.closeBoxWidth,0,this.closeBoxWidth,this.titleBarHeight).
            c("closebox").
            ae("mousedown",this.closemousedown.bind(this))
        this.bottomBar=new Div().pa().            
            r(0,this.height-this.bottomBarHeight,this.width,this.bottomBarHeight).
            c("bottombar")
        this.buttonBar=new Div().pa().
            r(2*this.resizeBoxPadding+this.resizeBoxWidth,this.height-this.bottomBarHeight+this.buttonBarPadding,
                this.width-4*this.resizeBoxPadding-2*this.resizeBoxWidth-2*this.buttonBarButtonPadding,this.buttonBarHeight-2*this.buttonBarButtonPadding).
            p(this.buttonBarButtonPadding).
            c("buttonbar").a(this.buttons.map(button=>button.
                he(this.buttonBarButtonHeight).
                ac("windowbutton")
            )).
            burl("assets/images/backgrounds/wood.jpg")
        this.resizeBox=new Div().pa().
            sa("draggable","true").
            r(this.width-this.resizeBoxWidth-this.resizeBoxPadding,this.height-this.bottomBarHeight+this.resizeBoxPadding,this.resizeBoxWidth,this.resizeBoxHeight).
            ae("dragstart",this.resizedragstart.bind(this)).            
            c("resizebox").a([
                this.resizeBar=new Div().pa().r(0,0,0,0).c("resizebar").
                ae("mousemove",this.resizemousemove.bind(this)).
                ae("mouseout",this.resizemouseout.bind(this)).
                ae("mouseup",this.resizemouseup.bind(this))
            ])
        this.contentTable=<Table>new Table().bs().pa().c("windowcontenttable").
            r(0,this.titleBarHeight+this.contentPadding,this.width,this.contentHeight())
        if(this.info!=undefined) this.contentTable.a([
            new Tr().a([
                this.infotd=<Td>new Td().h(this.info)
            ])
        ])
        if(this.content!=undefined) this.contentTable.a([
            new Tr().a([
                this.contenttd=<Td>new Td().a([this.content])
            ])
        ])
        if(!this.canClose) this.closeBox.z(0,0)
        if(!this.canResize) this.resizeBox.z(0,0)
        let container=new Div().pa().
            r(this.containerPadding,this.containerPadding,this.width,this.height).a([
                this.titleBar,
                this.closeBox,
                this.bottomBar,
                this.buttonBar,
                this.contentTable,
                this.resizeBox,                
            ])
        this.a([container])
        if(this.content!=undefined){
            this.content.resizeToWidth(this.width-2*this.contentHPadding)
            this.content.activate
        }
        return this
    }
    get toJsonText():string{
        return JSON.stringify(this,["id","left","top","width","height"],2)
    }
    fromJson(json:any):DraggableWindow{        
        this.left=json.left
        this.top=json.top
        this.width=json.width
        this.height=json.height
        return this
    }
    resizedragstart(e:Event){
        e.preventDefault()
        let me=<MouseEvent>e        
        this.dragstart=new Vect(me.clientX,me.clientY)            
        this.resizeBar.
            r(-this.dragPadding,-this.dragPadding,this.resizeBoxWidth+2*this.dragPadding,this.resizeBoxHeight+2*this.dragPadding)            
        this.dragunderway=true                                
    }
    resizemousemove(e:Event){  
        let me=<MouseEvent>e      
        if(this.dragunderway){
            this.dragd=new Vect(me.clientX,me.clientY).m(this.dragstart)                                                
            this.dragdunsc=this.dragd.unsc()
            this.layer.z(this.width+this.dragdunsc.x,this.height+this.dragdunsc.y)
            this.resizeBox.o(this.width-this.resizeBoxWidth+this.dragdunsc.x,this.height-this.bottomBarHeight+this.dragdunsc.y)
        }
    }
    finalizeResize(){
        this.dragunderway=false
        this.resizeBar.r(0,0,0,0)
        this.width=this.width+this.dragdunsc.x
        this.height=this.height+this.dragdunsc.y
        this.store
        this.build()
    }
    resizemouseout(e:Event){
        if(this.dragunderway){
            this.finalizeResize()
        }
    }
    resizemouseup(e:Event){
        if(this.dragunderway){            
            this.finalizeResize()
        }
    }
    windowdragstart(e:Event){
        e.preventDefault()
        let me=<MouseEvent>e        
        this.dragstart=new Vect(me.clientX,me.clientY)            
        this.dragBar.
            r(-this.dragPadding,-this.dragPadding,this.width+2*this.dragPadding,this.titleBarHeight+2*this.dragPadding)            
        this.dragunderway=true                                
    }
    windowmousemove(e:Event){  
        let me=<MouseEvent>e      
        if(this.dragunderway){
            this.dragd=new Vect(me.clientX,me.clientY).m(this.dragstart)                                                
            this.dragdunsc=this.dragd.unsc()
            this.layer.o(this.left+this.dragdunsc.x,this.top+this.dragdunsc.y)
        }
    }
    finalizeDrag(){
        this.dragunderway=false
        this.dragBar.r(0,0,0,0)
        this.left=this.left+this.dragdunsc.x
        this.top=this.top+this.dragdunsc.y
        this.store
        this.build()
    }
    windowmouseout(e:Event){
        if(this.dragunderway){
            this.finalizeDrag()
        }
    }
    windowmouseup(e:Event){
        if(this.dragunderway){            
            this.finalizeDrag()
        }
    }
    close(){
        Layers.popLayer()
        Layers.popLayer()
    }
    closemousedown(e:Event){
        this.close()
    }
}

class TextInputWindow extends DraggableWindow{    
    textinput:TextInput    
    textcallback:any
    enterCallback(){        
        this.close()                
        if(this.textcallback!=undefined) this.textcallback(this.textinput.getText())
    }
    constructor(id:string,orig:string,title:string,info:string,textcallback:any,options:any={}){
        super(id)        
        this.textcallback=textcallback
        this.setOkCallback(this.enterCallback.bind(this))
        this.setTitle(title)
        this.setInfo(info)        
        if(options.width!=undefined){            
            this.width=options.width
        }
        this.content=this.textinput=<TextInput>new TextInput(this.id+"_textinput").
            setEnterCallback(this.enterCallback.bind(this)).
            ac("textinputwindowtextinput").
            fs(getCssFloatProperty("--textinputwindowtextinputfontrelsize",1.25)*FONT_SIZE)
        this.build()
        this.textinput.setText(orig)
    }
}

class AckInfoWindow extends DraggableWindow{        
    constructor(content:string,okcallback:any){
        super("ackinfo")
        this.setOkCallback(okcallback)
        this.content=new Div().ac("ackinfotext").h(content)
        this.setTitle("Info")
    }
}