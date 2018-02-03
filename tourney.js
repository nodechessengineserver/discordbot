const fetch = require('node-fetch');
const FormData = require('form-data');
const fs=require("fs");

let LICHESS_TOURNEY_URL=`https://lichess.org/tournament/new`
let LICHESS_TOURNEY_NAME=`ACT Discord Server`
let LICHESS_TOURNEY_WAIT_MINUTES=`20`
let LICHESS_USER=process.env.LICHESS_USER
let LICHESS_PASS=process.env.LICHESS_PASS

let lila2

function getLila2(){
    if(lila2!=undefined) return lila2
    return process.env.lila2
}

function writeTextFile(path,content){
    fs.writeFile(path, content, function(err) {
        console.log(`write file ${path} with ${content.length} err`,err)
    })
}

function login(user,pass,callback){
    console.log(`lichess login in with ${user}`)
    let form=new FormData()
    form.append("username",user);
    form.append("password",pass);
    fetch((`https://lichess.org/login?referrer=/`),{
        method:"POST",
        headers:{
            "Referer":"https://lichess.org/login?referrer=/"
        },
        redirect:"manual",
        body:form
    }).then(response=>{
        cookie=response.headers._headers["set-cookie"][0]        
        let parts=cookie.split("=")
        parts.shift()
        parts=parts.join("=").split(";")
        lila2=parts[0]                
        console.log(`obtained cookie: lila2=${lila2}`)
        callback()
    })
}

function createTourney(time,inc,callback){
    console.log(`creating atomic tourney ${time}+${inc}`)
    let form=new FormData()    
    form.append("system","1");
    //form.append("isprivate","");
    form.append("password","");
    form.append("name",`${LICHESS_TOURNEY_NAME}`);
    form.append("variant","7");
    form.append("position","rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    form.append("mode","1");
    form.append("waitMinutes",`${LICHESS_TOURNEY_WAIT_MINUTES}`);
    form.append("clockTime",`${time}`);
    form.append("clockIncrement",`${inc}`);
    form.append("minutes","120");
    //console.log(form)
    let headers={
        "Referer":`${LICHESS_TOURNEY_URL}`,
        'Cookie': `lila2=${getLila2()}`
    }
    //console.log(headers);
    fetch((`${LICHESS_TOURNEY_URL}`),{
        method:"POST",
        headers:headers,
        redirect:"manual",
        body:form
    }).
    then(response=>response.text()).
    then(content=>callback(content))
}

function loginAndCreateTourney(time,inc){
    login(LICHESS_USER,LICHESS_PASS,()=>{
        console.log("login ok")
        createTourney(time,inc,(content)=>{
            console.log("create tourney done")
            writeTextFile("res.html",content)
        })
    })
}

//loginAndCreateTourney(1,0);

module.exports.loginAndCreateTourney=loginAndCreateTourney