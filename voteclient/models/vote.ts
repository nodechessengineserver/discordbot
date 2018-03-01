const MAX_STARS=3

type VOTE_TRANSACTION=
    "createvote"|
    "deletevote"|
    "addoption"|
    "deleteoption"|
    "castvote"|
    "uncastvote"

class UserVote{
    u:User=new User()

    stars:number=MAX_STARS

    toJson():any{
        return({
            u:this.u,
            starts:this.stars
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

    userVotes:UserVote[]=[]

    toJson():any{
        return({
            option:this.option,
            id:this.id,
            votes:this.userVotes.map(userVote=>userVote.toJson())
        })
    }

    fromJson(json:any):VoteOption{
        if(json==undefined) return this

        if(json.option!=undefined) this.option=json.option
        if(json.id!=undefined) this.id=json.id
        if(json.userVotes!=undefined) this.userVotes=
            json.userVotes.map((userVoteJson:any)=>new UserVote().fromJson(userVoteJson))

        return this
    }
}

class Vote{
    question:string="Vote question"

    id:string="voteid"

    owner:User=new User()

    options:VoteOption[]=[]

    toJson():any{
        return({
            question:this.question,
            id:this.id,
            owner:this.owner.toJson(),
            options:this.options.map((option:VoteOption)=>option.toJson())
        })
    }

    fromJson(json:any):Vote{
        if(json==undefined) return this

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

    id:string="transactionid"
    voteId:string="voteid"
    voteOptionId:string="voteoptionid"

    time:number=new Date().getTime()

    u:User=new User()

    userVote:UserVote=new UserVote()

    text:string="Vote content"

    toJson():any{
        return({
            t:this.t,
            id:this.id,
            voteId:this.voteId,
            voteOptionId:this.voteOptionId,
            time:this.time,
            u:this.u.toJson(),
            text:this.text
        })
    }

    fromJson(json:any):VoteTransaction{
        if(json==undefined) return this

        if(json.t!=undefined) this.t=json.t
        if(json.id!=undefined) this.id=json.id
        if(json.voteId!=undefined) this.voteId=json.voteId
        if(json.voteOptionId!=undefined) this.voteOptionId=json.voteOptionId
        if(json.time!=undefined) this.time=json.time
        if(json.u!=undefined) this.u=createUserFromJson(json.u)
        if(json.text!=undefined) this.text=json.text

        return this
    }
}

