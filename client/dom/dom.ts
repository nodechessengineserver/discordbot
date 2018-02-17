let DOM_DEFINED=true

let FONT_SIZE=getCssFloatProperty("--fontsize",15)

let DEBUG=true

let conslog=(content:string)=>console.log(content)

function getGeneralScrollBarWidthPx(){
    return getCssFloatProperty("--generalscrollbarwidthpx",30)
}

function getGeneralScrollBarWidthRem(){
    return getGeneralScrollBarWidthPx()/SCALE_FACTOR()
}

let windowResizeEventRecipients:DomElement<any>[]=[]

function registerForWindowResizeEvent(e:DomElement<any>){
    windowResizeEventRecipients.push(e)
}

function getGeneralWindowWidthCorrectionPx(){
    return getCssFloatProperty("--windowwidthcorrection",5)
}

function getGeneralWindowWidthCorrectionRem(){
    return getGeneralWindowWidthCorrectionPx()/SCALE_FACTOR()
}

function getGeneralWindowHeightCorrectionPx(){
    return getCssFloatProperty("--windowheightcorrection",5)
}

function getGeneralWindowHeightCorrectionRem(){
    return getGeneralWindowHeightCorrectionPx()/SCALE_FACTOR()
}

function getCorrectedWindowWidthPx(){    
    return window.innerWidth-getGeneralWindowWidthCorrectionPx()
}

function getCorrectedWindowWidthRem(){
    return getCorrectedWindowWidthPx()/SCALE_FACTOR()
}

function getCorrectedWindowHeightPx(){
    return window.innerHeight-getGeneralWindowHeightCorrectionPx()
}

function getCorrectedWindowHeightRem(){
    return getCorrectedWindowHeightPx()/SCALE_FACTOR()
}

function windowResizeHandler(ev:Event|null){
    for(let e of windowResizeEventRecipients) e.windowResizeHandler()
}

function setRem(rem:number){    
    document.documentElement.style.fontSize=rem+"px"
    windowResizeHandler(null)
}

window.addEventListener("resize",windowResizeHandler)

class DomElement<T>{    
    
    e:HTMLElement

    id:string|null=null

    domstore:DomStore

    domstorekey:string

    default:string

    snaptowindow:boolean=false

    constructor(tag:string){        
        this.e=document.createElement(tag)        
    }

    windowResizeHandler():DomElement<T>{        
        return this
    }

    snapToWindow(snap:boolean=true):DomElement<T>{
        this.snaptowindow=snap
        registerForWindowResizeEvent(this)
        return this
    }

    onBind(){
        // abstract        
        // should be used to initialize from bind
    }

    bind(domstore:DomStore,domstorekey:string,_default:any):DomElement<T>{
        this.domstore=domstore
        this.domstorekey=domstorekey
        this.default=_default
        this.onBind()
        return this
    }

    get activate():DomElement<T>{
        return this
    }
    resizeToWidth(width:number):DomElement<T>{return this}
    resizeToHeight(width:number):DomElement<T>{return this}
    focus():DomElement<T>{        
        this.e.focus()
        return this
    }
    get focusLater():DomElement<T>{
        setTimeout(this.focus.bind(this),0)
        return this
    }
    get x():DomElement<T>{        
        return this.h("")
    }
    getAttribute(name:string):string{        
        let attr=this.e.getAttribute(name)
        return attr==null?"":attr
    }
    //////////////////////////////////////////////     
    setPosition(value:string):DomElement<T>{
        this.e.style.position=value
        return this
    }
    pr():DomElement<T>{
        return this.setPosition("relative")
    }
    pa():DomElement<T>{
        return this.setPosition("absolute")
    }    
    //////////////////////////////////////////////     
    removeClass(klass:string):DomElement<T>{
        let parts=this.getAttribute("class").split(" ").filter(value=>value!=klass)
        this.setAttribute("class",parts.join(" "))
        return this
    }
    addClass(klass:string):DomElement<T>{
        this.removeClass(klass)        
        let parts=this.getAttribute("class").split(" ")
        parts.push(klass)
        this.setAttribute("class",parts.join(" "))
        return this
    }
    ac(klass:string):DomElement<T>{
        return this.addClass(klass)
    }
    //////////////////////////////////////////////        
    fromJson(json:any):DomElement<T>{                
        return this
    }
    fromJsonText(jsontext:string|null):DomElement<T>{        
        if(jsontext==null) return this
        try{
            let json=JSON.parse(jsontext)            
            this.fromJson(json)
        }catch(err){}        
        return this
    }    
    get storedJsonText():string|null{
        if(this.id==null) return null
        return localStorage.getItem(this.id)
    }
    
    get fromStored():DomElement<T>{        
        if(this.id==null) return this
        this.fromJsonText(this.storedJsonText)        
        if(DEBUG) conslog(`fromstored ${this.toJsonText}`)
        return this
    }
    get toJsonText():string{
        return JSON.stringify(this)
    }
    get store():DomElement<T>{
        if(this.id==null) return this
        let jsontext=this.toJsonText
        if(DEBUG) conslog(`store ${jsontext}`)
        localStorage.setItem(this.id,jsontext)
        return this
    }
    //////////////////////////////////////////////        
    setBackground(value:string):DomElement<T>{
        this.e.style.background=value
        return this
    }
    burl(url:string):DomElement<T>{
        return this.setBackground(`url(${url})`)
    }
    //////////////////////////////////////////////        
    setOverflow(value:string):DomElement<T>{
        this.e.style.overflow=value
        return this
    }
    get os():DomElement<T>{
        return this.setOverflow("scroll")
    }
    //////////////////////////////////////////////    
    setClass(klass:string):DomElement<T>{        
        return this.setAttribute("class",klass)
    }
    c(klass:string):DomElement<T>{        
        return this.setClass(klass)
    }
    //////////////////////////////////////////////    
    setWidth(value:string):DomElement<T>{
        this.e.style.width=value
        return this
    }
    setWidthRem(rem:number):DomElement<T>{
        return this.setWidth(`${rem}rem`)
    }
    w(rem:number):DomElement<T>{
        return this.setWidthRem(rem)
    }
    //////////////////////////////////////////////    
    setHeight(value:string):DomElement<T>{
        this.e.style.height=value
        return this
    }
    setHeightRem(rem:number):DomElement<T>{
        return this.setHeight(`${rem}rem`)
    }
    he(rem:number):DomElement<T>{
        return this.setHeightRem(rem)
    }
    //////////////////////////////////////////////
    z(w:number,h:number):DomElement<T>{
        return this.w(w).he(h)
    }
    //////////////////////////////////////////////    
    setLeft(value:string):DomElement<T>{
        this.e.style.left=value
        return this
    }
    setLeftRem(rem:number):DomElement<T>{
        return this.setLeft(`${rem}rem`)
    }
    l(rem:number):DomElement<T>{
        return this.setLeftRem(rem)
    }
    //////////////////////////////////////////////    
    setTop(value:string):DomElement<T>{
        this.e.style.top=value
        return this
    }
    setTopRem(rem:number):DomElement<T>{
        return this.setTop(`${rem}rem`)
    }
    t(rem:number):DomElement<T>{
        return this.setTopRem(rem)
    }
    //////////////////////////////////////////////
    o(left:number,top:number):DomElement<T>{
        return this.l(left).t(top)
    }
    //////////////////////////////////////////////
    r(left:number,top:number,width:number,height:number):DomElement<T>{
        return this.o(left,top).z(width,height)
    }
    //////////////////////////////////////////////
    setPadding(value:string):DomElement<T>{
        this.e.style.padding=value
        return this
    }
    setPaddingRem(rem:number):DomElement<T>{
        return this.setPadding(`${rem}rem`)
    }
    p(rem:number):DomElement<T>{
        return this.setPaddingRem(rem)
    }
    setPaddingTop(value:string):DomElement<T>{
        this.e.style.paddingTop=value
        return this
    }
    setPaddingTopRem(rem:number):DomElement<T>{
        return this.setPaddingTop(`${rem}rem`)
    }
    pt(rem:number):DomElement<T>{
        return this.setPaddingTopRem(rem)
    }
    setMarginTop(value:string):DomElement<T>{
        this.e.style.marginTop=value
        return this
    }
    setMarginTopRem(rem:number):DomElement<T>{
        return this.setMarginTop(`${rem}rem`)
    }
    mt(rem:number):DomElement<T>{
        return this.setMarginTopRem(rem)
    }
    setMarginLeft(value:string):DomElement<T>{
        this.e.style.marginLeft=value
        return this
    }
    setMarginLeftRem(rem:number):DomElement<T>{
        return this.setMarginLeft(`${rem}rem`)
    }
    ml(rem:number):DomElement<T>{
        return this.setMarginLeftRem(rem)
    }
    setDisplay(value:string):DomElement<T>{
        this.e.style.display=value
        return this
    }
    ib(){
        return this.setDisplay("inline-block")
    }
    //////////////////////////////////////////////
    setInnerHTML(content:string):DomElement<T>{
        this.e.innerHTML=content
        return this
    }
    h(content:string):DomElement<T>{
        return this.setInnerHTML(content)
    }
    //////////////////////////////////////////////
    appendChild(e:DomElement<any>):DomElement<T>{
        this.e.appendChild(e.e)
        return this
    }
    //////////////////////////////////////////////
    appendChilds(es:DomElement<any>[]):DomElement<T>{
        for(let e of es){
            this.appendChild(e)
        }
        return this
    }
    a(es:DomElement<any>[]):DomElement<T>{
        return this.appendChilds(es)
    }
    //////////////////////////////////////////////
    setBackgroundColor(value:string):DomElement<T>{
        this.e.style.backgroundColor=value
        return this
    }
    bcol(value:string):DomElement<T>{
        return this.setBackgroundColor(value)
    }
    setColor(value:string):DomElement<T>{
        this.e.style.color=value
        return this
    }
    col(value:string):DomElement<T>{
        return this.setColor(value)
    }
    fontStyle(value:string):DomElement<T>{
        this.e.style.fontStyle=value
        return this
    }
    it():DomElement<T>{
        return this.fontStyle("italic")
    }
    textDecoration(value:string):DomElement<T>{
        this.e.style.textDecoration=value
        return this
    }
    ul():DomElement<T>{
        return this.textDecoration("underline")
    }
    setVerticalAlign(value:string):DomElement<T>{
        this.e.style.verticalAlign=value
        return this
    }
    va(value:string):DomElement<T>{
        return this.setVerticalAlign(value)
    }
    setTextAlgin(value:string):DomElement<T>{
        this.e.style.textAlign=value
        return this
    }
    ta(value:string):DomElement<T>{
        return this.setTextAlgin(value)
    }
    //////////////////////////////////////////////
    setFontSize(value:string):DomElement<T>{
        this.e.style.fontSize=value
        return this
    }
    setFontSizeRem(rem:number):DomElement<T>{
        return this.setFontSize(`${rem}rem`)
    }
    fs(rem:number):DomElement<T>{
        return this.setFontSizeRem(rem)
    }
    //////////////////////////////////////////////
    setBorderCollapse(value:string):DomElement<T>{
        this.e.style.borderCollapse=value
        return this
    }
    //////////////////////////////////////////////
    setBorderSpacing(value:string):DomElement<T>{
        this.e.style.borderSpacing=value
        return this
    }
    setBorderSpacingRem(rem:number):DomElement<T>{
        this.e.style.borderSpacing=`${rem}rem`
        return this
    }
    //////////////////////////////////////////////
    get bred(){
        this.e.style.backgroundColor="red"
        return this
    }
    get bgreen(){
        this.e.style.backgroundColor="green"
        return this
    }
    get bblue(){
        this.e.style.backgroundColor="blue"
        return this
    }
    get blred(){
        this.e.style.backgroundColor="lightred"
        return this
    }
    get blgreen(){
        this.e.style.backgroundColor="lightgreen"
        return this
    }
    get blblue(){
        this.e.style.backgroundColor="lightblue"
        return this
    }
    get cred(){
        this.e.style.color="red"
        return this
    }
    get cgreen(){
        this.e.style.color="green"
        return this
    }
    get cblue(){
        this.e.style.color="blue"
        return this
    }
    //////////////////////////////////////////////
    removeAttribute(name:string):DomElement<T>{
        this.e.removeAttribute(name)
        return this
    }
    ra(name:string):DomElement<T>{
        return this.removeAttribute(name)
    }
    //////////////////////////////////////////////
    setAttribute(name:string,value:string):DomElement<T>{
        this.e.setAttribute(name,value)
        return this
    }
    sa(name:string,value:string):DomElement<T>{
        return this.setAttribute(name,value)
    }    
    setAttributeN(name:string,n:number):DomElement<T>{
        return this.setAttribute(name,`${n}`)
    }
    setType(type:string):DomElement<T>{
        return this.setAttribute("type",type)
    }    
    setValue(value:string):DomElement<T>{
        (<any>this.e)["value"]=value
        return this
    }    
    getValue():string{
        return (<any>this.e)["value"]
    }    
    //////////////////////////////////////////////
    getPx(pxstr:any):number{
        return parseInt(pxstr.replace("px",""))
    }
    getTopPx():number{
        return this.getPx(this.e.style.top)
    }
    getLeftPx():number{
        return this.getPx(this.e.style.left)
    }
    topPx(px:number):DomElement<T>{
        this.e.style.top=px+"px"
        return this
    }
    leftPx(px:number):DomElement<T>{
        this.e.style.left=px+"px"
        return this
    }
    zIndexNumber(z:number):DomElement<T>{
        this.e.style.zIndex=""+z
        return this
    }
    cp():DomElement<T>{
        this.e.style.cursor="pointer"
        return this
    }
    //////////////////////////////////////////////
    addEventListener(type:any,listener:(this:Element,ev:any)=>any):DomElement<T>{
        this.e.addEventListener(type,listener)
        return this
    }
    ae(type:any,listener:(this:Element,ev:any)=>any):DomElement<T>{
        return this.addEventListener(type,listener)
    }
    //////////////////////////////////////////////
}

class Div extends DomElement<Div>{
    constructor(){
        super("div")
    }
}

class Label extends DomElement<Div>{
    constructor(){
        super("label")
    }
}

