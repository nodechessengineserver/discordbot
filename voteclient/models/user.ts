type AJAX_REQUEST=
    "createverificationcode"|
    "checkverificationcode"|
    "login"|
    "updateuser"|
    "loadvotes"|
    "createvote"|
    "deletevote"|
    "createoption"|
    "deleteoption"|
    "castvote"

class User{
    username:string=""
    cookie:string=""
    bio:string=""
    isBot:boolean=false
    isSystem:boolean=false        
    registeredAt:number=new Date().getTime()
    lastSeenAt:number=new Date().getTime()

    //////////////////////////////////////////
    // profiling
    lastProfiledAt:number=0
    overallStrength:number=1500
    overallGames:number=0
    playTime:number=0
    membershipAge:number=0
    title:string="none"
    //////////////////////////////////////////

    membershipAgeF():string{
        return ""+Math.floor(this.membershipAge/ONE_DAY)
    }

    playtimeF():string{
        return ""+Math.floor(this.playTime/3600)
    }

    overallStrengthF():string{
        return ""+Math.floor(this.overallStrength)
    }

    clone():User{
        return createUserFromJson(this.toJson())
    }

    empty():boolean{
        return this.username==""
    }

    e(u:User):boolean{
        return this.username==u.username
    }

    toJson(secure:boolean=false):any{
        let json:any=({
            username:this.username,
            bio:this.bio,
            isBot:this.isBot,
            isSystem:this.isSystem,                        
            registeredAt:this.registeredAt,
            lastSeenAt:this.lastSeenAt,        
            
            //////////////////////////////////////////
            // profiling
            lastProfiledAt:this.lastProfiledAt,
            overallStrength:this.overallStrength,
            overallGames:this.overallGames,
            playTime:this.playTime,
            membershipAge:this.membershipAge,
            title:this.title
            //////////////////////////////////////////
        })
        // don't send user cookie to client
        if(!secure){
            json.cookie=this.cookie
        }
        return json
    }

    fromJson(json:any):User{        
        if(json==undefined) return this

        if(json.username!=undefined) this.username=json.username
        if(json.cookie!=undefined) this.cookie=json.cookie
        if(json.bio!=undefined) this.bio=json.bio
        if(json.isBot!=undefined) this.isBot=json.isBot
        if(json.isSystem!=undefined) this.isSystem=json.isSystem                
        if(json.registeredAt!=undefined) this.registeredAt=json.registeredAt
        if(json.lastSeenAt!=undefined) this.lastSeenAt=json.lastSeenAt        

        //////////////////////////////////////////
        // profiling
        if(json.lastProfiledAt!=undefined) this.lastProfiledAt=json.lastProfiledAt
        if(json.overallStrength!=undefined) this.overallStrength=json.overallStrength
        if(json.overallGames!=undefined) this.overallGames=json.overallGames
        if(json.playTime!=undefined) this.playTime=json.playTime
        if(json.membershipAge!=undefined) this.membershipAge=json.membershipAge
        if(json.title!=undefined) this.title=json.title
        //////////////////////////////////////////

        return this
    }
}

function createUserFromJson(json:any):User{
    if(json==undefined) return new User()    
    return new User().fromJson(json)
}

class UserList{
    users:{[id:string]:User}={}
    cookies:{[id:string]:User}={}

    toJson(secure:boolean=false):any{
        let usersJson:any={}

        for(let username in this.users){            
            usersJson[username]=this.users[username].toJson(secure)
        }

        return usersJson
    }

    fromJson(json:any):UserList{
        this.users={}
        this.cookies={}

        if(json==undefined) return this

        for(let username in json){
            let userJson=json[username]

            let u=createUserFromJson(userJson)

            this.users[u.username]=u
            this.cookies[u.cookie]=u
        }

        return this
    }

    setUser(u:User):User{
        this.users[u.username]=u
        this.cookies[u.cookie]=u
        return u
    }

    getByCookie(cookie:string):User{
        let u=this.cookies[cookie]
        if(u==undefined) return new User()
        return u
    }

    getByUsername(username:string):User{
        let u=this.users[username]
        if(u==undefined) return new User()
        return u
    }

    iterate(callback:any){
        for(let username in this.users){
            let u=this.users[username]
            callback(u)
        }
    }
}