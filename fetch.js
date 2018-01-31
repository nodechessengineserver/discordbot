var fetch = require('node-fetch');
var FormData = require('form-data');

let lila2=process.env.lila2

//console.log(lila2)

function getPlayers(callback){
    fetch("https://lichess.org/player/top/200/atomic",{
        headers: {
            'Cookie': `lila2=${process.env.lila2}`
        }
    }).then(response=>response.text()).then(content=>callback(content))
}

function getPlayerHandles(callback){
    getPlayers(content=>{
        let parts=content.split(`href="/@/`);
        let handles=[]
        for(let i=1;i<parts.length;i++){
            let parts2=parts[i].split(`"`);
            let handle=parts2[0];
            handles.push(handle)            
        }
        callback(handles)
    })
}

function sendPlayers(handles){    
if(handles.length<=0){
    console.log("messages sent");
    return
}

let handle=handles.pop()

console.log(handle);
let subject="";
let message=`
`
sendMessage(handle,subject,message,()=>{})

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

module.exports.getPlayers=getPlayers
module.exports.getPlayerHandles=getPlayerHandles
module.exports.sendPlayers=sendPlayers
module.exports.sendMessage=sendMessage