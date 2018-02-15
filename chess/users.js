// system
const uniqid = require("uniqid")

let users={}
let cookies={}

function createLogin(username,callback){    
    let code=uniqid()
    console.log(`creating login ${username} ${code}`)        
    callback(code)
}

function registerUser(username,callback){
    let cookie=uniqid()
    users[username]={
        username:username,
        cookie:cookie
    }
    cookies[cookie]={
        username:username
    }
    callback(cookie)
}

function checkCookie(cookie,callback){
    console.log(`checking cookie ${cookie}`)
    if(cookie==undefined){
        callback({ok:false})
        return
    }
    let cookieRecord=cookies[cookie]
    if(cookieRecord==undefined){
        callback({ok:false})
        return
    }
    let username=cookieRecord.username
    let user=users[username]
    callback({ok:true,user:user})
}

module.exports.users=users
module.exports.createLogin=createLogin
module.exports.registerUser=registerUser
module.exports.checkCookie=checkCookie