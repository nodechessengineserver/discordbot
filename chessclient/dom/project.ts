class InputField{
    key:string
    caption:string
    default:string    
    value:string|null    
    constructor(key:string,caption:string,_default:string,value:string|null=null){
        this.key=key
        this.caption=caption
        this.default=_default
        this.value=value
    }
}

class Project extends DomElement<Project>{

    fields:InputField[]=[]

    constructor(){
        super("div")
    }

    setFields(fields:InputField[]):Project{
        this.fields=fields        
        return this
    }

    setStore(domstore:DomStore):Project{
        this.domstore=domstore
        for(let field of this.fields){
            let value=this.domstore.getItem(field.key)            
            field.value=value!=undefined?value:field.default
        }
        return this
    }

    build():Project{
        this.x.a([
            new Table().bs().a(
                this.fields.map(field=>new Tr().a([
                    new Td().h(field.caption),
                    new Td().a([
                        new TextInput(this.id+"_"+field.key).w(400).
                            bind(this.domstore,field.key,field.default)
                    ])
                ]))
            )
        ])
        return this
    }
}