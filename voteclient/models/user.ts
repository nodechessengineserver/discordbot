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

type USER_KEY=
    "username"|
    "overallstrength"|    
    "playtime"|
    "overallgames"|
    "membershipage"|
    "title"|
    "avgrank"

const USER_LABELS:{[id:string]:string}={
    "username":"User name",
    "avgrank":"Average rank",
    "overallstrength":"Overall strength",
    "playtime":"Play time",
    "overallgames":"Overall games",
    "membershipage":"Membership age",
    "title":"Title"
}

const USER_KEYS:USER_KEY[]=[
    "username",
    "avgrank",
    "overallstrength",    
    "playtime",
    "overallgames",
    "membershipage",
    "title"
]

const RANKED_USER_KEYS:USER_KEY[]=[
    "overallstrength",    
    "playtime",
    "overallgames",
    "membershipage",
    "title"
]

const TITLE_VALUES:{[id:string]:number}={
    "NONE":0,
    "WLM":1,
    "WNM":2,
    "WCM":3,
    "LM":4,
    "NM":5,
    "CM":6,
    "WFM":7,
    "WIM":8,
    "FM":9,
    "IM":10,
    "WGM":11,
    "GM":12
}

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

    rank:{[id:string]:number}={}

    getRankByKey(key:USER_KEY):number{
        let rank=this.rank[key]
        if(rank==undefined) return 0
        return rank
    }

    getRankFByKey(key:USER_KEY,prec:number=3):string{
        if(prec==0) return ""+Math.floor(this.getRankByKey(key))
        return this.getRankByKey(key).toPrecision(prec)
    }

    setRankByKey(key:USER_KEY,rank:number){
        this.rank[key]=rank
    }

    getValueByKey(key:USER_KEY):number{
        if(key=="overallstrength") return this.overallStrength
        if(key=="overallgames") return this.overallGames
        if(key=="playtime") return this.playTime
        if(key=="membershipage") return this.membershipAge
        if(key=="title"){
            let TIT=this.title.toUpperCase()
            let titv=TITLE_VALUES[TIT]
            if(titv==undefined) return 0
            return titv
        }
        if(key=="avgrank"){
            return -this.getRankByKey("avgrank")
        }
        return 0
    }

    getValueFByKey(key:USER_KEY):string{
        if(key=="username") return this.username
        if(key=="title") return this.title
        if(key=="membershipage") return ""+Math.floor(this.membershipAge/ONE_DAY)+" days"
        if(key=="playtime") return ""+Math.floor(this.playTime/3600)+" hours"
        if(key=="overallgames") return ""+this.overallGames
        if(key=="overallstrength") return ""+Math.floor(this.overallStrength)
        if(key=="avgrank") return "#"+this.getRankFByKey("avgrank")
        return "?"
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

class VoterList{
    voters:User[]=[]

    constructor(voters:User[]){
        this.voters=voters
    }

    sortByKey(key:USER_KEY){
        this.voters.sort((a:User,b:User)=>b.getValueByKey(key)-a.getValueByKey(key))
        for(let i=0;i<this.voters.length;i++){
            if(key!="avgrank") this.voters[i].setRankByKey(key,i+1)
        }
    }

    sortByAllKeys(){
        for(let key of USER_KEYS){
            this.sortByKey(key)
        }

        for(let voter of this.voters){
            let sumrank=0
            for(let key of RANKED_USER_KEYS){
                let rank=voter.getRankByKey(key)
                sumrank+=rank                
            }
            let avgrank=sumrank/RANKED_USER_KEYS.length            
            voter.setRankByKey("avgrank",avgrank)
        }

        this.sortByKey("avgrank")
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