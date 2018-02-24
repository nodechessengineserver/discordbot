namespace Layers{
    let layers:DomElement<Div>[]=[]

    let index:number=-1

    export let body:any

    export let root:DomElement<Div>

    export function init(){
        body=document.querySelector("#root")
        
        body.innerHTML=""

        root=new Div().pr()

        body.appendChild(root.e)
    }

    export function pushLayer():Div{
        let div=new Div().pa()
        index++
        if(index>=layers.length){
            layers.push(div)
            root.appendChild(div)
        }else{
            div=layers[index]
        }
        return div
    }

    export function pushCover():Div{
        let div=pushLayer()
        div.x.
            o(0,0).
            setWidth(window.innerWidth+"px").
            setHeight(window.innerHeight+"px").
            c("coverdiv").
            fs(FONT_SIZE)
        return div
    }

    export function pushContent():Div{
        let div=pushLayer()
        div.x.
            r(0,0,0,0).
            c("contentdiv").
            fs(FONT_SIZE)
        return div
    }

    export function popLayer(){
        if(index>=0){
            let current=layers[index]
            current.x.r(0,0,0,0)
            index--
            layers.pop()
        }
    }
}