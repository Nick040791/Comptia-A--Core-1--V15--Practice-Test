// JavaScript logic for the CompTIA A+ (V15) practice test application

const questionContainer = document.getElementById('question-container');
const answerButtons = document.getElementById('answer-buttons');
const submitButton = document.getElementById('submit-button');
const resultContainer = document.getElementById('result-container');
const restartButton = document.getElementById('restart-button');

(async () => {

  // helper: fetch external questions.json if present
  async function loadExternalQuestions() {
    try {
      const res = await fetch('data/questions.json', {cache:'no-store'});
      if (!res.ok) throw new Error('no external file');
      const data = await res.json();
      if (Array.isArray(data) && data.length) return data;
    } catch (e) {
      // ignore, fallback to built-in set below
    }
    return null;
  }

  // built-in fallback question pool (small representative set; external JSON recommended)
  const builtinQs = [
    // Mobile devices (13%)
    { id:'m1', domain:'Mobile devices', multi:false, question:'Which component in a smartphone is most likely to cause the device to not power on if it is faulty?', options:['Rear camera module','Battery','Wi‑Fi antenna','Proximity sensor'], answers:[1], explanation:'Battery failures commonly prevent power-on. Cameras and antennas don\'t supply power.' },
    { id:'m2', domain:'Mobile devices', multi:true, question:'Which of the following are common methods to transfer files between a phone and PC? (Select all that apply.)', options:['Bluetooth','SATA cable','USB (MTP)','iCloud / cloud sync'], answers:[0,2,3], explanation:'Bluetooth, USB MTP and cloud sync are typical methods; SATA is internal PC storage interface.' },

    // Networking (23%)
    { id:'n1', domain:'Networking', multi:false, question:'Which port number is used by HTTPS by default?', options:['21','80','443','25'], answers:[2], explanation:'HTTPS uses TCP 443 by default. Port 80 is HTTP, 21 FTP, 25 SMTP.' },
    { id:'n2', domain:'Networking', multi:true, question:'Which tools are appropriate for testing an Ethernet cable and its wiring? (Select all that apply.)', options:['Cable tester','Crimper','Loopback plug','Multimeter'], answers:[0,1], explanation:'Cable testers and crimpers are used for cable verification and termination; multimeters can check continuity but are less convenient for wiring patterns.' },

    // Hardware (25%)
    { id:'h1', domain:'Hardware', multi:false, question:'When installing RAM into a modern desktop motherboard, which action is critical?', options:['Aligning the notch and applying even pressure until the module clicks','Using thermal paste between module and slot','Inserting RAM with power on','Bending one pin to match the slot'], answers:[0], explanation:'RAM must align with the notch and be seated until the latches click. Thermal paste is for CPUs only; never install with power on.' },
    { id:'h2', domain:'Hardware', multi:true, question:'Which connectors might you use to connect a monitor to a modern GPU? (Select all that apply.)', options:['HDMI','PCIe','DisplayPort','VGA'], answers:[0,2], explanation:'HDMI and DisplayPort are common video outputs; PCIe is an internal bus and VGA is legacy analog.' },

    // Virtualization and cloud computing (11%)
    { id:'v1', domain:'Virtualization & Cloud', multi:false, question:'Which of these is an example of Infrastructure as a Service (IaaS)?', options:['Virtual machines provided by a cloud provider','A consumer webmail service','A hosted office productivity app','A packaged desktop application'], answers:[0], explanation:'IaaS provides virtualized compute resources (VMs). Webmail is SaaS.' },
    { id:'v2', domain:'Virtualization & Cloud', multi:true, question:'Select concepts that are directly related to virtualization. (Select all that apply.)', options:['Hypervisor','Virtual machine','DHCP lease','Host OS vs guest OS'], answers:[0,1,3], explanation:'Hypervisors, VMs, and host/guest distinctions are virtualization concepts; DHCP is networking.' },

    // Troubleshooting (28%)
    { id:'t1', domain:'Hardware & Network Troubleshooting', multi:false, question:'A user reports intermittent Wi‑Fi connectivity. Which troubleshooting step is best to gather more information first?', options:['Reinstall the OS','Check signal strength and wireless channel congestion','Replace the wireless card immediately','Disable the firewall'], answers:[1], explanation:'First gather data: check signal and interference before replacing hardware or reinstalling OS.' },
    { id:'t2', domain:'Hardware & Network Troubleshooting', multi:true, question:'Which tools help diagnose cable continuity and wiring faults? (Select all that apply.)', options:['Cable tester','Crimper','Loopback plug','Network analyzer (packet capture)'], answers:[0,2], explanation:'Cable testers and loopback plugs help test wiring and continuity; crimpers terminate cables.' },

    // mixed
    { id:'mix1', domain:'Hardware', multi:false, question:'Which connector type commonly carries both video and audio from a PC to a monitor/TV?', options:['DVI','VGA','HDMI','SATA'], answers:[2], explanation:'HDMI carries both video and audio. DVI/VGA are video only; SATA is storage.' },
    { id:'mix2', domain:'Networking', multi:true, question:'Which of the following are private IPv4 address ranges? (Select all that apply.)', options:['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16','169.254.0.0/16'], answers:[0,1,2], explanation:'10/8, 172.16/12, and 192.168/16 are private. 169.254/16 is APIPA (link-local).' }
  ];

  // shuffle helper
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // sample n from pool; if pool < n, fill remaining by sampling with replacement
  function sampleQuestions(pool, n) {
    if (n === 'all') return shuffle(pool.slice());
    // if requested is less than or equal to pool size -> sample without replacement
    if (n <= pool.length) {
      return shuffle(pool.slice()).slice(0, n);
    }
    // requested > pool length -> include full shuffled pool then add random picks (with replacement)
    const result = shuffle(pool.slice());
    while (result.length < n) {
      // pick a random item from pool (clone to avoid mutation if needed)
      const pick = JSON.parse(JSON.stringify(pool[Math.floor(Math.random() * pool.length)]));
      result.push(pick);
    }
    return shuffle(result);
  }

  // state
  let questions = [];
  let current = 0;
  let userAnswers = []; // array of arrays of selected option indexes

  const qNumberEl = document.getElementById('q-number');
  const qDomainEl = document.getElementById('q-domain');
  const questionEl = document.getElementById('question');
  const optionsForm = document.getElementById('options');
  const progressEl = document.getElementById('progress');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const saveBtn = document.getElementById('save-btn');
  const finishBtn = document.getElementById('finish-btn');
  const restartBtn = document.getElementById('restart-btn');
  const reviewPanel = document.getElementById('review-panel');
  const scoreEl = document.getElementById('score');
  const detailsEl = document.getElementById('details');
  const quizSizeSelect = document.getElementById('quiz-size');

  // initialize questions: load external if possible
  const external = await loadExternalQuestions();
  const pool = external && external.length ? external : builtinQs;

  function prepareQuestionMapping(q) {
    // create shuffled option order and map answers accordingly
    const order = shuffle(q.options.map((o,i)=>i));
    q._options = order.map(i => q.options[i]);
    q._answers = q.answers.map(ai => order.indexOf(ai)).sort((a,b)=>a-b);
    // preserve explanation if present, else leave undefined
    q._explanation = q.explanation || null;
  }

  function startQuiz() {
    const sizeVal = quizSizeSelect.value;
    const requested = (sizeVal === 'all') ? 'all' : parseInt(sizeVal,10);
    const sampled = sampleQuestions(pool, requested);
    questions = sampled.map(q => {
      // clone to avoid mutating original pool
      const clone = JSON.parse(JSON.stringify(q));
      if (!Array.isArray(clone.answers)) clone.answers = Array.isArray(clone.answer) ? clone.answer : [];
      prepareQuestionMapping(clone);
      return clone;
    });

    current = 0;
    userAnswers = Array(questions.length).fill(null).map(()=>[]);
    reviewPanel.classList.add('hidden');
    updateProgress();
    renderQuestion();
  }

  function updateProgress(){
    progressEl.textContent = `Question ${current+1} / ${questions.length}`;
  }

  function renderQuestion(){
    const q = questions[current];
    qNumberEl.textContent = `Q${current+1}`;
    qDomainEl.textContent = q.domain || '';
    questionEl.textContent = q.question || '';

    optionsForm.innerHTML = '';
    const multi = !!q.multi;
    q._options.forEach((opt, idx) => {
      const id = `opt-${idx}`;
      const wrapper = document.createElement('div');
      wrapper.className = 'option';
      const input = document.createElement('input');
      input.type = multi ? 'checkbox' : 'radio';
      input.name = 'option';
      input.id = id;
      input.value = idx;
      const label = document.createElement('label');
      label.htmlFor = id;
      label.innerHTML = escapeHtml(opt);
      wrapper.appendChild(input);
      wrapper.appendChild(label);
      optionsForm.appendChild(wrapper);
    });

    // restore previously saved selection if exists
    const saved = userAnswers[current] || [];
    saved.forEach(i => {
      const el = optionsForm.querySelector(`[value="${i}"]`);
      if (el) el.checked = true;
    });

    prevBtn.disabled = (current === 0);
    nextBtn.disabled = (current === questions.length - 1);
  }

  function saveCurrentAnswer(){
    const q = questions[current];
    const inputs = Array.from(optionsForm.querySelectorAll('input'));
    const selected = inputs.filter(i=>i.checked).map(i=>parseInt(i.value,10));
    userAnswers[current] = selected.sort((a,b)=>a-b);
    showToast(`Saved answer for Q${current+1}`);
  }

  function showToast(msg){
    scoreEl.textContent = msg;
    setTimeout(()=> {
      if (reviewPanel.classList.contains('hidden')) scoreEl.textContent = '';
    }, 1000);
  }

  function gradeAll(){
    // ensure current answer saved
    saveCurrentAnswer();

    // only include questions the user actually answered (non-empty selection)
    const answeredResults = questions
      .map((q, idx) => {
        const user = userAnswers[idx] || [];
        return { idx, q, user };
      })
      .filter(r => Array.isArray(r.user) && r.user.length > 0)
      .map(r => {
        const correct = arraysEqual(r.user, questions[r.idx]._answers);
        return {
          idx: r.idx,
          correct,
          user: r.user,
          correctSet: questions[r.idx]._answers,
          explanation: questions[r.idx]._explanation
        };
      });

    if (answeredResults.length === 0) {
      reviewPanel.classList.remove('hidden');
      scoreEl.innerHTML = `<strong>No answers saved.</strong> Answer some questions before grading.`;
      detailsEl.innerHTML = `<div class="small">No answered questions to review.</div>`;
      reviewPanel.scrollIntoView({behavior:'smooth'});
      return;
    }

    const correctCount = answeredResults.filter(r=>r.correct).length;
    const pct = Math.round((correctCount / answeredResults.length) * 100);

    reviewPanel.classList.remove('hidden');
    scoreEl.innerHTML = `<strong>Answered:</strong> ${answeredResults.length} / ${questions.length} • <strong>Score:</strong> ${correctCount} / ${answeredResults.length} (${pct}%)`;
    renderDetails(answeredResults);
    reviewPanel.scrollIntoView({behavior:'smooth'});
  }

  function renderDetails(results){
    detailsEl.innerHTML = '';
    results.forEach(r => {
      const q = questions[r.idx];
      const row = document.createElement('div');
      row.className = 'result-row ' + (r.correct ? 'correct' : 'incorrect');

      const qh = document.createElement('div');
      qh.innerHTML = `<div class="small">${escapeHtml(q.domain || '')} • Q${r.idx+1}</div><div class="question-text">${escapeHtml(q.question)}</div>`;
      row.appendChild(qh);

      const userText = r.user.length ? r.user.map(i=>escapeHtml(q._options[i])).join(', ') : '<em class="user-answer">No answer</em>';
      const correctText = r.correctSet.map(i=>escapeHtml(q._options[i])).join(', ');
      const ans = document.createElement('div');
      ans.className = 'small';
      ans.innerHTML = `<div><strong>Your answer:</strong> <span class="user-answer">${userText}</span></div>
                       <div><strong>Correct:</strong> <span class="correct-answer">${correctText}</span></div>`;
      row.appendChild(ans);

      const expl = document.createElement('div');
      expl.className = 'small';
      const explanationText = r.explanation || q.explanation || generateFallbackExplanation(q, r);
      expl.innerHTML = `<div style="margin-top:8px"><strong>Explanation:</strong> ${escapeHtml(explanationText)}</div>`;
      row.appendChild(expl);

      detailsEl.appendChild(row);
    });
  }

  function generateFallbackExplanation(q, r) {
    // concise rationale when no explanation provided
    const correctOpts = (q._answers || []).map(i=>q._options[i]).join(', ');
    if (r.correct) return `Your selection matches the expected answer(s): ${correctOpts}.`;
    return `The expected answer(s): ${correctOpts}. Review the domain (${q.domain || 'topic'}) for details.`;
  }

  function arraysEqual(a,b){
    if (a.length !== b.length) return false;
    for (let i=0;i<a.length;i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function escapeHtml(s){
    return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  // handlers
  prevBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    saveCurrentAnswer();
    if (current>0) current--;
    updateProgress();
    renderQuestion();
  });

  nextBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    saveCurrentAnswer();
    if (current < questions.length - 1) current++;
    updateProgress();
    renderQuestion();
  });

  saveBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    saveCurrentAnswer();
  });

  finishBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    gradeAll();
  });

  restartBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    if (!confirm('Restart the quiz? Your current progress will be lost.')) return;
    startQuiz();
  });

  // change quiz length and restart
  quizSizeSelect.addEventListener('change', (e) => {
    // auto-restart with new length
    if (confirm('Change quiz length and restart?')) startQuiz();
    else {
      // revert to previous value (do nothing)
    }
  });

  document.addEventListener('keydown', (ev)=>{
    if ((ev.key === 'N' || ev.key === 'n') && !ev.metaKey) { nextBtn.click(); ev.preventDefault(); }
    if ((ev.key === 'P' || ev.key === 'p') && !ev.metaKey) { prevBtn.click(); ev.preventDefault(); }
    if (ev.key === 'Enter' && document.activeElement.tagName !== 'TEXTAREA') { saveBtn.click(); ev.preventDefault(); }
    if ((ev.key === 'F' || ev.key === 'f') && !ev.metaKey) { finishBtn.click(); ev.preventDefault(); }
  });

  // start
  startQuiz();

})();