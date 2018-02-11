let DRY=true
//login(LICHESS_USER,LICHESS_PASS,()=>getPlayerHandles(0,20,handles=>sendPlayers(handles)))

var fetch = require('node-fetch');
var FormData = require('form-data');

let LICHESS_USER=process.env.LICHESS_USER
let LICHESS_PASS=process.env.LICHESS_PASS

let LICHESS_ATOMIC_TOP200_URL=`https://lichess.org/player/top/200/atomic`

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
        console.log(handles.join(","));
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

I'm glad to announce that the Atomic Chess Theoreticians Team has launched its Discord Server.

Discord is a very advanced chat server designed for gamers.

It has high quality formatting, customizability, bots that can have custom code and perform useful functions. It is possible to link games, web pages for which a preview will be shown in the post.

Everybody is on Discord nowadays, you should be too.

I hereby invite you to join the server, which you can do by clicking on this invite link:

https://discord.gg/TvgMYfc

Of course if you are not a team member already, I also invite you to the Atomic Chess Theoreticians Team itself:

https://lichess.org/team/atomic-chess-theoreticians
`

console.log("remaining "+handles.length)

sendMessage(handle,subject,message,(content)=>
    console.log("message sent, response length: "+content.length))

setTimeout(sendPlayers.bind(this,handles),DRY?1000:10000)
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

function processTopList(n,content){
    let toplist=[]
    let players=content.split(`href="/@/`);
    table="`"+`${sformat("",3)} | ${sformat("Player",20)} | ${sformat("Rtg.",4)} | ${sformat("Tit",3)} 
 ${sformat("----",3)}---${sformat("---------------------",20)}---${sformat("----",4)}---${sformat("---",3)} 
`
    for(let i=1;i<=n;i++){
        let chunk=players[i]
        let chunkparts=chunk.split(`"`);
        let player=chunkparts[0]
        let tdparts=chunk.split(`<td>`);
        let tdparts2=tdparts[1].split(`</td>`)
        let rating=tdparts2[0]
        let title=""
        LICHESS_TITLES.map(t=>{if(chunk.indexOf(">"+t+"<")>=0) title=t})
        table+=` ${sformat(""+i,3)} | ${sformat(player,20)} | ${sformat(rating,4)} | ${sformat(title,3)} 
`
    }
    return table+"`"
}

function getTopList(n,callback){
    fetch((`${LICHESS_ATOMIC_TOP200_URL}`),{        
    }).
    then(response=>response.text()).
    then(content=>callback(processTopList(n,content)))
}

module.exports.getPlayers=getPlayers
module.exports.getPlayerHandles=getPlayerHandles
module.exports.sendPlayers=sendPlayers
module.exports.sendMessage=sendMessage
module.exports.getTopList=getTopList

