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
                new Div().ac("cumulstarsdiv").h(
                    `${this.voteOption.cumulStars()}`
                ),
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

        this.optionDiv.a([            
            new Div().ac("voteoptionvote").a([
                new Button("Upvote").onClick(this.voteClicked.bind(this,1)),
                new Button("Un-upvote").onClick(this.voteClicked.bind(this,-1))
            ]),            
            new Div().ac("uservotesdiv").a(
                this.voteOption.userVotes.map(userVote=>new Div().ac("uservotediv").h(
                    `<span class="votername">${userVote.u.username}</span> ( <span class="voterstars">${userVote.stars}</span> )`
                ))
            )
        ])

        return this
    }

    voteClicked(stars:number,e:Event){
        const t:AJAX_REQUEST="castvote"
        ajaxRequest({
            t:t,
            voteId:selVote.id,
            optionId:this.voteOption.id,
            stars:stars
        },(res:any)=>{
            if(res.ok){
                //console.log("vote cast ok")
                loadVotes({
                    loadVoteId:selVote.id,
                    selectTabKey:"vote"
                })
            }else{
                //console.log("vote cast failed",res.status)
                new AckInfoWindow(`<span class="errspan">Failed to cast vote:</span><br><br><span class="errreasonspan">${res.status}</span>`,function(){}).build()
            }
        })
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

        this.vote.sortByCumulStars()

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