const VOTE_TRANSACTIONS_COLL="votetransactions"

let votes:Vote[]=[]

let voteTransactions:VoteTransaction[]=[]

class Credit{
    action:VOTE_TRANSACTION="createvote"
    unaction:VOTE_TRANSACTION="deletevote"
    timeFrame:number=ONE_WEEK
    credit:number=MAX_VOTES_PER_WEEK

    constructor(action:VOTE_TRANSACTION,unaction:VOTE_TRANSACTION,timeFrame:number,credit:number){
        this.action=action
        this.unaction=unaction
        this.timeFrame=timeFrame
        this.credit=credit
    }

    check():boolean{
        let now=new Date().getTime()
        let sum = aggregateTransactions(
            (whileParams:any)=>
                ( now - whileParams.vt.time ) < this.timeFrame,
            (aggregParams:any)=>
                ( aggregParams.vt.t==this.action ? 1 : 0 ) -
                ( aggregParams.vt.t==this.unaction ? 1 : 0 )
        )
        return sum <= this.credit
    }
}

let CREATE_VOTE_WEEKLY_CREDIT=new Credit(
    "createvote",
    "deletevote",
    ONE_WEEK,
    MAX_VOTES_PER_WEEK
)

let CREATE_OPTION_WEEKLY_CREDIT=new Credit(
    "createoption",
    "deleteoption",
    ONE_WEEK,
    MAX_OPTIONS_PER_WEEK
)

let CREATE_VOTE_CREDITS=[CREATE_VOTE_WEEKLY_CREDIT]

let CREATE_OPTION_CREDITS=[CREATE_OPTION_WEEKLY_CREDIT]

function checkCredits(credits:Credit[]):boolean{
    for(let credit of credits) if(!credit.check()) return false
    return true
}

function aggregateTransactions(whileFunc:(whileParams:any)=>boolean,aggregFunc:(aggregParams:any)=>number):number{
    let sum=0
    for(let i=voteTransactions.length-1;i>=0;i--){
        let vt=voteTransactions[i]
        let whileParams={
            vt:vt
        }
        if(!whileFunc(whileParams)) return sum
        let aggregParams={
            vt:vt
        }
        sum+=aggregFunc(aggregParams)
    }
    return sum
}

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
            voteTransactions.push(vt)
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