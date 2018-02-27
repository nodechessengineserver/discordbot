interface Profile{
    setLoginCallback(loginCallback:any):Profile
    build():DomElement<any>
}

class LichessProfile extends DomElement<LichessProfile> implements Profile{
    loginCallback:any

    constructor(){
        super("div")
    }

    userTr:Tr

    build():LichessProfile{
        this.x.a([
            new Table().bs().a([
                this.userTr=new Tr().a([
                    new Td().a([
                        new Div().w(200).h("Lichess username")
                    ]),
                    new Td().a([
                        new Div().w(300).h(loggedUser.empty()?"?":loggedUser.username)
                    ]),
                    new Td().a([
                        loggedUser.empty()?
                        new Button("Log in").onClick(this.login.bind(this)):
                        new Button("Log out").onClick(this.logout.bind(this))
                    ])
                ])
            ])
        ])        
        return this
    }

    login(){
        new TextInputWindow("getusername","","Username","Please enter your lichess username!",(username:string)=>{
            ajaxRequest({
                t:"createverificationcode",
                username:username
            },(json:any)=>{
                if(json.ok){
                    new TextInputWindow("checkcode",""+json.code,"Verify","Please insert this code into your lichess profile then press OK!",(dummy:string)=>{
                        console.log("checking code")
                        ajaxRequest({
                            t:"checkverificationcode",
                            username:username
                        },(json:any)=>{
                            if(json.ok){
                                let cookie=json.cookie
                                console.log(`obtained cookie ${cookie}`)
                                setCookie("user",cookie,USER_COOKIE_VALIDITY)                                
                                this.loginCallback()
                            }else{
                                new AckInfoWindow("Verification failed.",function(){})
                            }
                        })
                    })
                }
            })            
        })
    }

    logout(){

    }

    setLoginCallback(loginCallback:any):LichessProfile{
        this.loginCallback=loginCallback
        return this
    }
}