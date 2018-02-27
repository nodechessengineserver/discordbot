let USERS_COLL=`voteusers`

const users:UserList=new UserList()

function setUser(u:User){
    users.setUser(u)

    mongoRequest({
        t:"upsertone",
        collName:USERS_COLL,
        query:{
            username:u.username
        },
        doc:u.toJson()
    },(res:any)=>{
        console.log(res)
    })
}