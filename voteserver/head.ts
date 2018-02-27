// system
const fetch_ = require("node-fetch")
const uniqid = require("uniqid")
const mongodb = require("mongodb")

// local


function isDev():boolean{
    return process.env.DISCORD_LOCAL!=undefined
}

function isProd():boolean{
    return !isDev()
}
