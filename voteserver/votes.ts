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
        return sum < this.credit
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

function someOption(v:Vote,iterfunc:(o:VoteOption)=>boolean){
    for(let o of v.options){
        if(iterfunc(o)) return true
    }
    return false
}

function hasQuestion(question:string){
    return someVote((v:Vote)=>v.question==question)
}

function hasOption(v:Vote,option:string){
    return someOption(v,(o:VoteOption)=>o.option==option)
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

        v.id=vt.voteId
        v.owner=vt.u        
        v.question=vt.text        

        votes.push(v)
    }else if(t=="deletevote"){
        let vi=findIndexById(vt.voteId)

        if(vi>=0){
            votes.splice(vi,1)
        }
    }else if(t=="createoption"){
        let o=new VoteOption()  

        o.id=vt.optionId
        o.owner=vt.u      
        o.option=vt.text

        let vi=findIndexById(vt.voteId)

        if(vi>=0){
            let v=votes[vi]

            if(v.getOptionIndexById(o.id)<0){
                v.addOption(o)
            }
        }
    }else if(t=="deleteoption"){
        let vi=findIndexById(vt.voteId)

        if(vi>=0){
            let v=votes[vi]

            let oi=v.getOptionIndexById(vt.optionId)

            if(oi>=0){
                v.options.splice(oi,1)
            }
        }
    }else if(t=="castvote"){
        let vi=findIndexById(vt.voteId)

        if(vi>=0){
            let v=votes[vi]

            v.castVote(vt.u,vt.optionId,vt.stars)
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

let patchVotesDone:boolean=false

function patchVotes(){
    if(!patchVotesDone){
        if(!usersStartupDone){
            console.log(`patch votes requested but users startup is not ready`)
            return
        }
        for(let vote of votes){
            console.log(`patching vote ${vote.question}`)
            for(let option of vote.options){
                console.log(`patching option ${option.option}`)
                for(let userVote of option.userVotes){
                    let u=users.users[userVote.u.username]
                    if(u!=undefined){
                        let uc=users.users[userVote.u.username].clone()
                        userVote.u=uc
                    }
                }
            }
        }
        patchVotesDone=true
    }
}