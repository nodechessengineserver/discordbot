function checkLichess(username:any,code:any,callback:any){
    console.log(`checking lichess code ${username} ${code}`)

    if(GLOBALS.isDev()){
        console.log(`user ${username} ok in dev`)
        callback(true)
        return
    }

    fetch_(`https://lichess.org/@/${username}`).then((response:any)=>response.text()).
    then((content:any)=>{
        let index=content.indexOf(code)          

        if(index<0){
            console.log(`lichess auth failed for ${username}`)
            callback(false)
            return
        }else{
            console.log(`lichess auth success for ${username}`)
            callback(true)
            return
        }
    },(err:any)=>{
        console.log(GLOBALS.handledError(err))
        callback(false)
    })    
}
