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
        console.log("default",_default)
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

function setCookie(name:any,value:any,days:any) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
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