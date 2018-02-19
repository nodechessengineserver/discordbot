interface DomStoreDriver{
    store(id:string,content:any):void
    retreive(id:string):any
}

class LocalStorageDomStoreDriver{
    store(id:string,content:any){
        localStorage.setItem(id,JSON.stringify(content))
    }
    retreive(id:string):any{
        let content=localStorage.getItem(id)
        if(content==null) return {}
        return JSON.parse(content)
    }
}

class DomStore{
    id:string
    content:any
    driver:DomStoreDriver=new LocalStorageDomStoreDriver()
    constructor(id:string){
        this.id=id
        this.retreive()
    }
    setDriver(driver:DomStoreDriver):DomStore{
        this.driver=driver
        this.retreive()
        return this
    }
    store(){
        if(DEBUG) conslog(`domstore store ${this.id}`)
        this.driver.store(this.id,this.content)
    }
    retreive(){
        if(DEBUG) conslog(`domstore retreive ${this.id}`)
        this.content=this.driver.retreive(this.id)
    }
    setItem(key:string,value:any){
        if(DEBUG) conslog(`domstore setitem ${this.id} ${key} ${value}`)
        this.content[key]=value
        this.store()
    }
    getItem(key:string):any{
        if(DEBUG) conslog(`domstore getitem ${this.id} ${key}`)
        return this.content[key]
    }
}