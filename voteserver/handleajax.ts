function handleAjax(req:any,res:any){
    let responseJson={
        ok:true,
        req:req.body
    }

    res.setHeader("Content-Type","application/json")
    res.send(JSON.stringify(responseJson))
}

module.exports.handleAjax=handleAjax