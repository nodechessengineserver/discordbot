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
