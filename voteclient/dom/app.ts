class App{
    id:string

    mainTabpane:Tabpane

    profile:Profile

    constructor(id:string){
        this.id=id
    }

    loginCallback(){
        ajaxRequest({
            t:"login"
        },(json:any)=>{
            console.log(json)
        })
    }

    setProfile(profile:Profile):App{
        this.profile=profile
        this.profile.setLoginCallback(this.loginCallback.bind(this))
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
            console.log(json)
        })
    }

    launch(){
        Layers.init()

        Layers.root.a([this.mainTabpane.build()])        

        this.login()
    }
}