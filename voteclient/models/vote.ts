const MAX_USERVOTES_PER_VOTE=6
const MAX_VOTES_PER_WEEK=3
const MAX_OPTIONS_PER_WEEK=9

type VOTE_TRANSACTION=
    "noop"|
    "createvote"|
    "deletevote"|
    "createoption"|
    "deleteoption"|
    "castvote"

class UserVote{
    u:User=new User()

    stars:number=1

    toJson():any{
        return({
            u:this.u.toJson(),
            stars:this.stars
        })
    }

    fromJson(json:any):UserVote{
        if(json==undefined) return this

        if(json.u!=undefined) this.u=createUserFromJson(json.u)
        if(json.stars!=undefined) this.stars=json.stars

        return this
    }
}

class VoteOption{
    option:string="Vote option"

    id:string="optionid"

    owner:User=new User()

    userVotes:UserVote[]=[]

    cumulStars():number{
        let sum=0
        for(let userVote of this.userVotes){
            sum+=userVote.stars
        }
        return sum
    }

    getUserVoteIndexByUsername(username:string):number{
        for(let i=0;i<this.userVotes.length;i++){
            let uv=this.userVotes[i]
            if(uv.u.username==username) return i
        }
        return -1
    }

    toJson():any{
        return({
            option:this.option,
            id:this.id,
            owner:this.owner.toJson(),
            userVotes:this.userVotes.map(userVote=>userVote.toJson())
        })
    }

    fromJson(json:any):VoteOption{
        if(json==undefined) return this

        if(json.option!=undefined) this.option=json.option
        if(json.id!=undefined) this.id=json.id
        if(json.owner!=undefined) this.owner=createUserFromJson(json.owner)
        if(json.userVotes!=undefined) this.userVotes=
            json.userVotes.map((userVoteJson:any)=>new UserVote().fromJson(userVoteJson))

        return this
    }
}

class Vote{
    invalid:boolean=false

    question:string="Vote question"

    id:string="voteid"

    owner:User=new User()

    options:VoteOption[]=[]

    voteCredits:{[id:string]:number}={}

    sortByCumulStars():Vote{
        this.options.sort((a:VoteOption,b:VoteOption)=>b.cumulStars()-a.cumulStars())
        return this
    }

    getVoteCredits(username:string):number{
        let vc=this.voteCredits[username]
        if(vc==undefined){
            this.voteCredits[username]=MAX_USERVOTES_PER_VOTE
            return MAX_USERVOTES_PER_VOTE
        }
        return vc
    }

    castVote(u:User,optionId:string,stars:number,dry:boolean=false):string{
        if(u.empty()) return "not authorized"

        let oi=this.getOptionIndexById(optionId)

        if(oi<0) return "no such option"

        let o=this.options[oi]

        let credits=this.getVoteCredits(u.username)

        let uvi=o.getUserVoteIndexByUsername(u.username)

        if(stars>0){
            if(stars>credits) return "not enough credits to vote"            
            if(dry) return "ok"
            if(uvi<0){
                let uv=new UserVote()
                uv.u=u
                uv.stars=stars
                o.userVotes.push(uv)                
            }else{
                let uv=o.userVotes[uvi]
                uv.stars+=stars
            }
            this.voteCredits[u.username]-=stars
            return "ok"
        }else{
            if(uvi<0) return "no user votes on this option"            
            let uv=o.userVotes[uvi]
            if((uv.stars+stars)<0) return "not enough votes to un upvote"
            if(dry) return "ok"
            uv.stars+=stars
            if(uv.stars<=0){
                o.userVotes.splice(uvi,1)
            }
            this.voteCredits[u.username]-=stars
            return "ok"
        }
    }

    empty():boolean{
        return this.options.length<=0
    }

    addOption(o:VoteOption):Vote{
        this.options.push(o)
        return this
    }

    getOptionIndexById(optionId:string):number{
        for(let i=0;i<this.options.length;i++) if(this.options[i].id==optionId) return i
        return -1
    }

    toJson():any{
        return({
            invalid:this.invalid,
            question:this.question,
            id:this.id,
            owner:this.owner.toJson(),
            options:this.options.map((option:VoteOption)=>option.toJson())
        })
    }

    fromJson(json:any):Vote{
        if(json==undefined) return this

        if(json.invalid!=undefined) this.invalid=json.invalid
        if(json.question!=undefined) this.question=json.question
        if(json.id!=undefined) this.id=json.id
        if(json.owner!=undefined) this.owner=createUserFromJson(json.owner)
        if(json.options!=undefined) this.options=
            json.options.map((optionJson:any)=>new VoteOption().fromJson(optionJson))

        return this
    }
}

class VoteTransaction{
    t:VOTE_TRANSACTION="createvote"
    time:number=new Date().getTime()
    u:User=new User()
    voteId:string="voteid"
    optionId:string="optionid"
    text:string="Vote content"
    stars:number=MAX_USERVOTES_PER_VOTE

    toJson():any{
        return({
            t:this.t,
            time:this.time,
            u:this.u.toJson(),
            voteId:this.voteId,
            optionId:this.optionId,
            text:this.text,
            stars:this.stars
        })
    }

    fromJson(json:any):VoteTransaction{
        if(json==undefined) return this

        if(json.t!=undefined) this.t=json.t
        if(json.time!=undefined) this.time=json.time
        if(json.u!=undefined) this.u=createUserFromJson(json.u)        
        if(json.voteId!=undefined) this.voteId=json.voteId
        if(json.optionId!=undefined) this.optionId=json.optionId        
        if(json.text!=undefined) this.text=json.text
        if(json.stars!=undefined) this.stars=json.stars

        return this
    }
}

