DEBUG=false

let PING_INTERVAL=5000
let SOCKET_TIMEOUT=30000
let USER_COOKIE_EXPIRY=365

let WS_URL=`ws://${document.location.host}/ws`

let loggedUser:any

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
        timeoutDiv.h(`${Math.floor(timeout/1000)} / ${SOCKET_TIMEOUT/1000}`)
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
                lagDiv.h(`${lag.toLocaleString()}`)
            }else if(t=="lichesscode"){
                let code=json.code
                let username=json.username
                console.log(`lichess code received ${username} ${code}`)
                showLichessCode(username,code)
            }else if(t=="userregistered"){
                let username=json.username
                let cookie=json.cookie
                console.log(`${username} registered , cookie : ${cookie}`)
                setCookie("user",cookie,USER_COOKIE_EXPIRY)
                emit({
                    t:"userloggedin",
                    username:username,
                    cookie:cookie
                })
            }else if(t=="usercheckfailed"){
                let username=json.username
                console.log(`check for ${username} failed`)
            }else if(t=="setuser"){
                let username=json.username
                let cookie=json.cookie
                console.log(`set user ${username} ${cookie}`)
                setCookie("user",cookie,USER_COOKIE_EXPIRY)
                loggedUser=username
                setLoggedUser()
            }else if(t=="userlist"){                
                userlist=json.userlist                
                console.log(`set userlist`,userlist)
                setUserList()
            }else if(t=="setboard"){
                let fen=json.fen
                gboard.b.setFromFen(fen)
            }else if(t=="chat"){
                chatItems.unshift(new ChatItem(json.user,json.text))
                showChat()
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
let playtable:Table
let play:Div
let legalmoves:Div
let gboard:GuiBoard
let boardInfoDiv:Div
let moveInput:TextInput
let chatDiv:Div
let chatInput:TextInput
let users:Div
let profile:Div
let tabpane:Tabpane
let profileTable:Table
let lagDiv:Div
let lichessUsernameDiv:Div
let timeoutDiv:Div
let usernameInputWindow:TextInputWindow
let lichessCodeShowWindow:TextInputWindow
let usernameDiv:Div
let usernameButtonDiv:Div
let userlist:any

function setLoggedUser(){
    usernameButtonDiv.x.a([
        loggedUser==undefined?
        new Button("Login").onClick(lichessLogin):
        new Button("Logout").onClick(lichessLogout)
    ])    
    lichessUsernameDiv.h(loggedUser==undefined?"?":loggedUser)
    tabpane.setCaptionByKey("profile",loggedUser==undefined?"Profile":loggedUser)
    tabpane.selectTab(loggedUser==undefined?"play":"play")
}

function setUserList(){
    users.x
    for(let username in userlist){
        let user=userlist[username]
        users.a([
            new Div().h(user.username)
        ])
    }
}

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

function lichessLogout(){
    setCookie("user","",USER_COOKIE_EXPIRY)
    loggedUser=undefined
    setLoggedUser()
}

function moveInputEntered(){
    let algeb=moveInput.getText()
    moveInput.clear()
    if(algeb=="reset"){
        emit({
            t:"reset"
        })
    }else if(algeb=="del"){
        emit({
            t:"delmove"
        })
    }
    else{
        emit({
            t:"makemove",
            algeb:algeb
        })
    }    
}

function moveClicked(algeb:string,e:Event){
    //console.log(algeb)
    emit({
        t:"makemove",
        algeb:algeb
    })
}

function boardPosChanged(){
    let lalgebs=gboard.b.legalAlgebMoves().sort()
    legalmoves.x.a(lalgebs.map(algeb=>
        new Div().h(algeb).cp().setColor("#00f").ul().
        addEventListener("mousedown",moveClicked.bind(null,algeb))
    ))
    boardInfoDiv.x.a([
        new TextInput("boardinfo").setText(gboard.b.reportFen()).
        w(gboard.totalBoardWidth()+60).fs(10)
    ])
}

function dragMoveCallback(algeb:string){
    //console.log("drag move",algeb)
    emit({
        t:"makemove",
        algeb:algeb
    })
}

class ChatItem{
    user:string
    text:string

    constructor(user:string,text:string){
        this.user=user
        this.text=text
    }
}

let chatItems:ChatItem[]=[]

function showChat(){
    chatDiv.x.h(chatItems.map(item=>
        `<span class="chatuser">${item.user}</span> : <span class="chattext">${item.text}</span>`
    ).join("<br>"))    
}

function chatInputCallback(){
    let user=loggedUser!=undefined?loggedUser:"Anonymous"
    let text=chatInput.getTextAndClear()
    emit({
        t:"chat",
        user:user,
        text:text
    })
}

function chatButtonClicked(){
    chatInputCallback()
}

function buildApp(){

    intro=new Div().h(
        `Chess playing interface of ACT Discord Server. Under construction.`
    )

    users=new Div()

    gboard=new GuiBoard().setPosChangedCallback(boardPosChanged)

    play=new Div().a([
        gboard.build()
    ])

    chatDiv=new Div().z(gboard.totalBoardWidth()-20,gboard.totalBoardHeight()).
        bcol("#eef").setOverflow("scroll")

    chatInput=new TextInput("chatinput").setEnterCallback(chatInputCallback)
    chatInput.w(gboard.totalBoardWidth()-70)

    let playtable=new Table().bs().a([
        new Tr().a([
            new Td().a([
                play
            ]),
            new Td().a([
                legalmoves=new Div()
            ]).setVerticalAlign("top"),
            new Td().pr().a([
                chatDiv.pa().o(3,3)
            ])            
        ]),
        new Tr().a([
            new Td().cs(2).a([
                moveInput=new TextInput("moveinput").setEnterCallback(moveInputEntered),
                new Button("Del").onClick((e:Event)=>emit({t:"delmove"})),        
                new Button("Flip").onClick((e:Event)=>gboard.doFlip()),
                new Button("Reset").onClick((e:Event)=>emit({t:"reset"})),        
                boardInfoDiv=new Div().mt(3)
            ]),
            new Td().a([
                chatInput.mt(3),
                new Button("Chat").onClick(chatButtonClicked).mt(3)
            ])
        ])
    ])

    profileTable=new Table().bs()

    profileTable.a([
        new Tr().a([
            new Td().a([
                new Div().setWidthRem(200).h(`Lichess username`)
            ]),
            new Td().a([
                lichessUsernameDiv=new Div().setWidthRem(400)
            ]),
            new Td().a([
                usernameButtonDiv=new Div()                
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
            new Tab("users","Users",users),
            new Tab("play","Play",playtable),
            new Tab("profile","Profile",profile),
            new Tab("log","Log",log)            
        ]).
        snapToWindow()).
        build()    

    log.log(new Logitem("application started","info"))

    conslog=log.logText.bind(log)

    Layers.init()

    Layers.root.a([tabpane])

    setLoggedUser()

    legalmoves.setHeightRem(gboard.totalBoardHeight()).setOverflow("scroll")

    gboard.b.posChanged()

    gboard.setDragMoveCallback(dragMoveCallback)
}

buildApp()

let b=new Board().setFromFen()

DEBUG=true