'use strict';
(() => {
 const DEMO = window.ASTE_DEMO === true;
 const REQUIRE_PORTAL_LOGIN = window.ASTE_PORTAL_LOGIN_REQUIRED === true;
 const PORTAL_URL = 'https://railsntgyan.github.io/';
 const BASE = window.ASTE_ASSET_BASE || '';
 const FIREBASE_CONFIG = {apiKey:'AIzaSyBAB8onFJN5t9k8No2YqCbcuFNFAQ5cbpY',authDomain:'signal-portal-6104.firebaseapp.com',projectId:'signal-portal-6104',storageBucket:'signal-portal-6104.firebasestorage.app',messagingSenderId:'177672020477',appId:'1:177672020477:web:9fe0f9565e53b6a5143994'};
 const state={bank:[],user:null,mode:'test',paper:'A',limit:'25',language:'both',current:0,ids:[],answers:{},marked:{},checked:{},startAt:0,endAt:0,timer:null,submitted:null,pending:false,reviewFilter:'all',reviewId:null};
 const $ = id => document.getElementById(id);
 const escapeHTML = str => String(str??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const findQ=id=>state.bank.find(q=>q.id===id);
 const activeBank=()=>state.bank.filter(q=>!q.deleted);
 const paperName = p => p==='A'?'Paper A':p==='B'?'Paper B':'All Papers';
 const countByPaper=p=>activeBank().filter(q=>p==='ALL'||q.paper===p).length;
 function show(name){['loading','auth','home','exam','result'].forEach(x=>{$(`screen-${x}`).classList.toggle('hidden',x!==name)}); window.scrollTo({top:0,behavior:'instant'});}
 function notify(msg,kind='info'){let e=$('toast');e.textContent=msg;e.style.background=kind==='error'?'#a43d45':'#143d55';e.classList.remove('hidden');clearTimeout(notify.timer);notify.timer=setTimeout(()=>e.classList.add('hidden'),3900)}
 function setPending(p){state.pending=p;document.querySelectorAll('button[data-net]').forEach(b=>b.disabled=p)}
 function timeText(seconds){seconds=Math.max(0,Math.floor(seconds));return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
 function applyLanguage(){document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('active',b.dataset.lang===state.language));if(!$('screen-exam').classList.contains('hidden'))renderQ();}
 async function remote(name,payload){
  if(DEMO){const keys=window.ASTE_DEMO_ANSWERS||{};
   if(name==='asteEvaluateAnswer')return {correctOption:keys[payload.id],isCorrect:keys[payload.id]===payload.choice};
   const qs=payload.questions.map(x=>{let chosen=Number(payload.answers[x])||null;return {id:x,chosen,correctOption:keys[x],status:!chosen?'skipped':chosen===keys[x]?'correct':'wrong'};});
   const tally=k=>qs.filter(x=>x.status===k).length;
   return {questions:qs,correct:tally('correct'),wrong:tally('wrong'),skipped:tally('skipped'),total:qs.length,marks:tally('correct'),maxMarks:qs.length,attemptId:'public-browser-only'};
  }
  const fx=window.firebase?.app().functions('asia-south1');
  if(!fx)throw Error('Firebase Functions could not load.');
  const call=fx.httpsCallable(name);
  const reply=await call(payload);
  return reply.data;
 }
 function initHome(){
  $('hero-total').textContent=state.bank.length;$('hero-active').textContent=activeBank().length;$('hero-deleted').textContent=state.bank.filter(q=>q.deleted).length;
  document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;updateHome()}));
  document.querySelectorAll('[data-paper]').forEach(b=>b.addEventListener('click',()=>{state.paper=b.dataset.paper;updateHome()}));
  $('limit').onchange=e=>state.limit=e.target.value;
  $('randomize').onchange=e=>state.randomize=e.target.checked;
  $('start-test').onclick=start;
  updateHome();
 }
 function updateHome(){
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===state.mode);b.querySelector('.radio').textContent=b.dataset.mode===state.mode?'●':'○'});
  document.querySelectorAll('[data-paper]').forEach(b=>b.classList.toggle('active',b.dataset.paper===state.paper));
  $('selected-summary').textContent=`${paperName(state.paper)} · ${countByPaper(state.paper)} available questions`;
  $('start-test').textContent=state.mode==='test'?'Start Test →':'Start Practice →';
  $('mode-note').textContent=state.mode==='test'?'Test Mode: answers stay hidden until submission. A timer and final evaluation are enabled.':'Practice Mode: check each answer immediately, review feedback and learn at your own pace.';
 }
 function start(){
  const pool=activeBank().filter(q=>state.paper==='ALL'||q.paper===state.paper);
  if(!pool.length)return notify('No questions available','error');
  if(state.randomize)pool.sort(()=>Math.random()-.5);
  const n=state.limit==='all'?pool.length:parseInt(state.limit,10);
  state.ids=pool.slice(0,n).map(q=>q.id); state.answers={};state.marked={};state.checked={};state.current=0;state.reviewId=null;state.submitted=null;
  state.startAt=Date.now();state.endAt=state.mode==='test'?state.startAt+state.ids.length*60*1000:0;
  show('exam');renderExam();clearInterval(state.timer);state.timer=setInterval(tick,1000);tick();
 }
 function tick(){
  if(!$('screen-exam') || $('screen-exam').classList.contains('hidden'))return;
  const el=$('timer');if(state.mode==='test'){
   const sec=Math.max(0,Math.ceil((state.endAt-Date.now())/1000));el.textContent='⏱ '+timeText(sec);el.classList.toggle('urgent',sec<120);
   if(sec===0 && !state.pending){clearInterval(state.timer);submit(true)}
  }else {el.textContent='⏱ '+timeText((Date.now()-state.startAt)/1000);el.classList.remove('urgent');}
 }
 function renderExam(){
  $('mode-tag').textContent=state.mode==='test'?'TEST MODE':'PRACTICE MODE';
  $('exam-paper').textContent=paperName(state.paper)+' · ASTE Special Drive 70% (2024)';
  $('palette-paper').textContent=`${state.ids.length} Questions`;
  $('btn-check').classList.toggle('hidden',state.mode!=='practice');
  renderQ();renderPalette();
 }
 function currentQ(){return findQ(state.ids[state.current]);}
 function visual(q,lang){
   const heading = lang==='hi'?'मूल प्रश्न • English + हिन्दी':lang==='en'?'Original source • English + हिन्दी':'Bilingual question • English + हिन्दी';
   return `<div class="question-visual"><div class="lang-label">${heading}</div>${visualImg(q)}</div>`;
 }
 function visualImg(q){return `<img src="${BASE}${q.en}" alt="Original bilingual scanned question ${q.paper}-${q.number}" loading="eager" onclick="window.ASTEZoom('${q.id}')"/><button class="image-zoom" onclick="window.ASTEZoom('${q.id}')">⤢ Enlarge question / प्रश्न बड़ा करें</button>`}
 window.ASTEZoom=id=>{const q=findQ(id);if(!q)return;const pic=`<img src="${BASE}${q.en}" alt="Original bilingual scanned question ${q.paper}-${q.number}"/>`;$('zoom-content').innerHTML=pic;$('zoom-dialog').classList.remove('hidden');};
 function renderQ(){const q=currentQ();if(!q)return;
  $('question-title').textContent=`Question ${state.current+1} of ${state.ids.length}`;
  $('question-meta').textContent=`${paperName(q.paper)} · Q${String(q.number).padStart(2,'0')} · PDF page ${q.sourcePage}`;
  $('exam-complete-fill').style.width=`${Math.round(Object.keys(state.answers).filter(x=>state.ids.includes(x)).length/state.ids.length*100)}%`;
  $('question-area').innerHTML=visual(q,state.language);
  const chosen=state.answers[q.id];const check=state.checked[q.id];
  $('option-area').innerHTML=[1,2,3,4].map(i=>`<button type="button" class="option ${chosen===i?'selected':''} ${check&&check.correctOption===i?'correct':''} ${check&&chosen===i&&!check.isCorrect?'wrong':''}" data-option="${i}" ${check?'disabled':''}><span class="op-num">${i}</span><span>Option ${i} <small style="font-weight:500;color:#8395a4">/ विकल्प ${i}</small></span>${chosen===i?' <span style="margin-left:auto">✓</span>':''}</button>`).join('');
  document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{state.answers[q.id]=Number(b.dataset.option);renderQ();renderPalette()});
  $('answer-feedback').classList.add('hidden');
  if(check){const f=$('answer-feedback');f.className='feedback '+(check.isCorrect?'ok':'no');f.textContent=check.isCorrect?'✓ Correct answer / सही उत्तर':`✕ Incorrect. Correct answer: Option ${check.correctOption} / सही उत्तर: विकल्प ${check.correctOption}`;}
  $('mark-btn').textContent=state.marked[q.id]?'★ Remove Review Mark':'☆ Mark for Review';
  $('prev-q').disabled=state.current===0;
  $('next-q').textContent=state.current===state.ids.length-1?'Finish / Review':'Next Question →';
  $('btn-check').disabled=!!check || !chosen;
 }
 function renderPalette(){
  const answered=state.ids.filter(id=>!!state.answers[id]).length;
  const marked=state.ids.filter(id=>!!state.marked[id]).length;
  $('palette-answered').textContent=answered;$('palette-remaining').textContent=state.ids.length-answered;$('palette-marked').textContent=marked;
  $('palette-grid').innerHTML=state.ids.map((id,i)=>`<button title="Question ${i+1}" class="${state.answers[id]?'done':'empty'} ${state.marked[id]?'marked':''} ${i===state.current?'current':''}" data-qnav="${i}" aria-label="Go to question ${i+1}">${i+1}</button>`).join('');
  document.querySelectorAll('[data-qnav]').forEach(b=>b.onclick=()=>{state.current=Number(b.dataset.qnav);renderQ();renderPalette();window.scrollTo({top:50,behavior:'smooth'})});
 }
 $('mark-btn').onclick=()=>{const id=currentQ().id;state.marked[id]=!state.marked[id];renderQ();renderPalette()};
 $('clear-answer').onclick=()=>{const id=currentQ().id;if(state.checked[id])return notify('Practice feedback already revealed');delete state.answers[id];renderQ();renderPalette()};
 $('prev-q').onclick=()=>{state.current=Math.max(0,state.current-1);renderQ();renderPalette()};
 $('next-q').onclick=()=>{if(state.current>=state.ids.length-1){document.getElementById('palette-grid').scrollIntoView({behavior:'smooth',block:'center'});notify('Review questions, then select Submit Test.');return}state.current++;renderQ();renderPalette();window.scrollTo({top:58,behavior:'smooth'})};
 $('btn-check').onclick=async()=>{const q=currentQ();const choice=state.answers[q.id];if(!choice)return notify('Select an answer first','error');if(state.checked[q.id])return;
  setPending(true);try{state.checked[q.id]=await remote('asteEvaluateAnswer',{id:q.id,choice});renderQ()}catch(e){notify(e.message,'error')}finally{setPending(false)}};
 $('submit-test').onclick=()=>{$('confirm-detail').textContent=`${state.ids.filter(id=>state.answers[id]).length} answered · ${state.ids.filter(id=>!state.answers[id]).length} unanswered`; $('confirm-dialog').classList.remove('hidden')};
 $('confirm-cancel').onclick=()=>$('confirm-dialog').classList.add('hidden');
 $('confirm-submit').onclick=()=>submit(false);
 async function submit(auto){
  if(state.pending)return;
  $('confirm-dialog').classList.add('hidden');setPending(true);notify('Submitting and calculating your result…');
  try{
   const result=await remote('asteSubmitAttempt',{questions:state.ids,answers:state.answers,paper:state.paper,mode:state.mode,startedAt:state.startAt});
   state.submitted=result;clearInterval(state.timer);state.reviewFilter='all';show('result');renderResults();
  }catch(e){notify('Submission unsuccessful: '+(e.message||'Please retry'),'error');if(auto)notify('Timer finished. Retry submission.','error')}
  finally{setPending(false)}
 }
 function renderResults(){let r=state.submitted;if(!r)return;
  $('result-paper').textContent=paperName(state.paper)+' · '+(state.mode==='test'?'Test Mode':'Practice Mode');
  $('score-value').textContent=`${r.marks} / ${r.maxMarks}`;
  $('r-correct').textContent=r.correct;$('r-wrong').textContent=r.wrong;$('r-skipped').textContent=r.skipped;$('r-accuracy').textContent=(r.correct+r.wrong?Math.round(100*r.correct/(r.correct+r.wrong)):0)+'%';
  const pts=r.total||1;$('analysis-chart').innerHTML=`<i class="cor" style="width:${r.correct/pts*100}%"></i><i class="wrg" style="width:${r.wrong/pts*100}%"></i><i class="skip" style="width:${r.skipped/pts*100}%"></i>`;
  const groups=['A','B'].map(p=>{let qq=r.questions.filter(o=>findQ(o.id)?.paper===p);return {p,qq,correct:qq.filter(x=>x.status==='correct').length,wrong:qq.filter(x=>x.status==='wrong').length}}).filter(g=>g.qq.length);
  $('paper-breakdown').innerHTML=`<tr><th>Paper</th><th>Q</th><th>Right</th><th>Wrong</th></tr>`+groups.map(g=>`<tr><td>Paper ${g.p}</td><td>${g.qq.length}</td><td>${g.correct}</td><td>${g.wrong}</td></tr>`).join('');
  renderReviewList();
 }
 function renderReviewList(){let qs=state.submitted.questions.filter(q=>state.reviewFilter==='all'||q.status===state.reviewFilter);
  $('review-list').innerHTML=qs.length?qs.map(o=>{let q=findQ(o.id);return `<button class="review-item" data-review="${q.id}"><span><strong>${paperName(q.paper)} · Q${String(q.number).padStart(2,'0')}</strong><small>Selected: ${o.chosen??'—'} · Correct: ${o.correctOption} · PDF page ${q.sourcePage}</small></span><span class="result-status status-${o.status}">${o.status.toUpperCase()}</span></button>`}).join(''):'<p class="small-muted">No questions under this filter.</p>';
  document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>showReview(b.dataset.review));
  document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===state.reviewFilter));
 }
 function showReview(id){state.reviewId=id;const o=state.submitted.questions.find(x=>x.id===id),q=findQ(id);if(!q)return;
  $('review-question-title').textContent=`${paperName(q.paper)} · Q${q.number} · Source PDF page ${q.sourcePage}`;
  $('review-image').innerHTML=visual(q,state.language);
  $('review-selection').textContent=`Your answer: ${o.chosen??'Not attempted'} · Correct answer: Option ${o.correctOption}`;
  $('review-details').classList.remove('hidden');$('review-details').scrollIntoView({behavior:'smooth',block:'start'});
 }
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.reviewFilter=b.dataset.filter;renderReviewList()});
 $('back-home').onclick=()=>{clearInterval(state.timer);show('home')};
 $('result-home').onclick=()=>show('home');
 $('result-retry').onclick=()=>{show('home');start()};
 $('close-zoom').onclick=()=>$('zoom-dialog').classList.add('hidden');
 $('zoom-dialog').onclick=e=>{if(e.target===$('zoom-dialog'))$('zoom-dialog').classList.add('hidden')};
 $('exit-test').onclick=()=>{if(confirm('Exit this attempt without saving your answers?')){clearInterval(state.timer);show('home')}};
 document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>{state.language=b.dataset.lang;applyLanguage();if(!$('screen-result').classList.contains('hidden')&&!$('review-details').classList.contains('hidden'))showReview(state.reviewId||state.submitted.questions[0].id)});
 $('sign-in').onsubmit=e=>{e.preventDefault();window.location.assign(PORTAL_URL)};
 // Signing out is always managed by the main portal, not this practice page.
 $('sign-out').onclick=()=>window.location.assign(PORTAL_URL);
 let authorizedLoad=null, authRevision=0;
 async function prepareAuthorizedQuestions(){
  if(authorizedLoad)return authorizedLoad;
  authorizedLoad=(async()=>{
   // In the login-protected version, only load the answer script after
   // the Firebase session check. Static GitHub files are still public.
   if(REQUIRE_PORTAL_LOGIN && DEMO && !window.ASTE_DEMO_ANSWERS){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');script.src='aste/answers.js';
     script.onload=resolve;script.onerror=()=>reject(Error('Could not load the practice answer file'));
     document.body.appendChild(script);
    });
   }
   const response=await fetch(BASE+'aste/questions.json',{cache:'no-cache'});
   if(!response.ok)throw Error('Question assets are unavailable');
   state.bank=await response.json();
   if(state.bank.length!==110)throw Error('Expected 110 questions; verify the full asset upload');
   const query=new URLSearchParams(window.location.search);
   if(['A','B','ALL'].includes((query.get('paper')||'').toUpperCase()))state.paper=query.get('paper').toUpperCase();
   if(['test','practice'].includes(query.get('mode')))state.mode=query.get('mode');
   initHome();applyLanguage();
  })();
  try {await authorizedLoad} catch(e){authorizedLoad=null;throw e;}
 }
 function lockPaper(){
  state.user=null;state.submitted=null;state.ids=[];state.answers={};state.checked={};
  clearInterval(state.timer);
  $('signed-user').textContent='Portal login required';
  $('confirm-dialog').classList.add('hidden');
  $('zoom-dialog').classList.add('hidden');
  show('auth');
 }
 async function boot(){
  try{
   if(REQUIRE_PORTAL_LOGIN){
    if(!window.firebase?.auth)throw Error('Firebase Authentication could not load. Please check your internet connection.');
    if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);
    // Same Firebase project and SESSION persistence as RailSNTGyan Portal.
    // A new-tab link may not share sessionStorage; use same-tab navigation.
    firebase.auth().onAuthStateChanged(async user=>{
     const revision=++authRevision;
     if(!user){lockPaper();return;}
     $('load-text').textContent='Preparing your ASTE practice paper…';
     show('loading');
     try{
      await prepareAuthorizedQuestions();
      if(revision!==authRevision || !firebase.auth().currentUser)return;
      state.user=user;
      $('signed-user').textContent=user.email||'Portal user';
      show('home');
     }catch(error){
      $('load-text').textContent='Unable to start: '+(error.message||'Please refresh');
      show('loading');console.error(error);
     }
    },error=>{
     lockPaper();$('auth-error').textContent='Unable to check portal login: '+(error.message||'Please reload');
    });
    return;
   }
   await prepareAuthorizedQuestions();
   if(DEMO){state.user={uid:'demo-local',email:'public@local.example'};$('signed-user').textContent='Open Access';show('home');return;}
   if(!window.firebase)throw Error('Firebase libraries did not load.');
   if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);
   firebase.auth().onAuthStateChanged(user=>{
    state.user=user;clearInterval(state.timer);
    if(!user){$('signed-user').textContent='Guest';show('auth')}
    else{$('signed-user').textContent=user.email||'Signed in';show('home')}
   });
  }catch(e){$('load-text').textContent='Unable to start: '+e.message;console.error(e)}
 }

 boot();
})();
