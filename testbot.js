// system imports
const Discord = require("discord.js");
const lichess = require('lichess-api');
const uniqid = require('uniqid');
const nfetch = require("node-fetch");
const MongoClient = require('mongodb').MongoClient;
const pimg = require("pureimage")
const fs = require("fs")
const schedule = require("node-schedule")

// local imports
const fetch=require("./fetch");
const tourney=require("./tourney");
const GLOBALS = require("./globals");
const chess = require("./chess");
const vplayers = require("./vplayers")
const ws = require("./ws")

let client

let db=null

let codes={}

function connectDb(){
  try{
    MongoClient.connect(process.env.MONGODB_URI, function(err, client) {
      if(err){
        console.log(err);
        return;
      }else{
        console.log(`connected to mongodb ${process.env.MONGODB_URI}`);
        db = client.db("mychessdb");
      }
    })
  }catch(err){
    console.log(err)
  }
}

function getTourneyChannel(){
  return GLOBALS.getChannelByName(client,"tourney")
}

function getTestChannel(){
  return GLOBALS.getChannelByName(client,"test")
}

let CHART_WIDTH=600
let CHART_HEIGHT=300

function lichessStats(callback){
  try{
    let collection=db.collection("listats")
    collection.find().sort({d:-1}).limit(10).toArray((error,documents)=>{
      if(!error) try{
        let content=""
        documents.map(doc=>{
          content+=`__${new Date(doc.time).toLocaleString()}__ players **${doc.d}** games **${doc.r}**\n`
        })
        callback(content)
      }catch(err){
        console.log(err)
      }    
    })
  }catch(err){
    console.log(err)
  }
}

function createChart(message,handle,ratings,minrating,maxrating){
    
  let n=ratings.length
  let X_SCALE=CHART_WIDTH/n
  let Y_RANGE=maxrating-minrating
  let Y_SCALE=CHART_HEIGHT/Y_RANGE  
  let img=pimg.make(CHART_WIDTH,CHART_HEIGHT)
  let ctx=img.getContext('2d')  
  ctx.fillStyle='#3f3f3f'
  ctx.strokeStyle='#ffff00'
  ctx.fillRect(0,0,CHART_WIDTH,CHART_HEIGHT)
  ctx.lineWidth=5  
  ratings.reverse()
  for(let i=1;i<n;i++){
    let cx0=(i-1)*X_SCALE
    let rating0=ratings[i-1]
    let crating0=rating0-minrating
    let mcrating0=Y_RANGE-crating0
    let cy0=mcrating0*Y_SCALE
    let cx1=i*X_SCALE
    let rating1=ratings[i]
    let crating1=rating1-minrating
    let mcrating1=Y_RANGE-crating1
    let cy1=mcrating1*Y_SCALE
    for(let jx=-1;jx<=1;jx++)
    for(let jy=-1;jy<=1;jy++){
      ctx.beginPath();
      ctx.moveTo(cx0+jx, cy0+jy);
      ctx.lineTo(cx1+jy, cy1+jy);
      ctx.stroke();       
    }    
  }

  pimg.encodePNGToStream(img, fs.createWriteStream(`${__dirname}/public/images/perfs/${handle}.png`)).then(() => {
      console.log(`wrote out the png file to ${handle}.png`);
      let rnd=Math.floor(Math.random()*1e9)
      setTimeout((e)=>{
        message.channel.send(`https://quiet-tor-66877.herokuapp.com/images/perfs/${handle}.png?rnd=${rnd}`)
      },2000)      
  }).catch((e)=>{
      console.log("there was an error writing");
  });
}

function correctRating(rating,dir){
  return rating
}

function createLichessGamesStats(message,handle,games,variant){  
  try{
    let stats=""
    let i=0
    let wins=0
    let losses=0
    let draws=0
    let ratings=[]
    let minrating=3500
    let maxrating=0
    games.map(game=>{
      let white=game.players.white
      let black=game.players.black
      let result="draw"
      if(game.winner=="white") result="1-0"
      if(game.winner=="black") result="0-1"
      let empwhite=result=="1-0"?"**":""
      let empblack=result=="0-1"?"**":""
      let handlel=handle.toLowerCase()            
      if(game.variant==variant){
        let rating=(handlel==white.userId?white.rating:black.rating);
        if(rating>maxrating) maxrating=rating;
        if(rating<minrating) minrating=rating;
        ratings.push(rating)
        if(result=="1-0"){
          if(handlel==white.userId) wins++; else losses++;
        }
        if(result=="0-1"){
          if(handlel==black.userId) wins++; else losses++;
        }
        if(result=="draw") draws++;
        if(i<10){
          let date=new Date(game.createdAt).toLocaleString()
          stats+=`${empwhite}${white.userId}${empwhite} ( ${white.rating} ) - ${empblack}${black.userId}${empblack} ( ${black.rating} ) **${result}** *${date}* <${GLOBALS.shortGameUrl(game.url)}>\n`
        }        
        i+=1
      }    
    })
    if(i==0){
      message.channel.send(GLOBALS.errorMessage(`Could not find ${variant} games in recent lichess games of ${handle}.`))  
    }else{
      let shown=Math.min(10,i)
      stats=`Out of last 100 lichess games __${handle}__ played **${i}** ${variant} games.
Won **${wins}** games, lost **${losses}** games, drawn **${draws}** games.
Min rating: **${minrating}**, max rating: **${maxrating}**. Showing last ${shown} games:

`+stats

      message.channel.send(stats)

      setTimeout((e)=>{
        createChart(message,handle,ratings,correctRating(minrating,0),correctRating(maxrating,1))
      },50)
      
    }    
  }catch(err){
    message.channel.send(GLOBALS.errorMessage(`Could not find ${variant} lichess games for ${handle}.`))
  }
}

function getLichessGames(message,handle,variant){  
  message.channel.send(`Looking for ${variant} games in the last 100 lichess games of __${handle}__.`)
  nfetch(`https://lichess.org/api/user/${handle}/games?nb=100&rated=1`)
  .then(response=>response.text())
  .then(content=>{
      try{
        let gamesjson=JSON.parse(content)
        createLichessGamesStats(message,handle,gamesjson.currentPageResults,variant)
      }catch(err){
        console.log(err)
        message.channel.send(GLOBALS.errorMessage("Could not find lichess games for this player."))
      }
  })
  .catch(err=>{
    console.log(err)
    message.channel.send(GLOBALS.errorMessage("Could not find lichess games for this player."))
  })
}

function getLichessUsers(handle1,handle2,callback,errcallback){
  lichess.user(handle1, function (err, user) {      
      if(err){
          errcallback();
      }else{
          let json1;
          try{
              json1=JSON.parse(user);
          }catch(err){errcallback();return;}
          lichess.user(handle2, function (err, user) {
              if(err){
                  errcallback();
              }else{
                  let json2
                  try{
                      json2=JSON.parse(user);
                  }catch(err){errcallback();return;}
                  callback(json1,json2);
              }
          })
      }
  })
}

function cmpPlayers(channel,handle,handlearg){
  channel.send(`comparing *${handle}'s* rating to *${handlearg}*
__                                                               __

`);
  getLichessUsers(handle,handlearg,(json1,json2)=>{   
      if((json1.perfs==undefined)||(json2.perfs==undefined)){
        console.log(json1,json2);
        channel.send(`:triangular_flag_on_post: error: perfs missing`);    
        return;
      }
      let a1=json1.perfs.atomic;
      let a2=json2.perfs.atomic;
      if((a1==undefined)||(a2==undefined)){
          channel.send(`:triangular_flag_on_post: error: atomic rating missing`);    
      }else{               
          //message.channel.send("difference "+(a1.rating-a2.rating));    
          channel.send(`:white_check_mark: success:
__                                                               __

**${handle}'s** rating: **${a1.rating}** , total games played: *${a1.games}* , registered: *${new Date(json1.createdAt).toLocaleString()}* , followers: *${json1.nbFollowers}*
__                                                               __

**${handlearg}**'s rating: **${a2.rating}** , total games played: *${a2.games}* , registered: *${new Date(json2.createdAt).toLocaleString()}* , followers: *${json2.nbFollowers}*
__                                                               __

rating difference: **${a1.rating-a2.rating}**
`)
            }
  },()=>{
      channel.send(`:triangular_flag_on_post: error: user not found`);
  })     
}

function getAndSendTopList(channel,n){
  fetch.getTopList(n,(table)=>channel.send(`Top ${n} Active Atomic Players:

  ${table}
  `));  
}

function purgeTourneyChannel(){  
  GLOBALS.purgeChannel(getTourneyChannel())
}

function purgeTestChannel(){
  let testchannel=getTestChannel()
  GLOBALS.purgeChannel(testchannel)
  setTimeout((e)=>{
    testchannel.send(`Channel purged at ${new Date().toLocaleString()}.`)
  },5000)
}

function createTourneyCommand(channel,time,inc){
  channel.send(`Creating ACT Discord Server Tourney ${time}+${inc}
  
  To join, please visit: https://lichess.org/tournament
  `)
  tourney.loginAndCreateTourney(time,inc)
}

function upsertOne(collname,query,doc){
  try{
    const collection = db.collection(collname);
    console.log(`upserting ${collname} ${JSON.stringify(query)} ${JSON.stringify(doc)}`)
    collection.updateOne(query,{$set:doc},{upsert:true},(error,result)=>{
      console.log("error",error)
    })
  }catch(err){
    console.log(err)
  }
}

function findOne(collname,query,callback){
  try{
    const collection = db.collection(collname);
    console.log(`finding ${collname} ${JSON.stringify(query)}`)
    collection.findOne(query,(error,result)=>{
      console.log("error",error)
      if(error==null){
        callback(result)
      }
    })
  }catch(err){
    console.log(err)
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

function startBot(){

client = new Discord.Client();

client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
});

client.on("message", async message => { try {
  if(message.author.bot) return;
  execDatabaseCommand(message);
  if(message.content.indexOf(GLOBALS.COMMAND_PREFIX) !== 0) return;    
  const args = message.content.slice(GLOBALS.COMMAND_PREFIX.length).trim().split(/ +/g);
  let command = args.shift().toLowerCase();

  if(command=="ver"){    
    let code=uniqid()
    let username=message.author.username
    codes[username]=code
    message.author.send(`Hi ${username}! Insert this code into your profile: [ **${code}** ] , then type the command: **+check** in the #test channel.`)
    message.channel.send(GLOBALS.infoMessage(
      `You were sent a code. Look in your personal messages for instructions.`
    ))
  }

  if(command=="check"){    
    let username=message.author.username
    code=codes[username]

    if(code=="undefined"){
      message.author.send(`Hi ${username}! To verify your lichess membership, type the command: **+ver** in the #test channel.`)
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

  if(command=="unver"){
    let username=message.author.username
    message.author.send(GLOBALS.infoMessage(
      `You will not be listed as a verified lichess member.`
    ))
    message.channel.send(`:exclamation: **${username}** will no longer be listed as a verified lichess member. :white_check_mark:`)
    try{
      message.member.removeRole(message.guild.roles.find("name", GLOBALS.VERIFIED_LICHESS_MEMBER))
    }catch(err){console.log(err)}
  }

  if(command=="p"){
    let username=args[0]
    lichess.user(username, function (err, user) {
      if(err){
        message.channel.send(GLOBALS.errorMessage(
          `Could not get profile information for **${user}** .`
        ));
      }
      else{
        try{          
          let json=JSON.parse(user)
          //console.log(json)
          let perfs=json.perfs
          let handle=json.username
          let perfscontent=`__                                                                             __
          
**${handle}** [ member since: *${new Date(json.createdAt).toLocaleString()}* , followers: *${json.nbFollowers}* ]
__                                                                             __

`
          for(let variant in perfs){            
            let perf=perfs[variant]
            if(perf.games>0)
              perfscontent+=`__${variant}__ : **${perf.rating}** ( games : ${perf.games} )\n`
          }                    
          if(json.online){
            perfscontent+=`
${handle} is online now on lichess, watch: ${json.url}/tv`
          }
          message.channel.send(perfscontent)
        }catch(err){
          console.log(err)
          message.channel.send(GLOBALS.errorMessage(
            `Could not get profile information for **${username}** .`
          ));
        }
      }
    })
  }

  if(command=="ls"){
    lichessStats(content=>{
      message.channel.send(content)
    })
  }

  if(command=="vp"){
    let vp=vplayers.variantPlayers
    let variants=Object.keys(vp)    
    variants.sort((a,b)=>vp[b]-vp[a])
    let content=""
    for(let variant of variants){
      let num=vp[variant]
      let pref=variant=="atomic"?"**":"__"      
      let disp=GLOBALS.VARIANT_DISPLAY_NAMES[variant]
      content+=`${pref}${disp}${pref} , players this week: **${num}**\n`
    }
    message.channel.send(content)
  }

  if(command=="perf"){
    let handle=args[0]
    let variant=args[1]    
    if(variant==undefined) variant="atomic";
    getLichessGames(message,handle,variant)
  }

  if(command=="fen"){
    command=args[0]
  }

  if(chess.makeMove(command)){    
    setTimeout((ev)=>{
      message.channel.send(`https://quiet-tor-66877.herokuapp.com/images/board.jpg?rnd=${Math.floor(Math.random()*1e9)}`)
    },2000)
  }

  if(command=="top"){    
      let n=args[0];
      if(isNaN(n)) n=10;
      if(n>25) n=25;

      getAndSendTopList(message.channel,n);        
  }

  if(command=="t"){
    let time=args[0];
    let inc=args[1];

    createTourneyCommand(message.channel,time,inc);
  }

  if(command=="cmp"){
      let handle=message.author.username
      let handlearg=args[0]

      if(handlearg==undefined){
        message.channel.send("usage: +cmp username");
      }else{
        cmpPlayers(message.channel,handle,handlearg);
      }
  }

  if(command=="purgetest"){
    purgeTestChannel()
  }

} catch(err){
  GLOBALS.unhandledMessageError(err)
} });

client.login(process.env.DISCORDTESTBOT_TOKEN);

schedule.scheduleJob(`0,15,30,45 * * * *`,function(){
  console.log("logging players and games")
  ws.getStats("p",json=>{        
    try{
      json.time=new Date().getTime()
      delete json["t"]
      console.log(json)
      upsertOne("listats",{time:json.time},json)
    }catch(err){
      console.log(err)
    }
  })
})

}

module.exports.client=client
module.exports.startBot=startBot
module.exports.connectDb=connectDb

module.exports.getAndSendTopList=getAndSendTopList;
module.exports.createTourneyCommand=createTourneyCommand;
module.exports.cmpPlayers=cmpPlayers
module.exports.getTourneyChannel=getTourneyChannel
module.exports.purgeTourneyChannel=purgeTourneyChannel
module.exports.purgeTestChannel=purgeTestChannel