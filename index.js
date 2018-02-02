const express = require('express')
const path = require('path')
const bodyParser = require('body-parser')
const api=require("./api")

const PORT = process.env.PORT || 5000

const atombot=require("./atombot")
const testbot=require("./testbot")
const tourney=require("./tourney")

atombot.startBot()
testbot.startBot()

tourney.loginAndCreateTourney(1,0);

express()
  .use('/ajax',bodyParser.json({limit:'1mb'}))
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .post("/ajax",(req, res) => api.handleApi(req,res))
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))
