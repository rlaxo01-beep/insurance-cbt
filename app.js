const $=id=>document.getElementById(id);
const LS={wrong:"cbt9_wrong",star:"cbt9_star",session:"cbt9_session",theme:"cbt9_theme"};
let wrong=read(LS.wrong,{}), star=read(LS.star,{});
let lastInkQuestionId=null;
let sets=new Set(), setButtons=new Map(), session=[], idx=0, selected={}, checked={}, mode="instant", startMs=0, timer=null, lastWrong=[];
function read(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function fmt(s){return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function show(id){["home","quiz","result"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden")}
function counts(){$("total").textContent=QUESTIONS.length;$("wrongCount").textContent=Object.keys(wrong).length;$("starCount").textContent=Object.keys(star).length}
function theme(){document.documentElement.classList.toggle("dark",localStorage.getItem(LS.theme)==="dark");$("theme").textContent=localStorage.getItem(LS.theme)==="dark"?"☀️":"🌙"}
$("theme").onclick=()=>{localStorage.setItem(LS.theme,localStorage.getItem(LS.theme)==="dark"?"light":"dark");theme()}
const allSets=[...new Set(QUESTIONS.map(q=>q.set))], s25=allSets.filter(s=>s.startsWith("25")), s26=allSets.filter(s=>s.startsWith("26 쪽집게")), sexp=allSets.filter(s=>s.startsWith("26 예상문제"));
function initSets(){let box=$("sets");allSets.forEach(s=>{sets.add(s);let b=document.createElement("button");b.className="chip on";b.textContent=s;b.onclick=()=>{sets.has(s)?sets.delete(s):sets.add(s);sync()};box.appendChild(b);setButtons.set(s,b)})}
function sync(){setButtons.forEach((b,s)=>b.classList.toggle("on",sets.has(s)))}
function setFilter(list){sets=new Set(list);sync()}
function filtered(){return QUESTIONS.filter(q=>sets.has(q.set))}
function countList(list,c){return c==="all"?[...list]:[...list].slice(0,Number(c))}
function start(list,opt={}){if(!list.length){alert("출제할 문제가 없어!");return}let c=opt.count??$("count").value,o=opt.order??$("order").value;mode=opt.mode??$("mode").value;session=countList(o==="shuffle"?shuffle(list):[...list],c);idx=0;selected={};checked={};lastWrong=[];startMs=Date.now();clearInterval(timer);timer=setInterval(()=>$("timer").textContent=fmt(Math.floor((Date.now()-startMs)/1000)),1000);$("timer").textContent="00:00";show("quiz");render()}
function render(){let q=session[idx];if(!q)return;$("now").textContent=idx+1;$("max").textContent=session.length;$("bar").style.width=((idx+1)/session.length*100)+"%";$("setName").textContent=q.set;$("localNo").textContent=q.localNo+"번";$("answerState").textContent=checked[q.id]?"정답 "+q.answer+"번":"정답 숨김";$("starBtn").textContent=star[q.id]?"★":"☆";let img=$("qimg");$("loading").classList.remove("hidden");img.classList.add("hidden");img.onload=()=>{$("loading").classList.add("hidden");img.classList.remove("hidden")};img.onerror=()=>{$("loading").textContent="이미지 로드 실패: "+q.image};img.src="./"+q.image+"?v=11";resetInkForQuestion(q.id);setTimeout(resizeInkCanvas,80);answers(q);feedback(q);pad();persist();preload()}
function preload(){let q=session[idx+1];if(q){let im=new Image();im.src="./"+q.image+"?v=11"}}
function answers(q){let box=$("answers");box.innerHTML="";[1,2,3,4].forEach(n=>{let b=document.createElement("button");b.className="ans";b.textContent=n+"번";if(selected[q.id]===n)b.classList.add("sel");if(checked[q.id]){if(n===q.answer)b.classList.add("ok");if(selected[q.id]===n&&n!==q.answer)b.classList.add("no")}b.onclick=()=>choose(n);box.appendChild(b)})}
function choose(n){let q=session[idx];selected[q.id]=n;if(mode==="instant"){checked[q.id]=true;remember(q,n)}render()}
function remember(q,n){if(n===q.answer)delete wrong[q.id];else wrong[q.id]={id:q.id,set:q.set,localNo:q.localNo,answer:q.answer,selected:n,image:q.image};save(LS.wrong,wrong);counts()}
function reveal(){let q=session[idx];checked[q.id]=true;if(!selected[q.id])selected[q.id]=0;if(selected[q.id]!==q.answer)remember(q,selected[q.id]);render()}
function feedback(q){let f=$("feedback");if(!checked[q.id]){f.classList.add("hidden");return}let ok=selected[q.id]===q.answer;f.className="feedback "+(ok?"ok":"no");let title=ok?"정답! "+q.answer+"번":"오답! 정답은 "+q.answer+"번";let exp=q.explain||("정답은 "+q.answer+"번이야. 문제 이미지의 선택지를 다시 확인해.");f.innerHTML="<b>"+esc(title)+"</b><div class='explainBox'>"+esc(exp)+"</div>";f.classList.remove("hidden")}
function pad(){let p=$("pad");p.innerHTML="";session.forEach((q,i)=>{let b=document.createElement("button");b.textContent=i+1;if(i===idx)b.classList.add("cur");if(selected[q.id])b.classList.add("done");if(checked[q.id])b.classList.add(selected[q.id]===q.answer?"ok":"no");b.onclick=()=>{idx=i;render()};p.appendChild(b)})}
function prev(){if(idx>0){idx--;render()}} function next(){idx<session.length-1?(idx++,render()):finish()}
function finish(){clearInterval(timer);let c=0,w=[];session.forEach(q=>{checked[q.id]=true;let s=selected[q.id]||0;if(s===q.answer){c++;delete wrong[q.id]}else{w.push(q);wrong[q.id]={id:q.id,set:q.set,localNo:q.localNo,answer:q.answer,selected:s,image:q.image}}});lastWrong=w.map(q=>q.id);save(LS.wrong,wrong);localStorage.removeItem(LS.session);counts();$("score").textContent=Math.round(c/session.length*100);$("scoreText").textContent=`${session.length}문제 중 ${c}개 정답 / ${session.length-c}개 오답`;review(w);show("result")}
function review(w){let box=$("review");box.innerHTML=w.length?"":"<div class='reviewItem'><b>틀린 문제가 없어!</b></div>";w.forEach(q=>{let d=document.createElement("div");d.className="reviewItem";d.innerHTML=`<div><b>${esc(q.set)} ${q.localNo}번</b><br>내 답: ${selected[q.id]||"미선택"}번 / 정답: ${q.answer}번<div class="reviewExplain">${esc(q.explain||"해설 없음")}</div></div>`;let b=document.createElement("button");b.textContent="보기";b.onclick=()=>openImg(q.image);d.appendChild(b);box.appendChild(d)})}
function persist(){if(session.length)save(LS.session,{ids:session.map(q=>q.id),idx,selected,checked,mode,elapsed:Math.floor((Date.now()-startMs)/1000)})}
function resume(){let s=read(LS.session,null);if(!s){alert("이어풀기 기록이 없어");return}let m=new Map(QUESTIONS.map(q=>[q.id,q]));session=s.ids.map(id=>m.get(id)).filter(Boolean);idx=s.idx||0;selected=s.selected||{};checked=s.checked||{};mode=s.mode||"instant";startMs=Date.now()-((s.elapsed||0)*1000);clearInterval(timer);timer=setInterval(()=>$("timer").textContent=fmt(Math.floor((Date.now()-startMs)/1000)),1000);show("quiz");render()}
function openImg(src){$("modalImg").src="./"+src+"?v=11";$("modal").classList.remove("hidden")}
function closeImg(){$("modal").classList.add("hidden");$("modalImg").src=""}
$("random50").onclick=()=>start(QUESTIONS,{count:"50",mode:"instant",order:"shuffle"});$("exam40").onclick=()=>start(QUESTIONS,{count:"40",mode:"exam",order:"shuffle"});$("all").onclick=()=>start(QUESTIONS,{count:"all",mode:"instant",order:"order"});$("custom").onclick=()=>start(filtered());$("wrong").onclick=()=>{let ids=new Set(Object.keys(wrong));start(QUESTIONS.filter(q=>ids.has(q.id)),{count:"all",mode:"instant",order:"shuffle"})};$("starred").onclick=()=>{let ids=new Set(Object.keys(star));start(QUESTIONS.filter(q=>ids.has(q.id)),{count:"all",mode:"instant",order:"shuffle"})};$("resume").onclick=resume;
$("fAll").onclick=()=>setFilter(allSets);$("f25").onclick=()=>setFilter(s25);$("f26").onclick=()=>setFilter(s26);$("fExpected").onclick=()=>setFilter(sexp);$("exit").onclick=()=>{persist();show("home")};$("prev").onclick=prev;$("next").onclick=next;$("showAnswer").onclick=reveal;$("starBtn").onclick=()=>{let q=session[idx];star[q.id]?delete star[q.id]:star[q.id]={id:q.id,set:q.set,localNo:q.localNo,answer:q.answer,image:q.image};save(LS.star,star);counts();render()};$("zoom").onclick=() => openImg(session[idx].image);$("qimg").onclick=() => openImg(session[idx].image);$("close").onclick=closeImg;$("modal").onclick=e=>{if(e.target.id==="modal")closeImg()};$("retryWrong").onclick=()=>{let ids=new Set(lastWrong);start(QUESTIONS.filter(q=>ids.has(q.id)),{count:"all",mode:"instant",order:"shuffle"})};$("retrySame").onclick=()=>start(session,{count:"all",mode:"instant",order:"order"});$("goHome").onclick=()=>show("home");
document.addEventListener("keydown",e=>{if(!$("modal").classList.contains("hidden")){if(e.key==="Escape")closeImg();return}if(!$("quiz").classList.contains("hidden")){if(["1","2","3","4"].includes(e.key))choose(Number(e.key));if(e.key==="ArrowLeft")prev();if(e.key==="ArrowRight"||e.key==="Enter")next();if(e.key.toLowerCase()==="s")$("starBtn").click()}});
theme();initSets();counts();show("home");


/* v11 이동식 필기 기능 */
const DRAW_LS={fab:"cbt11_draw_fab_pos",panel:"cbt11_draw_panel_pos"};
let drawState={enabled:true,tool:"pen",size:6,drawing:false,last:null};

function getCanvas(){return $("inkCanvas")}
function getCtx(){
  const c=getCanvas();
  return c ? c.getContext("2d") : null;
}
function resizeInkCanvas(){
  const c=getCanvas();
  const box=document.querySelector(".imgBox");
  if(!c||!box) return;
  const rect=box.getBoundingClientRect();
  const dpr=window.devicePixelRatio||1;
  const old=document.createElement("canvas");
  old.width=c.width; old.height=c.height;
  old.getContext("2d").drawImage(c,0,0);
  const nw=Math.max(1,Math.round(rect.width*dpr));
  const nh=Math.max(1,Math.round(rect.height*dpr));
  if(c.width===nw && c.height===nh) return;
  c.width=nw; c.height=nh;
  c.style.width=rect.width+"px";
  c.style.height=rect.height+"px";
  const ctx=c.getContext("2d");
  ctx.setTransform(1,0,0,1,0,0);
  if(old.width && old.height) ctx.drawImage(old,0,0,c.width,c.height);
}
function clearInk(){
  const c=getCanvas(), ctx=getCtx();
  if(!c||!ctx) return;
  ctx.clearRect(0,0,c.width,c.height);
}
function resetInkForQuestion(qid){
  if(lastInkQuestionId!==qid){
    lastInkQuestionId=qid;
    setTimeout(()=>{resizeInkCanvas();clearInk();},60);
  }
}
function canvasPoint(e){
  const c=getCanvas();
  const r=c.getBoundingClientRect();
  const dpr=window.devicePixelRatio||1;
  return {x:(e.clientX-r.left)*dpr,y:(e.clientY-r.top)*dpr};
}
function startInk(e){
  if(!drawState.enabled) return;
  resizeInkCanvas();
  drawState.drawing=true;
  drawState.last=canvasPoint(e);
  e.preventDefault();
}
function moveInk(e){
  if(!drawState.drawing||!drawState.last) return;
  const c=getCanvas(), ctx=getCtx();
  const p=canvasPoint(e);
  ctx.lineCap="round";
  ctx.lineJoin="round";
  if(drawState.tool==="erase"){
    ctx.globalCompositeOperation="destination-out";
    ctx.lineWidth=drawState.size*3*(window.devicePixelRatio||1);
    ctx.strokeStyle="rgba(0,0,0,1)";
  }else{
    ctx.globalCompositeOperation="source-over";
    ctx.lineWidth=drawState.size*(window.devicePixelRatio||1);
    ctx.strokeStyle=drawState.tool==="high"?"rgba(255,230,0,.38)":"rgba(220,30,30,.95)";
  }
  ctx.beginPath();
  ctx.moveTo(drawState.last.x,drawState.last.y);
  ctx.lineTo(p.x,p.y);
  ctx.stroke();
  drawState.last=p;
  e.preventDefault();
}
function endInk(){drawState.drawing=false;drawState.last=null}
function setTool(tool){
  drawState.tool=tool;
  ["penTool","highTool","eraseTool"].forEach(id=>$(id)?.classList.remove("active"));
  if(tool==="pen") $("penTool")?.classList.add("active");
  if(tool==="high") $("highTool")?.classList.add("active");
  if(tool==="erase") $("eraseTool")?.classList.add("active");
}
function setDrawEnabled(on){
  drawState.enabled=on;
  const c=getCanvas();
  if(c) c.classList.toggle("active",on);
  const b=$("drawToggle");
  if(b){b.textContent=on?"필기 ON":"필기 OFF";b.classList.toggle("on",on)}
}
function makeDraggable(el,handle,storeKey){
  if(!el||!handle) return;
  const saved=read(storeKey,null);
  if(saved&&Number.isFinite(saved.left)&&Number.isFinite(saved.top)){
    el.style.left=saved.left+"px"; el.style.top=saved.top+"px"; el.style.right="auto";
  }
  let sx=0,sy=0,sl=0,st=0,moved=false,down=false;
  handle.addEventListener("pointerdown",e=>{
    down=true;moved=false;sx=e.clientX;sy=e.clientY;
    const r=el.getBoundingClientRect();sl=r.left;st=r.top;
    handle.setPointerCapture?.(e.pointerId);
  });
  handle.addEventListener("pointermove",e=>{
    if(!down) return;
    const dx=e.clientX-sx,dy=e.clientY-sy;
    if(Math.abs(dx)+Math.abs(dy)>4)moved=true;
    let left=Math.min(window.innerWidth-el.offsetWidth-6,Math.max(6,sl+dx));
    let top=Math.min(window.innerHeight-el.offsetHeight-6,Math.max(6,st+dy));
    el.style.left=left+"px";el.style.top=top+"px";el.style.right="auto";
    e.preventDefault();
  });
  handle.addEventListener("pointerup",e=>{
    down=false;
    const r=el.getBoundingClientRect();
    save(storeKey,{left:r.left,top:r.top});
    el.dataset.wasDragged=moved?"1":"0";
    setTimeout(()=>{el.dataset.wasDragged="0"},0);
  });
}
function initDrawing(){
  const c=getCanvas();
  if(c){
    c.addEventListener("pointerdown",startInk);
    c.addEventListener("pointermove",moveInk);
    c.addEventListener("pointerup",endInk);
    c.addEventListener("pointercancel",endInk);
    c.addEventListener("pointerleave",endInk);
  }
  $("drawFab")?.addEventListener("click",()=>{
    if($("drawFab").dataset.wasDragged==="1") return;
    $("drawPanel")?.classList.toggle("hidden");
    setDrawEnabled(true);
    setTimeout(resizeInkCanvas,50);
  });
  $("closeDraw")?.addEventListener("click",()=>$("drawPanel")?.classList.add("hidden"));
  $("drawToggle")?.addEventListener("click",()=>setDrawEnabled(!drawState.enabled));
  $("penTool")?.addEventListener("click",()=>setTool("pen"));
  $("highTool")?.addEventListener("click",()=>setTool("high"));
  $("eraseTool")?.addEventListener("click",()=>setTool("erase"));
  $("clearInk")?.addEventListener("click",()=>clearInk());
  document.querySelectorAll(".sizeBtn").forEach(b=>b.addEventListener("click",()=>{
    drawState.size=Number(b.dataset.size||6);
    document.querySelectorAll(".sizeBtn").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
  }));
  makeDraggable($("drawFab"),$("drawFab"),DRAW_LS.fab);
  makeDraggable($("drawPanel"),$("drawHandle"),DRAW_LS.panel);
  setDrawEnabled(true);
  window.addEventListener("resize",()=>setTimeout(resizeInkCanvas,100));
}
initDrawing();
