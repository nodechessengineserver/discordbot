let DATABASE_NAME=`mychessdb`
let USERS_COLL=`actusers`
let CHESSLOG_COLL=`chesslog`

let LOCAL_MONGO_URI=`mongodb://localhost:27017/${DATABASE_NAME}`

let MONGODB_URI = GLOBALS.isProd()?process.env.MONGODB_URI:LOCAL_MONGO_URI

let db:any

try{
    mongodb.connect(MONGODB_URI, function(err:any, conn:any){
        if (err){
            console.log(GLOBALS.handledError(err))
        }else{
            db = conn.db(DATABASE_NAME)
            console.log(`chess connected to MongoDB database < ${db.databaseName} >`)            
            dbUsersStartup()
            dbChesslogStartup()
        }
    })
}catch(err){
    console.log(GLOBALS.handledError(err))
}

function dbFindAsArray(collectionName:any,query:any,callback:any){
    try{
        const collection = db.collection(collectionName)
        // Find documents
        collection.find(query).toArray(function(err:any, docs:any){
            callback([err,docs])
        })
    }catch(err){
        callback([err,[]])
    }
}

