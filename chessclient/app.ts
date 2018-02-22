DEBUG=false

let PING_INTERVAL=5000
let SOCKET_TIMEOUT=30000
let USER_COOKIE_EXPIRY=365

let CHATDIV_HEIGHT=225
let CHATDIV_WIDTH=375

let WS_URL=`ws://${document.location.host}/ws`

let SU=new SystemUser()

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
                loggedUser=createUserFromJson(json.u)
                console.log(`set user ${loggedUser}`)
                setCookie("user",loggedUser.cookie,USER_COOKIE_EXPIRY)
                setLoggedUser()
            }else if(t=="userlist"){                
                userlist=new UserList().fromJson(json.userlist)
                console.log(`set userlist`,userlist)
                setUserList()
            }else if(t=="setboard"){                
                let boardJson=json.boardJson
                //console.log("setboard",boardJson)
                let gn=new GameNode().fromJson(boardJson)                
                gboard.b.fromGameNode(gn,true)                
                let cl=new ChangeLog().fromJson(json.changeLog)
                gboard.b.changeLog=cl
                handleChangeLog(cl)
            }else if(t=="chat"){
                let u=createUserFromJson(json.u)
                chatItems.unshift(new ChatItem(u,json.text))
                showChat()
            }else if(t=="reset"){
                gboard.b.newGame()
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

function playClicked(pi:PlayerInfo){
    if(loggedUser.empty()){
        new AckInfoWindow("You have to be logged in to play!").build()
    }else{        
        emit({
            t:"sitplayer",
            color:pi.color,
            u:loggedUser
        })
    }
}

function playBotClicked(pi:PlayerInfo){    
    emit({
        t:"sitplayer",
        color:pi.color,
        u:new BotUser()
    })
}

function offerDrawClicked(pi:PlayerInfo){
    emit({
        t:"offerdraw",
        color:pi.color
    })
}

function acceptDrawClicked(pi:PlayerInfo){
    emit({
        t:"acceptdraw"
    })
}

function standClicked(pi:PlayerInfo){
    emit({
        t:"standplayer",
        color:pi.color
    })
}

function resignClicked(pi:PlayerInfo){
    emit({
        t:"resign",
        color:pi.color
    })
}

function createGuiPlayerInfo(color:number):GuiPlayerInfo{
    let gpi=new GuiPlayerInfo().
    setPlayColor(color).
    setPlayCallback(playClicked).
    setPlayBotCallback(playBotClicked).
    setAcceptDrawCallback(acceptDrawClicked).
    setOfferDrawCallback(offerDrawClicked).
    setStandCallback(standClicked).
    setResignCallback(resignClicked)
    return gpi
}

let intro:Div
let rules:Div
let playtable:Table
let play:Div
let legalmoves:Div
let gboard:GuiBoard
let boardInfoDiv:Div
let flipButtonSpan:Span
let modposButtonSpan:Span
let gameStatusDiv:Div
let moveInput:TextInput
let chatDiv:Div
let playerDiv:Div
let guiPlayerInfos:GuiPlayerInfo[]=[
    createGuiPlayerInfo(BLACK),
    createGuiPlayerInfo(WHITE)
]
let chatInput:TextInput
let users:Div
let profile:Div
let tabpane:Tabpane
let profileTable:Table
let lagDiv:Div
let lichessUsernameDiv:Div
let lichessRatingDiv:Div
let timeoutDiv:Div
let usernameInputWindow:TextInputWindow
let lichessCodeShowWindow:TextInputWindow
let usernameDiv:Div
let usernameButtonDiv:Div
let userlist:UserList

function setLoggedUser(){
    usernameButtonDiv.x.a([
        loggedUser.empty()?
        new Button("Login").onClick(lichessLogin):
        new Button("Logout").onClick(lichessLogout)
    ])    
    lichessUsernameDiv.h(loggedUser.empty()?"?":loggedUser.username)
    lichessRatingDiv.h(loggedUser.empty()?"?":`${loggedUser.glicko.ratingF()} ( rd : ${loggedUser.glicko.rdF()} )`)
    tabpane.setCaptionByKey("profile",loggedUser.empty()?"Profile":loggedUser.username)
    tabpane.selectTab(loggedUser.empty()?"play":"play")
}

function setUserList(){
    users.x
    userlist.iterate((u:User)=>{
        users.a([
            new Div().ac("user").h(`${u.username} ( ${u.glicko.ratingF()} ) <div class="userdata">( member since: ${new Date(u.registeredAt).toLocaleDateString()} , rd: ${u.glicko.rdF()} )</div>`)
        ])
        if(u.e(loggedUser)){
            let cookie=loggedUser.cookie
            loggedUser=u
            //loggedUser.cookie=cookie
            setLoggedUser()
        }
    })
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
    loggedUser=new User()
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
    //gameStatusDiv.h(gboard.b.gameStatus.score+" "+gboard.b.gameStatus.scoreReason)
    for(let i=0;i<guiPlayerInfos.length;i++){        
        guiPlayerInfos[i].setPlayerInfo(gboard.b.gameStatus.playersinfo.playersinfo[i])
    }            
    buildFlipButtonSpan()
    buildModposButtonSpan()
    buildPlayerDiv()    
}

function dragMoveCallback(algeb:string){
    //console.log("drag move",algeb)
    emit({
        t:"makemove",
        algeb:algeb
    })
}

class ChatItem{
    user:User
    text:string

    constructor(user:User,text:string){
        this.user=user
        this.text=text
    }
}

let chatItems:ChatItem[]=[]

function showChat(){    
    chatDiv.x.h(chatItems.map(item=>
        `${item.user.smartNameHtml()} : <span class="chattext">${item.text}</span>`
    ).join("<br>"))    
}

function chatInputCallback(){    
    let text=chatInput.getTextAndClear()
    emit({
        t:"chat",
        u:loggedUser.toJson(),
        text:text
    })
}

function chatButtonClicked(){
    chatInputCallback()
}

function handleChangeLog(cl:ChangeLog){    
    //console.log("handle change log",cl)        
    let colorName=cl.pi.colorName()
    if(cl.kind=="sitplayer"){        
        chatItems.unshift(new ChatItem(SU,
            `${cl.pi.u.smartNameHtml()} has been seated as ${colorName}`
        ))
        showChat()
        playSound("newchallengesound")
    }else if(cl.kind=="standplayer"){
        chatItems.unshift(new ChatItem(SU,
            `${cl.u.smartNameHtml()} has been unseated as ${colorName} ${cl.reason}`
        ))
        showChat()
        playSound("defeatsound")
    }else if(cl.kind=="movemade"){
        playSound("movesound")
    }else if(cl.kind=="boardreset"){
        playSound("newchallengesound")
    }else if(cl.kind=="ratingscalculated"){
        playSound("newchallengesound")
    }
    gboard.build()
}

function buildPlayerDiv(){
    playerDiv.x.a([
        new Table().bs().a([
            new Tr().a([
                guiPlayerInfos[gboard.flip==0?0:1].build()
            ]),
            new Tr().a([
                chatDiv
            ]),
            new Tr().a([
                guiPlayerInfos[gboard.flip==0?1:0].build()
            ])
        ])
    ])
}

function buildApp(){

    intro=new Div().ac("contentdiv").h(INTRO_HTML)

    rules=new Div().ac("contentdiv").h(PROMOTION_ATOMIC_RULES_HTML)

    users=new Div()

    gboard=new GuiBoard().setPosChangedCallback(boardPosChanged)

    play=new Div().a([
        gboard.build()
    ])

    chatDiv=new Div().z(CHATDIV_WIDTH,CHATDIV_HEIGHT).
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
                new Div().pa().o(3,3).a([
                    playerDiv=new Div()
                ])
            ])            
        ]),
        new Tr().a([
            new Td().cs(2).a([
                moveInput=new TextInput("moveinput").setEnterCallback(moveInputEntered),
                flipButtonSpan=new Span(),
                modposButtonSpan=new Span(),                
                gameStatusDiv=new Div().ib().ml(5),
                boardInfoDiv=new Div().mt(3)
            ]),
            new Td().a([
                chatInput.mt(3),
                new Button("Chat").onClick(chatButtonClicked).mt(3)
            ])
        ])
    ])

    buildPlayerDiv()
    buildFlipButtonSpan()
    buildModposButtonSpan()

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
                new Div().h(`Rating`)
            ]),
            new Td().a([
                lichessRatingDiv=new Div()
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
            new Tab("rules","Rules",rules),
            new Tab("users","Users",users),
            new Tab("play","Play",playtable),
            new Tab("profile","Profile",profile),
            /*new Tab("log","Log",log)*/            
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
    gboard.setFlipCallback(boardPosChanged)
}

function buildFlipButtonSpan(){
    let lseated:boolean=false
    gboard.b.gameStatus.playersinfo.iterate((pi:PlayerInfo)=>{
        if(pi.u.e(loggedUser)){
            gboard.flip=pi.color==WHITE?0:1            
            lseated=true
            gboard.build()
        }
    })    
    flipButtonSpan.x.a([
        lseated?new Span():
        new Button("Flip").onClick((e:Event)=>gboard.doFlip())
    ])
}

function buildModposButtonSpan(){
    modposButtonSpan.x
    if(!gboard.b.allSeated()) modposButtonSpan.a([
        new Button("Del").onClick((e:Event)=>emit({t:"delmove"})),        
        new Button("Reset").onClick((e:Event)=>emit({t:"reset"}))
    ])
}

function playSound(id:string){
    let e=document.getElementById(id)    
    if(e!=null){
        (<HTMLAudioElement>e).play()
    }    
}

setInterval(decClock,1000)

function decClock(){
    if(gboard.b.gameStatus.started){
        for(let gpi of guiPlayerInfos){
            if(gpi.pi.color==gboard.b.turn){
                gpi.pi.showTime-=1000
                gpi.build("gameclockactive")
            }else{
                gpi.build("gameclockpassive")
            }
        }        
    }
}

buildApp()

DEBUG=true