let DRY=false

if(process.argv.length>2){
    if(process.argv[2]=="randomletters"){
        setTimeout(function(){
            console.log("sending random letters")
            login(LICHESS_USER,LICHESS_PASS,()=>getPlayerHandles(50,150,handles=>sendPlayers(handles)))
        },5000)
    }
}

// system
const fetch = require('node-fetch');
const FormData = require('form-data');
const lichess = require('lichess-api');

// local
const GLOBALS = require('./globals')

let LICHESS_USER=process.env.LICHESS_USER
let LICHESS_PASS=process.env.LICHESS_PASS

let LICHESS_ATOMIC_TOP200_URL=`https://lichess.org/player/top/200`

let LICHESS_TITLES=["LM","NM","CM","FM","IM","GM"]
LICHESS_TITLES.map(title=>LICHESS_TITLES.push("W"+title))

let lila2

function getLila2(){
    if(lila2!=undefined) return lila2
    return process.env.lila2
}

function login(user,pass,callback){
    console.log(`lichess login in with ${user}`)
    let form=new FormData()
    form.append("username",user);
    form.append("password",pass);
    fetch((`https://lichess.org/login?referrer=/`),{
        method:"POST",
        headers:{
            "Referer":"https://lichess.org/login?referrer=/"
        },
        redirect:"manual",
        body:form
    }).then(response=>{
        cookie=response.headers._headers["set-cookie"][0]        
        let parts=cookie.split("=")
        parts.shift()
        parts=parts.join("=").split(";")
        lila2=parts[0]                
        console.log(`obtained cookie: lila2=${lila2}`)
        callback()
    })
}

function getPlayers(callback){
    fetch("https://lichess.org/player/top/200/atomic",{        
    }).then(response=>response.text()).then(content=>callback(content))
}

function getPlayerHandles(min,max,callback){
    getPlayers(content=>{
        let parts=content.split(`href="/@/`);
        let allhandles=[]
        let handles=[]
        let from=min+1
        let to=Math.min(parts.length,max+1)
        for(let i=1;i<parts.length;i++){
            let parts2=parts[i].split(`"`);
            let handle=parts2[0];
            allhandles.push(i-1)
            allhandles.push(handle)
            if((i>=from)&&(i<to)) handles.push(handle)            
        }
        console.log("all:")
        console.log(allhandles.join(","));
        console.log("selected:")
        if((max-min)>20){
            let rhandles=[]
            for(let i=0;i<20;i++){
                let r=Math.random()*handles.length
                if(r>=handles.length) r=0
                let h=handles.splice(r,1)
                console.log(`rand ${i} : ${h}`)
                rhandles.push(h[0])
            }
            handles=rhandles
        }else{
            console.log(handles.join(","));
        }        
        callback(handles)
    })
}

function sendPlayers(handles){    
console.log("\n#######################")
console.log("sendplayers "+handles.length)

if(handles.length<=0){
    console.log("messages sent");
    return
}

let handle=handles.shift()

console.log("-----------------------\n"+handle+"\n-----------------------");
let subject="Atomic Chess Theoreticians Discord Server";
let message=`Dear Atomic Friend ${handle} !

I'm glad to let you know that the Atomic Chess Theoreticians Team now has its own Discord Server with more than 100 members.

Discord is an upcoming and advanced chat server designed for gamers.

It has high quality formatting, customizability, and bots that perform useful functions.

Everybody is on Discord nowadays, you should be too.

At the server we have developed a new fun variant of Atomic, called promotion atomic.

You can play rated games with clock in this variant here:

http://quiet-tor-66877.herokuapp.com/chess/

I invite you to join the server, which you can do by clicking on this invite link:

https://discord.gg/TvgMYfc

Regards, jatekos ( https://lichess.org/@/jatekos )
`

console.log("remaining "+handles.length)

sendMessage(handle,subject,message,(content)=>
    console.log("message sent, response length: "+content.length))

setTimeout(sendPlayers.bind(this,handles),DRY?1000:5000)
}

function sendMessage(user,subject,message,callback){
    if(DRY){
        callback("dry");
        return;
    }
    let form=new FormData()
    form.append("username",user);
    form.append("subject",subject);
    form.append("text",message);
    fetch((`https://lichess.org/inbox/new?username=${user}`),{
        method:"POST",
        headers: {
            'Cookie': `lila2=${getLila2()}`
        },
        body:form
    }).then(response=>response.text()).then(content=>callback(content))
}

function sformat(str,n){
    if(str.length>n) return str.substring(0,n);
    let diff=n-str.length    
    for(let i=0;i<diff;i++) str+="-";
    return str
}

function processTopList(n,variant,content){
    let vdisplay=GLOBALS.VARIANT_DISPLAY_NAMES[variant]
    if(vdisplay==undefined){
        return GLOBALS.illegalVariantMessage(variant)
    }
    let toplist=[]
    let players=content.split(`href="/@/`);
    table="`"+`${sformat("",2)} | ${sformat("Player",20)} | ${sformat("Rtg.",4)} | ${sformat("Tit",3)} 
 ${sformat("----",3)}---${sformat("---------------------",20)}---${sformat("----",4)}---${sformat("---",3)} 
`
    let thress={10:1500,50:1500,100:1500,200:1500}
    for(let i=1;i<=Math.min(200,players.length);i++){
        let chunk=players[i]
        let chunkparts=chunk.split(`"`);
        let player=chunkparts[0]
        let tdparts=chunk.split(`<td>`);
        let tdparts2=tdparts[1].split(`</td>`)
        let rating=tdparts2[0]
        let title=""
        LICHESS_TITLES.map(t=>{if(chunk.indexOf(">"+t+"<")>=0) title=t})
        if(thress[i]!=undefined) thress[i]=rating
        if(i<=n){
            table+=` ${sformat(""+i,3)} | ${sformat(player,20)} | ${sformat(rating,4)} | ${sformat(title,3)}
`
        }        
    }

    table+="`"

    let threscontent=""
    for(let key in thress){
        threscontent+=`**Top ${key}** thresold: **${thress[key]}**\n`
    }

    let tablecontent=n>0?`Top ${n} Active ${vdisplay} Players:

    ${table}
\n`:""

    return tablecontent+threscontent
}

function getTopList(n,variant,callback){
    fetch((`${LICHESS_ATOMIC_TOP200_URL}/${variant}`),{        
    }).
    then(response=>response.text()).
    then(content=>callback(processTopList(n,variant,content)))
}

function quickLogin(callback){
    login(LICHESS_USER,LICHESS_PASS,callback)
}

function getLichessGames(handle,variant,callback,errcallback){
    fetch(`https://lichess.org/api/user/${handle}/games?nb=100&rated=1`)
    .then(response=>response.text())
    .then(content=>{
        try{
            let gamesjsonTotal=JSON.parse(content)
            let gamesjson=gamesjsonTotal.currentPageResults
            callback(gamesjson)        
        }catch(err){
            console.log(err)
            errcallback("Could not find lichess games for this player.")
        }
    })
    .catch(err=>{
        console.log(err)
        errcallback("Could not find lichess games for this player.")
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

////////////////////////////////////////
// Exports

module.exports.getPlayers=getPlayers
module.exports.getPlayerHandles=getPlayerHandles
module.exports.sendPlayers=sendPlayers
module.exports.sendMessage=sendMessage
module.exports.getTopList=getTopList
module.exports.quickLogin=quickLogin
module.exports.getLila2=getLila2
module.exports.LICHESS_USER=LICHESS_USER
module.exports.getLichessGames=getLichessGames
module.exports.getLichessUsers=getLichessUsers

////////////////////////////////////////

