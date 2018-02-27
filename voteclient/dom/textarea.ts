class TextArea extends DomElement<TextArea>{    
    constructor(id:string){
        super("textarea")        
        this.id=id
        this.fs(FONT_SIZE)        
    }        
    getText():string{
        return this.getValue()
    }    
    setText(content:string):TextArea{        
        (<any>this.e).value=content
        return this
    }    
    clear():TextArea{        
        this.setText("")
        return this
    }
}