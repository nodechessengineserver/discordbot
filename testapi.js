var fetch = require('node-fetch');

let AJAX_URL=`http://127.0.0.1:5000/ajax`

function makeAjaxRequest(payload,callback){
    fetch(`${AJAX_URL}`,{
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
            "Content-Type": "application/json"
        }
    }).
    then(response=>response.text()).
    then(content=>callback(content))
}

/*makeAjaxRequest({
    action:"t",
    time:"3",
    inc:"2"
},(content)=>{
    console.log(content)
})*/

/*makeAjaxRequest({
    action:"say",
    content:"In the end of the day we can have regular atomic tourneys every 2 hours."
},(content)=>{
    console.log(content)
})*/

/*makeAjaxRequest({
    action:"top",
    n:5
},(content)=>{
    console.log(content)
})*/

makeAjaxRequest({
    action:"cmp",
    handle:"Gannet",
    handlearg:"tipau"
},(content)=>{
    console.log(content)
})