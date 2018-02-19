// system
const express = require('express')
const WebSocket = require("ws")
const http=require('http');
const path = require('path')
const bodyParser = require('body-parser')

// local
const atombot=require("./atombot")
const testbot=require("./testbot")
const tourney=require("./tourney")
const api=require("./api")
const GLOBALS=require("./globals")
const chessWs=require("./chess/ws")

const PORT = process.env.PORT || 5000

////////////////////////////////////////
// Discord startup

atombot.startBot()
testbot.startBot()
testbot.connectDb()

if(GLOBALS.isProd()) setInterval(testbot.purgeTestChannel,10*GLOBALS.ONE_MINUTE)

////////////////////////////////////////

////////////////////////////////////////
// Server startup

const app=express()
  .use('/ajax',bodyParser.json({limit:'1mb'}))
  .use('/chess',express.static(path.join(__dirname, 'client/public')))
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .post("/ajax",(req, res) => api.handleApi(req,res))

const server=http.createServer(app)

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws,req)=>{
  chessWs.handleWs(ws,req)
})

server.listen(PORT, () => console.log(`Listening on ${ PORT }`))

////////////////////////////////////////