class VoteSummary extends DomElement<VoteSummary>{
    vote:Vote=new Vote()

    constructor(){        
        super("div")
    }

    setVote(vote:Vote):VoteSummary{
        this.vote=vote
        return this.build()
    }

    build():VoteSummary{
        this.x.a([
            new Div().h(this.vote.question)
        ])

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
                    console.log("vote created ok")
                    loadVotes()
                }else{
                    console.log("vote creation failed",res.status)
                }
            })
        })
    }

    build():VoteSummaries{
        this.x.a([
            new Button("Create vote").onClick(this.createVoteClicked.bind(this))
        ])
        this.a(this.votes.map((vote:Vote)=>new VoteSummary().setVote(vote)))
        return this
    }
}