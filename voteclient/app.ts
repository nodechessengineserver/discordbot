let urlVoteId=getParameterByName("voteid")

function loginTask(){
    if(urlVoteId==null){
        loadVotes({
            selectTabKey:"votes"
        })
    }else{
        loadVotes({
            loadVoteId:urlVoteId,
            selectTabKey:"vote"
        })
    }
}

app=new App("vote").
setProfile(new LichessProfile()).
setLoginTask(loginTask).
createFromTabs([
    new Tab("about","About",aboutDiv.h(ABOUT_HTML)),
    new Tab("votes","Votes",votesDiv),
    new Tab("vote","Vote",voteDiv)
]).
launch()