let SOCKET_TIMEOUT=GLOBALS.ONE_SECOND*60
let SOCKET_MAINTAIN_INTERVAL=GLOBALS.ONE_SECOND*60

let b=new Board().setFromFen()

let sockets:any={}

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
    return ({
        t:"setboard",
        boardJson:b.getCurrentGameNode().toJson()
    })
}

function sendBoard(ws:any){send(ws,setBoardJson())}
function broadcastBoard(){broadcast(setBoardJson())}

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

        let loggedUser

        let userCookie:any=cookies["user"]
        checkCookie(userCookie,(result:any)=>{
            if(result.ok){
                loggedUser=result.user                
                let username=loggedUser.username
                console.log(`logged user`,loggedUser)
                send(ws,{
                    t:"setuser",
                    username:username,
                    cookie:userCookie
                })
            }
        })

        send(ws,{
            t:"userlist",
            userlist:userList()
        })

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
                                send(ws,{
                                    t:"userlist",
                                    userlist:userList()
                                })
                            })
                        }else{
                            send(ws,{
                                t:"usercheckfailed",
                                username:username
                            })
                        }
                    })
                }else if(t=="userloggedin"){
                    let username=json.username
                    let cookie=json.cookie
                    console.log(`logged in ${username} ${cookie}`)                    
                    send(ws,{
                        t:"setuser",
                        username:username,
                        cookie:cookie
                    })
                }else if(t=="makemove"){
                    let algeb=json.algeb
                    console.log("makemove",algeb)
                    let ok=b.makeAlgebMove(algeb)                    
                    if(ok){                                                
                        console.log("legal")                        
                    }                    
                    broadcastBoard()
                }else if(t=="delmove"){                    
                    console.log("del move")
                    b.del()
                    broadcastBoard()
                }else if(t=="reset"){
                    console.log("reset board")
                    b.newGame()
                    broadcastBoard()
                }else if(t=="chat"){                    
                    console.log("chat")
                    broadcast(json)
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
