////////////////////////////////////////
// determine whether in production mode

function isProd(){
    return ( process.env.DISCORD_LOCAL == undefined );
}

// determine whether in development mode

function isDev(){
    return !isProd();
}

console.log(`application started in ${isProd()?"production":"development"} mode`)

////////////////////////////////////////

let HOST_URL=`https://quiet-tor-66877.herokuapp.com`

let DEFAULT_VARIANT="atomic"

let COMMAND_PREFIX="+"
let VERIFIED_LICHESS_MEMBER="@verifiedlichess"

let ONE_SECOND = 1000 //ms
let ONE_MINUTE = 60 * ONE_SECOND
let ONE_HOUR = 60 * ONE_MINUTE

let ALL_VARIANTS=[
    "bullet",
    "blitz",
    "rapid",
    "classical",
    "ultraBullet",
    "crazyhouse",
    "chess960",
    "kingOfTheHill",
    "threeCheck",
    "antichess",
    "atomic",
    "horde",
    "racingKings"
]

let VARIANT_DISPLAY_NAMES={
    bullet:"Bullet",
    blitz:"Blitz",
    rapid:"Rapid",
    classical:"Classical",
    ultraBullet:"Ultra Bullet",
    crazyhouse:"Crazyhouse",
    chess960:"Chess960",
    kingOfTheHill:"King of the Hill",
    threeCheck:"Three Check",
    antichess:"Antichess",
    atomic:"Atomic",
    horde:"Horde",
    racingKings:"Racing Kings"
}

function rndUrl(url){
    let rnd=Math.floor(Math.random()*1e9)
    return `${url}?rnd=${rnd}`
}

function hostRndUrl(path){
    return rndUrl(`${HOST_URL}/${path}`)
}

function shortGameUrl(url){return url.replace(/(\/white$|\/black$)/,"")}

function getChannelByName(client,name){    
    let channels=client.channels    
    let result=channels.find(item => item.name===name)
    return result
}

function purgeChannel(channel){
    channel.fetchMessages({ limit: 100 })
        .then(messages => {
            channel.bulkDelete(messages)
        })
        .catch(console.error);
}

function errorMessage(errmsg){
    return `:triangular_flag_on_post: Error: ${errmsg}`
}

function successMessage(succmsg){
    return `:white_check_mark: Success: ${succmsg}`
}

function infoMessage(infomsg){
    return `Info: ${infomsg}`
}

function unhandledMessageError(err){
    console.log("*** unhandled message processing error ***")
    console.log(err)
    console.log("******")
}

// replace underscores in username not to mess up markdown
function safeUserName(username){
    return username.replace(/_/g,"-")
}

function handledError(err){
    return `******\n${err}\n******\n`
}

function illegalVariantMessage(variant){
    return errorMessage(
        `Unknown variant ' **${variant}** '. Valid variants are: **${ALL_VARIANTS.join("** , **")}** .`
    )
}

////////////////////////////////////////
// Exports

module.exports.isProd=isProd
module.exports.isDev=isDev

module.exports.getChannelByName=getChannelByName
module.exports.errorMessage=errorMessage
module.exports.successMessage=successMessage
module.exports.infoMessage=infoMessage
module.exports.VERIFIED_LICHESS_MEMBER=VERIFIED_LICHESS_MEMBER
module.exports.COMMAND_PREFIX=COMMAND_PREFIX
module.exports.unhandledMessageError=unhandledMessageError
module.exports.purgeChannel=purgeChannel
module.exports.ONE_SECOND=ONE_SECOND
module.exports.ONE_MINUTE=ONE_MINUTE
module.exports.ONE_HOUR=ONE_HOUR
module.exports.shortGameUrl=shortGameUrl
module.exports.ALL_VARIANTS=ALL_VARIANTS
module.exports.VARIANT_DISPLAY_NAMES=VARIANT_DISPLAY_NAMES
module.exports.safeUserName=safeUserName
module.exports.handledError=handledError
module.exports.illegalVariantMessage=illegalVariantMessage
module.exports.DEFAULT_VARIANT=DEFAULT_VARIANT
module.exports.HOST_URL=HOST_URL
module.exports.rndUrl=rndUrl
module.exports.hostRndUrl=hostRndUrl

////////////////////////////////////////