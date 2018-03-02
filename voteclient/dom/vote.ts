class VoteOptionElement extends DomElement<VoteOptionElement>{
    voteOption:VoteOption=new VoteOption()

    optionDiv:Div

    constructor(){
        super("div")
    }

    setOption(voteOption:VoteOption):VoteOptionElement{
        this.voteOption=voteOption
        return this.build()
    }

    deleteOptionClicked(){
        const t:AJAX_REQUEST="deleteoption"
        ajaxRequest({
            t:t,
            voteId:selVote.id,
            optionId:this.voteOption.id
        },(res:any)=>{
            loadVotes({
                loadVoteId:selVote.id,
                selectTabKey:"vote"
            })
        })
    }

    build():VoteOptionElement{
        this.x.a([
            this.optionDiv=new Div().ac("voteoptiondiv").a([
                new Div().ac("voteoptionoption").h(this.voteOption.option),
                new Div().ac("voteoptionowner").h(this.voteOption.owner.username)
            ])
        ])

        if(this.voteOption.owner.e(loggedUser)){
            this.optionDiv.a([
                new Div().ac("voteoptioncontrol").a([
                    new Button("Delete").onClick(this.deleteOptionClicked.bind(this))
                ])
            ])
        }

        return this
    }
}

class VoteElement extends DomElement<VoteElement>{
    vote:Vote=new Vote()

    constructor(){
        super("div")
    }

    setVote(vote:Vote):VoteElement{
        this.vote=vote
        return this.build()
    }

    createOptionClicked(){
        const t:AJAX_REQUEST="createoption"
        new TextInputWindow("createoptioninput","","Create option","Enter option.",(option:string)=>{
            ajaxRequest({
                t:t,
                voteId:selVote.id,
                option:option
            },(res:any)=>{
                if(res.ok){
                    //console.log("option created ok")
                    loadVotes({
                        loadVoteId:this.vote.id,
                        selectTabKey:"vote"
                    })
                }else{
                    //console.log("option creation failed",res.status)
                    new AckInfoWindow(`<span class="errspan">Failed to create option:</span><br><br><span class="errreasonspan">${res.status}</span>`,function(){}).build()
                }
            })
        },{width:800})
    }

    build():VoteElement{
        this.x
        
        if(this.vote.invalid) return this

        this.a([
            new Button("Create option").onClick(this.createOptionClicked.bind(this)),
            new VoteSummary().setShowDel(false).setVote(this.vote)
        ])
        this.a(
            this.vote.options.map(voteOption=>new VoteOptionElement().setOption(voteOption))
        )
        return this
    }
}