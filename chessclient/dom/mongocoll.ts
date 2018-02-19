class MongoColl extends DomElement<MongoColl>{
    mdocs:MongoDoc[]=[]

    constructor(){
        super("div")
        this.
            fs(FONT_SIZE)
    }    

    loadcallback:any
    setLoadCallback(loadcallback:any):MongoColl{
        this.loadcallback=loadcallback
        return this
    }

    setDocs(docs:any[]):MongoColl{        
        this.mdocs=docs.map(doc=>new MongoDoc().setLoadCallback(this.loadcallback).setDoc(doc).build())
        return this
    }

    build():MongoColl{
        this.x.ac("mongocollmaindiv").a(this.mdocs)
        return this
    }
}