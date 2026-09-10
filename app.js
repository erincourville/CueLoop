/* Rehearsal Mapper: browser-only choreography rehearsal tool */
const STORAGE_KEY='cueLoopProjectV1';
const state={projectName:'',songTitle:'',artistName:'',bpm:120,firstBeat:0,cues:[{t:0,name:'START',detail:'Add your first choreography cue.'}]};
const $=id=>document.getElementById(id);
const audio=$('audio'),cueList=$('cueList'),bar=$('bar');
let audioObjectUrl=null,loopA=null,loopB=null,loopOn=false;

function fmt(t){t=Math.max(0,Number(t)||0);const m=Math.floor(t/60),s=t-m*60;return `${m}:${s.toFixed(1).padStart(4,'0')}`}
function parseTime(v){v=(v||'').trim();if(!v)return null;if(v.includes(':')){const [m,s]=v.split(':').map(Number);return Number.isFinite(m)&&Number.isFinite(s)?m*60+s:null}const n=Number(v);return Number.isFinite(n)?n:null}
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function activeIndex(t){if(!state.cues.length)return-1;let idx=0;for(let i=0;i<state.cues.length;i++)if(t>=state.cues[i].t)idx=i;return idx}
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function pullInputs(){state.projectName=$('projectName').value.trim();state.songTitle=$('songTitle').value.trim();state.artistName=$('artistName').value.trim();state.bpm=Number($('bpm').value)||120;state.firstBeat=Number($('firstBeat').value)||0;save()}
function pushInputs(){$('projectName').value=state.projectName||'';$('songTitle').value=state.songTitle||'';$('artistName').value=state.artistName||'';$('bpm').value=state.bpm||120;$('firstBeat').value=state.firstBeat||0}
function loadSaved(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!s)return;Object.assign(state,s);if(!Array.isArray(state.cues)||!state.cues.length)state.cues=[{t:0,name:'START',detail:'Add your first choreography cue.'}]}catch(e){}}

function render(){
  cueList.innerHTML='';
  state.cues.forEach((c,i)=>{
    const el=document.createElement('div');el.className='cue';el.dataset.i=i;
    el.innerHTML=`<div class="cueTop"><div class="cueTime">${fmt(c.t)}</div><div class="cueName">${esc(c.name)}</div><button class="small jump">Jump</button><button class="small set">Set here</button><button class="small edit">Edit</button><button class="small del">Delete</button></div><div class="cueDetail">${esc(c.detail||'')}</div>`;
    el.querySelector('.jump').onclick=()=>audio.currentTime=c.t;
    el.querySelector('.set').onclick=()=>{state.cues[i].t=audio.currentTime;state.cues.sort((a,b)=>a.t-b.t);save();render()};
    el.querySelector('.edit').onclick=()=>{const n=prompt('Move/cue name:',state.cues[i].name);if(n===null)return;const d=prompt('Notes/transition:',state.cues[i].detail||'');if(d===null)return;state.cues[i].name=n.trim()||state.cues[i].name;state.cues[i].detail=d.trim();save();render()};
    el.querySelector('.del').onclick=()=>{if(confirm(`Delete "${state.cues[i].name}"?`)){state.cues.splice(i,1);if(!state.cues.length)state.cues.push({t:0,name:'START',detail:'Add your first choreography cue.'});save();render()}};
    cueList.appendChild(el);
  });
}

function update(){
  const t=audio.currentTime||0;$('timeNow').textContent=fmt(t);
  bar.style.width=Number.isFinite(audio.duration)&&audio.duration>0?`${t/audio.duration*100}%`:'0%';
  const idx=activeIndex(t),c=idx>=0?state.cues[idx]:null;
  $('currentCue').textContent=c?.name||'—';$('currentDetail').textContent=c?.detail||'';$('nextCue').textContent=state.cues[idx+1]?.name||'FINISH / HOLD';
  $('practiceCurrent').textContent=c?.name||'—';
  $('practiceDetail').textContent=c?.detail||'';
  $('practiceNext').textContent=state.cues[idx+1]?.name||'FINISH / HOLD';
  $('practiceTime').textContent=fmt(t);
  document.querySelectorAll('.cue').forEach((el,i)=>el.classList.toggle('active',i===idx));
  const bpm=Number(state.bpm)||0,fb=Number(state.firstBeat)||0;
  if(bpm>0&&t>=fb){const bi=Math.floor((t-fb)/(60/bpm));$('countNow').textContent=bi%8+1;$('phraseNow').textContent=Math.floor(bi/8)+1}else{$('countNow').textContent='—';$('phraseNow').textContent='—'}
  if(loopOn&&loopA!==null&&loopB!==null&&t>=loopB){audio.currentTime=loopA;audio.play()}
  requestAnimationFrame(update);
}

$('audioFile').onchange=e=>{const f=e.target.files?.[0];if(!f)return;if(audioObjectUrl)URL.revokeObjectURL(audioObjectUrl);audioObjectUrl=URL.createObjectURL(f);audio.src=audioObjectUrl;audio.load();if(!state.songTitle){state.songTitle=f.name.replace(/\.[^.]+$/,'');$('songTitle').value=state.songTitle}$('projectStatus').textContent=`Loaded locally: ${f.name}`;save()};
$('newProject').onclick=()=>{if(confirm('Start a new blank project? Export first if you want a backup.')){Object.assign(state,{projectName:'',songTitle:'',artistName:'',bpm:120,firstBeat:0,cues:[{t:0,name:'START',detail:'Add your first choreography cue.'}]});if(audioObjectUrl)URL.revokeObjectURL(audioObjectUrl);audio.removeAttribute('src');audio.load();localStorage.removeItem(STORAGE_KEY);pushInputs();render();$('projectStatus').textContent='New blank project created.'}};
$('playPause').onclick=()=>audio.paused?audio.play():audio.pause();
function enterPracticeMode(){
  $('practiceView').classList.add('active');
  $('practiceView').setAttribute('aria-hidden','false');
  document.body.classList.add('practice-active');

  if(document.documentElement.requestFullscreen){
    document.documentElement.requestFullscreen().catch(()=>{});
  }
}

function exitPracticeMode(){
  $('practiceView').classList.remove('active');
  $('practiceView').setAttribute('aria-hidden','true');
  document.body.classList.remove('practice-active');

  if(document.fullscreenElement && document.exitFullscreen){
    document.exitFullscreen().catch(()=>{});
  }
}

$('practiceMode').onclick=enterPracticeMode;
$('exitPractice').onclick=exitPracticeMode;

document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && $('practiceView').classList.contains('active')){
    exitPracticeMode();
  }
});
$('back10').onclick=()=>audio.currentTime=Math.max(0,audio.currentTime-10);$('back5').onclick=()=>audio.currentTime=Math.max(0,audio.currentTime-5);$('fwd5').onclick=()=>audio.currentTime=Math.min(audio.duration||999999,audio.currentTime+5);
$('restartCue').onclick=()=>{const i=activeIndex(audio.currentTime);if(i>=0)audio.currentTime=state.cues[i].t};
$('speed').oninput=e=>{audio.playbackRate=Number(e.target.value);$('speedLabel').textContent=Number(e.target.value).toFixed(2)+'×'};
$('volume').oninput=e=>{audio.volume=Number(e.target.value);$('volLabel').textContent=Math.round(Number(e.target.value)*100)+'%'};
$('setFirstBeat').onclick=()=>{state.firstBeat=audio.currentTime;$('firstBeat').value=state.firstBeat.toFixed(2);save()};
function loopText(){$('loopStatus').textContent=`${loopA===null?'A: —':'A: '+fmt(loopA)} • ${loopB===null?'B: —':'B: '+fmt(loopB)}`}
$('setA').onclick=()=>{loopA=audio.currentTime;if(loopB!==null&&loopB<=loopA)loopB=null;loopText()};
$('setB').onclick=()=>{loopB=audio.currentTime;if(loopA!==null&&loopB<=loopA)loopA=null;loopText()};
$('toggleLoop').onclick=e=>{if(loopA===null||loopB===null)return;loopOn=!loopOn;e.target.textContent=loopOn?'Loop ON':'Loop OFF'};
$('clearLoop').onclick=()=>{loopA=loopB=null;loopOn=false;$('toggleLoop').textContent='Loop OFF';loopText()};
$('useCurrentTime').onclick=()=>$('newTime').value=fmt(audio.currentTime);
$('addCue').onclick=()=>{const t=parseTime($('newTime').value),name=$('newName').value.trim(),detail=$('newDetail').value.trim();if(t===null||!name){alert('Please enter a time and move/cue name.');return}state.cues.push({t,name,detail});state.cues.sort((a,b)=>a.t-b.t);save();render();$('newTime').value='';$('newName').value='';$('newDetail').value=''};

$('exportProject').onclick=()=>{pullInputs();const payload={app:'Rehearsal Mapper',version:1,exportedAt:new Date().toISOString(),note:'Audio intentionally not included.',project:state};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');const name=(state.projectName||state.songTitle||'rehearsal-project').replace(/[^a-z0-9-_]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase();a.href=url;a.download=`${name||'rehearsal-project'}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);$('projectStatus').textContent='Project backup exported. Audio is not included.'};

$('importProject').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text()),x=p.project||p;if(!x||!Array.isArray(x.cues))throw new Error();Object.assign(state,{projectName:x.projectName||'',songTitle:x.songTitle||'',artistName:x.artistName||'',bpm:Number(x.bpm)||120,firstBeat:Number(x.firstBeat)||0,cues:x.cues.filter(c=>c&&Number.isFinite(Number(c.t))&&typeof c.name==='string').map(c=>({t:Number(c.t),name:c.name,detail:typeof c.detail==='string'?c.detail:''})).sort((a,b)=>a.t-b.t)});if(!state.cues.length)state.cues=[{t:0,name:'START',detail:'Add your first choreography cue.'}];pushInputs();save();render();$('projectStatus').textContent=`Imported ${f.name}. Choose the matching song file.`}catch(err){alert('That file could not be imported as a Rehearsal Mapper project.')}finally{e.target.value=''}};

['projectName','songTitle','artistName','bpm','firstBeat'].forEach(id=>$(id).addEventListener('change',pullInputs));
loadSaved();pushInputs();render();update();
