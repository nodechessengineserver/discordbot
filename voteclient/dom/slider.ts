class Slider extends DomElement<Slider>{
    value:number|null=null
    constructor(id:string|null=null){
        super("input")
        this.id=id
        this.
            setType("range")
        this.fromStored
        this.c("slider")
    }    
    get toJsonText():string{
        return JSON.stringify(this,["id","value"],2)
    }
    fromJson(json:any):Slider{        
        this.value=json.value
        return this
    }
    setRange(min:number,max:number,value:number,force:boolean=false):Slider{
        if((this.value==null)||force) this.value=value
        return <Slider>this.
            setAttributeN("min",min).
            setAttributeN("max",max).
            setAttributeN("value",this.value)
    }
    changeHandler(e:Event){
        this.value=<number>(<any>e.target).value
        this.store
        this.callback(this.value)
    }
    callback:any
    onChange(callback:any,doStartup:boolean=true):Slider{
        this.callback=callback
        if(doStartup) this.callback(this.value)
        return <Slider>this.addEventListener("change",this.changeHandler.bind(this))
    }
}