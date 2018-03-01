const VOTE_TRANSACTIONS_COLL="votetransactions"

let votes:Vote[]=[]

let voteTransactions:VoteTransaction[]=[]

function someVote(iterfunc:(v:Vote)=>boolean):boolean{
    for(let v of votes){
        if(iterfunc(v)) return true
    }
    return false
}

function hasQuestion(question:string){
    return someVote((v:Vote)=>v.question==question)
}

function findIndexByQuestion(question:string):number{
    for(let i=0;i<votes.length;i++){
        if(votes[i].question==question) return i
    }
    return -1
}

function findIndexById(id:string):number{
    for(let i=0;i<votes.length;i++){
        if(votes[i].id==id) return i
    }
    return -1
}

function execTransaction(vt:VoteTransaction){
    let t=vt.t
    if(t=="createvote"){
        let v=new Vote()  
        v.question=vt.text
        v.owner=vt.u        
        votes.push(v)
    }else if(t=="deletevote"){
        let i=findIndexByQuestion(vt.v.question)
        if(i>=0){
            votes.splice(i,1)
        }
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