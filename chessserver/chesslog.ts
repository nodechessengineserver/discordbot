let CHESSLOG_MAX_AGE = GLOBALS.ONE_DAY*30

class ChessLogItem{
    time:number=new Date().getTime()
    username:string=""
    action:string=""

    constructor(username:string="",action:string=""){
        this.username=username
        this.action=action
    }

    toJson():any{
        return({
            time:this.time,
            username:this.username,
            action:this.action
        })
    }

    fromJson(json:any):ChessLogItem{
        if(json==undefined) return this

        if(json.time!=undefined) this.time=json.time
        if(json.username!=undefined) this.username=json.username
        if(json.action!=undefined) this.action=json.action

        return this
    }
}

class ChessLog{
    items:ChessLogItem[]=[]

    add(item:ChessLogItem){
        this.items.unshift(item)        
    }

    fromJson(json:any):ChessLog{
        this.items=[]

        if(json==undefined) return this

        for(let key in json){
            let valueJson=json[key]

            let item=new ChessLogItem().fromJson(valueJson)

            this.add(item)
        }

        return this
    }

    asHtml():string{
        let rows=this.items.map(item=>`
<tr>
<td>
<span class="logtime">${new Date(item.time).toLocaleString()}</span>
</td>
<td>
<span class="loguser">${item.username}</span>
</td>
<td>
<span class="logaction">${item.action}</span>
</td>
</tr>`
    ).join("\n")

    return `
<table>
${rows}
</table>`

    }
}

function dbInsertChessLogItem(cli:ChessLogItem){
    if(db!=null){
        try{
            const collection = db.collection(CHESSLOG_COLL)
            let doc=cli.toJson()
            //console.log(`updating chesslog`,doc)            
            collection.insertOne(doc,(error:any,result:any)=>{
                //console.log(`updating chesslog item error = `,error)
            })
            let forget=new Date().getTime()-CHESSLOG_MAX_AGE
            collection.deleteMany({time:{"$lt":forget}},(error:any,result:any)=>{
                //console.log(`deleting old chesslog error = `,error)
                //console.log(`deleted ${result.result.n} item(s)`)
            })
        }catch(err){console.log(GLOBALS.handledError(err))}
    }
}

let chessLog:ChessLog=new ChessLog()

function sendLogPage(req:any, res:any){
    let content=`
<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" href="stylesheets/reset.css">
    <link rel="stylesheet" href="stylesheets/app.css">
</head>

<body>
    ${chessLog.asHtml()}
</body>

</html>`
    res.send(content)
}

function dbChesslogStartup(){
    chessLog=new ChessLog()
    if(db!=null){
        dbFindAsArray(CHESSLOG_COLL,{},function(result:any){
            if(result[0]){
                console.log("chesslog startup failed",GLOBALS.handledError(result[0]))
            }else{
                console.log(`chesslog startup ok, ${result[1].length} item(s)`)
                chessLog.fromJson(result[1])
            }
        })
    }
}

function logChess(item:ChessLogItem){
    chessLog.add(item)
    dbInsertChessLogItem(item)
}
