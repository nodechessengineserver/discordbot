function buildVotesDiv(){
    votesDiv.x.a([
        new VoteSummaries().setVotes(votes)
    ])
}

function loadVotes(){
    console.log("loading votes")
    ajaxRequest({
        t:"loadvotes"
    },(json:any)=>{
        if(json.ok){
            console.log("processing votes")
            if(json.votes!=undefined){
                votes=json.votes.map((voteJson:any)=>new Vote().fromJson(voteJson))
            }
            buildVotesDiv()
        }
    })
}
