class ComboOption extends DomElement<ComboOption>{
    key:string
    display:string

    constructor(key:string,display:string){
        super("option")
        this.key=key
        this.display=display        
        this.setValue(key).h(this.display)
    }
}

class ComboBox extends DomElement<ComboBox>{
    options:ComboOption[]=[]

    selectedIndex:number=-1
    selectedKey:string|null

    clear():ComboBox{
        this.options=[]
        this.selectedIndex=-1
        this.store
        return this
    }

    addOptions(os:ComboOption[]):ComboBox{
        os.map(o=>this.options.push(o))
        this.store
        return this
    }

    selectByIndex(index:number):ComboBox{
        if(index<0) return this
        if(this.options.length<=index){
            this.selectedIndex=-1
            this.selectedKey=null
            return this
        }
        this.selectedIndex=index
        this.selectedKey=this.options[this.selectedIndex].key
        for(let i=0;i<this.options.length;i++){
            this.options[i].ra("selected")
            if(i==this.selectedIndex){
                this.options[i].sa("selected","true")
                this.store
            }
        }
        return this
    }

    indexByKey(key:string|null):number{        
        for(let i=0;i<this.options.length;i++){
            if(this.options[i].key==key) return i
        }
        return -1
    }

    selectByKey(key:string|null):ComboBox{
        return this.selectByIndex(this.indexByKey(key))
    }

    constructor(id:string){
        super("select")
        this.id=id
        this.fromStored
    }

    fromJson(json:any):ComboBox{
        this.selectedKey=json.selectedKey        
        this.options=json.optionsdata.map((optiondata:any)=>
            new ComboOption(optiondata.key,optiondata.display))
        return this
    }

    optionsdata:any[]=[]

    get toJsonText():string{
        this.optionsdata=this.options.map(option=><any>{
            key:option.key,
            display:option.display
        })
        return JSON.stringify(this,["id","selectedKey","optionsdata","key","display"],2)
    }

    build():ComboBox{
        this.h("").fs(FONT_SIZE).a(this.options)
        this.ae("change",this.change.bind(this))
        return this.selectByKey(this.selectedKey)
    }

    changeHandler:any

    change(e:Event){
        let t=<any>e.target
        this.selectedKey=t.selectedOptions[0].value        
        this.selectedIndex=this.indexByKey(this.selectedKey)
        this.store
        if(this.changeHandler!=undefined) this.changeHandler(e)
    }

    onChange(handler:any):ComboBox{
        this.changeHandler=handler        
        return this
    }
}