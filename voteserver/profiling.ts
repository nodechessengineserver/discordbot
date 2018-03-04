const PROFILE_EXPIRY = isDev() ? ONE_MINUTE * 3 : ONE_DAY * 1

let PROFILING_INTERVAL = isDev() ? ONE_SECOND * 60 : ONE_MINUTE * 5

if(isProd()){
    setInterval(profilingFunc,PROFILING_INTERVAL)

    if(isDev()) setTimeout(profilingFunc,ONE_SECOND*10)
}

function getProfile(username:string,callback:any):any{
    console.log(`getting lichess profile for ${username}`)
    fetch_(`https://lichess.org/api/user/${username}`).then(
        (response:any)=>response.text().then(
            (content:any)=>{
                try{
                    let json=JSON.parse(content)
                    callback(json)
                }catch(err){
                    logErr(err)
                }
            },
            (err:any)=>logErr(err)
        ),
        (err:any)=>logErr(err)
    )
}

function profilingFunc(){
    try{
        for(let username in users.users){
            let u=users.users[username]
            let now=new Date().getTime()
            let elapsed=now-u.lastProfiledAt
            if(elapsed>PROFILE_EXPIRY){
                getProfile(username,(json:any)=>{
                    console.log(json)
                    console.log(`profiling ${username}`)
                    let title=json.title==undefined?"none":json.title
                    console.log(`title ${title}`)
                    let registeredAt=json.createdAt
                    if(registeredAt==undefined) registeredAt=now
                    let membershipAge=now-registeredAt
                    console.log(`registered at ${registeredAt} membership age ${membershipAge}`)
                    let perfs=json.perfs
                    let totalgames=0
                    let cumrating=0
                    if(perfs!=undefined){
                        for(let variant in perfs){
                            let perf=perfs[variant]
                            let rating=perf.rating
                            let games=perf.games
                            if(games>0){
                                totalgames+=games
                                cumrating+=games*rating
                                console.log(`variant ${variant} games ${games} rating ${rating} totalgames ${totalgames} cumavgrating ${cumrating/totalgames}`)                            
                            }                            
                        }                        
                    }else{
                        console.log(`no perfs`)
                    }

                    let playTime=json.playTime.total

                    if(playTime==undefined) playTime=0

                    console.log(`playtime ${playTime}`)

                    u.lastProfiledAt=now
                    u.title=title
                    u.overallGames=totalgames
                    u.playTime=playTime
                    u.overallStrength=(totalgames>0)?cumrating/totalgames:1500
                    u.membershipAge=membershipAge

                    setUser(u)
                })                
                return
            }
        }
    }catch(err){
        logErr(err)
    }
}