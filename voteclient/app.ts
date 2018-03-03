function loginTask(){
    loadVotes({
        selectTabKey:"votes"
    })
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