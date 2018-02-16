// system
const WebSocket = require("ws")

// local
const utils = require("./utils")
const users = require("./users")
const board = require("./board")
const GLOBALS = require("../globals")

let SOCKET_TIMEOUT=GLOBALS.ONE_SECOND*60
let SOCKET_MAINTAIN_INTERVAL=GLOBALS.ONE_SECOND*60

let b=new board.Board().setFromFen()

let sockets={}

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

function isOpen(ws){
    return ws.readyState == WebSocket.OPEN
}

function send(ws,json){
    try{
        if(isOpen(ws)){
            let jsontext=JSON.stringify(json)
            //console.log("sending",jsontext)
            ws.send(jsontext)
        }
    }catch(err){console.log(err)}
}

function broadcast(json){
    for(let sri in sockets){
        let socket=sockets[sri]
        let ws=socket.ws
        send(ws,json)
    }
}

function handleWs(ws,req){    
    try{        
        let ru=req.url
        let sri="unknown sri"
        console.log("websocket connected",ru)

        let parts=ru.split("sri=")
        if(parts.length>1){
            sri=parts[1]
            let now=new Date().getTime()
            sockets[sri]={
                ws:ws,
                ping:now
            }
            //console.log(sockets)

            let fen=b.reportFen()
            send(ws,{
                t:"setboard",
                fen:fen
            })
        }

        let headers=req.headers
        let cookies={}
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

        let userCookie=cookies.user
        users.checkCookie(userCookie,result=>{
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
            userlist:users.userList()
        })

        ws.on('message', message=>{
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
                    users.createLogin(username,code=>{
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
                    utils.checkLichess(username,code,ok=>{
                        console.log(`check result = ${ok}`)
                        if(ok){
                            users.registerUser(username,cookie=>{
                                send(ws,{
                                    t:"userregistered",
                                    username:username,
                                    cookie:cookie
                                })
                                send(ws,{
                                    t:"userlist",
                                    userlist:users.userList()
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
                    let ok=b.makeAlgebMove(algeb)
                    let fen=b.reportFen()                        
                    console.log("makemove",algeb)
                    if(ok){                        
                        fen=b.reportFen()                        
                        console.log("legal",fen)                        
                    }
                    broadcast({
                        t:"setboard",
                        fen:fen
                    })
                }else if(t=="delmove"){
                    console.log("del move")
                    b.del()
                    let fen=b.reportFen()
                    broadcast({
                        t:"setboard",
                        fen:fen
                    })
                }else if(t=="reset"){
                    console.log("reset board")
                    b.setFromFen()
                    let fen=b.reportFen()
                    broadcast({
                        t:"setboard",
                        fen:fen
                    })
                }else if(t=="chat"){                    
                    console.log("chat")
                    broadcast(json)
                }
            }catch(err){console.log(err)}
        })
        ws.on('error', error=>{
            console.log(error)
        })
        ws.on('close', function(){
            console.log("websocket closed",sri)
        })
    }catch(err){
        console.log(err)
    }    
}

module.exports.handleWs=handleWs