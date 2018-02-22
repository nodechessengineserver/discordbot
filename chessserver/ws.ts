let SOCKET_TIMEOUT=GLOBALS.ONE_SECOND*60
let SOCKET_MAINTAIN_INTERVAL=GLOBALS.ONE_SECOND*60
let UNSEAT_TIMEOUT=GLOBALS.ONE_MINUTE*2
let BOARD_MAINTAIN_INTERVAL=GLOBALS.ONE_SECOND*1

let b=new Board().newGame()

let sockets:any={}

function updateUsers(us:User[]){
    storeUsers(us)
    broadcastUserList()
}

setInterval(maintainBoard,BOARD_MAINTAIN_INTERVAL)

function maintainBoard(){    
    let refresh=false
    b.iteratePlayersinfo((pi:PlayerInfo)=>{
        let now=new Date().getTime()
        let elapsed=now-pi.seatedAt        
        if((elapsed>UNSEAT_TIMEOUT)&&(pi.canStand)){            
            b.standPlayer(pi.color)            
            b.changeLog.reason="( timeout )"
            refresh=true
        }
    })
    if(refresh) broadcastBoard()
    if(b.gameStatus.started){
        b.gameStatus.playersinfo.iterate((pi:PlayerInfo)=>{
            if(b.turn==pi.color){
                let diff=new Date().getTime()-pi.startedThinkingAt                
                if(diff>pi.time){
                    b.flagPlayer(pi.color)

                    let us=b.calculateRatings()
                    updateUsers(us)

                    pi.time=0
                    broadcastBoard()
                }
            }
        })
    }
}

function maintainSockets(){    
    try{
        let delsris=[]
        for(let sri in sockets){
            let socket=sockets[sri]
            let now=new Date().getTime()
            let lastping=socket.ping||0
            let elapsed=now-lastping            
            if(elapsed>SOCKET_TIMEOUT){
                try{
                    let ws=socket.ws
                    if(isOpen(ws)){
                        socket.close(1000)
                    }
                    delsris.push(sri)
                }catch(err){
                    console.log("socket close",err)
                }
            }            
        }

        if(delsris.length>0){
            console.log("sockets to delete",delsris)
            for(let sri of delsris){
                delete sockets[sri]
            }
            //console.log("sockets",sockets)
        }
    }catch(err){
        console.log(err)
    }
}

setInterval(maintainSockets,SOCKET_MAINTAIN_INTERVAL)

function isOpen(ws:any){
    return ws.readyState == WebSocket_.OPEN
}

function send(ws:any,json:any){
    try{
        if(isOpen(ws)){
            let jsontext=JSON.stringify(json)
            //console.log("sending",jsontext)
            ws.send(jsontext)
        }
    }catch(err){console.log(err)}
}

function broadcast(json:any){
    for(let sri in sockets){
        let socket=sockets[sri]
        let ws=socket.ws
        send(ws,json)
    }
}

function setBoardJson(){        
    b.actualizeShowTime()
    return ({
        t:"setboard",
        boardJson:b.getCurrentGameNode().toJson(),
        changeLog:b.changeLog.toJson()
    })
}

function setUserListJson(){
    return({
        t:"userlist",
        userlist:users.toJson(true) // don't send cookies
    })
}

function sendUserlist(ws:any){send(ws,setUserListJson())}

function broadcastUserList(){
    broadcast(setUserListJson())
}

function sendBoard(ws:any){send(ws,setBoardJson())}

function broadcastBoard(){
    broadcast(setBoardJson())
    b.clearChangeLog()
}

function handleWs(ws:any,req:any){    
    try{        
        let ru=req.url
        let sri="unknown sri"
        console.log("websocket connected",ru)

        let parts=ru.split("sri=")
        if(parts.length>1){
            // valid socket connected
            sri=parts[1]
            let now=new Date().getTime()
            sockets[sri]={
                ws:ws,
                ping:now
            }
            
            // send board for first time
            sendBoard(ws)
        }

        let headers=req.headers
        let cookies:any={}

        if(headers!=undefined){
            let cookieAll=headers.cookie
            if(cookieAll!=undefined){            
            let cookiesAll=cookieAll.split(/;\s*/)
                
                for(let cookieStr of cookiesAll){
                    let parts=cookieStr.split("=")
                    let name=parts[0]
                    let value=parts[1]
                    cookies[name]=value
                }
                //console.log(cookies)
            }    
        }

        let loggedUser:User=new User()

        function setUser(){
            console.log("setting user",loggedUser)
            send(ws,({
                t:"setuser",
                u:loggedUser.toJson()
            }))
            sendBoard(ws)
        }

        let userCookie:any=cookies["user"]

        checkCookie(userCookie,(result:any)=>{
            if(result.ok){
                loggedUser=result.user                                
                console.log(`logged user`,loggedUser)
                setUser()
            }
        })

        sendUserlist(ws)

        ws.on('message', (message:any)=>{
            try{
                //console.log(message)
                let json=JSON.parse(message)
                let t=json.t
                //console.log("action",t)
                if(t=="ping"){
                    send(ws,{
                        t:"pong",
                        time:json.time
                    })
                    sockets[sri]["ping"]=new Date().getTime()
                }else if(t=="lichesslogin"){
                    console.log(t)
                    let username=json.username
                    createLogin(username,(code:any)=>{
                        console.log(`sending code for ${username} ${code}`)                        
                        send(ws,{
                            t:"lichesscode",
                            username:username,
                            code:code
                        })
                    })
                }else if(t=="checklichesscode"){
                    console.log(t)
                    let username=json.username
                    let code=json.code
                    checkLichess(username,code,(ok:any)=>{
                        console.log(`check result = ${ok}`)
                        if(ok){
                            registerUser(username,(cookie:any)=>{
                                send(ws,{
                                    t:"userregistered",
                                    username:username,
                                    cookie:cookie
                                })
                                sendUserlist(ws)
                            })
                        }else{
                            send(ws,{
                                t:"usercheckfailed",
                                username:username
                            })
                        }
                    })
                }else if(t=="userloggedin"){                                        
                    loggedUser=users.getByCookie(json.cookie)
                    console.log("logged in",loggedUser)                    
                    setUser()
                }else if(t=="makemove"){
                    if(b.someSeated()||b.allSeated()){
                        let pic=b.gameStatus.playersinfo.getByColor(b.turn)                        
                        if(!pic.u.empty()){
                            let pi=b.gameStatus.playersinfo.getByUser(loggedUser)
                            if(!((pi.color==b.turn)&&(pi.u.e(loggedUser)))){
                                console.log("not eligible")
                                broadcastBoard()
                                return
                            }
                        }
                    }
                    let algeb=json.algeb
                    console.log("makemove",algeb)
                    let oldTurn=b.turn
                    let ok=b.makeAlgebMove(algeb)                                
                    if(ok){           
                        console.log("legal")                        
                        b.changeLog.kind="movemade"

                        if(b.isTerminated()){
                            console.log("game terminated")
                            
                            b.savePlayers()

                            let us=b.calculateRatings()
                            updateUsers(us)

                            broadcastBoard()
                            return
                        }

                        if(b.gameStatus.started){
                            let picold=b.gameStatus.playersinfo.getByColor(oldTurn)
                            picold.time=picold.time-(new Date().getTime()-picold.startedThinkingAt)+b.timecontrol.inc
                            if(picold.time<0){
                                b.del()                                
                                b.flagPlayer(oldTurn)

                                let us=b.calculateRatings()
                                updateUsers(us)

                                picold.time=0
                                broadcastBoard()
                                return
                            }
                        }                                     

                        let pic=b.gameStatus.playersinfo.getByColor(b.turn)                        
                        pic.startedThinkingAt=new Date().getTime()

                        if(pic.u.isBot){
                            b.makeRandomMove()

                            let picafter=b.gameStatus.playersinfo.getByColor(b.turn)                        
                            picafter.startedThinkingAt=new Date().getTime()
                        }

                        if(!b.gameStatus.started){
                            if(b.allSeated()){
                                if(b.fullmoveNumber>=2) b.startGame()
                            }                            
                        }     

                        b.actualizeHistory()
                    }                        
                    broadcastBoard()
                }else if(t=="delmove"){                    
                    console.log("del move")
                    b.del()
                    broadcastBoard()
                }else if(t=="reset"){
                    console.log("reset board")
                    b.newGame()
                    b.changeLog.kind="boardreset"
                    broadcastBoard()
                }else if(t=="chat"){                    
                    console.log("chat")
                    broadcast(json)
                }else if(t=="sitplayer"){
                    let u=createUserFromJson(json.u)
                    console.log("sit player",u)
                    let color=json.color                    
                    b.sitPlayer(color,u)       
                    if(b.allSeated()){
                        b.newGame()
                        let pi=b.gameStatus.playersinfo.getByColor(WHITE)
                        if(pi.u.isBot){
                            b.makeRandomMove()
                        }
                    }
                    broadcastBoard()
                }else if(t=="standplayer"){                    
                    let color=json.color       
                    console.log("stand player",color)             
                    b.standPlayer(color)                                                            
                    broadcastBoard()
                }else if(t=="resign"){
                    let color=json.color
                    console.log("resign",color)

                    b.resignPlayer(color)                                                            

                    let us=b.calculateRatings()
                    updateUsers(us)

                    broadcastBoard()
                }else if(t=="offerdraw"){
                    let color=json.color
                    console.log("offer draw",color)
                    b.offerDraw(color)
                    broadcastBoard()
                }else if(t=="acceptdraw"){
                    console.log("draw accepted")

                    b.drawByAgreement()

                    let us=b.calculateRatings()
                    updateUsers(us)

                    broadcastBoard()
                }
            }catch(err){console.log(err)}
        })
        ws.on('error', (error:any)=>{
            console.log(error)
        })
        ws.on('close', function(){
            console.log("websocket closed",sri)
        })
    }catch(err){
        console.log(err)
    }    
}
