DEBUG=false

let PING_INTERVAL=3000
let SOCKET_TIMEOUT=10000

let WS_URL=`ws://${document.location.host}/ws`

//localStorage.clear()

function newSocket(){
    return new WebSocket(`${WS_URL}/?sri=${uniqueId()}`)
}

let ws:any

function emit(json:any){    
    try{
        let jsontext=JSON.stringify(json)    
        if(ws.OPEN){
            //console.log("sending",jsontext)
            ws.send(jsontext)
        }
    }catch(err){console.log(err)}    
}

let lastPong=0

function ping(){    
    let now=performance.now()
    let timeout=now-lastPong
    if(timeout>SOCKET_TIMEOUT){
        //console.log("socket timed out")
        strongSocket()
    }else{
        //console.log("timeout",timeout)
        timeoutDiv.h(`${timeout}`)
        emit({t:"ping",time:performance.now()})
        setTimeout(ping,PING_INTERVAL)
    }
}

function strongSocket(){
    ws=newSocket()        
    ws.onopen=function(){
        //console.log("socket connected")        
        lastPong=performance.now()
        ping()
    }
    ws.onmessage=(e:any)=>{
        let content=e.data
        //console.log("received",content)
        try{
            let json=JSON.parse(content)
            let t=json.t
            //console.log("action",t)
            if(t=="pong"){
                let now:any=performance.now()
                lastPong=now
                let time=json.time
                let lag=now-time
                //console.log("lag",lag)
                lagDiv.h(`${lag}`)
            }else if(t=="lichesscode"){
                let code=json.code
                let username=json.username
                console.log(`lichess code received ${username} ${code}`)
                showLichessCode(username,code)
            }else if(t=="userregistered"){
                let username=json.username
                let cookie=json.cookie
                console.log(`${username} registered , cookie : ${cookie}`)
                setCookie("user",cookie,365)
                emit({
                    t:"userloggedin",
                    username:username,
                    cookie:cookie
                })
            }else if(t=="usercheckfailed"){
                let username=json.username
                console.log(`check for ${username} failed`)
            }
        }catch(err){console.log(err)}
    }
}
strongSocket()

function resetApp(){
    localStorage.clear()
    buildApp()
}

function clog(json:any){
    conslog(JSON.stringify(json,null,2))
}

///////////////////////////////////////////////////////////

let intro:Div
let profile:Div
let tabpane:Tabpane
let profileTable:Table
let lagDiv:Div
let lichessUsernameDiv:Div
let timeoutDiv:Div
let usernameInputWindow:TextInputWindow
let lichessCodeShowWindow:TextInputWindow

function showLichessCode(username:any,code:any){
    lichessCodeShowWindow=new TextInputWindow("showlichesscode")    
    lichessCodeShowWindow.setTitle(`Lichess verification code`).
    setInfo(`${username} ! Insert this code into your lichess profile, then press Ok.`).
    setOkCallback(function(){
        console.log("checking lichess code")
        emit({
            t:"checklichesscode",
            username:username,
            code:code
        })
    }).
    build()
    lichessCodeShowWindow.textinput.setText(code)
}

function lichessLogin(){
    usernameInputWindow=new TextInputWindow("lichessusername")
    usernameInputWindow.setOkCallback(function(){
        let username=usernameInputWindow.textinput.getText()
        emit({
            t:"lichesslogin",
            username:username
        })
    }).setInfo(`Enter your lichess username:`).
    setTitle(`Lichess username`).build()
}

function buildApp(){

    intro=new Div().h(
        `<hr>Chess playing interface of ACT Discord Server.<hr>`+
        `Under construction.`
    )

    profileTable=new Table().bs()

    profileTable.a([
        new Tr().a([
            new Td().a([
                new Div().setWidthRem(200).h(`Lichess username`)
            ]),
            new Td().a([
                lichessUsernameDiv=new Div().setWidthRem(400).h("?")
            ]),
            new Td().a([
                new Button("Login").onClick(lichessLogin)
            ])            
        ]),
        new Tr().a([
            new Td().a([
                new Div().h(`Lag`)
            ]),
            new Td().a([
                lagDiv=new Div()
            ])            
        ]),
        new Tr().a([
            new Td().a([
                new Div().h(`Timeout`)
            ]),
            new Td().a([
                timeoutDiv=new Div()
            ])
        ])
    ])

    profile=new Div().a([        
        profileTable
    ])

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