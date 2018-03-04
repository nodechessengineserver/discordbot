function buildVoteDiv(){
    voteDiv.x.a([
        new VoteElement().setVote(selVote),
        new VoteProfiles().setVote(selVote)
    ])
}

