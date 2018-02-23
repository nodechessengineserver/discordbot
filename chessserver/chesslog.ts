class ChessLogItem{
    time:number=new Date().getTime()
    username:string
    action:string

    constructor(username:string,action:string){
        this.username=username
        this.action=action
    }
}

class ChessLog{
    items:ChessLogItem[]=[]

    add(item:ChessLogItem){
        this.items.unshift(item)
        while(this.items.length>1000) this.items.pop()
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
    ).join("<br>\n")

    return `
<table>
${rows}
</table>`

    }
}

const chessLog=new ChessLog()

function sendLogPage(req:any, res:any){
    let content=`
<!DOCTYPE html>
<html>

<head>
    <link rel="stylesheet" href="stylesheets/reset.css">
    <link rel="stylesheet" href="stylesheets/app.css">
</head>

<body>
    Chess log
    <hr>
    ${chessLog.asHtml()}
</body>

</html>`
    res.send(content)
}