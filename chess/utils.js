// system
let fetch = require("node-fetch")

function checkLichess(username,code,callback){
    console.log(`checking lichess code ${username} ${code}`)
    callback(true)
}

module.exports.checkLichess=checkLichess