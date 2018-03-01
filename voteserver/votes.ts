const VOTE_TRANSACTIONS_COLL="votetransactions"

let votes:Vote[]=[]

let voteTransactions:VoteTransaction[]=[]

function execTransaction(vt:VoteTransaction){
    let t=vt.t
    if(t=="createvote"){
        let v=new Vote()
        v.question=vt.text
        votes.push(v)
    }
}

function storeAndExecTransaction(vt:VoteTransaction,callback:any){
    const t:MONGO_REQUEST="insertone"
    mongoRequest({
        t:t,
        collName:VOTE_TRANSACTIONS_COLL,
        doc:vt.toJson()
    },(res:any)=>{
        console.log("insert result",res)
        if(res.ok){
            execTransaction(vt)
            callback(res)
        }else{
            callback(res)
        }
    })
}

function voteTransactionsStartup(){
    votes=[]
    voteTransactions=[]
    console.log(`vote transactions startup`)
    mongoRequest({
        t:"findaslist",
        collName:VOTE_TRANSACTIONS_COLL,
        query:{}
    },(res:any)=>{
        if(!res.ok){
            logErr(`vote transactions startup failed: ${res.status}`)
        }else{
            console.log(`vote transactions has ${res.docs.length} records`)            
            for(let doc of res.docs){                                
                let vt=new VoteTransaction().fromJson(doc)
                voteTransactions.push(vt)
                execTransaction(vt)
            }
        }
    })
}