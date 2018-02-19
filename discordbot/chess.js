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
        pimg.decodeJPEGFromStream(fs.createReadStream(__dirname+"/chesspieces/"+board[r*8+f]+".jpg")).then((img) => {                            
            c.drawImage(img,
                0, 0, img.width, img.height, // source dimensions
                f*IMAGE_SIZE, r*IMAGE_SIZE, IMAGE_SIZE, IMAGE_SIZE                 // destination dimensions
            );                            
        });
    }
    setTimeout(()=>{pimg.encodeJPEGToStream(img2,fs.createWriteStream(__dirname+"/../public/images/board.jpg"))},1000)
}

function makeMove(move){
    let result=makeMoveInner(move);
    createImage();
    return result;
}

function setPiece(r,f,p){    
    let sqcol=(((r+f)%2)==0)?"l":"d"
    board[r*8+f]=p=="-"?sqcol+"s":p+sqcol
}

let fenToPiece={'p':'bp','n':'bn','b':'bb','r':'br','q':'bq','k':'bk',
'P':'wp','N':'wn','B':'wb','R':'wr','Q':'wq','K':'wk'}

function setFromFen(fen){    
    let parts=fen.split(" ")
    let fenparts=parts[0].split("/")
    if(fenparts.length!=8) return false
    hist=[]
    board=clone(startpos)
    let r
    let f    
    function flush(n){
        for(let i=0;i<n;i++){
            setPiece(r,f,"-")
            f++
        }
    }
    for(r=0;r<fenparts.length;r++){
        let pieces=fenparts[r].split("")
        f=0
        for(let p of pieces){
            let piece=fenToPiece[p]
            if(piece!=undefined){
                setPiece(r,f,piece)
                f++
            }else{
                let n=parseInt(p)
                if(!isNaN(n)) flush(n)
            }
        }
    }    
    return true
}

function makeMoveInner(move){    
    let old=clone(board)
    if((move=="+")||(move=="show")||(move=="s")||(move=="board")||(move=="b")) return true
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
    let fenparts=move.split("/")
    if(fenparts.length==8){
        return setFromFen(move);
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
    if((frompiece=="ls")||(frompiece=="ds")) return false;
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
