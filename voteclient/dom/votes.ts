class VoteSummary extends DomElement<VoteSummary>{
    vote:Vote=new Vote()

    constructor(){        
        super("div")
    }

    setVote(vote:Vote):VoteSummary{
        this.vote=vote
        return this.build()
    }

    summaryDiv:Div=new Div()

    deleteVoteClicked(){
        const t:AJAX_REQUEST="deletevote"
        ajaxRequest({
            t:t,
            v:this.vote.toJson()
        },(res:any)=>{
            loadVotes()
        })
    }

    build():VoteSummary{
        this.x.a([
            this.summaryDiv=new Div().ac("votesummarydiv").a([
                new Div().ac("votesummarytitle").h(this.vote.question),
                new Div().ac("votesummaryowner").h(this.vote.owner.username)
            ])
        ])

        if(this.vote.owner.e(loggedUser)){
            this.summaryDiv.a([
                new Div().ac("votesummarycontrol").a([
                    new Button("Delete").onClick(this.deleteVoteClicked.bind(this))
                ])
            ])
        }

        return this
    }
}

class VoteSummaries extends DomElement<VoteSummaries>{
    votes:Vote[]=[]

    constructor(){
        super("div")
    }

    setVotes(votes:Vote[]):VoteSummaries{
        this.votes=votes
        return this.build()
    }

    createVoteClicked(){
        const t:AJAX_REQUEST="createvote"
        new TextInputWindow("createvoteinput","","Create vote","Enter vote question.",(question:string)=>{
            ajaxRequest({
                t:t,
                question:question
            },(res:any)=>{
                if(res.ok){
                    //console.log("vote created ok")
                    loadVotes()
                }else{
                    //console.log("vote creation failed",res.status)
                }
            })
        },{width:800})
    }

    build():VoteSummaries{
        this.x.a([
            new Button("Create vote").onClick(this.createVoteClicked.bind(this))
        ])
        this.a(this.votes.map((vote:Vote)=>new VoteSummary().setVote(vote)))
        return this
    }
}