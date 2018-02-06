// system imports
const Discord = require("discord.js");
const lichess = require('lichess-api');
const uniqid = require('uniqid');
const nfetch = require("node-fetch");

// local imports
const fetch=require("./fetch");
const tourney=require("./tourney");
const GLOBALS = require("./globals");
const chess = require("./chess");

let client

let codes={}

function getTourneyChannel(){
  return GLOBALS.getChannelByName(client,"tourney")
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

function createTourneyCommand(channel,time,inc){
  channel.send(`Creating ACT Discord Server Tourney ${time}+${inc}
  To join, please visit: https://lichess.org/tournament
  `)
  tourney.loginAndCreateTourney(time,inc)
}

function startBot(){

client = new Discord.Client();

client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
});

client.on("message", async message => { try {
  if(message.author.bot) return;  
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

} catch(err){
  GLOBALS.unhandledMessageError(err)
} });

client.login(process.env.DISCORDTESTBOT_TOKEN);

}

module.exports.client=client
module.exports.startBot=startBot

module.exports.getAndSendTopList=getAndSendTopList;
module.exports.createTourneyCommand=createTourneyCommand;
module.exports.cmpPlayers=cmpPlayers
module.exports.getTourneyChannel=getTourneyChannel