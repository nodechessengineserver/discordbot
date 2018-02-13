// system
const pimg = require("pureimage")
const fs = require("fs")

// local
const GLOBALS = require("../globals")
const fetch = require("../fetch")

let CHART_WIDTH=600
let CHART_HEIGHT=300

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
  
    pimg.encodePNGToStream(img, fs.createWriteStream(`${__dirname}/../public/images/perfs/${handle}.png`)).then(() => {
        console.log(`wrote out the png file to ${handle}.png`);
        let rnd=Math.floor(Math.random()*1e9)
        setTimeout((e)=>{
          message.channel.send(`https://quiet-tor-66877.herokuapp.com/images/perfs/${handle}.png?rnd=${rnd}`)
        },2000)      
    }).catch(e=>{
        console.log("there was an error writing",e);
    });
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
            `Out of last 100 lichess games __${handle}__ played **${i}** ${variantd} games.\n`+
            `Won **${wins}** games, lost **${losses}** games, drawn **${draws}** games.\n`+
            `Min rating: **${minrating}**, max rating: **${maxrating}**. Showing last ${shown} games:\n\n`+
        stats
  
        message.channel.send(stats)
  
        setTimeout((e)=>{
          createChart(message,handle,ratings,minrating,maxrating)
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

////////////////////////////////////////
// Exports

module.exports.getLichessGamesStats=getLichessGamesStats

////////////////////////////////////////