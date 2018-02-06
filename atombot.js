// system imports
const Discord = require("discord.js");

// local imports
const GLOBALS = require("./globals")

let client;

function sayGeneral(content){
  GLOBALS.getChannelByName(client,"general").send(content);
}

function startBot(){

client = new Discord.Client();

client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);   
});

client.on("message", async message => { try {
  if(message.author.bot) return;
  if(message.content.indexOf(GLOBALS.COMMAND_PREFIX) !== 0) return;
  const args = message.content.slice(GLOBALS.COMMAND_PREFIX.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
    
  if(command === "say") {  
    const sayMessage = args.join(" ");    
    message.delete().catch(O_o=>{}); 
    
    sayGeneral(`:exclamation: **${message.author.username}** wants the world to know that :
__                                                                   __

${sayMessage}
__                                                                   __`);    
  }
    
} catch(err) {
  GLOBALS.unhandledMessageError(err)
} });

client.login(process.env.DISCORDBOT_TOKEN);

}

module.exports.client=client;
module.exports.startBot=startBot

module.exports.sayGeneral=sayGeneral;