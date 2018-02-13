// system
const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')

// local
const atombot=require("./atombot")
const testbot=require("./testbot")
const tourney=require("./tourney")
const api=require("./api")
const GLOBALS=require("./globals")

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

express()
  .use('/ajax',bodyParser.json({limit:'1mb'}))
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .post("/ajax",(req, res) => api.handleApi(req,res))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

////////////////////////////////////////