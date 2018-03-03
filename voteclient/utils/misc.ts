function logErr(err:any){
    console.log("err",err)
}

function getCssProperty(name:string,_default:string=""):string{
    let propertyValue=window.getComputedStyle(document.body).getPropertyValue(name)    
    if(propertyValue=="") return _default
    return propertyValue
}

function getCssFloatProperty(name:string,_default:number):number{
    let propertyValue=getCssProperty(name)
    try{
        let value=parseFloat(propertyValue)        
        if(isNaN(value)) return _default
        return value
    }catch(err){
        //console.log("default",_default)
        return _default
    }
}

function SCALE_FACTOR():number{
    let rootFontSize=document.documentElement.style.fontSize    
    return (rootFontSize==null)||(rootFontSize=="")?1:parseFloat(rootFontSize.replace("px",""))
}

let LOG_BUFFER_SIZE=50

type LogitemKind="normal"|"info"|"success"|"error"

class Logitem{
    text:string
    kind:string
    now:Date
    constructor(text:string,kind:LogitemKind="normal"){
        this.text=text
        this.kind=kind
        this.now=new Date()
    }
}

class Log{
    items:Logitem[]=[]
    log(li:Logitem){
        this.items.unshift(li)
        if(this.items.length>LOG_BUFFER_SIZE) this.items.pop()
    }
}

function uniqueId(){
    return ""+Math.floor(Math.random()*1e9)
}

function toTwoDigits(n:number):string{
    return (n<10?"0":"")+n
}

function formatDurationAsClock(dur:number):string{    
    let msecsMod=dur%1000
    let secs=(dur-msecsMod)/1000
    let secsMod=secs%60
    let mins=(secs-secsMod)/60
    secs-=mins*60
    let minsMod=mins%60
    let hours=(mins-minsMod)/60
    mins-=hours*60    
    return `${toTwoDigits(hours)}:${toTwoDigits(mins)}:${toTwoDigits(secs)}`
}

function ajaxRequest(json:any,callback:any){
    let body=JSON.stringify(json)
    //console.log(`making ajax request ${body}`)    
    fetch(`ajax`,{
        method:"POST",
        credentials:"include",
        headers:new Headers({
            "Content-Type":"application/json"
        }),
        body:body
    }).then((response:any)=>{
        response.text().then((content:any)=>{
            try{
                let json=JSON.parse(content)
                callback(json)
            }catch(err){
                logErr(err)
            }
        },(err:any)=>{
            logErr(err)
        })
    },(err:any)=>{
        logErr(err)
    })
}

function setCookie(name:any,value:any,expiryPeriod:number) {
    var expires = "";
    if (expiryPeriod) {
        var date = new Date();
        date.setTime(date.getTime() + expiryPeriod);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

// https://stackoverflow.com/questions/10730362/get-cookie-by-name

function getCookie(name:string):any{
    var value = "; " + document.cookie    
    var parts:string[] = value.split("; " + name + "=")
    let lastPart=parts.pop()    
    if(lastPart==undefined) return undefined
    if (parts.length == 1) return lastPart.split(";").shift()
}

// https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript

function getParameterByName(name:any, url:any=undefined) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}