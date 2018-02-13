// system
const nfetch = require("node-fetch")

// local
const GLOBALS = require("./globals")

let variantPlayers={}

function getVariantPlayers(){
    for(let i=0;i<GLOBALS.ALL_VARIANTS.length;i++){
        let variant=GLOBALS.ALL_VARIANTS[i]
        setTimeout(function(){
            nfetch(`https://lichess.org/stat/rating/distribution/${variant}`).
            then(response=>{
                response.text().then(content=>{             
                    try{
                        let parts=content.split(`class="desc"`)
                        parts=parts[1].split(/<strong>|<\/strong>/)
                        let num=parts[1].replace(/[^0-9]/g,"")
                        variantPlayers[variant]=parseInt(num)                        
                    }catch(err){
                        console.log(err)
                    }
                },err=>console.log(err))
            },err=>console.log(err))
        },i*3000)
    }
}

////////////////////////////////////////
// Scheduling

if(GLOBALS.isProd()){

    getVariantPlayers()

    setInterval(getVariantPlayers,GLOBALS.ONE_HOUR)

}

////////////////////////////////////////

////////////////////////////////////////
// Exports

module.exports.variantPlayers=variantPlayers

////////////////////////////////////////