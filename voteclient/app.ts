DEBUG=false
conslog=(item:string)=>{console.log("<item>",item)}

let tabpane=(<Tabpane>new Tabpane("votetabpane").
        setTabs([
            new Tab("intro","Intro",new Div().ac("test").h(INTRO_HTML))           
        ]).
        snapToWindow()).
        build().
        selectTab("intro")

Layers.init()

Layers.root.a([tabpane])

ajaxRequest({action:"test"},(json:any)=>{
    console.log(json)
})