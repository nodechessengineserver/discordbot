var fetch = require('node-fetch');
var FormData = require('form-data');

let lila2=process.env.lila2

//console.log(lila2)

function login(user,pass,lcontent,callback){
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
        fetch("https://lichess.org",{
            headers:{
                'Cookie': `lila2=${lila2}`
            }
        }).
        then(response=>response.text()).
        then(content=>callback(lcontent+content))
    })
}

function getLogin(user,pass,callback){    
    fetch("https://lichess.org/login?referrer=/",{}).
    then(response=>response.text()).
    then(content=>login(user,pass,content,callback))
}

function getPlayers(callback){
    fetch("https://lichess.org/player/top/200/atomic",{
        headers: {
            'Cookie': `lila2=${process.env.lila2}`
        }
    }).then(response=>response.text()).then(content=>callback(content))
}

function getPlayerHandles(max,callback){
    getPlayers(content=>{
        let parts=content.split(`href="/@/`);
        let handles=[]
        for(let i=1;i<Math.min(parts.length,max+1);i++){
            let parts2=parts[i].split(`"`);
            let handle=parts2[0];
            handles.push(handle)            
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
let subject="";
let message=`
`

console.log("remaining "+handles.length)

sendMessage(handle,subject,message,(content)=>
    console.log("message sent, response length: "+content.length))

setTimeout(sendPlayers.bind(this,handles),10000)
}

function sendMessage(user,subject,message,callback){
    let form=new FormData()
    form.append("username",user);
    form.append("subject",subject);
    form.append("text",message);
    fetch((`https://lichess.org/inbox/new?username=${user}`),{
        method:"POST",
        headers: {
            'Cookie': `lila2=${process.env.lila2}`
        },
        body:form
    }).then(response=>response.text()).then(content=>callback(content))
}

//getPlayerHandles(3,handles=>sendPlayers(handles))

module.exports.login=login
module.exports.getLogin=getLogin
module.exports.getPlayers=getPlayers
module.exports.getPlayerHandles=getPlayerHandles
module.exports.sendPlayers=sendPlayers
module.exports.sendMessage=sendMessage