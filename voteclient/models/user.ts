class User{
    username:string=""
    cookie:string=""
    bio:string=""
    isBot:boolean=false
    isSystem:boolean=false        
    registeredAt:number=new Date().getTime()
    lastSeenAt:number=new Date().getTime()

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
            lastSeenAt:this.lastSeenAt            
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