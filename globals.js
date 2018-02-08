let COMMAND_PREFIX="+"
let VERIFIED_LICHESS_MEMBER="@verifiedlichess"

let ONE_SECOND = 1000 //ms
let ONE_MINUTE = 60 * ONE_SECOND
let ONE_HOUR = 60 * ONE_MINUTE

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
    return `:exclamation: Error: ${errmsg}`
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