let users:UserList=new UserList()

function dbUsersStartup(){
    users=new UserList()
    if(db!=null){
        dbFindAsArray(USERS_COLL,{},function(result:any){
            if(result[0]){
                console.log("users startup failed",GLOBALS.handledError(result[0]))
            }else{
                console.log(`users startup ok, ${result[1].length} user(s)`)
                users.fromJson(result[1])
            }
        })
    }
}

function dbSetUser(user:User){
    if(db!=null){
        try{
            const collection = db.collection(USERS_COLL)
            console.log(`updating user`,user)
            collection.updateOne({username:user.username},{"$set":user.toJson()},{upsert:true},(error:any,result:any)=>{
                console.log(`updating user ${user.username} error = `,error)
            })
        }catch(err){console.log(GLOBALS.handledError(err))}
    }
}

function createLogin(username:any,callback:any){    
    let code=uniqid()
    console.log(`creating login ${username} ${code}`)        
    callback(code)
}

function registerUser(username:string,callback:any){
    let cookie=uniqid()

    let u=new User()

    u.username=username
    u.cookie=cookie    

    users.setUser(u)

    dbSetUser(u)

    callback(cookie)
}

function storeUsers(us:User[]){

    console.log("storing users")

    for(let u of us){        

        let uclone=users.upsertUser(u)

        dbSetUser(uclone)

    }

}

function checkCookie(cookie:any,callback:any){
    console.log(`checking cookie ${cookie}`)    

    let u=users.getByCookie(cookie)

    callback(u==undefined?
        {ok:false}:
        {ok:true,user:u}
    )
}
