function handleWs(ws,req){
    try{
        console.log("websocket connected",req.url)
        ws.on('message', message=>{
            console.log(message)
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