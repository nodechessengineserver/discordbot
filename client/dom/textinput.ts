class TextInput extends DomElement<TextInput>{
    history:string[]=[]
    index:number=0
    constructor(id:string,password:boolean=false){
        super("input")
        this.
            setType(password?"password":"text")
        this.id=id
        this.fs(FONT_SIZE)
        this.ae("change",this.changeEventListener.bind(this))
        this.ae("input",this.changeEventListener.bind(this))
        this.fromStored
        this.addEventListener("keyup",this.keyup.bind(this))
    }
    changeEventListener(e:Event){
        if(this.domstore!=undefined){
            let value=this.getText()            
            this.domstore.setItem(this.domstorekey,value)
        }
    }
    onBind(){
        let value=this.domstore.getItem(this.domstorekey)
        if(value==undefined){
            this.domstore.setItem(this.domstorekey,this.default)
            this.setText(this.default)
        }else{
            this.setText(value)
        }
    }
    fromJson(json:any):TextInput{
        this.history=json.history
        this.index=json.index
        return this
    }
    get toJsonText():string{
        return JSON.stringify(this,["id","history","index"],2)
    }
    getText():string{
        return this.getValue()
    }
    caretToEnd():TextInput{
        let l=(<any>this.e).value.length;
        (<any>this.e).selectionStart=l;
        (<any>this.e).selectionEnd=l;
        return this
    }
    setText(content:string):TextInput{
        this.setValue(content)
        return this.caretToEnd()
    }
    addToHistory(text:string):TextInput{
        this.history=this.history.filter(item=>item!="")
        if(text=="") return this
        let index=this.history.indexOf(text)        
        if(index>=0) this.index=index
        else{
            this.history.push(text)
            this.index=this.history.length-1
        }
        return <TextInput>this.store
    }
    clear():TextInput{        
        this.setText("")
        return this
    }
    getTextAndClear(addToHistory:boolean=true):string{
        let text=this.getText()
        if(addToHistory) this.addToHistory(text)
        this.clear()
        return text
    }
    entercallback:any
    setEnterCallback(entercallback:any):TextInput{
        this.entercallback=entercallback
        return this
    }        
    moveIndex(dir:number):TextInput{
        if(this.history.length<=0) return this
        if(this.getText()!="") this.index+=dir
        if(this.index>=this.history.length) this.index=0
        else if(this.index<0) this.index=this.history.length-1        
        this.store
        return this.setText(this.history[this.index])
    }
    keyup(e:KeyboardEvent){        
        //console.log(e.code)
        if(e.code=="Enter"){        
            if(this.entercallback!=undefined){
                this.entercallback()
            }
        }
        if(e.code=="ArrowUp"){
            this.moveIndex(-1)
        }
        if(e.code=="ArrowDown"){
            this.moveIndex(1)
        }
        if(e.code=="Escape"){
            this.clear()
        }
    }
    get activate():TextInput{        
        return <TextInput>this.focusLater

    }
    resizeToWidth(width:number):TextInput{
        return <TextInput>this.w(width)
    }
}