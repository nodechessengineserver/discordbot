// system
const Discord = require("discord.js");

// local
const GLOBALS = require("./globals");

let client

function startBot(){

client = new Discord.Client();

client.on("ready", () => {
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
});

client.on("message", async message => { try {
  if(message.author.bot) return;
  if(message.content.indexOf(GLOBALS.COMMAND_PREFIX) !== 0) return;    
  const args = message.content.slice(GLOBALS.COMMAND_PREFIX.length).trim().split(/ +/g);
  let command = args.shift().toLowerCase();

  if(command=="dev"){
    message.channel.send("dev ok")
  }

} catch(err){
  GLOBALS.unhandledMessageError(err)
} });

client.login(process.env.DISCORDDEVBOT_TOKEN);

}

startBot()