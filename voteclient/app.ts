new App("vote").
setProfile(new LichessProfile()).
createFromTabs([
    new Tab("about","About",new Div()),
    new Tab("votes","Votes",votesDiv),
    new Tab("vote","Vote",voteDiv)
]).
launch()

loadVotes()