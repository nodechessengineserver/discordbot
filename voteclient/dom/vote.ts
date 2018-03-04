class VoteOptionElement extends DomElement<VoteOptionElement>{
    voteOption:VoteOption=new VoteOption()

    optionDiv:Div
    userVotesDiv:Div

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
            if(res.ok){
                loadVotes({
                    loadVoteId:selVote.id,
                    selectTabKey:"vote"
                })
            }else{
                //console.log("vote cast failed",res.status)
                new AckInfoWindow(`<span class="errspan">Failed to delete option:</span><br><br><span class="errreasonspan">${res.status}</span>`,function(){}).build()
            }            
        })
    }

    build():VoteOptionElement{
        this.x.a([
            this.optionDiv=new Div().ac("voteoptiondiv").a([
                new Div().ac("cumulstarsdiv").h(
                    `<div class="votestar votestarcontainer"></div>${this.voteOption.cumulStars()}`
                ),
                new Div().ac("voteoptionoption").h(this.voteOption.option),
                new Div().ac("voteoptionownercopyright").h("@"),
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

        function createStars(stars:number):string{
            let content=""
            for(let i=0;i<stars;i++){
                content+=`<div class="votestar"></div>`
            }
            return content
        }

        this.userVotesDiv=new Div().ac("uservotesdiv").a([
            new Div().h("Upvote").ae("mousedown",this.voteClicked.bind(this,1)).
            ac("votebutton upvotebutton"),
            new Div().h("Un-upvote").ae("mousedown",this.voteClicked.bind(this,-1)).
            ac("votebutton unupvotebutton")
        ]).a(
            this.voteOption.userVotes.map(userVote=>new Div().ac("uservotediv").h(
                `<span class="votername">${userVote.u.username}</span> <span class="voterstars">${createStars(userVote.stars)}</span>`
            ).ae("mousedown",this.userNameClicked.bind(this,userVote.u.username)))
        )

        this.optionDiv.a([                        
                this.userVotesDiv
        ])

        return this
    }

    userNameClicked(username:string,e:Event){
        window.open(`https://lichess.org/@/${username}`)
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

class ProfileElement extends DomElement<ProfileElement>{
    u:User=new User()

    constructor(){
        super("div")
    }

    setUser(u:User):ProfileElement{
        this.u=u
        return this.build()
    }

    build():ProfileElement{
        this.x.a([
            new Div().ac("profileelementdiv").a(
                USER_KEYS.map(key=>new Div().ac(`profile${key}div`).h(
                    this.u.empty()?USER_LABELS[key]:
                        `${this.u.getValueFByKey(key)} ${key=="avgrank"?"":`#${this.u.getRankFByKey(key,1)}`}`
                ))                
            )
        ])

        return this
    }
}

class VoteProfiles extends DomElement<VoteProfiles>{
    vote:Vote=new Vote()

    constructor(){
        super("div")
    }

    setVote(vote:Vote):VoteProfiles{
        this.vote=vote
        return this.build()
    }

    build():VoteProfiles{
        this.x.a([
            new ProfileElement().build()
        ])

        let voters=this.vote.collectVoters()

        voters.sortByAllKeys()

        this.a(voters.voters.map(voter=>new ProfileElement().setUser(voter)))

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

        this.vote.sortByCumulStars()

        this.a([
            new Div().h("Create option").
            ae("mousedown",this.createOptionClicked.bind(this)).ac("createbutton"),
            new VoteSummary().setShowDel(false).setVote(this.vote)
        ])
        this.a(
            this.vote.options.map(voteOption=>new VoteOptionElement().setOption(voteOption))
        )
        return this
    }
}