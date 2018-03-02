let vercodes:{[id:string]:string}={}

function sendResponse(res:any,responseJson:any){
    res.setHeader("Content-Type","application/json")
    res.send(JSON.stringify(responseJson))
    console.log("req",responseJson.req,"status",res.status)
}

function handleAjax(req:any,res:any){
    let json=req.body

    console.log("ajax",json)

    let responseJson:any={
        ok:true,
        status:"ok",
        req:json
    }

    try{
        let t:AJAX_REQUEST=json.t

        let userCookie=req.cookies.user

        console.log("user cookie",userCookie)

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
                    let oldu=users.getByUsername(username)

                    let cookie=uniqid()
                    responseJson.cookie=cookie
                    console.log(`check ok, created cookie ${cookie}`)

                    let u=new User()
                    u.username=username

                    if(!oldu.empty()){
                        console.log(`user ${username} already exists`)
                        u=oldu
                    }
                    
                    u.cookie=cookie

                    setUser(u)
                    sendResponse(res,responseJson)
                }
            })
        }else if(t=="login"){
            responseJson.u=loggedUser.toJson()
            sendResponse(res,responseJson)
        }else if(t=="updateuser"){
            let u=createUserFromJson(json.u)
            let oldu=users.getByUsername(u.username)            
            if(!oldu.empty()){
                u.cookie=oldu.cookie
                setUser(u)
                responseJson.u=u.toJson()
                sendResponse(res,responseJson)
            }else{
                responseJson.u=new User()
                sendResponse(res,responseJson)
            }
        }else if(t=="loadvotes"){
            console.log("load votes",loggedUser)
            responseJson.votes=votes.map((vote:Vote)=>vote.toJson())
            sendResponse(res,responseJson)
        }else if(t=="createvote"){
            let question=json.question
            console.log("create vote",question,loggedUser)
        
            if(loggedUser.empty()){
                responseJson.ok=false
                responseJson.status="have to be logged in to create vote"
                sendResponse(res,responseJson)
            }else{
                if(hasQuestion(question)){
                    responseJson.ok=false
                    responseJson.status="question already exists"                    
                    sendResponse(res,responseJson)
                }else if(!checkCredits(CREATE_VOTE_CREDITS)){
                    responseJson.ok=false
                    responseJson.status="vote creation credits surpassed"
                    sendResponse(res,responseJson)
                }else{
                    let vt=new VoteTransaction()

                    vt.t="createvote"                        
                    vt.u=loggedUser                
                    vt.text=question
                    vt.voteId=uniqid()

                    storeAndExecTransaction(vt,(mongores:any)=>{                    
                        responseJson.ok=mongores.ok
                        responseJson.status=mongores.status
                        sendResponse(res,responseJson)
                    })                   
                }                                
            }            
        }else if(t=="createoption"){
            let option=json.option
            let voteId=json.voteId
            console.log("create option",option,voteId,loggedUser)

            let vi=findIndexById(voteId)
        
            if(vi<0){
                responseJson.ok=false
                responseJson.status="no such vote"
                sendResponse(res,responseJson)
                return
            }

            let v=votes[vi]

            if(loggedUser.empty()){
                responseJson.ok=false
                responseJson.status="have to be logged in to create option"
                sendResponse(res,responseJson)
            }else{                
                if(hasOption(v,option)){
                    responseJson.ok=false
                    responseJson.status="option already exists"                    
                    sendResponse(res,responseJson)
                }else if(!checkCredits(CREATE_OPTION_CREDITS)){
                    responseJson.ok=false
                    responseJson.status="option creation credits surpassed"
                    sendResponse(res,responseJson)
                }else{
                    let vt=new VoteTransaction()

                    vt.t="createoption"
                    vt.u=loggedUser                
                    vt.voteId=voteId
                    vt.optionId=uniqid()
                    vt.text=option

                    storeAndExecTransaction(vt,(mongores:any)=>{                    
                        responseJson.ok=mongores.ok
                        responseJson.status=mongores.status
                        sendResponse(res,responseJson)
                    })                   
                }                                
            }            
        }else if(t=="deletevote"){
            let voteId=json.voteId
            console.log("delete vote",voteId)

            let vi=findIndexById(voteId)

            if(vi<0){
                responseJson.ok=false
                responseJson.status="no such vote"
                sendResponse(res,responseJson)
                return
            }

            let v=votes[vi]

            if(!v.empty()){
                responseJson.ok=false
                responseJson.status="vote is not empty"
                sendResponse(res,responseJson)
            }else if(v.owner.e(loggedUser)){
                let vt=new VoteTransaction()

                vt.t="deletevote"
                vt.voteId=voteId

                storeAndExecTransaction(vt,(mongores:any)=>{                    
                    responseJson.ok=mongores.ok
                    responseJson.status=mongores.status
                    sendResponse(res,responseJson)
                })                   
            }else{
                responseJson.ok=false
                responseJson.status="not authorized to delete vote"
                sendResponse(res,responseJson)
            }
        }else if(t=="deleteoption"){
            let voteId=json.voteId            
            let optionId=json.optionId
            console.log("delete option",voteId,optionId)

            let vi=findIndexById(voteId)

            if(vi<0){
                responseJson.ok=false
                responseJson.status="no such vote"
                sendResponse(res,responseJson)
                return
            }

            let v=votes[vi]

            let oi=v.getOptionIndexById(optionId)

            if(oi<0){
                responseJson.ok=false
                responseJson.status="no such option"
                sendResponse(res,responseJson)
                return
            }            
            
            if(v.owner.e(loggedUser)){
                let vt=new VoteTransaction()

                vt.t="deleteoption"
                vt.voteId=voteId
                vt.optionId=optionId

                storeAndExecTransaction(vt,(mongores:any)=>{                    
                    responseJson.ok=mongores.ok
                    responseJson.status=mongores.status
                    sendResponse(res,responseJson)
                })                   
            }else{
                responseJson.ok=false
                responseJson.status="not authorized to delete option"
                sendResponse(res,responseJson)
            }
        }
    }catch(err){
        responseJson.ok=false
        logErr(err)
        sendResponse(res,responseJson)
    }
}

module.exports.handleAjax=handleAjax