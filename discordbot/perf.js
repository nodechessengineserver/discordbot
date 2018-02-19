// system
const pimg = require("pureimage")
const fs = require("fs")
const lichess = require('lichess-api');

// local
const GLOBALS = require("./globals")
const fetch = require("./fetch")
const chart = require("./chart")

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
            let corrWhiteUserId=GLOBALS.safeUserName(white.userId)
            let corrBlackUserId=GLOBALS.safeUserName(black.userId)
            stats+=`${empwhite}${corrWhiteUserId}${empwhite} ( ${white.rating} ) - ${empblack}${corrBlackUserId}${empblack} ( ${black.rating} ) **${result}** *${date}* <${GLOBALS.shortGameUrl(game.url)}>\n`
          }        
          i+=1
        }    
      })
      if(i==0){
        message.channel.send(GLOBALS.errorMessage(`Could not find ${variant} games in recent lichess games of ${handle}.`))  
      }else{
        let shown=Math.min(10,i)
        let variantd=GLOBALS.VARIANT_DISPLAY_NAMES[variant]
        stats=
            `Out of last 100 lichess games **${handle}** played **${i}** ${variantd} games.\n`+
            `Won **${wins}** games, lost **${losses}** games, drawn **${draws}** games.\n`+
            `Min rating: **${minrating}**, max rating: **${maxrating}**. Showing last ${shown} games:\n\n`+
        stats
  
        message.channel.send(stats)
  
        setTimeout(e=>{          
          chart.createChart({
            name:handle,
            data:ratings,
            FOLDER:"perfs",
            MOVING_AVERAGE:10
          },function(){            
            setTimeout(e=>{
              message.channel.send(GLOBALS.hostRndUrl(
                `images/perfs/${handle}.png`
              ))
            },2000)      
          },function(){
            message.channel.send(GLOBALS.errorMessage("Could not create chart."))
          })
        },50)
        
      }    
    }catch(err){
      message.channel.send(GLOBALS.errorMessage(`Could not find ${variant} lichess games for ${handle}.`))
    }
  }
  
function getLichessGamesStats(message,handle,variant){
    let handleSafe=GLOBALS.safeUserName(handle)
    let variantd=GLOBALS.VARIANT_DISPLAY_NAMES[variant]
    message.channel.send(`Looking for **${variantd}** games in the last 100 lichess games of __${handleSafe}__.`)
    fetch.getLichessGames(handle,variant,gamesjson=>{
        createLichessGamesStats(message,handle,gamesjson,variant)
    },errmsg=>{
        message.channel.send(GLOBALS.errorMessage(errmsg))
    })
}

function profile(message,username){
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
        let handleSafe=GLOBALS.safeUserName(handle)
        let perfscontent=
          `__                                                                             __\n\n`+
          `**${handleSafe}** [ member since: *${new Date(json.createdAt).toLocaleString()}* , followers: *${json.nbFollowers}* ]\n`+
          `__                                                                             __\n\n`
        for(let variant in perfs){            
          let perf=perfs[variant]
          if(perf.games>0)
            perfscontent+=
              `__${variant}__ : **${perf.rating}** ( games : ${perf.games} )\n`
        }                    
        if(json.online){
          perfscontent+=
            `\n${handleSafe} is online now on lichess, watch: ${json.url}/tv`
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

function cmpPlayers(message,handle,handlearg){
  let channel=message.channel
  let handleSafe=GLOBALS.safeUserName(handle)
  let handleargSafe=GLOBALS.safeUserName(handlearg)
  channel.send(
    `comparing *${handleSafe}'s* rating to *${handleargSafe}*\n`+
    `__                                                               __\n\n`
  );
  fetch.getLichessUsers(handle,handlearg,(json1,json2)=>{   
      if((json1.perfs==undefined)||(json2.perfs==undefined)){
        console.log(json1,json2);
        channel.send(
          GLOBALS.errorMessage("Perfs missing.")
        );    
        return;
      }
      let a1=json1.perfs.atomic;
      let a2=json2.perfs.atomic;
      if((a1==undefined)||(a2==undefined)){
          channel.send(
            GLOBALS.errorMessage("Atomic rating missing.")
          );    
      }else{               
          //message.channel.send("difference "+(a1.rating-a2.rating));    
          channel.send(
            `:white_check_mark: success:\n`+
            `__                                                               __\n\n`+
            `**${handleSafe}'s** rating: **${a1.rating}** , total games played: *${a1.games}* , registered: *${new Date(json1.createdAt).toLocaleString()}* , followers: *${json1.nbFollowers}*\n`+
            `__                                                               __\n\n`+
            `**${handleargSafe}**'s rating: **${a2.rating}** , total games played: *${a2.games}* , registered: *${new Date(json2.createdAt).toLocaleString()}* , followers: *${json2.nbFollowers}*\n`+
            `__                                                               __\n\n`+
            `rating difference: **${a1.rating-a2.rating}**`
          )
        }
  },()=>{
      channel.send(
        GLOBALS.errorMessage("User not found.")        
      );
  })     
}

////////////////////////////////////////
// Exports

module.exports.getLichessGamesStats=getLichessGamesStats
module.exports.profile=profile
module.exports.cmpPlayers=cmpPlayers

////////////////////////////////////////