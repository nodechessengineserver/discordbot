namespace Glicko{

const VERBOSE = true

///////////////////////////////////////////
// Constants and utility functions

export const RATING0 = 1500
export const RD0 = 350
const TYPICAL_RD = 50
const TIME_CONSTANT = 1000
const RATING_DIFFERENCE_DIVISOR = 400
const MIN_RATING = 100
const MAX_RATING = 3500
const PI = Math.PI
const Q = Math.log(10) / RATING_DIFFERENCE_DIVISOR
const MONTH_MS = 1000 * 60 * 60 * 24 * 30
const C2 = (sq(RD0) - sq(TYPICAL_RD)) / MONTH_MS

function sqrt(x:number){return Math.sqrt(x)}
function sq(x:number){return x*x}
function pow10(x:number){return Math.pow(10,x)}
function min(x:number,y:number){return Math.min(x,y)}

///////////////////////////////////////////
// Glick sub calculations

function g(rdi:number){
    return 1.0 / sqrt(1.0 + 3.0 * sq(Q * rdi / PI))
}

function E(r:number, ri:number, rdi:number){
    return 1.0 / (1.0 + pow10(g(rdi) * (r - ri) / -RATING_DIFFERENCE_DIVISOR))
}

function d2(r:number, ri:number, rdi:number){
    return 1.0 / (sq(Q) * sq(g(rdi)) * E(r, ri, rdi) * (1 - E(r, ri, rdi)))
}

function r(r:number, rd:number, ri:number, rdi:number, si:number){
    let newr = r + Q / ((1 / sq(rd) + (1 / d2(r, ri, rdi)))) * (si - E(r, ri, rdi))
    if(newr < MIN_RATING) newr = MIN_RATING
    if(newr > MAX_RATING) newr = MAX_RATING
    return newr
}

function getrdt(rd:number, t:number){
    return min(sqrt(sq(rd) + C2 * t), RD0)
}

function rd(r:number, rd:number, ri:number, rdi:number){
    return sqrt(1 / ((1 / sq(rd)) + (1 / d2(r, ri, rdi))))
}

export function calc(g:GlickoData, gi:GlickoData, si:number):GlickoData{

    const now = new Date().getTime()
    const rdt = getrdt(g.rd, now - g.lastrated)

    if(VERBOSE) {
      console.log("***********************************")
      console.log("Glicko calculation")
      console.log("***********************************")
      console.log("Player ",g)
      console.log("Opponent ",gi)
      console.log("***********************************")
      console.log("Result ",si)
      console.log("Expected result ",E(g.rating, gi.rating, gi.rd))
      console.log("***********************************")
    }

    const result = new GlickoData()

    result.rating = r(g.rating, rdt, gi.rating, gi.rd, si),
    result.rd = rd(g.rating, rdt, gi.rating, gi.rd),
    result.lastrated = now

    if(VERBOSE) {
      console.log("New rating ",result)
      console.log("***********************************")
    }

    return result

  }

}