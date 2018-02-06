const GLOBALS=require("./globals")
const atombot=require("./atombot")
const testbot=require("./testbot")
const tourney=require("./tourney")

function send(res,json){
    res.send(JSON.stringify(json))
}

function handleApi(req,res){
    res.setHeader("Content-Type","application/json")

    let body=req.body;
    let action=body.action;
    console.log("handle API",action);
    if(action==undefined){
        send(res,{ok:false,status:"action missing"});
    }
    if(action=="say"){
        let content=body.content;
        try{
            testbot.getTourneyChannel().send(content);
            send(res,{ok:true,status:"ok"});
        }catch(err){
            send(res,{ok:false,status:"sayGeneral failed"});
        }        
        return
    }
    if(action=="t"){
        let time=body.time;
        let inc=body.inc;
        try{
            testbot.purgeTourneyChannel()
            testbot.createTourneyCommand(testbot.getTourneyChannel(),time,inc);
            send(res,{ok:true,status:"ok"});
        }catch(err){
            console.log(err);
            send(res,{ok:false,status:"createTourneyCommand failed"});
        }        
        return
    }
    if(action=="top"){
        let n=body.n;
        try{
            testbot.purgeTourneyChannel()
            testbot.getAndSendTopList(testbot.getTourneyChannel(),n);
            send(res,{ok:true,status:"ok"});
        }catch(err){
            console.log(err);
            send(res,{ok:false,status:"getAndSetTopList failed"});
        }        
        return
    }
    if(action=="cmp"){
        let handle=body.handle;
        let handlearg=body.handlearg;
        try{
            testbot.cmpPlayers(testbot.getTourneyChannel(),handle,handlearg);
            send(res,{ok:true,status:"ok"});
        }catch(err){
            console.log(err);
            send(res,{ok:false,status:"cmpPlayers failed"});
        }        
        return
    }
    send(res,{ok:false,status:"unknown action"})
}

module.exports.handleApi=handleApi