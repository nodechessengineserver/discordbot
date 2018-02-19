let DATABASE_NAME=`mychessdb`
let USERS_COLL=`actusers`

let LOCAL_MONGO_URI=`mongodb://localhost:27017/${DATABASE_NAME}`

let MONGODB_URI = GLOBALS.isProd()?process.env.MONGODB_URI:LOCAL_MONGO_URI

let users:any={}
let cookies:any={}

let db:any

try{
    mongodb.connect(MONGODB_URI, function(err:any, conn:any){
        if (err){
            console.log(err)      
        }else{
            db = conn.db(DATABASE_NAME)
            console.log(`chess connected to MongoDB database < ${db.databaseName} >`)            
            dbStartup()
        }
    })
}catch(err){
    console.log(err)
}

function dbFindAsArray(collectionName:any,query:any,callback:any){
    try{
        const collection = db.collection(collectionName)
        // Find documents
        collection.find(query).toArray(function(err:any, docs:any){
            callback([err,docs])
        })
    }catch(err){
        console.log(err)
    }
}

function dbStartup(){
    users={}
    if(db!=null){
        dbFindAsArray(USERS_COLL,{},function(result:any){
            if(result[0]){
                console.log("users startup failed",result[0])
            }else{
                console.log(`users startup ok, ${result[1].length} user(s)`)
                for(let obj of result[1]){
                    let username=obj.username
                    let cookie=obj.cookie
                    users[username]=obj
                    cookies[cookie]={
                        username:username
                    }
                }
            }
        })
    }
}

function setUserDb(user:any){
    if(db!=null){
        try{
            const collection = db.collection(USERS_COLL)
            console.log(`updating user`,user)
            collection.updateOne({username:user.username},{"$set":user},{upsert:true},(error:any,result:any)=>{
                console.log(`updating user ${user.username} error = `,error)
                console.log(error)
            })
        }catch(err){console.log(err)}
    }
}

function createLogin(username:any,callback:any){    
    let code=uniqid()
    console.log(`creating login ${username} ${code}`)        
    callback(code)
}

function registerUser(username:any,callback:any){
    let cookie=uniqid()
    let user={
        username:username,
        cookie:cookie
    }
    users[username]=user
    cookies[cookie]={
        username:username
    }
    setUserDb(user)
    callback(cookie)
}

function checkCookie(cookie:any,callback:any){
    console.log(`checking cookie ${cookie}`)
    if(cookie==undefined){
        callback({ok:false})
        return
    }
    let cookieRecord=cookies[cookie]
    if(cookieRecord==undefined){
        callback({ok:false})
        return
    }
    let username=cookieRecord.username
    let user=users[username]
    callback({ok:true,user:user})
}

function userList(){
    let userlist:any={}
    for(let username in users){
        userlist[username]={
            username:username
        }
    }
    return userlist
}
