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
  .use(morgan('combined'))
  .use('/ajax',bodyParser.json({limit:'1mb'}))
  .use('/vote/ajax',bodyParser.json({limit:'1mb'}))
  .use('/chess',express.static(path.join(__dirname, 'chessclient/public')))
  .use('/vote',express.static(path.join(__dirname, 'voteserver')))
  .use(express.static(path.join(__dirname, 'public')))
  .use(cookieParser())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req:any, res:any) => res.render('pages/index'))
  .get('/chesslog', (req:any, res:any) => sendLogPage(req,res))
  .get('/vote', (req:any, res:any) => voteserver.index(req,res))
  .post("/ajax",(req:any, res:any) => api.handleApi(req,res))
  .post("/vote/ajax",(req:any, res:any) => voteserver.handleAjax(req,res))
  .get("/kill",(req:any, res:any) => process.exit(0))

const server=http.createServer(app)

const wss = new WebSocket_.Server({ server });

wss.on("connection", (ws:any,req:any)=>{
  handleWs(ws,req)
})

server.listen(PORT, () => console.log(`Listening on ${ PORT }`))

////////////////////////////////////////