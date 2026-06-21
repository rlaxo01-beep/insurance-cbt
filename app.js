const VERSION = "6.0";
const $ = (id) => document.getElementById(id);

const LS = {
  wrong: "insurance_cbt_v6_wrong",
  star: "insurance_cbt_v6_star",
  theme: "insurance_cbt_v6_theme",
  session: "insurance_cbt_v6_session",
  stats: "insurance_cbt_v6_stats"
};

let wrongStore = readLS(LS.wrong, {});
let starStore = readLS(LS.star, {});
let stats = readLS(LS.stats, { solved: 0, correct: 0 });

let selectedSets = new Set();
let setBtns = new Map();
let session = [];
let idx = 0;
let selected = {};
let checked = {};
let mode = "instant";
let startedAt = 0;
let timerId = null;
let lastWrongIds = [];

function readLS(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function writeLS(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function shuffle(arr){
  const a = [...arr];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fmt(sec){
  return String(Math.floor(sec/60)).padStart(2,"0") + ":" + String(sec%60).padStart(2,"0");
}
function show(id){
  ["home","quiz","result"].forEach(x => $(x).classList.add("hidden"));
  $(id).classList.remove("hidden");
}
function updateCounts(){
  $("totalCount").textContent = QUESTIONS.length;
  $("wrongCount").textContent = Object.keys(wrongStore).length;
  $("starCount").textContent = Object.keys(starStore).length;
}
function applyTheme(){
  const t = localStorage.getItem(LS.theme) || "light";
  document.documentElement.dataset.theme = t;
  $("themeBtn").textContent = t === "dark" ? "☀️" : "🌙";
}
function toggleTheme(){
  const now = localStorage.getItem(LS.theme) || "light";
  localStorage.setItem(LS.theme, now === "dark" ? "light" : "dark");
  applyTheme();
}

const allSets = [...new Set(QUESTIONS.map(q => q.set))];
const sets25 = allSets.filter(s => s.startsWith("25"));
const sets26Mock = allSets.filter(s => s.startsWith("26 쪽집게"));
const setsExpected = allSets.filter(s => s.startsWith("26 예상문제"));

function initFilters(){
  const box = $("setFilters");
  box.innerHTML = "";
  allSets.forEach(set => {
    selectedSets.add(set);
    const b = document.createElement("button");
    b.className = "chip active";
    b.textContent = set;
    b.onclick = () => {
      selectedSets.has(set) ? selectedSets.delete(set) : selectedSets.add(set);
      syncFilterButtons();
    };
    box.appendChild(b);
    setBtns.set(set, b);
  });
}
function setFilters(list){
  selectedSets = new Set(list);
  syncFilterButtons();
}
function syncFilterButtons(){
  setBtns.forEach((btn,set) => btn.classList.toggle("active", selectedSets.has(set)));
}
function filteredQuestions(){
  return QUESTIONS.filter(q => selectedSets.has(q.set));
}
function chooseCount(list, countValue){
  if(countValue === "all") return [...list];
  return [...list].slice(0, Number(countValue));
}
function startFrom(list, opts = {}){
  if(!list.length){ alert("출제할 문제가 없어! 범위를 확인해줘."); return; }
  const count = opts.count ?? $("countSelect").value;
  const order = opts.order ?? $("orderSelect").value;
  mode = opts.mode ?? $("modeSelect").value;
  let arranged = order === "shuffle" ? shuffle(list) : [...list];
  arranged = chooseCount(arranged, count);

  session = arranged;
  idx = 0;
  selected = {};
  checked = {};
  lastWrongIds = [];
  startedAt = Date.now();
  clearInterval(timerId);
  timerId = setInterval(() => $("timer").textContent = fmt(Math.floor((Date.now()-startedAt)/1000)), 1000);
  $("timer").textContent = "00:00";
  show("quiz");
  saveSession();
  renderQuestion();
}
function startCustom(){ startFrom(filteredQuestions()); }
function startWrong(){
  const ids = new Set(Object.keys(wrongStore));
  const list = QUESTIONS.filter(q => ids.has(q.id));
  if(!list.length){ alert("아직 오답노트가 없어. 먼저 풀어보자!"); return; }
  startFrom(list, {count: "all", mode: "instant", order: "shuffle"});
}
function startStar(){
  const ids = new Set(Object.keys(starStore));
  const list = QUESTIONS.filter(q => ids.has(q.id));
  if(!list.length){ alert("별표 문제가 없어. 문제 화면에서 ☆를 눌러 저장해줘!"); return; }
  startFrom(list, {count: "all", mode: "instant", order: "shuffle"});
}
function resumeSession(){
  const saved = readLS(LS.session, null);
  if(!saved || !saved.ids || !saved.ids.length){ alert("이어풀기 기록이 없어."); return; }
  const map = new Map(QUESTIONS.map(q => [q.id, q]));
  session = saved.ids.map(id => map.get(id)).filter(Boolean);
  if(!session.length){ alert("이어풀기 기록을 불러올 수 없어."); return; }
  idx = Math.min(saved.idx || 0, session.length-1);
  selected = saved.selected || {};
  checked = saved.checked || {};
  mode = saved.mode || "instant";
  startedAt = Date.now() - ((saved.elapsed || 0) * 1000);
  clearInterval(timerId);
  timerId = setInterval(() => $("timer").textContent = fmt(Math.floor((Date.now()-startedAt)/1000)), 1000);
  show("quiz");
  renderQuestion();
}
function saveSession(){
  if(!session.length) return;
  writeLS(LS.session, {
    ids: session.map(q => q.id),
    idx, selected, checked, mode,
    elapsed: Math.floor((Date.now()-startedAt)/1000),
    savedAt: Date.now()
  });
}
function currentQ(){ return session[idx]; }

function renderQuestion(){
  const q = currentQ();
  if(!q) return;

  $("nowNo").textContent = idx + 1;
  $("totalNo").textContent = session.length;
  $("barFill").style.width = ((idx+1)/session.length*100) + "%";
  $("sourcePill").textContent = q.set;
  $("localPill").textContent = `${q.localNo}번`;
  $("answerPill").textContent = checked[q.id] ? `정답 ${q.answer}번` : "정답 숨김";
  $("starBtn").textContent = starStore[q.id] ? "★" : "☆";

  const img = $("questionImg");
  $("imageLoading").classList.remove("hidden");
  img.classList.add("hidden");
  img.onload = () => {
    $("imageLoading").classList.add("hidden");
    img.classList.remove("hidden");
  };
  img.onerror = () => {
    $("imageLoading").textContent = "이미지 로드 실패: " + q.image;
    img.classList.add("hidden");
  };
  img.src = q.image + "?v=" + VERSION;

  renderChoices(q);
  renderFeedback(q);
  renderPad();
  preloadNext();
  saveSession();
}
function preloadNext(){
  const next = session[idx+1];
  if(next){
    const im = new Image();
    im.src = next.image + "?v=" + VERSION;
  }
}
function renderChoices(q){
  const box = $("choices");
  box.innerHTML = "";
  const choices = q.choices && q.choices.length ? q.choices : [1,2,3,4];
  choices.forEach(num => {
    const b = document.createElement("button");
    b.className = "answerBtn";
    b.textContent = `${num}번`;
    if(selected[q.id] === num) b.classList.add("selected");
    if(checked[q.id]){
      if(num === q.answer) b.classList.add("correct");
      if(selected[q.id] === num && num !== q.answer) b.classList.add("wrong");
    }
    b.onclick = () => choose(num);
    box.appendChild(b);
  });
}
function choose(num){
  const q = currentQ();
  if(!q) return;
  selected[q.id] = num;

  if(mode === "instant"){
    checked[q.id] = true;
    rememberAnswer(q, num);
  }

  renderQuestion();

  if(mode === "instant"){
    const auto = $("autoNextSelect").value;
    const ok = num === q.answer;
    if(idx < session.length-1 && (auto === "always" || (auto === "correct" && ok))){
      setTimeout(() => nextQuestion(), 550);
    }
  }
}
function revealAnswer(){
  const q = currentQ();
  if(!q) return;
  checked[q.id] = true;
  if(!selected[q.id]) selected[q.id] = 0;
  if(selected[q.id] !== q.answer){
    wrongStore[q.id] = { id:q.id, set:q.set, localNo:q.localNo, answer:q.answer, selected:selected[q.id], image:q.image, ts:Date.now() };
    writeLS(LS.wrong, wrongStore);
    updateCounts();
  }
  renderQuestion();
}
function rememberAnswer(q, num){
  stats.solved += 1;
  if(num === q.answer){
    stats.correct += 1;
    delete wrongStore[q.id];
  } else {
    wrongStore[q.id] = { id:q.id, set:q.set, localNo:q.localNo, answer:q.answer, selected:num, image:q.image, ts:Date.now() };
  }
  writeLS(LS.stats, stats);
  writeLS(LS.wrong, wrongStore);
  updateCounts();
}
function renderFeedback(q){
  const f = $("feedback");
  if(!checked[q.id]){
    f.classList.add("hidden");
    return;
  }
  const sel = selected[q.id];
  const ok = sel === q.answer;
  f.className = "feedback " + (ok ? "ok" : "bad");
  f.textContent = ok ? `정답! ${q.answer}번` : `오답! 정답은 ${q.answer}번이야. ${sel ? "내 답: " + sel + "번" : "선택 없이 정답 확인"}`;
  f.classList.remove("hidden");
}
function renderPad(){
  const pad = $("numPad");
  pad.innerHTML = "";
  session.forEach((q, i) => {
    const b = document.createElement("button");
    b.textContent = i + 1;
    if(i === idx) b.classList.add("current");
    if(selected[q.id]) b.classList.add("answered");
    if(checked[q.id]){
      b.classList.add(selected[q.id] === q.answer ? "correct" : "wrong");
    }
    b.onclick = () => { idx = i; renderQuestion(); };
    pad.appendChild(b);
  });
}
function prevQuestion(){
  if(idx > 0){ idx--; renderQuestion(); }
}
function nextQuestion(){
  if(idx < session.length - 1){
    idx++;
    renderQuestion();
  } else {
    finish();
  }
}
function finish(){
  if(!session.length) return;
  clearInterval(timerId);
  let correct = 0;
  let wrong = [];

  session.forEach(q => {
    checked[q.id] = true;
    const sel = selected[q.id] || 0;
    if(sel === q.answer){
      correct++;
      delete wrongStore[q.id];
    } else {
      wrong.push(q);
      wrongStore[q.id] = { id:q.id, set:q.set, localNo:q.localNo, answer:q.answer, selected:sel, image:q.image, ts:Date.now() };
    }
  });

  lastWrongIds = wrong.map(q => q.id);
  writeLS(LS.wrong, wrongStore);
  updateCounts();

  const pct = Math.round(correct / session.length * 100);
  $("scorePct").textContent = pct;
  $("scoreLine").textContent = `${session.length}문제 중 ${correct}개 정답 / ${session.length - correct}개 오답`;
  renderReview(wrong);
  localStorage.removeItem(LS.session);
  show("result");
}
function renderReview(wrong){
  const box = $("reviewList");
  box.innerHTML = "";
  if(!wrong.length){
    box.innerHTML = `<div class="reviewItem"><b>틀린 문제가 없어. 완벽해!</b></div>`;
    return;
  }
  wrong.forEach(q => {
    const div = document.createElement("div");
    div.className = "reviewItem";
    div.innerHTML = `<div><b>${q.set} ${q.localNo}번</b><br><span>내 답: ${selected[q.id] || "미선택"}번 / 정답: ${q.answer}번</span></div>`;
    const btn = document.createElement("button");
    btn.textContent = "보기";
    btn.onclick = () => openModal(q.image);
    div.appendChild(btn);
    box.appendChild(div);
  });
}
function retryWrongSession(){
  const ids = new Set(lastWrongIds);
  const list = QUESTIONS.filter(q => ids.has(q.id));
  if(!list.length){ alert("방금 틀린 문제가 없어!"); return; }
  startFrom(list, {count:"all", mode:"instant", order:"shuffle"});
}
function retrySame(){
  if(!session.length){ show("home"); return; }
  startFrom(session, {count:"all", mode:"instant", order:"order"});
}
function goHome(){
  show("home");
}
function toggleStar(){
  const q = currentQ();
  if(!q) return;
  if(starStore[q.id]) delete starStore[q.id];
  else starStore[q.id] = { id:q.id, set:q.set, localNo:q.localNo, answer:q.answer, image:q.image, ts:Date.now() };
  writeLS(LS.star, starStore);
  updateCounts();
  renderQuestion();
}
function openModal(src){
  $("modalImg").src = src + "?v=" + VERSION;
  $("modal").classList.remove("hidden");
}
function closeModal(){
  $("modal").classList.add("hidden");
  $("modalImg").src = "";
}

$("themeBtn").onclick = toggleTheme;
$("startRandom50").onclick = () => startFrom(QUESTIONS, {count:"50", mode:"instant", order:"shuffle"});
$("startExam40").onclick = () => startFrom(QUESTIONS, {count:"40", mode:"exam", order:"shuffle"});
$("startAll").onclick = () => startFrom(QUESTIONS, {count:"all", mode:"instant", order:"order"});
$("resumeBtn").onclick = resumeSession;
$("startWrong").onclick = startWrong;
$("startStar").onclick = startStar;
$("startCustom").onclick = startCustom;
$("checkAll").onclick = () => setFilters(allSets);
$("checkNone").onclick = () => setFilters([]);
$("check25").onclick = () => setFilters(sets25);
$("check26Mock").onclick = () => setFilters(sets26Mock);
$("checkExpected").onclick = () => setFilters(setsExpected);
$("exitBtn").onclick = () => {
  saveSession();
  if(confirm("현재 풀이를 저장하고 홈으로 나갈까?")) show("home");
};
$("prevBtn").onclick = prevQuestion;
$("nextBtn").onclick = nextQuestion;
$("revealBtn").onclick = revealAnswer;
$("starBtn").onclick = toggleStar;
$("questionImg").onclick = () => openModal(currentQ().image);
$("zoomBtn").onclick = () => openModal(currentQ().image);
$("closeModal").onclick = closeModal;
$("modal").onclick = (e) => { if(e.target.id === "modal") closeModal(); };
$("retryWrongSession").onclick = retryWrongSession;
$("retrySame").onclick = retrySame;
$("homeBtn").onclick = goHome;

document.addEventListener("keydown", (e) => {
  if(!$("modal").classList.contains("hidden")){
    if(e.key === "Escape") closeModal();
    return;
  }
  if(!$("quiz").classList.contains("hidden")){
    if(["1","2","3","4"].includes(e.key)) choose(Number(e.key));
    if(e.key === "ArrowLeft") prevQuestion();
    if(e.key === "ArrowRight" || e.key === "Enter") nextQuestion();
    if(e.key.toLowerCase() === "s") toggleStar();
  }
});

applyTheme();
initFilters();
updateCounts();
show("home");
