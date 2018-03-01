let DATABASE_NAME=`mychessdb`

let LOCAL_MONGO_URI=`mongodb://localhost:27017/${DATABASE_NAME}`

let MONGODB_URI = isProd()?process.env.MONGODB_URI:LOCAL_MONGO_URI

const COLL_COMMANDS:any={
    upsertone:true,
    insertone:true,
    findaslist:true
}

type MONGO_REQUEST=
    "upsertone"|
    "insertone"|
    "findaslist"

let db:any

try{
    mongodb.connect(MONGODB_URI, function(err:any, conn:any){
        if (err){
            console.log(logErr(err))
        }else{
            db = conn.db(DATABASE_NAME)
            console.log(`votes connected to MongoDB database < ${db.databaseName} >`)            
            // startup
            usersStartup()
            voteTransactionsStartup()
        }
    })
}catch(err){
    console.log(logErr(err))
}

function mongoRequest(req:any,callback:any){
    let res:any={
        ok:true,
        status:"ok",
        req:req
    }

    try{
        let t:MONGO_REQUEST=req.t
        console.log(`mongo request ${t}`)

        if(db==null){
            res.ok=false
            res.status="no db"
            callback(res)
            return
        }

        if(COLL_COMMANDS[t]){
            let collName=req.collName

            let collection=db.collection(collName)

            let query=req.query            
            let doc=req.doc

            if(t=="upsertone"){          
                console.log("upsert one",query,doc)      
                collection.updateOne(query,{"$set":doc},{upsert:true},(error:any,result:any)=>{
                    if(error){
                        res.ok=false;res.status="upsert failed";res.err=error
                        callback(res)
                        return
                    }else{
                        res.status="upsert ok"
                        callback(res)
                        return
                    }
                })
            }else if(t=="insertone"){          
                console.log("insert one",doc)      
                collection.insertOne(doc,(error:any,result:any)=>{
                    if(error){
                        res.ok=false;res.status="insert failed";res.err=error
                        callback(res)
                        return
                    }else{
                        res.status="insert ok"
                        callback(res)
                        return
                    }
                })
            }else if(t=="findaslist"){
                console.log("find as list",query)
                collection.find(query).toArray((error:any,docs:any)=>{
                    if(error){
                        res.ok=false;res.status="find as list failed";res.err=error
                        callback(res)
                        return
                    }else{
                        res.docs=docs
                        callback(res)
                        return
                    }
                })
            }
        }
    }catch(err){
        logErr(err)
        res.ok=false
        res.status="exception"
        res.err=err
        callback(res)
    }
}