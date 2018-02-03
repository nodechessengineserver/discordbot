module.exports.getBoardText=getBoardText
module.exports.makeMove=makeMove

const pimg = require("pureimage")
const fs = require("fs")

const readline = require('readline');

let FTF={0:'a',1:'b',2:'c',3:'d',4:'e',5:'f',6:'g',7:'h'}

let IMAGE_SIZE=60

let squares=[]

for(let r=7;r>=0;r--)for(let f=0;f<8;f++)squares.push(FTF[f]+(r+1))

let startpos=[
    'brl','bnd','bbl','bqd','bkl','bbd','bnl','brd',
    'bpd','bpl','bpd','bpl','bpd','bpl','bpd','bpl',
    'ls','ds','ls','ds','ls','ds','ls','ds',
    'ds','ls','ds','ls','ds','ls','ds','ls',    
    'ls','ds','ls','ds','ls','ds','ls','ds',
    'ds','ls','ds','ls','ds','ls','ds','ls',    
    'wpl','wpd','wpl','wpd','wpl','wpd','wpl','wpd',
    'wrd','wnl','wbd','wql','wkd','wbl','wnd','wrl'
]

function clone(pos){
    let c=[]
    for(let p of pos)c.push(p)
    return c
}

board=clone(startpos)

let hist=[]

function getBoardText(){
    let bt=""
    for(let r=0;r<8;r++){
        bt+=board.slice(r*8,r*8+8).map(p=>":"+p+":").join("")+"\n"
    }
    return bt
}

function getIndexBySquare(square){
    return squares.indexOf(square)
}

function isPiece(piece){
    if((piece=="ds")||(piece=="ls")) return false
    return true
}

function createImage(){            
    let img2=pimg.make(480,480)
    var c = img2.getContext('2d');        
    for(let r=0;r<8;r++)for(let f=0;f<8;f++)
    {        
        pimg.decodeJPEGFromStream(fs.createReadStream(__dirname+"/chesspieces_jpg/"+board[r*8+f]+".jpg")).then((img) => {                            
            c.drawImage(img,
                0, 0, img.width, img.height, // source dimensions
                f*IMAGE_SIZE, r*IMAGE_SIZE, IMAGE_SIZE, IMAGE_SIZE                 // destination dimensions
            );                            
        });
    }
    setTimeout(()=>{pimg.encodeJPEGToStream(img2,fs.createWriteStream(__dirname+"/public/images/board.jpg"))},1000)
}

function makeMove(move){
    let result=makeMoveInner(move);
    createImage();
    return result;
}

function makeMoveInner(move){    
    let old=clone(board)
    if(move==="reset"){
        board=clone(startpos)
        hist=[]
        return true
    }
    if(move==="del"){
        if(hist.length>0){
            board=hist.pop()
        }
        return true
    }
    if(move.length<4) return false
    if(move.length>5) return false
    let from=move.substring(0,2)
    let to=move.substring(2,4)    
    let fromi=getIndexBySquare(from)
    let toi=getIndexBySquare(to)    
    if((fromi<0)||(toi<0)) return false
    let frompiece=board[fromi]
    let topiece=board[toi]                
    board[fromi]=frompiece.substring(2,3)==="l"?"ls":"ds"
    let prompiece=move.length>4?move.substring(4,5):frompiece.substring(1,2)    
    board[toi]=frompiece.substring(0,1)+prompiece+(
        topiece=="ls"?"l":topiece=="ds"?"d":topiece.substring(2,3)
    )
    if(isPiece(topiece)){
        let tof=toi%8
        let tor=(toi-tof)/8        
        for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){
            let tord=tor+i
            let tofd=tof+j
            if((tord>=0)&&(tord<8)&&(tofd>=0)&&(tofd<8)){
                let index=tord*8+tofd
                let top=board[index]                
                if((top.substring(1,2)!="p")&&(top!="ls")&&(top!="ds"))
                    board[index]=top.substring(2,3)=='l'?"ls":"ds"
            }
        }
        board[toi]=topiece.substring(2,3)=="l"?"ls":"ds"
    }
    hist.push(old)        
    return true
}

function interpreter(){
    console.log(getBoardText())

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    rl.question('move: ', (move) => {        
        makeMove(move);
        rl.close();
        interpreter()
    })
}

//interpreter()