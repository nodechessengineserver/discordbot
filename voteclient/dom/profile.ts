interface Profile{
    setLoginCallback(loginCallback:any):Profile
    setLogoutCallback(logoutCallback:any):Profile
    build():DomElement<any>
}

class LichessProfile extends DomElement<LichessProfile> implements Profile{
    loginCallback:any
    logoutCallback:any

    constructor(){
        super("div")
    }

    userTr:Tr

    bioTextArea:TextArea

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
                ]),
                new Tr().a([
                    new Td().va("middle").a([
                        new Div().h("Bio").setMarginTop("auto")
                    ]),
                    new Td().a([
                        this.bioTextArea=<TextArea>new TextArea("biotext").setText(loggedUser.bio).
                        z(300,100)                        
                    ])
                ]),
                new Tr().a([
                    new Button("Update profile").onClick(this.updateProfile.bind(this))
                ])
            ])
        ])        
        return this
    }

    updateProfile(){
        let bio=this.bioTextArea.getText()
        let uclone=loggedUser.clone()
        uclone.bio=bio
        ajaxRequest({
            t:"updateuser",
            u:uclone.toJson()
        },(res:any)=>{
            loggedUser=createUserFromJson(res.u)
            if(loggedUser.empty()) this.loginCallback()
            else this.build()
        })
    }

    login(){
        new TextInputWindow("getusername","","Username","Please enter your lichess username!",(username:string)=>{
            ajaxRequest({
                t:"createverificationcode",
                username:username
            },(json:any)=>{
                if(json.ok){
                    new TextInputWindow("checkcode",""+json.code,"Verify","Please insert this code into your lichess profile then press OK!",(dummy:string)=>{
                        //console.log("checking code")
                        ajaxRequest({
                            t:"checkverificationcode",
                            username:username
                        },(json:any)=>{
                            if(json.ok){
                                let cookie=json.cookie
                                //console.log(`obtained cookie ${cookie}`)
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
        setCookie("user","",USER_COOKIE_VALIDITY)
        loggedUser=new User()
        this.build()
        if(this.logoutCallback!=undefined) this.logoutCallback()
    }

    setLoginCallback(loginCallback:any):LichessProfile{
        this.loginCallback=loginCallback
        return this
    }

    setLogoutCallback(logoutCallback:any):LichessProfile{
        this.logoutCallback=logoutCallback
        return this
    }
}