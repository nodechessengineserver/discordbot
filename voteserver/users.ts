let USERS_COLL=`voteusers`

let users:UserList=new UserList()

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

function usersStartup(){
    console.log(`users startup`)
    mongoRequest({
        t:"findaslist",
        collName:USERS_COLL,
        query:{}
    },(res:any)=>{
        if(!res.ok){
            logErr(`users startup failed: ${res.status}`)
        }else{
            console.log(`users has ${res.docs.length} records`)
            users=new UserList()
            for(let doc of res.docs){                                
                users.setUser(createUserFromJson(doc))
            }
        }
    })
}