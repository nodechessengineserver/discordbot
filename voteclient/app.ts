new App("vote").
setProfile(new LichessProfile()).
createFromTabs([
    new Tab("about","About",new Div())
]).
launch()