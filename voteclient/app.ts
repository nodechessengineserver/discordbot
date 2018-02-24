
let tabpane=(<Tabpane>new Tabpane("votetabpane").
        setTabs([
            new Tab("intro","Intro",new Div().ac("test").h(INTRO_HTML))           
        ]).
        snapToWindow()).
        build()    

Layers.init()

Layers.root.a([tabpane])