// system
const Discord = require("discord.js");
const lichess = require('lichess-api');
const uniqid = require('uniqid');
const nfetch = require("node-fetch");
const MongoClient = require('mongodb').MongoClient;
const pimg = require("pureimage")
const fs = require("fs")
const schedule = require("node-schedule")

// local
const fetch=require("./fetch");
const tourney=require("./tourney");
const GLOBALS = require("./globals");
const chess = require("./chess");
const vplayers = require("./vplayers")
const ws = require("./ws")
const perf = require("./perf")
const chart = require("./chart")

////////////////////////////////////////

let client

////////////////////////////////////////

let codes={}

////////////////////////////////////////
// MongoDb

let db=null

function connectDb(){
  try{
    MongoClient.connect(process.env.MONGODB_URI, function(err, client) {
      if(err){
        console.log(GLOBALS.handledError(err));
      }else{
        console.log(
          `connected to mongodb ${process.env.MONGODB_URI}`
        );
        db = client.db("mychessdb");
      }
    })
  }catch(err){
    console.log(GLOBALS.handledError(err));
  }
}

function upsertOne(collname,query,doc){
  try{
    const collection = db.collection(collname);
    console.log(
      `upserting ${collname} ${JSON.stringify(query)} ${JSON.stringify(doc)}`
    )
    collection.updateOne(query,{$set:doc},{upsert:true},(error,result)=>{
      console.log(GLOBALS.handledError(error))
    })
  }catch(err){
    console.log(GLOBALS.handledError(err))
  }
}

function findOne(collname,query,callback){
  try{
    const collection = db.collection(collname);
    console.log(`finding ${collname} ${JSON.stringify(query)}`)
    collection.findOne(query,(error,result)=>{
      console.log(GLOBALS.handledError(error))
      if(error==null){
        callback(result)
      }
    })
  }catch(err){
    console.log(GLOBALS.handledError(err))
    callback({})
  }
}

function execDatabaseCommand(message){
  if(db==null) return
  let username=message.author.username
  let command=message.content
  let regCreate = /^\$([a-z]+)=([\s\S]+)$/;
  let matchCreate = regCreate.exec(command);  
  if(matchCreate!=null){
    let key=matchCreate[1]
    let value=matchCreate[2]
    console.log(username,key,value)
    if(db!=null){
      upsertOne("discord",{username:username,key:key},{username:username,key:key,value:value})
    }
    return
  }
  let regGet = /^\$([a-z]+)$/;
  let matchGet = regGet.exec(command);  
  if(matchGet!=null){
    let key=matchGet[1]
    findOne("discord",{username:username,key:key},result=>{
      console.log(result)
      let value=result.value
      message.channel.send(value)
    })
  }
}

////////////////////////////////////////

function getTourneyChannel(){
  return GLOBALS.getChannelByName(client,"tourney")
}

function getTestChannel(){
  return GLOBALS.getChannelByName(client,"test")
}

function getGameChannel(){
  return GLOBALS.getChannelByName(client,"game")
}

function lichessStats(callback){
  try{
    let collection=db.collection("listats")
    collection.find().sort({d:-1}).limit(10).toArray((error,documents)=>{
      if(!error) try{
        let content=""
        documents.map(doc=>{
          content+=
            `__${new Date(doc.time).toLocaleString()}__ players **${doc.d}** games **${doc.r}**\n`
        })
        callback(content)
      }catch(err){
        console.log(GLOBALS.handledError(err));
      }    
    })
  }catch(err){
    console.log(GLOBALS.handledError(err));
  }
}

function lichessStatsChart(callback){
  try{
    let collection=db.collection("listats")
    collection.find().toArray((error,documents)=>{
      if(!error) try{        
        let data=documents.map(doc=>doc.d)
        data.reverse()
        chart.createChart({
          name:"lichessstats",
          data:data,
          MOVING_AVERAGE:96,
          MOVING_AVERAGE_FRONT:true
        },callback,err=>{
          console.log(GLOBALS.handledError(err));  
        })
      }catch(err){
        console.log(GLOBALS.handledError(err));
      }    
    })
  }catch(err){
    console.log(GLOBALS.handledError(err));
  }
}

function getAndSendTopList(channel,n,variant){
  if(variant==undefined) variant=GLOBALS.DEFAULT_VARIANT;
  fetch.getTopList(n,variant,(table)=>channel.send(table));  
}

function purgeTourneyChannel(){  
  GLOBALS.purgeChannel(getTourneyChannel())
}

function purgeTestChannel(){
  let testchannel=getTestChannel()
  GLOBALS.purgeChannel(testchannel)
  setTimeout((e)=>{
    testchannel.send(
      `Channel purged at ${new Date().toLocaleString()}.`
    )
  },5000)
}

function purgeGameChannel(){
  let gamechannel=getGameChannel()
  GLOBALS.purgeChannel(gamechannel)
  setTimeout((e)=>{
    gamechannel.send(
      `Please use this channel to play games on the server's board.`
    )
  },5000)
}

function createTourneyCommand(channel,time,inc){
  channel.send(
    `Creating ACT Discord Server Tourney ${time}+${inc}\n\n`+
    `  To join, please visit: https://lichess.org/tournament\n`
  )
  tourney.loginAndCreateTourney(time,inc)
}

////////////////////////////////////////

function startBot(){

client = new Discord.Client();

client.on("ready", () => {
  console.log(
    `TestBot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`
  );
});

client.on("message", async message => { try {
  if(message.author.bot) return;
  execDatabaseCommand(message);
  if(message.content.indexOf(GLOBALS.COMMAND_PREFIX) !== 0) return;    
  const args = message.content.slice(GLOBALS.COMMAND_PREFIX.length).trim().split(/ +/g);
  let command = args.shift().toLowerCase();

  if(GLOBALS.isProd()) if(command=="ver"){    
    let code=uniqid()
    let username=message.author.username
    codes[username]=code
    message.author.send(
      `Hi ${username}! Insert this code into your profile: [ **${code}** ] , then type the command: **+check** in the #test channel.`
    )
    message.channel.send(GLOBALS.infoMessage(
      `You were sent a code. Look in your personal messages for instructions.`
    ))
  }

  if(GLOBALS.isProd()) if(command=="check"){    
    let username=message.author.username
    code=codes[username]

    if(code=="undefined"){
      message.author.send(
        `Hi ${username}! To verify your lichess membership, type the command: **+ver** in the #test channel.`
      )
      return
    }

    nfetch(`https://lichess.org/@/${username}`).then((response)=>response.text()).
      then((content)=>{
          let index=content.indexOf(code)
          let uindex=content.indexOf(`/@/${username}/`)

          if(index<0){
            message.author.send(GLOBALS.errorMessage(
              `Code not found in your profile.`
            ))
            return
          }

          if(uindex<0){
            message.author.send(GLOBALS.errorMessage(
              `Your lichess username is not the same as your Discord username.`
            ))
            return
          }
          
          message.member.addRole(message.guild.roles.find("name", GLOBALS.VERIFIED_LICHESS_MEMBER))
          message.author.send(GLOBALS.successMessage(
            `Your have verified your lichess account.`
          ))
          message.channel.send(
            `:exclamation: **${username}** was verified as a lichess member. :white_check_mark:`
          )
      })    
  }

  if(GLOBALS.isProd()) if(command=="unver"){
    let username=message.author.username
    message.author.send(GLOBALS.infoMessage(
      `You will not be listed as a verified lichess member.`
    ))
    message.channel.send(
      `:exclamation: **${username}** will no longer be listed as a verified lichess member. :white_check_mark:`
    )
    try{
      message.member.removeRole(message.guild.roles.find("name", GLOBALS.VERIFIED_LICHESS_MEMBER))
    }catch(err){
      console.log(GLOBALS.handledError(err));
    }
  }

  if(GLOBALS.isProd()) if(command=="p"){
    let username=""+args[0]

    perf.profile(message,username)
  }

  if(GLOBALS.isProd()) if(command=="ls"){
    lichessStats(content=>{
      message.channel.send(content)
      lichessStatsChart(function(){
        message.channel.send(GLOBALS.hostRndUrl(
          `images/charts/lichessstats.png`
        ))
      })
    })
  }

  if(GLOBALS.isProd()) if(command=="vp"){
    let vp=vplayers.variantPlayers
    let variants=Object.keys(vp)    
    variants.sort((a,b)=>vp[b]-vp[a])
    let content=""
    for(let variant of variants){
      let num=vp[variant]
      let pref=variant==GLOBALS.DEFAULT_VARIANT?"**":"__"      
      let disp=GLOBALS.VARIANT_DISPLAY_NAMES[variant]
      content+=
        `${pref}${disp}${pref} , players this week: **${num}**\n`
    }
    message.channel.send(content)
  }

  if(GLOBALS.isProd()) if(command=="perf"){
    let handle=args[0]
    let variant=args[1]    

    if(variant==undefined) variant=GLOBALS.DEFAULT_VARIANT

    let vdisplay=GLOBALS.VARIANT_DISPLAY_NAMES[variant]

    if(vdisplay==undefined){
      message.channel.send(GLOBALS.illegalVariantMessage(variant))
    }else{
      perf.getLichessGamesStats(message,handle,variant)
    }
  }

  if(GLOBALS.isProd()) if(command=="fen"){
    command=args[0]
  }

  if(GLOBALS.isProd()) if(chess.makeMove(command)){    
    setTimeout((ev)=>{
      message.channel.send(GLOBALS.hostRndUrl(
        `images/board.jpg`
      ))
    },2000)
  }

  if(GLOBALS.isProd()) if(command=="top"){    
      let n=args[0];
      
      if(isNaN(n)) n=10;
      if(n>25) n=25;

      let variant=args[1]

      if(variant==undefined) variant=GLOBALS.DEFAULT_VARIANT;

      getAndSendTopList(message.channel,n,variant);        
  }

  if(GLOBALS.isProd()) if(command=="t"){
    let time=args[0];
    let inc=args[1];

    //createTourneyCommand(message.channel,time,inc);

    message.channel.send(GLOBALS.errorMessage(
      `Sorry, this command has been deprecated.`
    ))
  }

  if(GLOBALS.isProd()) if(command=="cmp"){
      let handle=message.author.username
      let handlearg=args[0]

      if(handlearg==undefined){
        message.channel.send(
          `usage: +cmp username`
        );
      }else{
        perf.cmpPlayers(message,handle,handlearg);
      }
  }

  if(GLOBALS.isProd()) if(command=="purgetest"){
    purgeTestChannel()
  }

  if(GLOBALS.isProd()) if(command=="purgegame"){
    purgeGameChannel()
  }

  if(GLOBALS.isProd()) if(command=="users"){
    let CHUNK=50
    let page=parseInt(args[0])
    if(isNaN(page)) page=1
    page--
    if(page<0) page=0
    let start=page*CHUNK

    let users=client.users    
    let ids=users.keys()
    let ida=Array.from(ids)

    let content=`**Server users** ( total **${ida.length}** ) - Page **${page+1}** - Listing from **${start+1}** to **${start+CHUNK}**\n\n`
    let ucs=[]
    for(let i=start;i<start+CHUNK;i++){
      if(i<ida.length){
        let id=ida[i]
        let user=users.get(id)
        let username=user["username"]        
        ucs.push(`${i+1}. **${username}${user.bot?" [ Bot ]":""}**`)
      }
    }

    content+=ucs.join(" , ")
    
    console.log(content)
    message.channel.send(content)
  }

} catch(err){
  GLOBALS.unhandledMessageError(err)
} });

////////////////////////////////////////
// TestBot login

try{
  client.login(process.env.DISCORDTESTBOT_TOKEN).
  catch(err=>console.log(GLOBALS.handledError(err)))
}catch(err){
  console.log(GLOBALS.handledError(err))
}

////////////////////////////////////////

////////////////////////////////////////
// TestBot scheduling

if(GLOBALS.isProd()) schedule.scheduleJob(`0,15,30,45 * * * *`,function(){
  console.log(
    `logging players and games`
  )
  ws.getStats("p",json=>{        
    try{
      json.time=new Date().getTime()
      delete json["t"]
      console.log(json)
      upsertOne("listats",{time:json.time},json)
    }catch(err){
      console.log(GLOBALS.handledError(err));
    }
  })
})

if(GLOBALS.isProd()) schedule.scheduleJob(`0,5,10,15,20,25,30,35,40,45,50,55 * * * *`,function(){
  //ws.makeRandomInvite()
})

////////////////////////////////////////

}

////////////////////////////////////////
// Exports

module.exports.client=client
module.exports.startBot=startBot
module.exports.connectDb=connectDb

module.exports.getAndSendTopList=getAndSendTopList;
module.exports.createTourneyCommand=createTourneyCommand;
module.exports.getTourneyChannel=getTourneyChannel
module.exports.purgeTourneyChannel=purgeTourneyChannel
module.exports.purgeTestChannel=purgeTestChannel

////////////////////////////////////////