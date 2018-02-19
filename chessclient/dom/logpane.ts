class Logpane extends DomElement<Logpane>{
    logger:Log=new Log()
    constructor(){
        super("div")
    }
    log(li:Logitem):Logpane{
        this.logger.log(li)
        return this.build()
    }    
    logText(text:string):Logpane{
        this.logger.log(new Logitem(text))
        return this.build()
    }
    createTable():Table{
        return <Table>new Table().bs(2).c("logtable").a(this.logger.items.map(item=>new Tr().a([
            new Td().ac("logtd logtime log"+item.kind).a([new Div().fs(FONT_SIZE*0.6).w(FONT_SIZE*4).h(item.now.toLocaleTimeString())]),                
            new Td().ac("logtd logcontent log"+item.kind).a([new Div().fs(FONT_SIZE*0.7).w(2000).h(`<pre>${item.text}</pre>`)]),
        ])))
    }
    build():Logpane{        
        this.x.a([
            this.createTable()
        ])
        return this
    }
}