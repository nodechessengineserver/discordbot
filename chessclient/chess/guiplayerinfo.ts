class GuiPlayerInfo extends DomElement<GuiPlayerInfo>{
    PLAYER_WIDTH=275
    PLAYER_HEIGHT=30
    BUTTONS_HEIGHT=25
    TIME_WIDTH=80

    pi:PlayerInfo=new PlayerInfo()

    constructor(){
        super("div")
    }

    setPlayerInfo(pi:PlayerInfo):GuiPlayerInfo{        
        this.pi=pi
        return this.build()
    }

    color:number=BLACK
    playCallback:any
    playBotCallback:any
    offerDrawCallback:any
    acceptDrawCallback:any
    resignCallback:any
    standCallback:any

    setPlayColor(color:number):GuiPlayerInfo{this.color=color;return this}
    setPlayCallback(playCallback:any):GuiPlayerInfo{this.playCallback=playCallback;return this}
    setPlayBotCallback(playBotCallback:any):GuiPlayerInfo{this.playBotCallback=playBotCallback;return this}
    setOfferDrawCallback(offerDrawCallback:any):GuiPlayerInfo{this.offerDrawCallback=offerDrawCallback;return this}
    setAcceptDrawCallback(acceptDrawCallback:any):GuiPlayerInfo{this.acceptDrawCallback=acceptDrawCallback;return this}
    setResignCallback(resignCallback:any):GuiPlayerInfo{this.resignCallback=resignCallback;return this}
    setStandCallback(standCallback:any):GuiPlayerInfo{this.standCallback=standCallback;return this}

    playClicked(){if(this.playCallback!=undefined) this.playCallback(this)}
    playBotClicked(){if(this.playBotCallback!=undefined) this.playBotCallback(this)}
    offerDrawClicked(){if(this.offerDrawCallback!=undefined) this.offerDrawCallback(this)}
    acceptDrawClicked(){if(this.acceptDrawCallback!=undefined) this.acceptDrawCallback(this)}
    resignClicked(){if(this.resignCallback!=undefined) this.resignCallback(this)}
    standClicked(){if(this.standCallback!=undefined) this.standCallback(this)}

    build(addClockClass:any=undefined):GuiPlayerInfo{
        let buttons:Button[]=[]
        let authok=this.pi.u.e(loggedUser)
        let botok=this.pi.u.isBot
        let authbotok=authok||botok
        if(this.pi.canPlay) buttons.push(
            new Button("Play").onClick(this.playClicked.bind(this))
        )
        if(this.pi.canPlay) buttons.push(
            new Button("Play Bot").onClick(this.playBotClicked.bind(this))
        )
        if(this.pi.canOfferDraw&&authbotok) buttons.push(
            new Button("Offer draw").onClick(this.offerDrawClicked.bind(this))
        )
        if(this.pi.canAcceptDraw&&authbotok) buttons.push(
            new Button("Accept draw").onClick(this.acceptDrawClicked.bind(this))
        )
        if(this.pi.canResign&&authbotok) buttons.push(
            new Button("Resign").onClick(this.resignClicked.bind(this))
        )
        if(this.pi.canStand&&authbotok) buttons.push(
            new Button("Stand").onClick(this.standClicked.bind(this))
        )
        let clockclass="gameclock"
        if(addClockClass!=undefined) clockclass=clockclass+" "+addClockClass
        this.x.a([
            new Table().bs().a([
                new Tr().a([
                    new Td().a([
                        new Div().
                        z(this.PLAYER_WIDTH,this.PLAYER_HEIGHT).
                        h(`${this.pi.u.username!=""?`${this.pi.u.smartNameHtml()} ( ${this.pi.u.glicko.ratingF()} )`:"?"}`)
                    ]),
                    new Td().a([
                        new Div().z(this.TIME_WIDTH,this.PLAYER_HEIGHT).
                        ac(clockclass).
                        h(`${formatDurationAsClock(this.pi.showTime)}`)
                    ])
                ]),
                new Tr().a([
                    new Td().cs(2).a([
                        new Div().
                        z(this.PLAYER_WIDTH,this.BUTTONS_HEIGHT).a(
                            buttons
                        )
                    ])
                ])
            ])
        ])        
        return this
    }
}