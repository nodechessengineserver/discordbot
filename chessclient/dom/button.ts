class Button extends DomElement<Button>{
    constructor(caption:string){
        super("input")
        this.
            setType("button").
            setValue(caption).
            fs(FONT_SIZE)
    }
    get ok():Button{
        this.ac("okbutton")
        return this
    }
    get cancel():Button{
        this.ac("cancelbutton")
        return this
    }
    get delete():Button{
        this.ac("deletebutton")
        return this
    }
    get info():Button{
        this.ac("infobutton")
        return this
    }
    onClick(callback:any):Button{
        return <Button>this.addEventListener("click",callback)
    }
}