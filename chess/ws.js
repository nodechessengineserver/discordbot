// local
let utils = require("./utils")
let users = require("./users")

function send(ws,json){
    try{
        let jsontext=JSON.stringify(json)
        //console.log("sending",jsontext)
        ws.send(jsontext)
    }catch(err){console.log(err)}
}

function handleWs(ws,req){    
    try{        
        console.log("websocket connected",req.url)

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
                console.log(`logged user`,loggedUser)
            }
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
                }
            }catch(err){console.log(err)}
        })
        ws.on('error', error=>{
            console.log(error)
        })
        ws.on('close', function(){
            console.log("websocket closed")
        })
    }catch(err){
        console.log(err)
    }    
}

module.exports.handleWs=handleWs