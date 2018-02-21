let EPOCH = 1517443200000 // 2018-2-1

class User{
    username:string=""
    cookie:string=""
    rating:number=1500
    rd:number=350
    registeredAt:number=EPOCH
    lastSeenAt:number=EPOCH

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
        return this.username==""?`<span class="anonuser">${this.smartName()}</span>`:this.username
    }

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
        if(json==undefined) return this

        if(json.username!=undefined) this.username=json.username
        if(json.cookie!=undefined) this.cookie=json.cookie
        if(json.rating!=undefined) this.rating=json.rating
        if(json.rd!=undefined) this.rd=json.rd
        if(json.registeredAt!=undefined) this.registeredAt=json.registeredAt
        if(json.lastSeenAt!=undefined) this.lastSeenAt=json.lastSeenAt
        return this
    }
}

class SystemUser extends User{
    smartNameHtml():string{
        return `<span class="systemuser">system</span>`
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

        for(let userJson of json){
            let u=new User().fromJson(userJson)

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
}

let loggedUser:User=new User()