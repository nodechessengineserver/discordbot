function getChannelByName(client,name){    
    let channels=client.channels    
    let result=channels.find(item => item.name===name)
    return result
}

module.exports.getChannelByName=getChannelByName
