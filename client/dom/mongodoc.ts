class MongoDoc extends DomElement<MongoDoc>{
    doc:any={}

    constructor(){
        super("div")
        this.
            fs(FONT_SIZE)
    }    

    setDoc(doc:any):MongoDoc{
        this.doc=doc
        return this
    }

    loadcallback:any
    setLoadCallback(loadcallback:any):MongoDoc{
        this.loadcallback=loadcallback
        return this
    }

    loadButtonClicked(e:Event){        
        if(this.loadcallback!=undefined) this.loadcallback(this.doc)
    }

    build():MongoDoc{
        let content=""        
        for(let key in this.doc){
            let value=this.doc[key]
            content+=`<span class="dockey">${key}</span>`
            if((typeof value=="string")&&(value.length>80))
                content+=` : <hr><pre>${value}</pre><hr>`
            else content+=` = ${value}<hr>`
        }                
        this.x.ac("mongodocmaindiv").a([
            new Button("Load").onClick(this.loadButtonClicked.bind(this)),
            new Div().h(content)
        ])
        return this
    }
}