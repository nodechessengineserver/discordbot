class Table extends DomElement<Table>{
    constructor(){
        super("table")
        this.            
            setFontSizeRem(FONT_SIZE).
            c("domtable")
    }
    setBorderCollapseSpacingRem(rem:number):Table{
        return <Table>this.
            setBorderCollapse("separate").
            setBorderSpacingRem(rem)
    }
    bs(rem:number=5):Table{return this.setBorderCollapseSpacingRem(rem)}
}

class Tr extends DomElement<Tr>{
    constructor(){
        super("tr")
    }
}

class Td extends DomElement<Td>{
    constructor(){
        super("td")
        this.c("domtd")
    }
    //////////////////////////////////////////////
    setColspan(value:string):Td{
        this.setAttribute("colspan",value)
        return this
    }
    setColspanRem(rem:number):Td{
        return this.setColspan(`${rem}rem`)
    }
    cs(rem:number):Td{
        return this.setColspanRem(rem)
    }
    //////////////////////////////////////////////
}