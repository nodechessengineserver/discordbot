let vercodes:{[id:string]:string}={}

function sendResponse(res:any,responseJson:any){
    res.setHeader("Content-Type","application/json")
    res.send(JSON.stringify(responseJson))
}

function handleAjax(req:any,res:any){
    let json=req.body

    console.log("ajax",json)

    let responseJson:any={
        ok:true,
        req:json
    }

    try{
        let t=json.t

        let userCookie=req.cookies.user

        let loggedUser=users.getByCookie(userCookie)

        console.log("logged",loggedUser)

        if(t=="createverificationcode"){
            let username=json.username
            let code=uniqid()

            console.log(`for ${username} created code ${code}`)

            vercodes[username]=code

            responseJson.code=code

            sendResponse(res,responseJson)
        }else if(t=="checkverificationcode"){
            let username=json.username
            let code=vercodes[username]

            checkLichess(username,code,(ok:boolean)=>{
                if(!ok){
                    responseJson.ok=false
                    console.log("check failed")
                    sendResponse(res,responseJson)
                }
                else {                    
                    let cookie=uniqid()
                    responseJson.cookie=cookie
                    console.log(`check ok, created cookie ${cookie}`)

                    let u=new User()
                    u.username=username
                    u.cookie=cookie

                    setUser(u)
                    sendResponse(res,responseJson)
                }
            })
        }else if(t=="login"){

        }
    }catch(err){
        responseJson.ok=false
        logErr(err)
        sendResponse(res,responseJson)
    }
}

module.exports.handleAjax=handleAjax