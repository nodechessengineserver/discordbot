let EPOCH = 1517443200000 // 2018-2-1

class User{
    username:string=""
    cookie:string=""
    rating:number=1500
    rd:number=350
    registeredAt:number=EPOCH
    lastSeenAt:number=EPOCH

    toJson(secure:boolean=false):any{
        let json:any=({
            username:this.username,
            rating:this.rating,
            rd:this.rd,
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
        let u=new User()
        if(json.username!=undefined) u.username=json.username
        if(json.cookie!=undefined) u.cookie=json.cookie
        if(json.rating!=undefined) u.rating=json.rating
        if(json.rd!=undefined) u.rd=json.rd
        if(json.registeredAt!=undefined) u.registeredAt=json.registeredAt
        if(json.lastSeenAt!=undefined) u.lastSeenAt=json.lastSeenAt
        return u
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

        for(let userJson of json){
            let u=new User().fromJson(userJson)

            this.users[u.username]=u
            this.cookies[u.cookie]=u
        }

        return this
    }

    setUser(u:User){
        this.users[u.username]=u
        this.cookies[u.username]=u
    }

    getByCookie(cookie:string):User{
        return this.cookies[cookie]
    }

    getByUsername(username:string):User{
        return this.users[username]
    }
}