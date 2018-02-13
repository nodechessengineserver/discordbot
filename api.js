// local
const GLOBALS=require("./globals")
const atombot=require("./atombot")
const testbot=require("./testbot")
const tourney=require("./tourney")

function send(res,json){
    res.send(JSON.stringify(json))
}

function handleApi(req,res){
    if(GLOBALS.isProd()){
        handleApiFunc(req,res)
    }else{
        send(res,{ok:false,status:"development mode"});
    }
}

function handleApiFunc(req,res){
    res.setHeader("Content-Type","application/json")

    let body=req.body;
    let action=body.action;
    console.log("handle API",action);
    if(action==undefined){
        send(res,{ok:false,status:"action missing"});
    }
    else if(action=="say"){
        let content=body.content;
        try{
            testbot.getTourneyChannel().send(content);
            send(res,{ok:true,status:"ok"});
        }catch(err){
            send(res,{ok:false,status:"sayGeneral failed"});
        }        
        return
    }
    else if(action=="t"){
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
    else if(action=="top"){
        let n=body.n;
        try{
            testbot.purgeTourneyChannel()
            testbot.getAndSendTopList(testbot.getTourneyChannel(),n);
            send(res,{ok:true,status:"ok"});
        }catch(err){
            console.log(err);
            send(res,{ok:false,status:"getAndSetTopList failed"});
        }
    }
    else if(action=="cmp"){
        let handle=body.handle;
        let handlearg=body.handlearg;
        try{
            testbot.cmpPlayers(testbot.getTourneyChannel(),handle,handlearg);
            send(res,{ok:true,status:"ok"});
        }catch(err){
            console.log(err);
            send(res,{ok:false,status:"cmpPlayers failed"});
        }
    }

    send(res,{ok:false,status:"unknown action"})
}

////////////////////////////////////////
// Exports

module.exports.handleApi=handleApi

////////////////////////////////////////