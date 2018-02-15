// system
const uniqid = require("uniqid")
let mongodb = require("mongodb")

// local
const GLOBALS = require("../globals")

let DATABASE_NAME=`mychessdb`
let USERS_COLL=`users`

let LOCAL_MONGO_URI=`mongodb://localhost:27017/${DATABASE_NAME}`

let MONGODB_URI = GLOBALS.isProd()?process.env.MONGODB_URI:LOCAL_MONGO_URI

let users={}
let cookies={}

let db

try{
    mongodb.connect(MONGODB_URI, function(err, conn){
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

function dbFindAsArray(collectionName,query,callback){
    try{
        const collection = db.collection(collectionName)
        // Find documents
        collection.find(query).toArray(function(err, docs){
            callback([err,docs])
        })
    }catch(err){
        console.log(err)
    }
}

function dbStartup(){
    users={}
    if(db!=null){
        dbFindAsArray(USERS_COLL,{},function(result){
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

function setUserDb(user){
    if(db!=null){
        try{
            const collection = db.collection(USERS_COLL)
            console.log(`updating user`,user)
            collection.updateOne({username:user.username},{"$set":user},{upsert:true},(error,result)=>{
                console.log(`updating user ${user.username} error = `,error)
                console.log(error)
            })
        }catch(err){console.log(err)}
    }
}

function createLogin(username,callback){    
    let code=uniqid()
    console.log(`creating login ${username} ${code}`)        
    callback(code)
}

function registerUser(username,callback){
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

function checkCookie(cookie,callback){
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
    let userlist={}
    for(let username in users){
        userlist[username]={
            username:username
        }
    }
    return userlist
}

module.exports.users=users
module.exports.createLogin=createLogin
module.exports.registerUser=registerUser
module.exports.checkCookie=checkCookie
module.exports.userList=userList