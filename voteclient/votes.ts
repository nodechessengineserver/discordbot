function buildVotesDiv(){
    votesDiv.x.a([
        new VoteSummaries().setVotes(votes)
    ])
}

function getVoteById(id:string):Vote{
    for(let vote of votes){
        if(vote.id==id) return vote
    }
    return new Vote()
}

function loadVotes(params:any={}){
    //console.log("loading votes")
    ajaxRequest({
        t:"loadvotes"
    },(json:any)=>{
        if(json.ok){
            //console.log("processing votes")
            if(json.votes!=undefined){
                votes=json.votes.map((voteJson:any)=>new Vote().fromJson(voteJson))
            }
            buildVotesDiv()
            if(params.loadVoteId!=undefined){
                selVote=getVoteById(params.loadVoteId)
                buildVoteDiv()
            }
            if(params.selectTabKey!=undefined){
                app.mainTabpane.selectTab(params.selectTabKey)
            }
            if(params.clearSelVote){
                selVote.invalid=true
                buildVoteDiv()
            }
        }
    })
}
