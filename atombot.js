// system
const Discord = require("discord.js");

// local
const GLOBALS = require("./globals")

////////////////////////////////////////

let client

////////////////////////////////////////

function sayGeneral(content){
  GLOBALS.getChannelByName(client,"general").send(content);
}

////////////////////////////////////////

function startBot(){

client = new Discord.Client();

client.on("ready", () => {
  console.log(
    `AtomBot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`
  );   
});

client.on("message", async message => { try {
  if(message.author.bot) return;
  if(message.content.indexOf(GLOBALS.COMMAND_PREFIX) !== 0) return;
  const args = message.content.slice(GLOBALS.COMMAND_PREFIX.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
    
  if(GLOBALS.isProd()) if(command === "say") {  
    const sayMessage = args.join(" ");    
    message.delete().catch(O_o=>{}); 
    
    sayGeneral(
      `:exclamation: **${message.author.username}** wants the world to know that :\n`+
      `__                                                                   __\n\n`+
      `${sayMessage}\n`+
      `__                                                                   __`
    );    
  }
    
} catch(err) {
  GLOBALS.unhandledMessageError(err)
} });

////////////////////////////////////////
// AtomBot login

try{
  client.login(process.env.DISCORDBOT_TOKEN).
  catch(err=>console.log(GLOBALS.handledError(err)))
}catch(err){
  console.log(GLOBALS.handledError(err))
}

////////////////////////////////////////

}

////////////////////////////////////////
// Exports

module.exports.client=client
module.exports.startBot=startBot

module.exports.sayGeneral=sayGeneral

////////////////////////////////////////