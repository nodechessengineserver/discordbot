// system
let fetch = require("node-fetch")

function checkLichess(username,code,callback){
    console.log(`checking lichess code ${username} ${code}`)

    fetch(`https://lichess.org/@/${username}`).then((response)=>response.text()).
    then((content)=>{
        let index=content.indexOf(code)          

        if(index<0){
            console.log(`lichess auth failed for ${username}`)
            callback(false)
            return
        }else{
            console.log(`lichess auth success for ${username}`)
            callback(true)
            return
        }
    },err=>{
        console.log(err)
        callback(false)
    })    
}

module.exports.checkLichess=checkLichess