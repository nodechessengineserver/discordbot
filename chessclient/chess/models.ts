let EPOCH = 1517443200000 // 2018-2-1

function createUserFromJson(json:any):User{
    if(json==undefined) return new User()
    if(json.isBot) return new BotUser().fromJson(json)
    if(json.isSystem) return new SystemUser().fromJson(json)
    return new User().fromJson(json)
}

class GlickoData{
    rating: number = Glicko.RATING0
    rd: number = Glicko.RD0
    lastrated: number = new Date().getTime()

    ratingF():string{return ""+Math.floor(this.rating)}
    rdF():string{return ""+Math.floor(this.rd)}

    toJson():any{
        return({
            rating:this.rating,
            rd:this.rd,
            lastrated:this.lastrated
        })
    }

    fromJson(json:any):GlickoData{
        if(json==undefined) return this

        if(json.rating!=undefined) this.rating=json.rating
        if(json.rd!=undefined) this.rd=json.rd
        if(json.lastrated!=undefined) this.lastrated=json.lastrated

        return this
    }
}

class User{
    username:string=""
    cookie:string=""
    isBot:boolean=false
    isSystem:boolean=false    
    rd:number=350
    registeredAt:number=EPOCH
    lastSeenAt:number=EPOCH
    glicko:GlickoData=new GlickoData()

    clone():User{
        return createUserFromJson(this.toJson())
    }

    empty():boolean{
        return this.username==""
    }

    e(u:User):boolean{
        return this.username==u.username
    }

    smartName():string{
        return this.username==""?"Anonymous":this.username
    }

    smartNameHtml():string{
        return `<span class="${this.empty()?"modeluser anonuser":"modeluser"}">${this.smartName()}</span>`
    }

    toJson(secure:boolean=false):any{
        let json:any=({
            username:this.username,
            isBot:this.isBot,
            isSystem:this.isSystem,            
            rd:this.rd,
            registeredAt:this.registeredAt,
            lastSeenAt:this.lastSeenAt,
            glicko:this.glicko.toJson()
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
        if(json.isBot!=undefined) this.isBot=json.isBot
        if(json.isSystem!=undefined) this.isSystem=json.isSystem        
        if(json.rd!=undefined) this.rd=json.rd
        if(json.registeredAt!=undefined) this.registeredAt=json.registeredAt
        if(json.lastSeenAt!=undefined) this.lastSeenAt=json.lastSeenAt
        if(json.glicko!=undefined) this.glicko=new GlickoData().fromJson(json.glicko)
        return this
    }
}

class SystemUser extends User{
    constructor(){
        super()
        this.username="#System"
        this.isSystem=true
    }

    smartNameHtml():string{
        return `<span class="modeluser systemuser">system</span>`
    }
}

class BotUser extends User{
    constructor(){
        super()
        this.username="#Bot"
        this.isBot=true
    }

    smartNameHtml():string{
        return `<span class="modeluser botuser">Bot</span>`
    }
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

    setUser(u:User){
        this.users[u.username]=u
        this.cookies[u.cookie]=u
    }

    getByCookie(cookie:string):User{
        return this.cookies[cookie]
    }

    getByUsername(username:string):User{
        return this.users[username]
    }

    iterate(callback:any){
        for(let username in this.users){
            let u=this.users[username]
            callback(u)
        }
    }
}

let loggedUser:User=new User()