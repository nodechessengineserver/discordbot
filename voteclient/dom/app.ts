class App{
    id:string

    mainTabpane:Tabpane

    profile:Profile

    loginTask:any

    constructor(id:string){
        this.id=id
    }

    setLoginTask(loginTask:any):App{
        this.loginTask=loginTask
        return this
    }

    loginCallback(){
        //console.log(`log in callback`)
        this.login()
    }

    logoutCallback(){
        //console.log(`log out callback`)
        this.mainTabpane.setCaptionByKey("profile","Profile")
    }

    setProfile(profile:Profile):App{
        this.profile=profile
        this.profile.setLoginCallback(this.loginCallback.bind(this))
        this.profile.setLogoutCallback(this.logoutCallback.bind(this))
        return this
    }

    createFromTabs(tabs:Tab[]):App{
        this.mainTabpane=new Tabpane(`${this.id}_mainTabpane`)
        this.mainTabpane.tabs=tabs
        this.mainTabpane.tabs.push(new Tab("profile","Profile",this.profile.build()))
        this.mainTabpane.snapToWindow()
        return this
    }

    login(){
        ajaxRequest({
            t:"login"
        },(json:any)=>{
            //console.log(`login user [${json.u.username}]`)
            loggedUser=createUserFromJson(json.u)
            this.mainTabpane.setCaptionByKey("profile",loggedUser.empty()?"Profile":loggedUser.username)
            this.profile.build()

            if(this.loginTask!=undefined){
                this.loginTask()
            }
        })
    }

    launch(){
        Layers.init()

        Layers.root.a([this.mainTabpane.build()])        

        this.login()
    }
}