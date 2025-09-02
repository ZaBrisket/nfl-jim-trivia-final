
import React from 'react'
import type { Position } from '../types'
import { seedFromString, mulberry32 } from '../util/rng'
import { levenshtein } from '../util/levenshtein'
import { useDataset } from './dataset'

type Round = { active:boolean; revealed:boolean; playerId?:string; pos?:Position; startAt?:number; guesses:number; hints:number; score:number; timedOut:boolean }
const RECENT_KEY='njt_recent_ids'; const STREAK_KEY='njt_streak_best'; const CURRENT_STREAK_KEY='njt_streak_current'
function getStored<T>(k:string,f:T):T{ try{const s=localStorage.getItem(k); return s?JSON.parse(s):f}catch{return f} }
function setStored<T>(k:string,v:T){ try{localStorage.setItem(k,JSON.stringify(v))}catch{} }

class GameState {
  round: Round = { active:false, revealed:false, guesses:0, hints:0, score:5, timedOut:false }
  guessInput=''; focusedGuess=false
  bestStreak=getStored<number>(STREAK_KEY,0); currentStreak=getStored<number>(CURRENT_STREAK_KEY,0)
  #timer?: any

  use(){ const [,setTick]=React.useState(0); React.useEffect(()=>()=>clearInterval(this.#timer),[]); (this as any).force=()=>setTick(x=>x+1); return this }
  focusGuess(){ this.focusedGuess=true; (this as any).force() }

  get timeLeft():number{ if(!this.round.active||!this.round.startAt) return 60; const e=Math.floor((Date.now()-this.round.startAt)/1000); return Math.max(0,60-e) }

  private startTimer(){ clearInterval(this.#timer); this.#timer=setInterval(()=>{ if(!this.round.active||this.round.revealed||this.round.timedOut) return; const e=Math.floor((Date.now()-(this.round.startAt||Date.now()))/1000); if(e>=60){ this.round.timedOut=true; this.endRound(false,true) } ;(this as any).force() },250) }

  startRound(ds: ReturnType<typeof useDataset>){ const eligible=ds.eligibility.filter(e=>e.eligible_flag===1).map(e=>e.player_id); const recent=getStored<string[]>(RECENT_KEY,[]); const pool=eligible.filter(id=>!recent.includes(id)); const pickFrom=pool.length?pool:eligible; const rng=mulberry32(seedFromString(String(Date.now()))); const idx=Math.floor(rng()*pickFrom.length); this.startSpecific(ds,pickFrom[idx]) }
  startSpecific(ds: ReturnType<typeof useDataset>, playerId:string){ const p=ds.players.find(p=>p.player_id===playerId); if(!p) return; this.round={active:true,revealed:false,playerId,pos:p.pos,startAt:Date.now(),guesses:0,hints:0,score:5,timedOut:false}; this.guessInput=''; this.startTimer(); (this as any).force() }
  restartDaily(ds: ReturnType<typeof useDataset>){ const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}); const ymd=fmt.format(new Date()); const match=ds.dailyPicks.find(d=>d.date_chi===ymd); if(match) this.startSpecific(ds,match.player_id) }

  hint(n:1|2){ if(!this.round.active||this.round.revealed) return; if(n===1&&this.round.hints<1){this.round.hints+=1; this.round.score-=1}else if(n===2&&this.round.hints<2){this.round.hints+=1; this.round.score-=1}; (this as any).force() }
  submit(){ if(!this.round.active||this.round.revealed) return; const id=this.round.playerId!; const v=this.guessInput.trim(); if(!v) return; const ok=this.matchGuess(v,id); if(ok){ this.endRound(true,false) } else { this.round.guesses+=1; if(this.round.guesses>=3){ this.endRound(false,false,true) }; (this as any).force() } }
  giveUp(){ if(!this.round.active||this.round.revealed) return; this.endRound(false,true) }

  private endRound(correct:boolean, timeout:boolean, thirdWrong=false){ clearInterval(this.#timer); if(!correct&&(timeout||thirdWrong)) this.round.score-=1; this.round.revealed=true; if(correct&&this.round.score>=1){ this.currentStreak+=1; this.bestStreak=Math.max(this.bestStreak,this.currentStreak) } else { this.currentStreak=0 } setStored(STREAK_KEY,this.bestStreak); setStored(CURRENT_STREAK_KEY,this.currentStreak); const recent=getStored<string[]>(RECENT_KEY,[]); setStored(RECENT_KEY,[this.round.playerId!,...recent].slice(0,50)); (this as any).force() }

  matchGuess(value:string, playerId:string):boolean{ const players:any[]=(window as any).__PLAYERS__||[]; const p=players.find(p=>p.player_id===playerId); if(!p) return false; const name=p.display_name.toLowerCase(); const aliases=(p.aliases_csv||'').split(',').map((s:string)=>s.trim().toLowerCase()).filter(Boolean); const v=value.toLowerCase(); if(v===name) return true; if(aliases.includes(v)) return true; const d=levenshtein(v,name); if(name.length>=6 && d<=2) return true; return false }
}

const game=new GameState()
export const Game={ use(){ return game.use() }, Provider({children}:{children:React.ReactNode}){ return <>{children}</> } }
