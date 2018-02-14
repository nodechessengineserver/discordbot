DEBUG=false

let AJAX_URL=`http://${document.location.host}/ajax`

//localStorage.clear()

function resetApp(){
    localStorage.clear()
    buildApp()
}

function clog(json:any){
    conslog(JSON.stringify(json,null,2))
}

function ajaxRequest(payload:any,callback:any){
    console.log("submitting ajax request",payload)
    let body=JSON.stringify(payload) 
    let headers = new Headers()
    headers.append("Content-Type", "application/json");       
    fetch(AJAX_URL,{
        method: 'POST',
        headers: headers,
        body: body
    }).then(
        response=>{
            console.log("server responded to ajax request")
            return response.json()
        }
    ).then(
        json=>{
            console.log("server returned",json)
            callback(json)
        }
    )
}

///////////////////////////////////////////////////////////

let intro:Div
let profile:Div
let tabpane:Tabpane

function buildApp(){

    intro=new Div().h(
        `<hr>Chess playing interface of ACT Discord Server.<hr>`+
        `Under construction.`
    )

    profile=new Div()

    let log=new Logpane()

    tabpane=(<Tabpane>new Tabpane("maintabpane").
        setTabs([
            new Tab("intro","Intro",intro),
            new Tab("profile","Profile",profile),
            new Tab("log","Log",log)            
        ]).
        snapToWindow()).
        build()    

    log.log(new Logitem("application started","info"))

    conslog=log.logText.bind(log)

    Layers.init()

    Layers.root.a([tabpane])

}

buildApp()

DEBUG=true