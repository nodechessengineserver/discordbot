class VoteSummary extends DomElement<VoteSummary>{
    vote:Vote=new Vote()

    showDel:boolean=true

    constructor(){        
        super("div")
    }

    setVote(vote:Vote):VoteSummary{
        this.vote=vote
        return this.build()
    }

    setShowDel(showDel:boolean):VoteSummary{
        this.showDel=showDel
        return this
    }

    summaryDiv:Div=new Div()

    deleteVoteClicked(){
        const t:AJAX_REQUEST="deletevote"
        ajaxRequest({
            t:t,
            voteId:this.vote.id
        },(res:any)=>{
            if(res.ok){
                loadVotes({
                    clearSelVote:true
                })
            }else{
                new AckInfoWindow(`<span class="errspan">Failed to delete vote:</span><br><br><span class="errreasonspan">${res.status}</span>`,function(){}).build()
            }       
        })
    }

    voteTitleClicked(){
        selVote=this.vote
        buildVoteDiv()
        app.mainTabpane.selectTab("vote")
    }

    build():VoteSummary{
        this.x.a([
            this.summaryDiv=new Div().ac("votesummarydiv").a([
                new Div().ac("votesummarytitle").h(this.vote.question).
                ae("mousedown",this.voteTitleClicked.bind(this)),
                new Div().ac("votesummaryownercopyright").h("@"),
                new Div().ac("votesummaryowner").h(this.vote.owner.username)
            ])
        ])

        if(this.showDel&&this.vote.owner.e(loggedUser)){
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
                    loadVotes({
                        selectTabKey:"votes"
                    })
                }else{
                    //console.log("vote creation failed",res.status)
                    new AckInfoWindow(`<span class="errspan">Failed to create vote:</span><br><br><span class="errreasonspan">${res.status}</span>`,function(){}).build()
                }
            })
        },{width:800})
    }

    build():VoteSummaries{
        this.x.a([
            new Div().h("Create vote").
            ae("mousedown",this.createVoteClicked.bind(this)).ac("createbutton")
        ])
        this.a(this.votes.map((vote:Vote)=>new VoteSummary().setVote(vote)))
        return this
    }
}