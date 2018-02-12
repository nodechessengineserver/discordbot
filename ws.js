// system
const WebSocket = require("ws")
const uniqid = require("uniqid")
const nfetch = require("node-fetch")

// local
const fetch = require("./fetch")

let INVITE=`Join ACT Discord Server https://discord.gg/TvgMYfc discuss the game with atomic players and get quality performance statistics`

function getStats(t,callback){
    let id=(uniqid()+"ds239udi76").substring(0,10)

    let url=`wss://socket.lichess.org/lobby/socket/v2?sri=${id}`

    //console.log(`connecting to ${url}`)

    let ws=new WebSocket(url)

    ws.on('message', function incoming(data) {
        try{
            let json=JSON.parse(data)
            if(json.t=="n"){
                ws.close(1001)
                callback(json)
            }
        }catch(err){
            console.log(err)
        }
    })

    ws.on('open',function(){
        //console.log("opened")
        ws.send(`{"t":"${t}"}`)
    })
}

function makePost(tourneyId,content){
    let socketId=(uniqid()+"ds239udi76").substring(0,10)

    let url=`wss://socket.lichess.org/tournament/${tourneyId}/socket/v2?sri=${socketId}`

    console.log(`connecting to ${url}`)

    let cookie=`lila2=${fetch.getLila2()}`

    //console.log(cookie)

    let ws=new WebSocket(url,{
        headers:{
            "Cookie": cookie
        }
    })

    ws.on('message', function incoming(data) {
        try{
            let json=JSON.parse(data)            
            if(json.t=="message"){
                if(json.d.u==fetch.LICHESS_USER){
                    console.log("acknowledged, close socket")
                    ws.close(1001)
                }
            }
        }catch(err){
            console.log(err)
        }
    })

    ws.on('open',function(){
        //console.log("opened")
        let json={
            t:"talk",
            d:content
        }
        let jsontext=JSON.stringify(json)
        console.log("sending",jsontext)
        ws.send(jsontext)
    })
}

// wss://socket.lichess.org/tournament/[id]/socket/v2?sri=[uniqid]

function getTourneys(callback){
    nfetch(`https://lichess.org/api/tournament`).then(
        response=>response.text().then(
            content=>{
                try{
                    let json=JSON.parse(content)
                    callback(json)
                }catch(err){
                    console.log(err)
                }
            },
            error=>console.log(error)
        ),
        error=>console.log(error)
    )
}

function loginAndMakePost(tourneyId,content){
    fetch.quickLogin(function(){
        makePost(tourneyId,content)
    })
}

function makeRandomInvite(){
    getTourneys((json)=>{
        try{
            let started=json.started
            let ts=started/*.filter(t=>t.variant.key=="atomic")*/
            if(ts.length>0){
                let t=ts[Math.floor(Math.random()*ts.length)]
                let id=t.id
                console.log(`selected  ${t.fullName} ${t.variant} ${t.limit} + ${t.increment} ${t.nbPlayers}`)
                loginAndMakePost(id,INVITE)
            }
        }catch(err){
            console.log(err)
        }
    })
}

//makeRandomInvite()

module.exports.getStats=getStats
module.exports.makeRandomInvite=makeRandomInvite