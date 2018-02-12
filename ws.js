// system
const WebSocket = require("ws")
const uniqid = require("uniqid")

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

module.exports.getStats=getStats