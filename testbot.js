// Load up the discord.js library
const Discord = require("discord.js");

const fetch=require("./fetch")
const tourney=require("./tourney")
const lichess = require('lichess-api');

const GLOBALS = require("./globals")

const chess = require("./chess")

let client
module.exports.client=client
module.exports.getAndSendTopList=getAndSendTopList;
module.exports.createTourneyCommand=createTourneyCommand;
module.exports.cmpPlayers=cmpPlayers
module.exports.getTourneyChannel=getTourneyChannel

function getTourneyChannel(){
  return GLOBALS.getChannelByName(client,"tourney")
}

function getLichessUsers(handle1,handle2,callback,errcallback){
  lichess.user(handle1, function (err, user) {      
      if(err){
          errcallback();
      }else{
          let json1;
          try{
              json1=JSON.parse(user);
          }catch(err){errcallback();return;}
          lichess.user(handle2, function (err, user) {
              if(err){
                  errcallback();
              }else{
                  let json2
                  try{
                      json2=JSON.parse(user);
                  }catch(err){errcallback();return;}
                  callback(json1,json2);
              }
          })
      }
  })
}

function cmpPlayers(channel,handle,handlearg){
  channel.send(`comparing *${handle}'s* rating to *${handlearg}*
__                                                               __

`);
  getLichessUsers(handle,handlearg,(json1,json2)=>{   
      if((json1.perfs==undefined)||(json2.perfs==undefined)){
        console.log(json1,json2);
        channel.send(`:triangular_flag_on_post: error: perfs missing`);    
        return;
      }
      let a1=json1.perfs.atomic;
      let a2=json2.perfs.atomic;
      if((a1==undefined)||(a2==undefined)){
          channel.send(`:triangular_flag_on_post: error: atomic rating missing`);    
      }else{               
          //message.channel.send("difference "+(a1.rating-a2.rating));    
          channel.send(`:white_check_mark: success:
__                                                               __

**${handle}'s** rating: **${a1.rating}** , total games played: *${a1.games}* , registered: *${new Date(json1.createdAt).toLocaleString()}* , followers: *${json1.nbFollowers}*
__                                                               __

**${handlearg}**'s rating: **${a2.rating}** , total games played: *${a2.games}* , registered: *${new Date(json2.createdAt).toLocaleString()}* , followers: *${json2.nbFollowers}*
__                                                               __

rating difference: **${a1.rating-a2.rating}**
`)
            }
  },()=>{
      channel.send(`:triangular_flag_on_post: error: user not found`);
  })     
}

function getAndSendTopList(channel,n){
  fetch.getTopList(n,(table)=>channel.send(`Top ${n} Active Atomic Players:

  ${table}
  `));  
}

function createTourneyCommand(channel,time,inc){
  channel.send(`Creating ACT Discord Server Tourney ${time}+${inc}
  To join, please visit: https://lichess.org/tournament
  `)
  tourney.loginAndCreateTourney(time,inc)
}

function startBot(){
// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
client = new Discord.Client();

let config={
  prefix:"+"
}

client.on("ready", () => {
  // This event will run if the bot starts, and logs in, successfully.
  console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`); 
  // Example of changing the bot's playing game to something useful. `client.user` is what the
  // docs refer to as the "ClientUser".
  //client.user.setGame(`on ${client.guilds.size} servers`);
});

client.on("guildCreate", guild => {
  // This event triggers when the bot joins a guild.
  console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
  // this event triggers when the bot is removed from a guild.
  console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
  client.user.setGame(`on ${client.guilds.size} servers`);
});


client.on("message", async message => {
  // This event will run on every single message received, from any channel or DM.
  
  // It's good practice to ignore other bots. This also makes your bot ignore itself
  // and not get into a spam loop (we call that "botception").
  if(message.author.bot) return;
  
  // Also good practice to ignore any message that does not start with our prefix, 
  // which is set in the configuration file.
  if(message.content.indexOf(config.prefix) !== 0) return;
  
  // Here we separate our "command" name, and our "arguments" for the command. 
  // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
  // command = say
  // args = ["Is", "this", "the", "real", "life?"]
  const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  
  // Let's go with a few common example commands! Feel free to delete or change those.
  
  if(command === "ping") {
    // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
    // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
  }
  
  if(command === "say") {
    // makes the bot say something and delete the message. As an example, it's open to anyone to use. 
    // To get the "message" itself we join the `args` back into a string with spaces: 
    const sayMessage = args.join(" ");
    // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
    message.delete().catch(O_o=>{}); 
    // And we get the bot to say the thing: 
    //console.log(client.channels);
    //client.channels.get("407793962527752194").send(sayMessage);
    //message.channel.send(sayMessage);
  }

  if(chess.makeMove(command)){    
    //message.channel.send(chess.getBoardText());
    setTimeout((ev)=>{
      message.channel.send(`https://quiet-tor-66877.herokuapp.com/images/board.jpg`)
    },2000)
  }

  if(command=="top"){    
      let n=args[0];
      if(isNaN(n)) n=10;
      if(n>25) n=25;

      getAndSendTopList(message.channel,n);        
  }

  if(command=="t"){
    let time=args[0];
    let inc=args[1];
    createTourneyCommand(message.channel,time,inc);
  }

  if(command=="cmp"){
      let handle=message.author.username
      let handlearg=args[0]
      if(handlearg==undefined){
        message.channel.send("usage: +cmp username");
      }else{
        cmpPlayers(message.channel,handle,handlearg);
      }
  }
  
  if(command === "kick") {
    // This command must be limited to mods and admins. In this example we just hardcode the role names.
    // Please read on Array.some() to understand this bit: 
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
    if(!message.member.roles.some(r=>["Administrator", "Moderator"].includes(r.name)) )
      return message.reply("Sorry, you don't have permissions to use this!");
    
    // Let's first check if we have a member and if we can kick them!
    // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.kickable) 
      return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");
    
    // slice(1) removes the first part, which here should be the user mention!
    let reason = args.slice(1).join(' ');
    if(!reason)
      return message.reply("Please indicate a reason for the kick!");
    
    // Now, time for a swift kick in the nuts!
    await member.kick(reason)
      .catch(error => message.reply(`Sorry ${message.author} I couldn't kick because of : ${error}`));
    message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because: ${reason}`);

  }
  
  if(command === "ban") {
    // Most of this command is identical to kick, except that here we'll only let admins do it.
    // In the real world mods could ban too, but this is just an example, right? ;)
    if(!message.member.roles.some(r=>["Administrator"].includes(r.name)) )
      return message.reply("Sorry, you don't have permissions to use this!");
    
    let member = message.mentions.members.first();
    if(!member)
      return message.reply("Please mention a valid member of this server");
    if(!member.bannable) 
      return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

    let reason = args.slice(1).join(' ');
    if(!reason)
      return message.reply("Please indicate a reason for the ban!");
    
    await member.ban(reason)
      .catch(error => message.reply(`Sorry ${message.author} I couldn't ban because of : ${error}`));
    message.reply(`${member.user.tag} has been banned by ${message.author.tag} because: ${reason}`);
  }
  
  if(command === "purge") {
    // This command removes all messages from all users in the channel, up to 100.
    
    // get the delete count, as an actual number.
    const deleteCount = parseInt(args[0], 10);
    
    // Ooooh nice, combined conditions. <3
    if(!deleteCount || deleteCount < 2 || deleteCount > 100)
      return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");
    
    // So we get our messages, and delete them. Simple enough, right?
    const fetched = await message.channel.fetchMessages({count: deleteCount});
    message.channel.bulkDelete(fetched)
      .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
  }
});

client.login(process.env.DISCORDTESTBOT_TOKEN);
}

module.exports.startBot=startBot