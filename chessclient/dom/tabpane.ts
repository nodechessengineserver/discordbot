class Tab{
    id:string
    caption:string
    node:DomElement<any>
    td:Td
    scroll:boolean
    constructor(id:string,caption:string,node:DomElement<any>,scroll:boolean=true){
        this.id=id
        this.caption=caption
        this.node=node
        this.scroll=scroll
    }
}

class Tabpane extends DomElement<Tabpane>{
    constructor(id:string){
        super("div")
        this.id=id
        this.fromStored
    }
    tabs:Tab[]=[]
    width:number=600
    height:number=400
    selectedIndex=-1
    fromJson(json:any):Tabpane{
        this.selectedIndex=json.selectedIndex
        return this
    }
    scroll:boolean=true
    effDivwidth():number{
        if(this.scroll) return this.divwidth-getGeneralScrollBarWidthRem()
        return this.divwidth-getGeneralWindowWidthCorrectionRem()
    }
    effDivheight():number{
        if(this.scroll) return this.divheight-getGeneralScrollBarWidthRem()
        return this.divheight-getGeneralWindowHeightCorrectionRem()
    }
    getIndexById(id:string|null):number{
        for(let i=0;i<this.tabs.length;i++){
            if(this.tabs[i].id==id) return i
        }
        return -1
    }
    setCaptionByKey(id:string,caption:string):Tabpane{
        let index=this.getIndexById(id)
        if(index>=0){
            this.tabs[index].td.h(caption)
        }
        return this
    }
    selectTabByIndex(index:number):Tabpane{
        this.selectedIndex=index
        if(index>=0){
            let tab=this.tabs[index]
            let node=tab.node
            this.scroll=tab.scroll
            this.contentdiv.h("").a([node]).setOverflow(this.scroll?"scroll":"hidden")
            node.resizeToWidth(this.effDivwidth())
            node.resizeToHeight(this.effDivheight())
            node.activate
        }        
        for(let i=0;i<this.tabs.length;i++){
            this.tabs[i].td.c(i==this.selectedIndex?"tabpanetabtdselected":"tabpanetabtd")
        }
        return <Tabpane>this.store
    }
    selectTab(key:string|null):Tabpane{
        return this.selectTabByIndex(this.getIndexById(key))
    }
    setTabs(tabs:Tab[]):Tabpane{
        this.tabs=tabs
        return this
    }
    setW(width:number):Tabpane{
        this.width=width
        return this
    }
    setH(height:number):Tabpane{
        this.height=height
        return this
    }
    get toJsonText():string{
        return JSON.stringify(this,["id","selectedIndex"],2)
    }
    contentdiv:Div
    windowResizeHandler():Tabpane{        
        this.doSnapToWindow()
        return this.build()
    }
    doSnapToWindow():Tabpane{
        this.width=getCorrectedWindowWidthRem()
        this.height=getCorrectedWindowHeightRem()
        return this
    }
    resizeToWidth(width:number):Tabpane{
        this.width=width
        return this.build()
    }
    resizeToHeight(height:number):Tabpane{
        this.height=height
        return this.build()
    }
    divWidthCorrection():number{
        return getCssFloatProperty("--tabpanedivwidthcorrection",18)
    }
    divHeightCorrection():number{
        return getCssFloatProperty("--tabpanedivheightcorrection",28)
    }
    divwidth:number
    divheight:number
    build():Tabpane{
        if(this.snaptowindow){
            this.doSnapToWindow()
        }
        let tabheight=1.25*FONT_SIZE
        this.divwidth=this.width-this.divWidthCorrection()
        this.divheight=this.height-tabheight-this.divHeightCorrection()
        let table=new Table().bs().z(this.width,this.height).a([
            new Tr().a(
                this.tabs.map(tab=>tab.td=<Td>new Td().
                    he(tabheight).
                    fs(FONT_SIZE).
                    c("tabpanetabtd").
                    h(tab.caption).
                    addEventListener("mousedown",this.tabClicked.bind(this,tab))
                )
            ),
            new Tr().a([
                new Td().
                    setAttributeN("colspan",this.tabs.length).
                    c("tabpanecontenttd").a([
                        this.contentdiv=new Div().
                            z(this.divwidth,this.divheight).
                            setOverflow(this.scroll?"scroll":"hidden")
                    ])
            ]),
        ])
        this.h("").a([
            table
        ])
        return this.selectTabByIndex(this.selectedIndex)
    }
    tabClicked(tab:Tab,e:Event){
        this.selectTab(tab.id)
    }
}