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
  .use('/chess',express.static(path.join(__dirname, 'chessclient/public')))
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req:any, res:any) => res.render('pages/index'))
  .post("/ajax",(req:any, res:any) => api.handleApi(req,res))

const server=http.createServer(app)

const wss = new WebSocket_.Server({ server });

wss.on("connection", (ws:any,req:any)=>{
  handleWs(ws,req)
})

server.listen(PORT, () => console.log(`Listening on ${ PORT }`))

////////////////////////////////////////