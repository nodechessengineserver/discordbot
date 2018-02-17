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

  if(command=="users"){
    let CHUNK=100
    let page=parseInt(args[0])
    if(isNaN(page)) page=1
    page--
    if(page<0) page=0
    let start=page*CHUNK

    let users=client.users    
    let ids=users.keys()
    let ida=Array.from(ids)

    let content=`**Server users** ( total **${ida.length}** ) - Page **${page+1}** - Listing from **${start+1}** to **${start+CHUNK}**\n\n`
    let ucs=[]
    for(let i=start;i<start+CHUNK;i++){
      if(i<ida.length){
        let id=ida[i]
        ucs.push(`${i+1}. **${users.get(id)["username"]}**`)
      }
    }

    content+=ucs.join(" , ")
    
    console.log(content)
    message.channel.send(content)
  }

} catch(err){
  GLOBALS.unhandledMessageError(err)
} });

client.login(process.env.DISCORDDEVBOT_TOKEN);

}

startBot()