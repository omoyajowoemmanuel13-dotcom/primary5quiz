// script.js
(() => {
  const QUESTIONS_PER_TOPIC = 60;
  const TIMER_SECONDS = 20 * 60;

  const TOPICS = {
    'fractions': { id: 'fractions', name: 'Fractions', generator: genFractions },
    'decimals': { id: 'decimals', name: 'Decimals', generator: genDecimals },
    'geometry': { id: 'geometry', name: 'Geometry', generator: genGeometry },
    'measurement': { id: 'measurement', name: 'Measurement', generator: genMeasurement },
    'wordproblems': { id: 'wordproblems', name: 'Word Problems', generator: genWordProblems }
  };

  const params = new URLSearchParams(window.location.search);
  const topicId = params.get('topic');
  const topicDef = TOPICS[topicId];

  const topicTitle = document.getElementById('topicTitle');
  const topicSubtitle = document.getElementById('topicSubtitle');
  const timerDisplay = document.getElementById('timerDisplay');
  const quizCard = document.getElementById('quizCard');
  const startCard = document.getElementById('startCard');
  const startTopicBtn = document.getElementById('startTopicBtn');
  const backHomeBtn = document.getElementById('backHomeBtn');
  const progressEl = document.getElementById('progress');
  const questionText = document.getElementById('questionText');
  const optionsList = document.getElementById('optionsList');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');

  let questions = [];
  let currentIndex = 0;
  let answers = {};
  let remainingSeconds = TIMER_SECONDS;
  let timerInterval = null;
  let startedAt = null;

  if (!topicDef) {
    topicTitle.textContent = 'Topic not selected';
    topicSubtitle.textContent = 'Go back and select a topic';
    startTopicBtn.disabled = true;
  } else {
    topicTitle.textContent = topicDef.name;
    topicSubtitle.textContent = `${QUESTIONS_PER_TOPIC} questions — 20:00`;
  }

  startTopicBtn.addEventListener('click', startQuiz);
  backHomeBtn.addEventListener('click', ()=> window.location.href='index.html');
  prevBtn.addEventListener('click', prevQuestion);
  nextBtn.addEventListener('click', nextQuestion);
  submitBtn.addEventListener('click', submitQuiz);

  window.addEventListener('keydown', e => {
    if(e.key==='n'||e.key==='N') { nextQuestion(); e.preventDefault(); }
    if(e.key==='p'||e.key==='P') { prevQuestion(); e.preventDefault(); }
    if(e.key==='s'||e.key==='S') { submitQuiz(); e.preventDefault(); }
  });

  function startQuiz() {
    questions = topicDef.generator(QUESTIONS_PER_TOPIC);
    questions.forEach((q,i)=> { q._index=i; q._id=uniqueId(); });
    shuffleArray(questions);
    questions.forEach(q => shuffleArray(q.options));
    currentIndex=0;
    answers={};
    remainingSeconds=TIMER_SECONDS;
    startedAt=Date.now();
    saveProgress();
    startCard.style.display='none';
    quizCard.style.display='';
    renderQuestion();
    updateTimerDisplay();
    if(timerInterval) clearInterval(timerInterval);
    timerInterval=setInterval(tickTimer,1000);
  }

  function renderQuestion() {
    const q = questions[currentIndex];
    progressEl.textContent=`Question ${currentIndex+1} / ${questions.length}`;
    questionText.textContent=q.text;
    optionsList.innerHTML='';
    q.options.forEach((opt,i)=>{
      const li=document.createElement('li');
      li.innerHTML=`<label><input type="radio" name="opt-${q._id}" value="${i}" ${answers[q._id]===i?'checked':''}> ${opt.text}</label>`;
      optionsList.appendChild(li);
      li.querySelector('input').addEventListener('change', ()=>{ answers[q._id]=i; saveProgress(); });
    });
    prevBtn.disabled = currentIndex===0;
    nextBtn.disabled = currentIndex===questions.length-1;
  }

  function nextQuestion() { if(currentIndex<questions.length-1){ currentIndex++; renderQuestion(); } }
  function prevQuestion() { if(currentIndex>0){ currentIndex--; renderQuestion(); } }

  function submitQuiz() {
    if(!confirm('Submit now? You will be taken to the score page.')) return;
    finalizeAndGoToResults();
  }

  function finalizeAndGoToResults() {
    let correct=0;
    for(const q of questions){
      const sel=answers[q._id];
      if(typeof sel==='number' && q.options[sel] && q.options[sel].isCorrect) correct++;
    }
    const result = {
      topicId: topicDef.id,
      topicName: topicDef.name,
      total: questions.length,
      correct,
      startedAt,
      finishedAt: Date.now()
    };
    sessionStorage.setItem('p5quiz_result', JSON.stringify(result));
    if(timerInterval) clearInterval(timerInterval);
    window.location.href='results.html';
  }

  function tickTimer() {
    remainingSeconds--;
    updateTimerDisplay();
    if(remainingSeconds<=0){
      clearInterval(timerInterval);
      alert("Time's up — quiz will be submitted automatically.");
      finalizeAndGoToResults();
    }
  }

  function updateTimerDisplay() {
    const mm=Math.floor(Math.max(0,remainingSeconds)/60).toString().padStart(2,'0');
    const ss=(Math.max(0,remainingSeconds)%60).toString().padStart(2,'0');
    timerDisplay.textContent=`${mm}:${ss}`;
  }

  function saveProgress() {
    const save={
      topicId:topicDef?.id||null,
      topicName:topicDef?.name||null,
      answers,
      startedAt,
      remainingSeconds
    };
    sessionStorage.setItem('p5quiz_progress',JSON.stringify(save));
  }

  function uniqueId(){ return 'q_'+Math.random().toString(36).slice(2,9); }
  function shuffleArray(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function rnd(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function isNumeric(s){ return /^-?\d+(\.\d+)?( ?[a-zA-Z%°₦cmkmkgms]*)?$/.test(String(s).trim()); }

  function makeQ(text, correctValue){
    const opts=[];
    const correct=String(correctValue);
    opts.push({text:correct,isCorrect:true});
    const numeric=isNumeric(correct);
    if(numeric){
      const base=parseFloat(correct.replace(/[^\d\.\-]/g,''));
      const d1=(Math.round((base+rnd(1,Math.max(1,Math.abs(base)*0.1))) * 100)/100);
      const d2=(Math.round((Math.max(0,base-rnd(1,Math.max(1,Math.abs(base)*0.1)))) * 100)/100);
      const d3=(Math.round((base+rnd(2,Math.max(2,Math.abs(base)*0.2))) * 100)/100);
      [d1,d2,d3].forEach(d=>{ const s=Number.isFinite(d)?String(d):String(d); if(!opts.some(o=>o.text===s)) opts.push({text:s,isCorrect:false}); });
    } else {
      const s1=correct+' ';
      const s2=correct.split(' ').reverse().join(' ');
      const s3='None of these';
      [s1,s2,s3].forEach(s=>{ if(!opts.some(o=>o.text===s)) opts.push({text:s,isCorrect:false}); });
    }
    while(opts.length<4) opts.push({text:'0',isCorrect:false});
    shuffleArray(opts);
    return {text, options:opts};
  }

  // GENERATORS
  function genFractions(n){ return generateUniqueQuestions(n, () => generateFractionQuestion()); }
  function genDecimals(n){ return generateUniqueQuestions(n, () => generateDecimalQuestion()); }
  function genGeometry(n){ return generateUniqueQuestions(n, () => generateGeometryQuestion()); }
  function genMeasurement(n){ return generateUniqueQuestions(n, () => generateMeasurementQuestion()); }

  function genWordProblems(n){
    const out=[]; const used=new Set();
    const generators=[genFractions, genDecimals, genGeometry, genMeasurement];
    while(out.length<n){
      const gen=generators[rnd(0,3)];
      const qs=gen(1);
      if(qs.length && !used.has(qs[0].text)){ out.push(qs[0]); used.add(qs[0].text); }
    }
    return out;
  }

  function generateUniqueQuestions(n, generatorFn){
    const out=[]; const used=new Set();
    while(out.length<n){
      const q=generatorFn();
      if(!used.has(q.text)){ out.push(q); used.add(q.text); }
    }
    return out;
  }

  // Example of fraction question generator
  function generateFractionQuestion(){
    const type=rnd(1,5);
    if(type===1){
      const b=rnd(2,12), m=rnd(2,6); const a=b*m;
      return makeQ(`Simplify ${a}/${b}`, `${a/m}/${b/m}`);
    } else if(type===2){
      const d=rnd(2,12), a=rnd(1,d-1), b=rnd(1,d-1);
      const sum=a+b, whole=Math.floor(sum/d), rem=sum%d;
      const correct = rem===0 ? `${whole}` : (whole>0 ? `${whole} ${rem}/${d}` : `${rem}/${d}`);
      return makeQ(`${a}/${d} + ${b}/${d} = ?`, correct);
    } else if(type===3){
      const d=rnd(2,12), a=rnd(1,d-1), b=rnd(1,d-1);
      const diff=a-b; const correct=diff>=0?`${diff}/${d}`:`${Math.abs(diff)}/${d} (negative)`;
      return makeQ(`${a}/${d} - ${b}/${d} = ?`, correct);
    } else if(type===4){
      const d=rnd(2,10), n=rnd(1,d-1); const correct=(n/d).toFixed(2);
      return makeQ(`${n}/${d} as decimal (2 d.p.) = ?`, correct);
    } else {
      const a=rnd(1,9), b=rnd(2,12), c=rnd(1,9), d=rnd(2,12); 
      const left=a/b, right=c/d;
      const correct=left>right?`${a}/${b}`:left<right?`${c}/${d}`:'=';
      return makeQ(`Which is greater: ${a}/${b} or ${c}/${d}?`, correct);
    }
  }

  function generateDecimalQuestion(){
    const type=rnd(1,4);
    if(type===1){
      const a=(rnd(10,999)/100).toFixed(2); return makeQ(`Round ${a} to 1 decimal place = ?`, parseFloat(a).toFixed(1));
    } else if(type===2){
      const a=(rnd(10,499)/100).toFixed(2), b=(rnd(10,499)/100).toFixed(2); return makeQ(`${a} + ${b} = ? (2 d.p.)`, (parseFloat(a)+parseFloat(b)).toFixed(2));
    } else if(type===3){
      const a=(rnd(10,99)/10).toFixed(1), b=rnd(2,20).toString(); return makeQ(`${a} × ${b} = ? (2 d.p.)`, (parseFloat(a)*parseFloat(b)).toFixed(2));
    } else {
      const d=rnd(2,10), n=rnd(1,d-1); const dec=(n/d).toFixed(2); return makeQ(`${dec} as a fraction (approx) = ?`, `${n}/${d}`);
    }
  }

  function generateGeometryQuestion(){
    const type=rnd(1,4);
    if(type===1){ const s=rnd(1,30); return makeQ(`Perimeter of square side ${s} cm = ?`, `${4*s} cm`); }
    else if(type===2){ const b=rnd(2,30), h=rnd(2,20); return makeQ(`Area of triangle base ${b} cm height ${h} cm = ?`, `${(b*h/2).toFixed(1)} cm²`); }
    else if(type===3){ const r=rnd(1,12); return makeQ(`Area of circle radius ${r} cm = ? (2 d.p.)`, (Math.PI*r*r).toFixed(2)+' cm²'); }
    else { const a=rnd(3,20), b=rnd(3,20); return makeQ(`Right triangle legs ${a} cm and ${b} cm. Hypotenuse ≈ ? (1 d.p.)`, `${Math.sqrt(a*a+b*b).toFixed(1)} cm`); }
  }

  function generateMeasurementQuestion(){
    const type=rnd(1,4);
    if(type===1){ const cm=rnd(10,1000); return makeQ(`${cm} cm = ?`, `${(cm/100).toFixed(2)} m`); }
    else if(type===2){ const g=rnd(100,5000); return makeQ(`${g} g = ?`, `${(g/1000).toFixed(2)} kg`); }
    else if(type===3){ const mins=rnd(60,300); const h=Math.floor(mins/60), rem=mins%60; return makeQ(`${mins} minutes = ?`, `${h} h ${rem} m`); }
    else { const price=rnd(10,500), qty=rnd(1,12); return makeQ(`If 1 item costs ₦${price}, cost of ${qty} items = ?`, `₦${price*qty}`); }
  }

})();
