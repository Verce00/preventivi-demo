
(function(){
"use strict";
/* ---------- pagina a sé: accesso con lo stesso account del CRM (la sessione è la stessa) ---------- */
const store=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
const esc=v=>String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(t){document.querySelectorAll(".toast").forEach(o=>o.remove());const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
const call=(fn,...a)=>fetch("api/"+fn,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}).then(r=>{if(!r.ok)throw new Error("Il server non risponde ("+r.status+"): riprova tra poco.");return r.json()},()=>{throw new Error("Non riesco a raggiungere il server dei preventivi: controlla di essere in ufficio e che il server sia acceso.")}).then(x=>{if(!x.ok)throw new Error(x.error);return x.r});
let token=store("crm.token")||"";
async function api(fn,...a){
  try{return await call(fn,token,...a)}
  catch(e){const m=String(e&&e.message||e);if(/SESSIONE/.test(m)){token="";store("crm.token","");mostraLogin(m.replace(/^.*SESSIONE:\s*/,""))}throw e}
}
function mostraLogin(testo,modo){
  const box=document.getElementById("pvLogin"), reg=modo==="reg";
  box.innerHTML=`<div class="auth"><div class="authbox"><h2>Preventivi</h2>
    <div class="seg" role="group" aria-label="Tipo di accesso"><button type="button" data-auth="login" aria-pressed="${!reg}">Accedi</button><button type="button" data-auth="reg" aria-pressed="${reg}">Primo accesso</button></div>
    <p class="small muted">${esc(testo||(reg?"Inserisci la tua email di Ask Consulting e scegli una password. Funziona solo con le email autorizzate dall'amministratore.":"Accedi con il tuo account."))}</p>
    <form id="pvAuth" class="pv-auth" autocomplete="on"><label>${reg?"Email di Ask Consulting":"Email o nome utente"}<input class="field" id="pvUser" ${reg?'type="email" autocomplete="email"':'autocomplete="username"'} required></label>
    <label>Password<input class="field" id="pvPw" type="password" autocomplete="${reg?"new-password":"current-password"}" ${reg?'minlength="8"':""} required></label>
    ${reg?`<label>Ripeti la password<input class="field" id="pvPw2" type="password" autocomplete="new-password" minlength="8" required></label>`:""}
    <button class="btn primary" type="submit">${reg?"Crea l'accesso":"Accedi"}</button><p class="pv-av err" id="pvAuthErr" hidden></p></form></div></div>`;
  box.hidden=false;document.getElementById("pvUser").focus();
  box.querySelectorAll("[data-auth]").forEach(b=>b.onclick=()=>mostraLogin("",b.dataset.auth));
  document.getElementById("pvAuth").onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector("button[type=submit]"),er=document.getElementById("pvAuthErr"),pw=document.getElementById("pvPw").value;er.hidden=true;
    if(reg&&pw!==document.getElementById("pvPw2").value){er.textContent="Le due password non coincidono.";er.hidden=false;return}
    b.disabled=true;
    try{
      if(reg){const r=await call("register",document.getElementById("pvUser").value.trim().toLowerCase(),pw);mostraLogin(r.msg,"login");return}
      const r=await call("login",document.getElementById("pvUser").value,pw);token=r.token;store("crm.token",token);box.hidden=true;box.innerHTML="";if(!P.D)avvia()}
    catch(x){er.textContent=msg(x);er.hidden=false;b.disabled=false}};
}

/* ---------- account: stesso menu e stessa gestione utenti del CRM ---------- */
const el=s=>document.querySelector(s);
const fmtD=iso=>iso?iso.slice(8,10)+"/"+iso.slice(5,7)+(iso.slice(0,4)!==String(new Date().getFullYear())?"/"+iso.slice(2,4):""):"";
const chip=(t,c)=>`<span class="chip" style="--c:${c||"#888"}" title="${esc(t)}"><span class="cl">${esc(t)}</span></span>`;
const closeDrawer=()=>{el("#drawerRoot").innerHTML=""};
function userMenu(){
  const r=el("#menuRoot"); if(!r.hidden){r.hidden=true;return}
  const mb=el("#meBtn"); if(mb)r.style.top=(mb.getBoundingClientRect().bottom+6)+"px";
  r.innerHTML=`<div class="menu" role="menu"><button role="menuitem" data-mm="pw">Cambia password</button>${P.admin?`<button role="menuitem" data-mm="users">Gestisci utenti</button><button role="menuitem" data-mm="importa">Importa dati da Google</button>`:""}<button role="menuitem" data-mm="out">Esci</button></div>`;
  r.hidden=false;
}
async function menuAction(a){
  el("#menuRoot").hidden=true;
  if(a==="out"){if(!lascia("esci"))return;try{await call("logout",token)}catch(e){}
    token="";store("crm.token","");P.D=null;P.p=null;P.dirty=false;closeDrawer();el("#pvMe").innerHTML="";mostraLogin("Sei uscito dai preventivi.");return}
  if(a==="pw")return panel(`<h3>Cambia password</h3><form id="pwForm" class="form" style="grid-template-columns:1fr">
     <label>Password attuale<input class="field" type="password" id="pwOld" autocomplete="current-password" required></label>
     <label>Nuova password<input class="field" type="password" id="pwNew" autocomplete="new-password" minlength="8" required></label>
     <div class="actions"><span id="pwErr" style="font-size:12px;color:var(--bad);margin-right:auto"></span><button class="btn primary" type="submit">Salva</button></div></form>`,()=>{
     el("#pwForm").onsubmit=async e=>{e.preventDefault();try{await api("changePassword",el("#pwOld").value,el("#pwNew").value);closeDrawer();toast("Password cambiata")}catch(err){el("#pwErr").textContent=msg(err)}}});
  if(a==="users")return usersPanel();
  if(a==="importa")return panel(`<h3>Importa dati da Google</h3><div style="font-size:14px;line-height:1.5">
     <p>Serve una volta sola, per portare qui i preventivi, le chiamate e le aziende acquisite fatti con la versione Google.</p>
     <ol><li>Apri il foglio Google <b>CRM – Preventivi</b>.</li><li>Menu <b>File → Scarica → Microsoft Excel (.xlsx)</b>.</li><li>Scegli qui sotto il file scaricato.</li></ol>
     <p class="muted small">Quello che c'è già qui non viene toccato né duplicato: puoi ripetere l'importazione senza problemi.</p>
     <label class="btn primary">Scegli il file Excel…<input type="file" id="pvFileImporta" accept=".xlsx" hidden></label>
     <p id="impEsito" style="margin-top:12px"></p></div>`,()=>{
     el("#pvFileImporta").onchange=async e=>{const f=e.target.files[0];if(!f)return;const out=el("#impEsito");out.textContent="Importo…";
       try{const n=await api("pvImporta",await leggiB64(f));out.textContent="Fatto: "+n.preventivi+" preventivi, "+n.contatti+" chiamate e "+n.acquisite+" aziende acquisite importati. Ricarico la pagina…";
         setTimeout(()=>location.reload(),1800)}catch(err){out.textContent=msg(err)}}});
}
function panel(html,after){
  const root=el("#drawerRoot");
  root.innerHTML=`<div class="scrim" id="scrim"></div><aside class="drawer" role="dialog"><div class="dhead"><div class="dtop"><div style="min-width:0;flex:1">${html.match(/<h3>.*?<\/h3>/)[0]}</div><button class="btn x" id="closeD" aria-label="Chiudi">\u2715<span class="hide-sm">&nbsp;Chiudi</span></button></div></div><div class="dbody">${html.replace(/<h3>.*?<\/h3>/,"")}</div></aside>`;
  el("#scrim").onclick=closeDrawer;el("#closeD").onclick=closeDrawer; if(after)after();
}
async function usersPanel(list){
  if(!list){panel(`<h3>Utenti</h3><div class="muted">Caricamento…</div>`);try{list=await api("listUsers")}catch(e){toast(msg(e));return}}
  const col={"attivo":"#3fa45b","in attesa":"#e0a400","disattivato":"#9a9a9a"};
  panel(`<h3>Utenti</h3><div class="muted" style="font-size:13px">Solo le email nell'elenco <b>Email autorizzate</b> (più sotto) possono fare il primo accesso. Reimposta password genera una password provvisoria da comunicare al collega.</div>
   <div class="listbox">${list.map(u=>{const self=String(u.user).trim().toLowerCase()===String(P.user||"").trim().toLowerCase();
     return `<div class="urow" data-u="${esc(u.user)}">
     <div style="min-width:0"><div class="uname"><b>${esc(u.nome||u.user)}</b>${self?` <span class="muted">(tu)</span>`:""} ${u.ruolo==="admin"?`<span class="chip plain" style="--c:#13529b">amministratore</span>`:""}</div><div class="sub">${u.email?esc(u.email):`<span style="color:var(--warn)">email mancante</span>`}${u.accesso?" · ultimo accesso "+fmtD(u.accesso.slice(0,10)):""}</div>
       <div class="uacts">
        ${self?"":(u.stato!=="attivo"?`<button class="mini" data-ua="attivo">Approva</button>`:`<button class="mini" data-ua="disattivato">Disattiva</button>`)}
        <button class="mini" data-ua="reset">${self?"Reimposta la mia password":"Reimposta password"}</button>
        ${self?"":(u.ruolo==="admin"?`<button class="mini" data-ua="utente">Togli amministratore</button>`:`<button class="mini" data-ua="admin">Rendi amministratore</button>`)}
       </div>${self?`<div class="sub" style="margin-top:6px">Non puoi disattivare il tuo account né toglierti i permessi: può farlo solo un altro amministratore.</div>`:""}<div class="temp mono" style="font-size:13px;margin-top:6px"></div></div>
     <div>${chip(u.stato,col[u.stato])}</div></div>`}).join("")}</div>
   <div class="sech" style="margin-top:22px"><h4>Email autorizzate</h4></div>
   <div class="muted" style="font-size:13px;margin-bottom:10px">Chi è in questo elenco può fare il <b>Primo accesso</b> inserendo solo email e password. Il nome che scrivi qui diventa il suo nome utente.</div>
   <div id="allowBox"><div class="muted">Caricamento…</div></div>`,()=>{
    loadAllow();
    el("#drawerRoot").querySelectorAll("[data-ua]").forEach(b=>b.onclick=async()=>{
      const row=b.closest("[data-u]"),user=row.dataset.u,a=b.dataset.ua; b.disabled=true;
      try{
        if(a==="reset"){const t=await api("resetPassword",user);row.querySelector(".temp").textContent="Password provvisoria: "+t;b.disabled=false;return}
        const ch=(a==="admin"||a==="utente")?{ruolo:a}:{stato:a};
        usersPanel(await api("updateUser",user,ch));
      }catch(e){toast(msg(e));b.disabled=false}
    })});
}
async function loadAllow(list){
  const box=el("#allowBox"); if(!box)return;
  if(!list){try{list=await api("listAllowed")}catch(e){box.innerHTML=`<div class="muted">${esc(msg(e))}</div>`;return}}
  box.innerHTML=`<div class="listbox">${list.length?list.map(a=>`<div class="urow" data-em="${esc(a.email)}"><div style="min-width:0"><div class="uname"><b>${esc(a.nome||"—")}</b></div><div class="sub">${esc(a.email)}</div></div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${a.registrato?`<span class="chip plain" style="--c:#3fa45b">account creato</span>`:`<span class="chip plain" style="--c:#e0a400">non ancora entrato</span>`}<button class="mini danger" type="button" data-alrm>Rimuovi</button></div></div>`).join("")
      :`<div class="urow"><span class="muted">Nessuna email autorizzata.</span></div>`}</div>
   <form class="form" id="allowForm" style="margin-top:12px">
     <label>Nome e cognome<input class="field" name="nome" placeholder="es. Mario Rossi" required></label>
     <label>Email<input class="field" name="email" type="email" inputmode="email" placeholder="cognome@askconsulting.it" required></label>
     <div class="actions"><span class="hint" data-hint></span><button class="btn primary" type="submit">Aggiungi email</button></div>
   </form>`;
  box.querySelectorAll("[data-alrm]").forEach(b=>b.onclick=async()=>{
    if(!b.dataset.sure){b.dataset.sure="1";b.textContent="Sicuro? Rimuovi";b.classList.add("armed");setTimeout(()=>{if(b.isConnected){delete b.dataset.sure;b.textContent="Rimuovi";b.classList.remove("armed")}},4000);return}
    b.disabled=true; try{loadAllow(await api("removeAllowed",b.closest("[data-em]").dataset.em));toast("Email rimossa dall'elenco")}catch(e){toast(msg(e));b.disabled=false}
  });
  el("#allowForm").onsubmit=async e=>{e.preventDefault();const f=e.target,fd=Object.fromEntries(new FormData(f)),btn=f.querySelector("button[type=submit]");
    btn.disabled=true; try{loadAllow(await api("addAllowed",fd.email.trim(),fd.nome.trim()));toast("Email autorizzata")}
    catch(err){f.querySelector("[data-hint]").textContent=msg(err);btn.disabled=false}};
}

/* ---------- calcoli (uguali a pvCalcola_ nello script Preventivi) ---------- */
function pvNum(v){let s=String(v==null?"":v).trim().replace(/[\s€]/g,"");if(s.indexOf(",")>=0)s=s.replace(/\./g,"").replace(",",".");else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,"");const x=Number(s);return isFinite(x)?x:0}
function pvCalcola(p){
  const num=pvNum, r2=v=>Math.round(v*100)/100;
  const aziende=p.aziende||[], corsi=p.corsi||[], ask=p.ask||{};
  const disponibile=r2(aziende.reduce((s,a)=>s+num(a.disponibile),0));
  const maturando=r2(aziende.reduce((s,a)=>s+num(a.maturando),0));
  const budget=r2(disponibile+maturando);
  const manuale=num(p.totaleManuale)>0, totale=manuale?r2(num(p.totaleManuale)):budget;
  const parametro=num(p.parametro)||165;
  const soglia=num(ask.soglia||"4230"), askPerc=totale>=soglia;
  const askPrep=askPerc?Math.ceil(r2(totale*num(ask.perc)/100)/10)*10:totale>3000?675:totale>=2000?500:0; // sotto la soglia: 1.350 € oltre 3.000, 1.000 € da 2.000 a 3.000, 0 sotto 2.000 (metà preparatorie, metà gestione)
  const askGest=askPrep, revisore=r2(num(p.revisore)), recupero=r2(num(p.recupero));
  const fissi=r2(corsi.reduce((s,c)=>s+(c.residuo?0:num(c.importo)),0));
  const residuo=r2(totale-askPrep-askGest-revisore-recupero-fissi);
  const resIdx=corsi.map((c,i)=>c.residuo?i:-1).filter(i=>i>=0);
  const oreRes=resIdx.reduce((s,i)=>s+num(corsi[i].ore),0);
  const importi=corsi.map(c=>c.residuo?0:r2(num(c.importo)));
  let assegnato=0;
  resIdx.forEach((i,k)=>{
    const q=k===resIdx.length-1?r2(residuo-assegnato)
      :r2(oreRes?residuo*num(corsi[i].ore)/oreRes:residuo/resIdx.length);
    importi[i]=q; assegnato=r2(assegnato+q);
  });
  const euroOraCorsi=corsi.map((c,i)=>num(c.ore)?importi[i]/num(c.ore):0);
  const docenzaCorsi=r2(importi.reduce((s,v)=>s+v,0));
  const docenza=r2(docenzaCorsi+recupero);
  const ore=Math.round(corsi.reduce((s,c)=>s+num(c.ore),0)*100)/100;
  const totalePiano=r2(docenza+askPrep+askGest+revisore);
  const oreMin=Math.ceil(totale/parametro-1e-9);
  const euroOraPiano=ore?totalePiano/ore:0, euroOraDocenza=ore?docenzaCorsi/ore:0;
  const e=v=>v.toFixed(2).replace(".",",")+" €";
  const avvisi=[];
  if(manuale&&totale>budget+0.004)avvisi.push({liv:"err",testo:"Il totale del piano supera il budget Fondimpresa ("+e(budget)+") di "+e(totale-budget)+"."});
  else if(manuale&&budget-totale>=0.01)avvisi.push({liv:"warn",testo:"Restano "+e(budget-totale)+" sul conto Fondimpresa, non usati in questo piano."});
  if(!totale)avvisi.push({liv:"warn",testo:"Inserisci i saldi Fondimpresa (disponibile e maturando)."});
  if(!corsi.length)avvisi.push({liv:"warn",testo:"Aggiungi almeno un corso."});
  if(totale&&residuo<0)avvisi.push({liv:"err",testo:"I costi fissi superano il budget di "+e(-residuo)+": riduci gli importi fissi o le quote Ask/revisore."});
  if(totale&&corsi.length&&!resIdx.length&&Math.abs(totalePiano-totale)>=0.01)
    avvisi.push({liv:"warn",testo:totalePiano<totale
      ?"Restano "+e(totale-totalePiano)+" non assegnati: segna un corso come \"prende il residuo\"."
      :"Il piano supera il budget di "+e(totalePiano-totale)+"."});
  if(totale&&ore<oreMin-1e-9)
    avvisi.push({liv:"err",testo:"Servono almeno "+oreMin+" ore di formazione (parametro "+parametro+" €/ora): ora sono "+String(ore).replace(".",",")+"."});
  else if(totale&&ore)avvisi.push({liv:"ok",testo:"Parametro rispettato: "+e(euroOraPiano)+" all'ora sul piano (massimo "+parametro+")."});
  return {disponibile,maturando,budget,manuale,totale,parametro,soglia,askPerc,askPrep,askGest,revisore,recupero,fissi,residuo,oreRes,importi,
    euroOraCorsi,docenzaCorsi,docenza,ore,totalePiano,oreMin,euroOraPiano,euroOraDocenza,avvisi};
}

/* ---------- stato ---------- */
const EUR=new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR",useGrouping:"always"});
const eur=v=>EUR.format(v||0);
const n1=v=>(Math.round((v||0)*10)/10).toLocaleString("it-IT");
const oggi=()=>new Date().toLocaleDateString("sv-SE");
const dIt=s=>s?s.split("-").reverse().join("/"):"";
const P={root:null,D:null,corsi:[],lista:[],contatti:[],vista:"preventivi",reg:null,p:null,dirty:false,busy:false,stato:"",admin:false,saldi:{righe:[],data:"",link:"",errore:""}};
const q=s=>P.root.querySelector(s);
const msg=e=>String(e&&e.message||e).replace(/^(Error|Exception|ScriptError):\s*/,"");
const corsoVuoto=()=>({docente:"",titolo:"",codice:"",periodo:"",partecipanti:"",ore:"",residuo:true,importo:"",note:""});
function nuovo(){const D=P.D||{ask:{}};return {id:"",dataPreventivo:oggi(),dataSaldi:oggi(),periodo:"",
  aziende:[{nome:"",cf:"",disponibile:"",maturando:""}],corsi:[corsoVuoto()],
  ask:{valore:D.ask.valore||"675",perc:D.ask.perc||"16",soglia:D.ask.soglia||"4230"},totaleManuale:"",revisore:D.revisore||"150",recupero:D.recupero||"0",parametro:D.parametro||"165",
  scadenza:"",date:{presentazione:"",avvio:"",fine:"",rendicontazione:"",prossimo:""},note:"",fileUrl:""}}
const getP=(o,k)=>k.split(".").reduce((x,s)=>x==null?x:x[s],o);
function setP(o,k,v){const a=k.split(".");let x=o;for(let i=0;i<a.length-1;i++)x=x[a[i]];x[a[a.length-1]]=v}

/* ---------- saldi dal Google Foglio "Saldi Fondimpresa" ---------- */
const cfNorm=cf=>String(cf||"").toUpperCase().replace(/\s+/g,"");
const saldoDi=cf=>cfNorm(cf)?P.saldi.righe.find(r=>r.cf===cfNorm(cf)):null;
const cifra=v=>(v||0).toFixed(2).replace(".",",");
// compila disponibile, maturando, importo in scadenza e data dei saldi delle aziende trovate nell'elenco; restituisce quante ne ha trovate
function applicaSaldi(p){
  let n=0,scad=0,data=P.saldi.data;
  p.aziende.forEach(a=>{const s=saldoDi(a.cf);if(!s)return;n++;a.disponibile=cifra(s.disponibile);a.maturando=cifra(s.maturando);scad+=s.scadenza||0;if(s.data)data=s.data});
  if(n){p.scadenza=scad?cifra(scad):"";if(data)p.dataSaldi=data}
  return n;
}
function notaSaldo(a){
  if(!a.nome&&!cfNorm(a.cf))return "";
  const s=saldoDi(a.cf);
  if(!s)return "Questa azienda non è nell'elenco dei saldi: aggiungila con «+ Nuova azienda» (riquadro Saldi Fondimpresa) oppure scrivi i saldi a mano.";
  return s.acquisita?`Azienda aggiunta a mano${s.data?": saldi aggiornati al "+dIt(s.data):""}.`
    :`Saldi presi dal file Fondimpresa${(s.data||P.saldi.data)?" (aggiornati al "+dIt(s.data||P.saldi.data)+")":""}.`;
}
// aziende che si possono scegliere: quelle del foglio dei saldi più le acquisite aggiunte a mano
function righeAziende(filtro,a){
  const f=senzaAccenti(filtro).trim(), tutte=P.saldi.righe.filter(r=>r.nome);
  const l=tutte.filter(r=>!f||senzaAccenti(r.nome+" "+r.cf).includes(f)).sort((x,y)=>x.nome.localeCompare(y.nome,"it"));
  const sn=P.saldi.senzaNome?`<div class="pv-catno">${P.saldi.senzaNome} righe del foglio non hanno il nome dell'azienda e qui non compaiono.</div>`:"";
  if(!tutte.length)return `<div class="pv-catno">Nessuna azienda: carica il file dei saldi o usa «+ Nuova azienda» nel riquadro Saldi Fondimpresa.</div>`;
  return (l.length?l.map(r=>`<button type="button" class="pv-cato pv-catoaz${r.cf===cfNorm(a.cf)?" on":""}" data-pv="az-scegli" data-cf="${esc(r.cf)}"><span title="${esc(r.nome)}">${esc(r.nome)}</span><small>${r.acquisita?"acquisita · ":""}${esc(r.cf)}</small></button>`).join("")
    :`<div class="pv-catno">Nessuna azienda trovata. Se è nuova, aggiungila con «+ Nuova azienda» nel riquadro Saldi Fondimpresa.</div>`)+sn;
}
const boxAziende=a=>`<div class="pv-catbox"><input type="search" class="field" data-az-cerca placeholder="Cerca per nome o codice fiscale…" autocomplete="off" aria-label="Cerca tra le aziende"><div class="pv-catlist">${righeAziende("",a)}</div></div>`;
function formAcquisita(){
  const f=(k,lab,ph)=>fld(lab,`<input class="field" data-acq="${k}" value="${esc(P.acq[k]||"")}"${ph?` inputmode="decimal" placeholder="0,00"`:""} autocomplete="off">`);
  return `<div class="pv-acq pv-acqside"><b>Nuova azienda</b>
    ${f("nome","Ragione sociale")}${f("cf","Codice fiscale")}${f("disponibile","Disponibile €",1)}${f("maturando","Maturando €",1)}${f("scadenza","Scadenza 31/12 €",1)}
    <p class="small muted">Viene aggiunta all'elenco delle aziende: poi la scegli in «Scegli azienda…» del preventivo.</p>
    <div class="pv-acqb"><button type="button" class="btn sm primary" data-pv="acq-salva">Salva azienda</button><button type="button" class="btn sm" data-pv="acq-annulla">Annulla</button></div></div>`;
}


/* ---------- elenco ---------- */
// pallino con le iniziali (es. «massimiliano giorsetti» → MG), colore fisso per persona
function avatar(nome){const n=String(nome||"").trim();if(!n)return "";
  const p=n.split(/[\s.@_-]+/).filter(Boolean),ini=((p[0]||"")[0]||"")+(p.length>1?p[p.length-1][0]:(p[0]||"")[1]||"");
  let h=0;for(const c of n.toLowerCase())h=(h*31+c.charCodeAt(0))>>>0;
  return `<span class="avt" style="--a:hsl(${h%360} 55% 42%)" title="${esc(n)}" aria-label="${esc(n)}">${esc(ini.toUpperCase())}</span>`}
// status dell'azienda del preventivo (se il preventivo ha più aziende, quello della prima)
function statoPv(x){const cf=cfNorm(String(x.cf||"").split(" + ")[0]);if(!cf)return "";const s=statoDi(cf);return chip(faseLabel(s),FC[s.fase])}
function renderList(){
  const f=(q("#pvFiltro").value||"").trim().toLowerCase();
  const items=P.lista.filter(x=>!f||(x.azienda+" "+x.cf+" "+x.id).toLowerCase().includes(f));
  q("#pvItems").innerHTML=items.length?items.map(x=>`<button type="button" class="pv-item${P.p&&P.p.id===x.id?" on":""}" data-pv="apri" data-id="${esc(x.id)}">
    <b>${esc(x.azienda||"(senza nome)")}</b><small>${eur(x.totale)}</small><span class="pv-meta">${avatar(x.autore)}${statoPv(x)}</span></button>`).join("")
    :`<div class="muted small">${P.lista.length?"Nessun preventivo trovato.":"Nessun preventivo salvato."}</div>`;
}

/* ---------- modulo ---------- */
// elenco dei corsi del catalogo: è fatto qui dentro e non con il menu del browser, che nel CRM non scorre
const senzaAccenti=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
// se il catalogo indica una durata minima e massima le ore le decide chi prepara il preventivo
const orePrese=k=>String(k.ore||"").includes("/")?"":k.ore;
const durata=c=>{const k=P.corsi.find(z=>z.codice===c.codice);return k&&String(k.ore).includes("/")?String(k.ore).split("/"):null};
function nomeCatalogo(c){const k=P.corsi.find(z=>z.codice===c.codice);
  return k?k.codice+" · "+k.titolo:P.corsi.length?"Scegli dal catalogo…":"Catalogo corsi vuoto"}
// pre-scelta dell'area: prima si sceglie il riquadro, poi il corso. Se si scrive nella ricerca, si cerca in tutto il catalogo
const IC_AREA={
 qual:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>',
 sost:'<path d="M5 19c0-8 5-13 15-14 0 10-5 15-13 14"/><path d="M5 21c1-5 4-8 8-10"/>',
 man:'<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
 dig:'<path d="M4 10v4h3l9 5V5l-9 5H4z"/><path d="M19 9.5a3.5 3.5 0 0 1 0 5"/>',
 exc:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
 ai:'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
 lin:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
 soft:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-4 3-6 6.500-6s6 2 6.500 6"/><path d="M16 4.800a3.500 3.500 0 0 1 0 6.400M18 14.500c2 .8 3.200 2.700 3.500 5.500"/>'};
const AREE=[["Qualità (ISO 9001, ISO 14001, ISO 45001), privacy e 231","qual"],["Sostenibilità ed ESG","sost"],["Management e organizzazione","man"],["Digital marketing e comunicazione","dig"],["Excel, dati e software","exc"],["A.I. e sicurezza informatica","ai"],["Lingue straniere","lin"],["Soft skills e gestione del tempo","soft"]];
function riquadriAree(sel){
  const n=a=>P.corsi.filter(c=>c.catalogo===a).length;
  return (sel?`<button type="button" class="pv-cato" data-pv="cat-scegli" data-cod=""><span class="muted">Togli il corso dal catalogo</span></button>`:"")+
   `<div class="pv-aree">${AREE.map(a=>`<button type="button" class="pv-cato pv-area" data-pv="cat-area" data-area="${esc(a[0])}"><svg viewBox="0 0 24 24" aria-hidden="true">${IC_AREA[a[1]]}</svg><span>${esc(a[0])}</span><small>${n(a[0])}</small></button>`).join("")}</div>`;
}
function corpoCat(filtro,sel){
  if(String(filtro||"").trim())return righeCorsi(filtro,sel);
  if(!P.catArea)return riquadriAree(sel);
  const l=P.corsi.filter(c=>c.catalogo===P.catArea);
  return `<div class="pv-catind"><button type="button" class="mini" data-pv="cat-area" data-area="">‹ Tutte le aree</button><span>${esc(P.catArea)}</span></div>`+l.map(rigaCorso(sel)).join("");
}
const rigaCorso=sel=>c=>`<button type="button" class="pv-cato${c.codice===sel?" on":""}" data-pv="cat-scegli" data-cod="${esc(c.codice)}"><b>${esc(c.codice)}</b><span>${esc(c.titolo)}</span>${c.ore?`<small>${esc(c.ore)} h</small>`:""}</button>`;
function righeCorsi(filtro,sel){
  const f=senzaAccenti(filtro).trim(), gruppi={};
  P.corsi.filter(c=>!f||senzaAccenti(c.codice+" "+c.titolo).includes(f)).forEach(c=>{(gruppi[c.catalogo||"Corsi"]=gruppi[c.catalogo||"Corsi"]||[]).push(c)});
  const nomi=Object.keys(gruppi);
  return (!f&&sel?`<button type="button" class="pv-cato" data-pv="cat-scegli" data-cod=""><span class="muted">Togli il corso dal catalogo</span></button>`:"")+
    (nomi.length?nomi.map(g=>`<div class="pv-catg">${esc(g)}</div>`+gruppi[g].map(rigaCorso(sel)).join("")).join("")
      :`<div class="pv-catno">Nessun corso trovato.</div>`);
}
const boxCorsi=c=>`<div class="pv-catbox"><input type="search" class="field" data-cat-cerca placeholder="Cerca in tutto il catalogo…" autocomplete="off" aria-label="Cerca nel catalogo"><div class="pv-catlist">${corpoCat("",c.codice)}</div></div>`;
function chiudiCat(){
  const b=P.catAperto!=null?q(`[data-pv="cat-apri"][data-i="${P.catAperto}"]`):P.azAperto!=null?q(`[data-pv="az-apri"][data-i="${P.azAperto}"]`):null;
  P.catAperto=P.azAperto=null;q(".pv-catbox")?.remove();if(b)b.setAttribute("aria-expanded","false");return b}
function inp(k,o){o=o||{};const v=getP(P.p,k);
  return `<input class="field" data-k="${k}" value="${esc(v==null?"":v)}"${o.type?` type="${o.type}"`:""}${o.num?' inputmode="decimal"':""}${o.ro?" readonly":""}${o.ph?` placeholder="${esc(o.ph)}"`:""} autocomplete="off">`}
const fld=(lab,html,cls)=>`<label${cls?` class="${cls}"`:""}>${lab}${html}</label>`;
/* ---------- saldi Fondimpresa nella colonna di sinistra ---------- */
function leggiB64(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]||"");r.onerror=()=>rej(new Error("Non riesco a leggere il file."));r.readAsDataURL(f)})}
function renderSaldi(){
  const s=P.saldi||{righe:[]}, n=(s.righe||[]).filter(r=>!r.acquisita).length;
  q("#pvSaldi").innerHTML=`<b class="pv-saldih">Saldi Fondimpresa</b>
     ${n?`<span class="small">${n} aziende${s.data?" · aggiornati al "+esc(s.data.split("-").reverse().join("/")):""}</span>${s.file?`<span class="small muted">${esc(s.file)}</span>`:""}`
       :`<span class="small muted">${P.admin?"Il file dei saldi Fondimpresa non è ancora stato caricato.":"Il file dei saldi Fondimpresa non è ancora stato caricato: chiedi a un amministratore."}</span>`}
     ${P.admin?`<label class="btn sm">${n?"Carica saldi nuovi (.xlsx)":"Carica il file dei saldi (.xlsx)"}<input type="file" id="pvFileSaldi" accept=".xlsx" hidden></label>`:""}
     ${s.errore?`<p class="pv-av err">${esc(s.errore)}</p>`:""}
     ${P.acq&&!P.acq.az?formAcquisita():`<button type="button" class="btn sm" data-pv="acq-apri">+ Nuova azienda</button>`}
     ${P.admin&&P.avviso?`<p class="pv-av err">${esc(P.avviso)}</p>`:""}`;
}
function renderForm(){
  const p=P.p;
  const az=p.aziende.map((a,i)=>`<div class="pv-blk">
    ${p.aziende.length>1?`<div class="pv-blkh"><b>Azienda ${i+1}</b><button type="button" class="mini danger" data-pv="del-az" data-i="${i}">Togli</button></div>`:""}
    <div class="pv-grid pv-az1">
      <div class="pv-f pv-cat">Azienda<button type="button" class="field pv-catb" data-pv="az-apri" data-i="${i}" aria-expanded="${P.azAperto===i}">${esc(a.nome||"Scegli azienda…")}</button>${P.azAperto===i?boxAziende(a):""}</div>
      ${fld("Codice fiscale",inp(`aziende.${i}.cf`,{ro:1}))}
    </div>
    <div class="pv-grid pv-az2">
      ${fld("Disponibile €",inp(`aziende.${i}.disponibile`,{num:1,ph:"0,00"}))}
      ${fld("Maturando €",inp(`aziende.${i}.maturando`,{num:1,ph:"0,00"}))}
      <div class="pv-f">Totale<span class="pv-out" data-out="az${i}"></span></div>
      ${i===0?fld("Scadenza 31/12 €",inp("scadenza",{num:1,ph:"0,00"})):"<span></span>"}
    </div>${notaSaldo(a)?`<p class="pv-note">${esc(notaSaldo(a))}</p>`:""}</div>`).join("");
  const co=p.corsi.map((c,i)=>`<div class="pv-blk">
    <div class="pv-blkh"><b>Corso ${i+1}</b>${c.codice?`<span class="pill">${esc(c.codice)}</span>`:""}${p.corsi.length>1?`<button type="button" class="mini danger" data-pv="del-corso" data-i="${i}">Togli</button>`:""}</div>
    <div class="pv-grid">
      <div class="pv-f pv-cat">Dal catalogo<button type="button" class="field pv-catb" data-pv="cat-apri" data-i="${i}" aria-expanded="${P.catAperto===i}">${esc(nomeCatalogo(c))}</button>${P.catAperto===i?boxCorsi(c):""}</div>
      ${fld("Titolo del corso",inp(`corsi.${i}.titolo`,{ph:"Scegli dal catalogo o scrivi"}),"pv-span2")}
      ${fld("Docente / fornitore",inp(`corsi.${i}.docente`))}
      ${fld("Date / periodo",inp(`corsi.${i}.periodo`,{ph:"es. ottobre 2027"}))}
      ${fld(durata(c)?`Ore (da ${durata(c)[0]} a ${durata(c)[1]})`:"Ore",inp(`corsi.${i}.ore`,{num:1}))}
      ${fld("Min. partecipanti",inp(`corsi.${i}.partecipanti`,{num:1}))}
      ${fld("Note sul corso",`<textarea class="field" data-k="corsi.${i}.note" rows="2" placeholder="Annotazioni su questo corso (restano qui, non vanno nell'Excel)">${esc(c.note||"")}</textarea>`,"pv-spanall")}
    </div>
    <div class="pv-imp">
      <div class="seg" role="group" aria-label="Importo del corso"><button type="button" data-pv="residuo" data-i="${i}" data-v="1" aria-pressed="${!!c.residuo}">Prende il residuo</button><button type="button" data-pv="residuo" data-i="${i}" data-v="0" aria-pressed="${!c.residuo}">Importo fisso</button></div>
      ${c.residuo?`<span class="pv-quota">Quota: <b data-out="q${i}"></b></span><span class="pv-quota">Al docente: <b data-out="h${i}"></b> all'ora</span>`
        :fld("Importo €",inp(`corsi.${i}.importo`,{num:1,ph:"0,00"}))+fld("€/ora al docente",`<input class="field" data-eh="${i}" inputmode="decimal" placeholder="${pvNum(c.ore)?"0,00":"prima le ore"}" autocomplete="off">`)}
    </div></div>`).join("");
  q("#pvForm").innerHTML=`
   <div class="pv-head"><h2>${p.id?esc(p.aziende.map(a=>a.nome).filter(Boolean).join(" + ")||p.id):"Nuovo preventivo"}${p.id?` <span class="pill">${esc(p.id)}</span>`:""}</h2>
     ${p.id?`<button type="button" class="btn sm" data-pv="duplica">Duplica</button><button type="button" class="btn sm danger" data-pv="elimina">${P.conferma==="elimina:"+p.id?"Sicuro? Elimina":"Elimina"}</button>`:""}</div>
   <section class="panel"><h2><span class="qn">1</span>Azienda e saldi Fondimpresa</h2>
     ${az}
     <div class="pv-grid" style="margin-top:12px">
       ${fld("Totale del piano € (vuoto = tutto il budget)",inp("totaleManuale",{num:1,ph:"tutto il budget"}),"pv-span2")}
       ${fld("Saldi aggiornati al",inp("dataSaldi",{type:"date"}))}
       ${fld("Data del preventivo",inp("dataPreventivo",{type:"date"}))}
     </div></section>
   <section class="panel"><h2><span class="qn">2</span>Corsi e docenza</h2>
     <div class="pv-grid" style="margin-bottom:10px">${fld("Periodo del piano",inp("periodo",{ph:"es. novembre 2026 – ottobre 2027"}),"pv-span2")}</div>
     ${co}
     <button type="button" class="btn sm pv-add" data-pv="add-corso">+ Aggiungi corso</button>
     <div class="pv-grid" style="margin-top:12px;grid-template-columns:minmax(0,220px)">
       ${fld("Recupero spese azienda €",inp("recupero",{num:1}))}
     </div>
     <p class="pv-note">I corsi che «prendono il residuo» si dividono quello che resta del budget in proporzione alle ore.</p></section>
   <section class="panel"><h2><span class="qn">3</span>Progettazione, gestione e revisione</h2>
     <div class="pv-grid">
       ${fld("Quota Ask in % del budget",inp("ask.perc",{num:1}))}
       ${fld("La % vale da (budget €)",inp("ask.soglia",{num:1}))}
       ${fld("Revisore dei conti €",inp("revisore",{num:1}))}
       ${fld("Parametro orario €/ora",inp("parametro",{num:1}))}
     </div>
     <p class="pv-note" data-out="askrule"></p>
     <p class="pv-note">La stessa quota vale per «attività preparatorie» e per «gestione e rendicontazione».</p></section>
   ${sezioneChiamata()}`;
  renderSaldi();renderSum();
}

/* ---------- chiamate, come nella scheda azienda del CRM ma separate dal CRM ---------- */
const FASI=[["Da contattare","var(--f0)"],["Contattata","var(--f1)"],["Interesse futuro","var(--f7)"],["Interessata","var(--f2)"],["Appuntamento fissato","var(--f3)"],["Piano presentato","var(--f8)"],["Acquisita","var(--f5)"],["Archiviata","var(--f6)"]];
const FC=Object.fromEntries(FASI), FASI_SCELTA=FASI.map(f=>f[0]).filter(f=>f!=="Da contattare"), PIPE=FASI.map(f=>f[0]).filter(f=>f!=="Archiviata");
const MOTIVI=["Non interessata","Ha già un ente","Non contattabile"];
const ESITI=["Risposto – interessato","Risposto – interessato in futuro","Risposto – non interessato","Risposto – ha già un ente","Non risponde","Richiamare","Appuntamento fissato","Email inviata","Numero errato / inesistente","Acquisita – contratto firmato"];
const ESITO_FASE={"Risposto – interessato":["Interessata"],"Risposto – interessato in futuro":["Interesse futuro"],"Risposto – non interessato":["Archiviata","Non interessata"],"Risposto – ha già un ente":["Archiviata","Ha già un ente"],
 "Non risponde":["Contattata"],"Richiamare":["Contattata"],"Appuntamento fissato":["Appuntamento fissato"],"Email inviata":["Contattata"],"Numero errato / inesistente":["Archiviata","Non contattabile"],"Acquisita – contratto firmato":["Acquisita"]};
const SUGG={"Non risponde":["Follow up",1],"Richiamare":["Follow up",2],"Risposto – interessato":["Inviare email",2],"Risposto – interessato in futuro":["Follow up",60],"Appuntamento fissato":["Appuntamento",7],"Email inviata":["Follow up",5],"Numero errato / inesistente":["Cercare contatti",1]};
const CANALI=["Telefono","Email","Visita","LinkedIn","Altro"];
const AZIONI=["Chiamare","Follow up","Inviare email","Inviare preventivo","Contattare su LinkedIn","Appuntamento","Cercare contatti","Verificare dati"];
const ESITO_STATO="Cambio stato", isCall=a=>a&&a.esito!==ESITO_STATO;
const addDays=(iso,n)=>{const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.toLocaleDateString("sv-SE")};
const opt=(l,v,vuoto)=>(vuoto!=null?`<option value="">${esc(vuoto)}</option>`:"")+l.map(o=>`<option value="${esc(o)}"${o===v?" selected":""}>${esc(o)}</option>`).join("");
const faseLabel=x=>x.fase==="Archiviata"&&x.motivo?`Archiviata · ${x.motivo}`:x.fase;
// dalla più recente alla più vecchia
const contattiDi=cf=>P.contatti.filter(a=>a.cf===cf).sort((a,b)=>String(b.data).localeCompare(String(a.data))||String(b.creato||"").localeCompare(String(a.creato||"")));
function statoDi(cf){const a=contattiDi(cf)[0];
  return a?{fase:FC[a.fase]?a.fase:"Contattata",motivo:a.motivo||"",prossimaAzione:a.prossimaAzione||"",dataProssima:a.dataProssima||"",user:a.user||""}:{fase:"Da contattare",motivo:"",prossimaAzione:"",dataProssima:"",user:""}}
// tutte le aziende dei saldi più quelle che hanno chiamate ma non sono più nel foglio
function aziendeTutte(){const m=new Map();
  P.saldi.righe.filter(r=>r.nome&&r.cf).forEach(r=>m.set(r.cf,{cf:r.cf,nome:r.nome,budget:(r.disponibile||0)+(r.maturando||0)}));
  P.contatti.forEach(a=>{if(!m.has(a.cf))m.set(a.cf,{cf:a.cf,nome:a.nome||a.cf,budget:null})});
  return [...m.values()].map(x=>Object.assign(x,statoDi(x.cf)))}
const conPreventivo=cf=>P.lista.some(x=>String(x.cf||"").split(" + ").includes(cf));
function regVuota(cf){const s=statoDi(cf);return {cf,esito:"",fase:s.fase==="Da contattare"?"Contattata":s.fase,motivo:s.motivo,note:"",az:"",due:"",data:oggi(),canale:"Telefono",autoSet:false,faseManual:false,hint:"",err:false}}
function regCorrente(){const az=P.p.aziende.filter(a=>cfNorm(a.cf));if(!az.length)return null;
  const cf=P.reg&&az.some(a=>cfNorm(a.cf)===P.reg.cf)?P.reg.cf:cfNorm(az[0].cf);if(!P.reg||P.reg.cf!==cf)P.reg=regVuota(cf);return {az,r:P.reg}}
function sezioneChiamata(){
  const c=regCorrente();
  if(!c)return `<section class="panel pv-reg" id="pvReg"><h2><span class="qn">4</span>Registra la chiamata</h2><div class="muted small">Scegli prima l'azienda nella sezione 1.</div></section>`;
  const r=c.r, tutti=contattiDi(r.cf), ul=tutti.find(isCall), s=statoDi(r.cf);
  return `<section class="panel pv-reg" id="pvReg">
    <div class="sech"><h2><span class="qn">4</span>${r.edit?"Modifica la chiamata":"Registra la chiamata"}</h2><span class="muted small">${r.edit?"Stai modificando una chiamata già registrata":ul?`Ultimo: ${fmtD(ul.data)} · ${esc(ul.esito)}`:"Mai contattata"}</span></div>
    <div class="stack">
      ${c.az.length>1?`<label class="lbl pv-regaz">Azienda<select class="field" data-reg="cf">${c.az.map(a=>`<option value="${esc(cfNorm(a.cf))}"${cfNorm(a.cf)===r.cf?" selected":""}>${esc(a.nome||a.cf)}</option>`).join("")}</select></label>`:""}
      <fieldset class="opts"><legend class="lbl">Com'è andata?</legend><div class="optgrid">${ESITI.map(e=>`<label class="opt"><input type="radio" name="pvEsito" data-reg="esito" value="${esc(e)}"${e===r.esito?" checked":""}><span>${esc(e)}</span></label>`).join("")}</div></fieldset>
      <div class="statobox"><div class="row2"><label class="lbl">Status dell'azienda dopo la chiamata<select class="field" data-reg="fase">${opt(FASI_SCELTA,r.fase)}</select></label>
        <label class="lbl" ${r.fase==="Archiviata"?"":"hidden"}>Motivo dell'archiviazione<select class="field" data-reg="motivo">${opt(MOTIVI,r.motivo,"Scegli…")}</select></label></div>
        <div class="muted small">${r.faseManual?"Status scelto da te.":r.esito?`Proposto in base all'esito (ora è “${esc(faseLabel(s))}”). Cambialo solo se serve.`:"Si imposta da solo con l'esito: cambialo solo se serve."}</div></div>
      <label class="lbl">Note<textarea class="field" data-reg="note" rows="3" placeholder="Con chi hai parlato, cosa è emerso, cosa ti hanno chiesto…">${esc(r.note)}</textarea></label>
      <div class="next"><div class="lbl">Prossimo passo</div>
        <div class="row2"><select class="field" data-reg="az" aria-label="Prossima azione">${opt(AZIONI,r.az,"Nessuno")}</select><input class="field" type="date" data-reg="due" aria-label="Entro il" value="${esc(r.due)}"></div>
        <div class="quick">${[[1,"Domani"],[3,"Tra 3 giorni"],[7,"Tra una settimana"],[14,"Tra 2 settimane"]].map(x=>`<button type="button" class="mini" data-pv="reg-due" data-n="${x[0]}">${x[1]}</button>`).join("")}</div></div>
      <details class="more"${r.apriMeta?" open":""}><summary>Data e canale <span class="muted">· ${r.data===oggi()?"oggi":fmtD(r.data)}, ${esc(r.canale.toLowerCase())}</span></summary>
        <div class="row2" style="margin-top:8px"><label class="lbl">Data<input class="field" type="date" data-reg="data" value="${esc(r.data)}"></label>
        <label class="lbl">Canale<select class="field" data-reg="canale">${opt(CANALI,r.canale)}</select></label></div></details>
      <div class="actions"><span class="hint${r.err?" err":""}" role="status">${esc(r.hint)}</span>${r.edit?`<button type="button" class="btn big" data-pv="reg-annulla">Annulla</button><button type="button" class="btn primary big" data-pv="reg-salva">Salva modifiche</button>`:`<button type="button" class="btn primary big" data-pv="reg-salva">Registra chiamata</button>`}</div>
    </div>${storico(tutti)}</section>`;
}
function storico(l){if(!l.length)return "";const puo=a=>P.admin||String(a.user||"").toLowerCase()===String(P.user||"").toLowerCase();
  return `<div class="pv-sto"><b>Storico contatti (${l.length})</b>${l.map(a=>`<div class="pv-stoi"><div class="pv-stoh"><b>${esc(a.esito===ESITO_STATO?"Status cambiato a mano":a.esito)}</b>${chip(faseLabel(a),FC[a.fase])}</div>
    ${puo(a)?`<span class="pv-stob">${a.esito!==ESITO_STATO?`<button type="button" class="mini" data-pv="reg-mod" data-id="${esc(a.id)}">${P.reg&&P.reg.edit===a.id?"In modifica":"Modifica"}</button>`:""}<button type="button" class="mini danger" data-pv="reg-del" data-id="${esc(a.id)}">${P.conferma==="regdel:"+a.id?"Sicuro?":"Elimina"}</button></span>`:"<span></span>"}
    <small>${fmtD(a.data)} · ${esc(a.canale||"")}${a.autore?" · "+esc(a.autore):""}${a.prossimaAzione||a.dataProssima?` · poi: ${esc(a.prossimaAzione)}${a.dataProssima?" "+fmtD(a.dataProssima):""}`:""}</small>${a.note?`<p>${esc(a.note)}</p>`:""}</div>`).join("")}</div>`}
// mantiene il punto della pagina quando la sezione si ridisegna
function ridisegnaReg(){const el=q("#pvReg");if(el)el.outerHTML=sezioneChiamata()}
function regCambia(t){const r=P.reg,k=t.dataset.reg;if(!r)return;
  if(k==="cf"){P.reg=regVuota(t.value);ridisegnaReg();return}
  if(k==="esito"){const e=t.value,nf=ESITO_FASE[e]||["Contattata"],sg=SUGG[e];r.esito=e;
    if(!r.faseManual){r.fase=nf[0];r.motivo=nf[1]||""}
    if(sg&&(!r.az||r.autoSet)){r.az=sg[0];r.due=addDays(oggi(),sg[1]);r.autoSet=true}
    else if(!sg&&r.autoSet){r.az="";r.due="";r.autoSet=false}
    r.err=false;r.hint=e==="Numero errato / inesistente"?"Ricordati di correggere il numero nel CRM":"";ridisegnaReg();q('input[name=pvEsito]:checked')?.focus({preventScroll:true});return}
  r[k]=t.value;
  if(k==="fase"){r.faseManual=true;ridisegnaReg()}
  else if(k==="az"){r.autoSet=false;if(r.az&&!r.due)r.due=addDays(oggi(),2);ridisegnaReg()}
  else if(k==="due")r.autoSet=false;
  else if(k==="data"||k==="canale"){r.apriMeta=true;ridisegnaReg()}
}
function nomeDi(cf){const a=P.p&&P.p.aziende.find(z=>cfNorm(z.cf)===cf),s=saldoDi(cf);return a&&a.nome||s&&s.nome||(contattiDi(cf)[0]||{}).nome||cf}
function regSalva(){const r=P.reg;if(!r)return;
  const stop=t=>{r.hint=t;r.err=true;ridisegnaReg()};
  if(!r.esito)return stop("Scegli com'è andata la chiamata.");
  if(r.fase==="Archiviata"&&!r.motivo)return stop("Scegli il motivo dell'archiviazione.");
  return lavora(r.edit?"Salvo le modifiche…":"Registro la chiamata…",async()=>{
    P.contatti=await api(r.edit?"pvModificaContatto":"pvRegistra",{id:r.edit||"",cf:r.cf,nome:nomeDi(r.cf),data:r.data,canale:r.canale,esito:r.esito,fase:r.fase,motivo:r.motivo,note:r.note.trim(),prossimaAzione:r.az||(r.due?"Follow up":""),dataProssima:r.due});
    const due=r.due,mod=!!r.edit;P.reg=regVuota(r.cf);P.stato="";ridisegnaReg();toast((mod?"Chiamata modificata":"Chiamata registrata")+(due?" · prossimo passo "+fmtD(due):""))});
}

/* ---------- aziende: elenco con tutte le informazioni ---------- */
const extraDi=(s,re)=>{const e=s&&s.extra;if(!e)return "";const k=Object.keys(e).find(x=>re.test(x));return k?String(e[k]):""};
const dipDi=s=>{const v=extraDi(s,/dipend/i).trim(),n=pvNum(v);return {dipT:v,dip:v===""?"":n}};
function quoteDi(tot){if(!tot)return {ask:0,rev:0,doc:0};const D=P.D||{ask:{}},A=D.ask||{};
  const c=pvCalcola({aziende:[{disponibile:cifra(tot),maturando:""}],corsi:[],ask:{valore:A.valore||"675",perc:A.perc||"16",soglia:A.soglia||"4230"},revisore:D.revisore||"150",recupero:D.recupero||"0",parametro:D.parametro||"165"});
  // Ask: 32% (16% preparazione + 16% gestione) da soglia in su; sotto: oltre 3.000 € = 1.350, da 2.000 a 3.000 € = 1.000, sotto 2.000 € = 0
  const ask=tot>=c.soglia?Math.round((c.askPrep+c.askGest)*100)/100:tot>3000?1350:tot>=2000?1000:0;
  return {ask,rev:c.revisore,doc:Math.round((tot-ask-c.revisore)*100)/100}}
function righeAziendeTab(){
  return aziendeTutte().map(x=>{const s=saldoDi(x.cf)||{},ul=contattiDi(x.cf).find(isCall),pv=P.lista.filter(p=>String(p.cf||"").split(" + ").includes(x.cf));
    return Object.assign(x,{s,disp:s.disponibile||0,mat:s.maturando||0,tot:(s.disponibile||0)+(s.maturando||0),scad:s.scadenza||0,dataS:s.data||"",
      tel:extraDi(s,/telef|cell/i),sede:extraDi(s,/sede|indirizzo|comune|citt/i),prov:((extraDi(s,/sede|indirizzo|comune|citt/i).match(/\(([A-Za-z]{2})\)\s*$/)||[])[1]||"").toUpperCase(),ul,ultimo:ul?ul.data:"",pv,npv:pv.length,acq:!!s.acquisita},dipDi(s),quoteDi((s.disponibile||0)+(s.maturando||0)))});
}
const AZ_COL=[["nome","Azienda"],["dip","Dipendenti",1],["fase","Status"],["disp","Disponibile",1],["mat","Maturando",1],["tot","Totale",1],["scad","Scad. 31/12",1],["dataS","Saldi al"],["tel","Telefono"],["ultimo","Ultimo contatto"],["dataProssima","Prossimo passo"],["npv","Preventivi",1]];
const BU_COL=[["nome","Azienda"],["dip","Dipendenti",1],["fase","Status"],["disp","Disponibile",1],["mat","Maturando",1],["tot","Totale",1],["scad","Scad. 31/12",1],["ask","Ask",1],["rev","Rev",1],["doc","Docenza",1],["dataS","Saldi al"]];
const colonne=()=>P.vista==="budget"?BU_COL:AZ_COL;
// colonne da sommare nella riga dei totali
const SOMMA=["dip","disp","mat","tot","scad","ask","rev","doc","npv"];
function cella(k,x){switch(k){
  case "nome":return `<td class="az-nome"><b>${esc(x.nome)}</b><small>${esc(x.cf)}${x.acq?" · aggiunta a mano":""}${x.sede?" · "+esc(x.sede):""}</small></td>`;
  case "dip":return `<td class="n">${esc(x.dipT)||"–"}</td>`;
  case "fase":return `<td>${chip(faseLabel(x),FC[x.fase])}</td>`;
  case "disp":case "mat":case "ask":case "rev":return `<td class="n">${eur(x[k])}</td>`;
  case "doc":return `<td class="n${x.doc<0?" neg":""}">${eur(x.doc)}</td>`;
  case "tot":return `<td class="n"><b>${eur(x.tot)}</b></td>`;
  case "scad":return `<td class="n">${x.scad?eur(x.scad):"–"}</td>`;
  case "dataS":return `<td>${x.dataS?dIt(x.dataS):"–"}</td>`;
  case "tel":return `<td>${esc(x.tel)||"–"}</td>`;
  case "ultimo":return `<td>${x.ul?`${fmtD(x.ul.data)}<br><small>${esc(x.ul.esito)}</small>`:"<small>mai</small>"}</td>`;
  case "dataProssima":return `<td>${x.dataProssima||x.prossimaAzione?`<span class="due ${dueClass(x.dataProssima)}">${fmtD(x.dataProssima)}</span> <small>${esc(x.prossimaAzione)}</small>`:"–"}</td>`;
  case "npv":return `<td class="n">${x.npv||"–"}</td>`;
  default:return "<td></td>"}}
function cellaTot(k,l){
  if(k==="nome")return `<td>Totale (${l.length===1?"1 azienda":l.length+" aziende"})</td>`;
  if(!SOMMA.includes(k))return "<td></td>";
  const v=l.reduce((t,x)=>t+(Number(x[k])||0),0);
  if(k==="dip"||k==="npv")return `<td class="n">${v?v.toLocaleString("it-IT"):"–"}</td>`;
  return `<td class="n${v<0?" neg":""}">${eur(Math.round(v*100)/100)}</td>`}
function tabAziende(){
  const f=senzaAccenti(P.azQ||"").trim(),fs=P.azFase||"",o=P.azOrd||{k:"nome",d:1},ordF=FASI.map(z=>z[0]);
  const t=oggi(),sett=addDays(t,7),min=pvNum(P.azMin||"");
  let l=righeAziendeTab().filter(x=>(!f||senzaAccenti(x.nome+" "+x.cf+" "+x.sede+" "+x.tel).includes(f))&&(!fs||x.fase===fs)
    &&(!P.azProv||x.prov===P.azProv)
    &&(!P.azPv||(P.azPv==="si"?x.npv>0:x.npv===0))
    &&(!P.azCon||(P.azCon==="mai"?!x.ul:!!x.ul))
    &&(!P.azPasso||(P.azPasso==="scaduto"?x.dataProssima&&x.dataProssima<t:P.azPasso==="oggi"?x.dataProssima===t:P.azPasso==="settimana"?x.dataProssima&&x.dataProssima>=t&&x.dataProssima<=sett:!x.dataProssima))
    &&(!P.azScad||x.scad>0)&&(!P.azAcq||x.acq)&&(!min||x.tot>=min));
  l.sort((a,b)=>{let va=a[o.k],vb=b[o.k];if(o.k==="fase"){va=ordF.indexOf(va);vb=ordF.indexOf(vb)}
    if(typeof va==="number"||typeof vb==="number")return ((va||0)-(vb||0))*o.d;
    va=String(va||"");vb=String(vb||"");if(!va&&vb)return 1;if(va&&!vb)return -1;return va.localeCompare(vb,"it")*o.d});
  const somma=l.reduce((t,x)=>t+x.tot,0);
  const COL=colonne();
  const th=c=>`<th class="${c[2]?"n":""}"><button type="button" data-pv="az-ord" data-k="${c[0]}">${c[1]}${o.k===c[0]?(o.d>0?" ▲":" ▼"):""}</button></th>`;
  const riga=(x,i)=>`<tr class="az-r${P.azAperta===x.cf?" on":""}" data-pv="az-riga" data-cf="${esc(x.cf)}" tabindex="0"><td class="az-num">${i+1}</td>${COL.map(c=>cella(c[0],x)).join("")}</tr>${P.azAperta===x.cf?dettaglioAzienda(x):""}`;
  return `<p class="az-sum">${l.length===1?"1 azienda":l.length+" aziende"} · budget totale ${eur(somma)}</p>
    <div class="az-wrap"><table class="az-tab"><thead><tr><th class="az-num">#</th>${COL.map(th).join("")}</tr></thead><tbody>${l.map(riga).join("")||`<tr><td colspan="${COL.length+1}" class="muted">Nessuna azienda trovata.</td></tr>`}</tbody>${l.length?`<tfoot><tr><td></td>${COL.map(c=>cellaTot(c[0],l)).join("")}</tr></tfoot>`:""}</table></div>`;
}
function dettaglioAzienda(x){
  const e=x.s.extra||{},cs=contattiDi(x.cf);
  const voce=(t,v)=>v===""||v==null?"":`<div><span>${esc(t)}</span>${esc(v)}</div>`;
  return `<tr class="az-det"><td colspan="${colonne().length+1}">
    <div class="az-grid">${voce("Ragione sociale",x.nome)}${voce("Codice fiscale",x.cf)}${voce("Status",faseLabel(x))}
      ${voce("Disponibile",eur(x.disp))}${voce("Maturando",eur(x.mat))}${voce("Totale",eur(x.tot))}${voce("In scadenza 31/12",x.scad?eur(x.scad):"")}
      ${voce("Saldi aggiornati al",dIt(x.dataS))}${x.acq?voce("Origine","Aggiunta a mano"+(x.s.data?" il "+dIt(x.s.data):"")):""}
      ${Object.keys(e).map(k=>voce(k,typeof e[k]==="number"&&/tot|piano|€|eur/i.test(k)?eur(e[k]):e[k])).join("")}</div>
    <div class="az-sub">Preventivi (${x.pv.length})</div>
    ${x.pv.length?`<ul class="az-lst">${x.pv.map(p=>`<li><button type="button" class="mini" data-pv="az-apripv" data-id="${esc(p.id)}">Apri</button> ${esc(p.id)} · ${fmtD(p.data)} · ${eur(p.totale)}${p.autore?" · "+esc(p.autore):""}</li>`).join("")}</ul>`:'<div class="muted small">Nessun preventivo.</div>'}
    <div class="az-sub">Ultimi contatti (${cs.length})</div>
    ${cs.length?`<ul class="az-lst">${cs.slice(0,5).map(a=>`<li>${fmtD(a.data)} · ${esc(a.esito===ESITO_STATO?"Status cambiato a mano":a.esito)} · ${esc(faseLabel(a))}${a.autore?" · "+esc(a.autore):""}${a.note?`<br><small>${esc(a.note)}</small>`:""}</li>`).join("")}</ul>`:'<div class="muted small">Mai contattata.</div>'}
    <div class="az-act"><button type="button" class="btn sm primary" data-pv="az-nuovopv" data-cf="${esc(x.cf)}">+ Nuovo preventivo</button><button type="button" class="btn sm" data-pv="vai-az" data-cf="${esc(x.cf)}">Registra una chiamata</button></div>
  </td></tr>`;
}
const AZ_ORD=[["nome:1","Nome (A→Z)"],["nome:-1","Nome (Z→A)"],["tot:-1","Budget totale (più alto)"],["tot:1","Budget totale (più basso)"],["disp:-1","Disponibile (più alto)"],["mat:-1","Maturando (più alto)"],["scad:-1","In scadenza 31/12 (più alto)"],["fase:1","Status"],["ultimo:-1","Ultimo contatto (più recente)"],["ultimo:1","Ultimo contatto (più vecchio)"],["dataProssima:1","Prossimo passo (più vicino)"],["npv:-1","N. preventivi"],["prov:1","Provincia"]];
const filtriAttivi=()=>["azQ","azFase","azProv","azPv","azCon","azPasso","azScad","azAcq","azMin"].filter(k=>P[k]).length;
function renderAziende(){const el=q("#pvAltro"),o=P.azOrd||{k:"nome",d:1},ov=o.k+":"+o.d;
  const prov=[...new Set(righeAziendeTab().map(x=>x.prov).filter(Boolean))].sort();
  const sel=(id,lab,vals,cur)=>`<select class="field az-f" id="${id}" aria-label="${esc(lab)}">${vals.map(v=>`<option value="${esc(v[0])}"${(cur||"")===v[0]?" selected":""}>${esc(v[1])}</option>`).join("")}</select>`;
  const n=filtriAttivi();
  el.innerHTML=`<div class="filters"><input type="search" class="field" id="pvAzQ" placeholder="Cerca per nome, codice fiscale, sede o telefono…" aria-label="Cerca azienda" value="${esc(P.azQ||"")}" style="flex:1;min-width:220px">
    <button type="button" class="btn primary" data-pv="acq-apri">+ Aggiungi azienda</button></div>
    <div id="pvAzForm">${P.acq&&P.acq.az?`<div class="az-form">${formAcquisita()}</div>`:""}</div>
    <div class="filters az-filtri">
      ${sel("pvAzFase","Status",[["","Tutti gli status"]].concat(FASI.map(f=>[f[0],f[0]])),P.azFase)}
      ${sel("pvAzProv","Provincia",[["","Tutte le province"]].concat(prov.map(p=>[p,p])),P.azProv)}
      ${sel("pvAzPv","Preventivi",[["","Con e senza preventivo"],["si","Con preventivo"],["no","Senza preventivo"]],P.azPv)}
      ${sel("pvAzCon","Contatti",[["","Contattate e non"],["mai","Mai contattate"],["si","Già contattate"]],P.azCon)}
      ${sel("pvAzPasso","Prossimo passo",[["","Qualsiasi prossimo passo"],["scaduto","Prossimo passo scaduto"],["oggi","Da fare oggi"],["settimana","Nei prossimi 7 giorni"],["nessuno","Senza prossimo passo"]],P.azPasso)}
      <input class="field az-f" id="pvAzMin" inputmode="decimal" placeholder="Budget minimo €" aria-label="Budget totale minimo" value="${esc(P.azMin||"")}" style="width:150px">
      <label class="az-chk"><input type="checkbox" id="pvAzScad"${P.azScad?" checked":""}> Con importo in scadenza</label>
      <label class="az-chk"><input type="checkbox" id="pvAzAcq"${P.azAcq?" checked":""}> Solo aggiunte a mano</label>
      ${n?`<button type="button" class="btn sm" data-pv="az-azzera">Azzera filtri (${n})</button>`:""}
    </div>
    <div class="filters az-filtri"><label class="az-chk">Ordina per ${sel("pvAzOrd","Ordina per",AZ_ORD.some(x=>x[0]===ov)?AZ_ORD:AZ_ORD.concat([[ov,"Colonna scelta"]]),ov)}</label>
      <span class="muted" style="font-size:13px">Puoi anche cliccare i titoli delle colonne. Clicca un'azienda per vedere tutto.</span></div>
    <div id="pvAzBox">${tabAziende()}</div>`}
function ridisegnaAziende(){const b=q("#pvAzBox");if(b)b.innerHTML=tabAziende()}

/* ---------- pipeline ---------- */
const dueClass=d=>{if(!d)return "";const t=oggi();return d<t?"late":d===t?"today":""};
function cardHTML(x){return `<div class="card" draggable="true" tabindex="0" role="button" data-pv="vai-az" data-cf="${esc(x.cf)}" style="--c:${conPreventivo(x.cf)?"var(--accent)":"var(--line)"}"><div class="name">${esc(x.nome)}</div>
  <div class="meta"><span>${x.budget==null?"":eur(x.budget)}</span><span>${x.dataProssima?`<span class="due ${dueClass(x.dataProssima)}">${fmtD(x.dataProssima)}</span>`:""}</span></div></div>`}
function boardHTML(){const f=senzaAccenti(P.pipeQ||"").trim();P.lim=P.lim||{};
  const base=aziendeTutte().filter(x=>!f||senzaAccenti(x.nome+" "+x.cf).includes(f));
  const cols=PIPE.map(st=>{const arr=base.filter(x=>x.fase===st).sort((a,b)=>(a.dataProssima||"9").localeCompare(b.dataProssima||"9")||(b.budget||0)-(a.budget||0)),lim=P.lim[st]||40;
    return `<div class="col" data-fase="${esc(st)}"><div class="colhead"><b>${chip(st,FC[st])}</b><span class="mono muted">${arr.length}</span></div>
      <div class="colbody">${arr.slice(0,lim).map(cardHTML).join("")}${arr.length>lim?`<button type="button" class="mini more" data-pv="pipe-altre" data-fase="${esc(st)}">altre ${arr.length-lim}</button>`:""}</div></div>`}).join("");
  const n=m=>base.filter(x=>x.fase==="Archiviata"&&(m?x.motivo===m:!MOTIVI.includes(x.motivo))).length, nm=n("");
  return `<div class="board" id="pvBoard">${cols}</div><div class="resultbar"><span>Archiviate: ${MOTIVI.map(m=>`${chip(m,FC.Archiviata)} <span class="mono">${n(m)}</span>`).join(" &nbsp; ")}${nm?` &nbsp; ${chip("Senza motivo",FC.Archiviata)} <span class="mono">${nm}</span>`:""}</span></div>`}
function renderPipe(){const el=q("#pvAltro");
  el.innerHTML=`<div class="filters"><input type="search" class="field" id="pvPipeQ" placeholder="Cerca azienda…" aria-label="Cerca azienda" value="${esc(P.pipeQ||"")}">
    <span class="pnav"><button type="button" class="btn sm" data-pv="pipe-scorri" data-d="-1" aria-label="Scorri a sinistra">‹</button><button type="button" class="btn sm" data-pv="pipe-scorri" data-d="1" aria-label="Scorri a destra">›</button></span>
    <span class="muted" style="font-size:13px">Trascina una scheda per cambiarne lo status, cliccala per aprire l'azienda. Il bordo colorato indica che ha già un preventivo.</span></div>
    <div id="pvBoardBox">${boardHTML()}</div>`}
function ridisegnaBoard(){const b=q("#pvBoardBox");if(!b)return;const s=q("#pvBoard")?.scrollLeft||0;b.innerHTML=boardHTML();const n=q("#pvBoard");if(n)n.scrollLeft=s}
async function cambiaStato(cf,fase){const x=aziendeTutte().find(z=>z.cf===cf);if(!x||x.fase===fase)return;
  const prima=faseLabel(x);x.fase=fase;
  try{P.contatti=await api("pvRegistra",{cf,nome:x.nome,data:oggi(),canale:"CRM",esito:ESITO_STATO,fase,motivo:"",note:`Status cambiato a mano: da “${prima}” a “${fase}”`,prossimaAzione:x.prossimaAzione,dataProssima:x.dataProssima});
    P.reg=null;toast("Status: "+fase)}
  catch(e){if(!/SESSIONE/.test(msg(e)))toast(msg(e).slice(0,140))}
  ridisegnaBoard();if(P.p)renderForm()}

/* ---------- calendario ---------- */
const MESI=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"], GSET=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const IC_CAL='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h2v2h6V2h2v2h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3zm12 8H5v9h14zM5 6v2h14V6z" fill="currentColor"/></svg>';
const CAL_K=[["int",["interessata","interessate"],"Interessate","var(--f2)",e=>e==="Risposto – interessato"],
  ["app",["appuntam.","appuntam."],"Appuntamenti","var(--f3)",e=>e==="Appuntamento fissato"],
  ["pro",["email","email"],"Email inviate","var(--f1)",e=>e==="Email inviata"],
  ["acq",["acquisita","acquisite"],"Acquisite","var(--f5)",e=>e.startsWith("Acquisita")],
  ["no",["archiviata","archiviate"],"Archiviate (non interessate / altro ente)","var(--f6)",e=>e==="Risposto – non interessato"||e.startsWith("Risposto – ha gi")]];
const calLab=(k,n)=>k[1][n===1?0:1], pad2=n=>String(n).padStart(2,"0");
function calStats(acts){const o={tot:new Set(acts.map(a=>a.cf)).size,calls:acts.length};CAL_K.forEach(k=>{o[k[0]]=new Set(acts.filter(a=>k[4](a.esito||"")).map(a=>a.cf)).size});return o}
function renderCal(){
  const t=oggi();if(!P.cal)P.cal={y:+t.slice(0,4),m:+t.slice(5,7)-1,sel:t,mine:false};
  const c=P.cal, mio=u=>String(u||"").toLowerCase()===String(P.user||"").toLowerCase();
  const acts=P.contatti.filter(a=>a.data&&isCall(a)&&(!c.mine||mio(a.user)));
  const byDay={};acts.forEach(a=>(byDay[a.data]=byDay[a.data]||[]).push(a));
  const az=aziendeTutte(), byPlan={};az.filter(x=>x.dataProssima&&x.fase!=="Archiviata"&&(!c.mine||mio(x.user))).forEach(x=>(byPlan[x.dataProssima]=byPlan[x.dataProssima]||[]).push(x));
  const ym=`${c.y}-${pad2(c.m+1)}`, nDays=new Date(c.y,c.m+1,0).getDate(), lead=(new Date(c.y,c.m,1).getDay()+6)%7, ms=calStats(acts.filter(a=>a.data.startsWith(ym)));
  let max=1;for(let d=1;d<=nDays;d++){const a=byDay[`${ym}-${pad2(d)}`];if(a)max=Math.max(max,new Set(a.map(z=>z.cf)).size)}
  let cells="";for(let i=0;i<lead;i++)cells+=`<div class="cday out" aria-hidden="true"></div>`;
  for(let d=1;d<=nDays;d++){const iso=`${ym}-${pad2(d)}`, st=calStats(byDay[iso]||[]), pl=(byPlan[iso]||[]).length, dow=(lead+d-1)%7, ks=CAL_K.filter(k=>st[k[0]]);
    const lab=`${d} ${MESI[c.m]}: ${st.tot} contattate`+ks.map(k=>`, ${st[k[0]]} ${k[2].toLowerCase()}`).join("")+(pl?`, ${pl} in programma`:"");
    cells+=`<button type="button" class="cday${iso===t?" today":""}${iso===c.sel?" sel":""}${dow>4?" we":""}${iso<t&&!st.tot?" empty":""}" data-pv="cal-day" data-iso="${iso}" style="--heat:${st.tot?Math.round(6+st.tot/max*22):0}%" aria-label="${esc(lab)}" aria-pressed="${iso===c.sel}">
      <span class="cdn">${d}</span>${st.tot?`<span class="ctot"><b>${st.tot}</b><span class="ctl"> ${st.tot===1?"contattata":"contattate"}</span></span>`:""}
      ${ks.length?`<span class="cpills">${ks.map(k=>`<span class="cpill" style="--k:${k[3]}">${st[k[0]]} ${calLab(k,st[k[0]])}</span>`).join("")}</span><span class="cdots">${ks.map(k=>`<i style="--k:${k[3]}"></i>`).join("")}</span>`:""}
      ${pl?`<span class="cplan" title="${pl} in programma">${IC_CAL}<span>${pl}<span class="ctl"> in programma</span></span></span>`:""}</button>`}
  const tail=(7-(lead+nDays)%7)%7;for(let i=0;i<tail;i++)cells+=`<div class="cday out" aria-hidden="true"></div>`;
  const sel=c.sel, sa=(byDay[sel]||[]).slice().sort((a,b)=>String(a.creato||"").localeCompare(String(b.creato||""))), ss=calStats(sa), sp=byPlan[sel]||[];
  const dLab=new Date(sel+"T12:00:00").toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
  const col=e=>{const k=CAL_K.find(k=>k[4](e||""));return k?k[3]:"var(--line)"};
  const nome=a=>(az.find(x=>x.cf===a.cf)||a).nome||a.cf;
  const kp=(v,l,c2)=>`<div class="kpi"><div class="v"${c2?` style="color:${c2}"`:""}>${v}</div><div class="l">${l}</div></div>`;
  q("#pvAltro").innerHTML=`<div class="filters calbar"><div class="calnav"><button class="btn sm" type="button" data-pv="cal-nav" data-d="-1" aria-label="Mese precedente">‹</button>
      <h2 class="calm">${MESI[c.m]} ${c.y}</h2><button class="btn sm" type="button" data-pv="cal-nav" data-d="1" aria-label="Mese successivo">›</button><button class="btn sm" type="button" data-pv="cal-nav" data-d="0">Oggi</button></div>
      <label class="seg" style="padding:2px 4px"><input type="checkbox" id="pvCalMine" ${c.mine?"checked":""} style="margin:0 6px 0 4px"><span style="padding:4px 8px 4px 0;font-weight:500">Solo le mie</span></label></div>
    <div class="kpis calk">${kp(ms.tot,"Aziende contattate")}${kp(ms.int,"Interessate",CAL_K[0][3])}${kp(ms.app,"Appuntamenti",CAL_K[1][3])}${kp(ms.pro,"Email inviate",CAL_K[2][3])}${kp(ms.acq,"Acquisite",CAL_K[3][3])}${kp(ms.no,"Archiviate",CAL_K[4][3])}</div>
    <div class="calwrap"><div class="panel calgrid-p"><div class="calgrid" role="grid" aria-label="${MESI[c.m]} ${c.y}">${GSET.map((g,i)=>`<div class="cwd${i>4?" we":""}">${g}</div>`).join("")}${cells}</div>
        <div class="clegend">${CAL_K.map(k=>`<span><i style="--k:${k[3]}"></i>${k[2]}</span>`).join("")}<span><i style="--k:var(--accent2)"></i>In programma</span><span class="muted">Più scuro = più aziende contattate</span></div></div>
      <section class="panel caldet" aria-live="polite"><h2 class="cdtitle">${esc(dLab)}</h2>
      ${sa.length?`<div class="cdsum"><span><b>${ss.tot}</b> ${ss.tot===1?"azienda contattata":"aziende contattate"}</span><span class="muted">${ss.calls} ${ss.calls===1?"registrazione":"registrazioni"}</span></div>
        <div class="cactlist">${sa.map(a=>`<div class="cact" data-pv="vai-az" data-cf="${esc(a.cf)}" role="button" tabindex="0"><span class="cbar" style="--k:${col(a.esito)}"></span><span class="cmain"><b>${esc(nome(a))}</b><span class="muted small">${esc(a.esito||"")}${a.autore?" · "+esc(a.autore):""}</span></span></div>`).join("")}</div>`
        :`<div class="muted small">${sel>t?"Nessuna chiamata (giorno futuro).":"Nessuna chiamata registrata."}</div>`}
      ${sp.length?`<h3 class="cdh">${IC_CAL}In programma (${sp.length})</h3><div class="cactlist">${sp.map(x=>`<div class="cact" data-pv="vai-az" data-cf="${esc(x.cf)}" role="button" tabindex="0"><span class="cbar" style="--k:var(--accent2)"></span><span class="cmain"><b>${esc(x.nome)}</b><span class="muted small">${esc(x.prossimaAzione||"Azione")}</span></span></div>`).join("")}</div>`:""}
      </section></div>`;
}
function vista(v){P.vista=v;store("pv.vista",v);
  P.root.querySelectorAll("#pvTabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.v===v));
  q("#pvWrap").hidden=v!=="preventivi";q("#pvAltro").hidden=v==="preventivi";
  disegnaVista();
  if(v!=="preventivi")api("pvContatti").then(l=>{P.contatti=l;renderList();if(P.vista===v)disegnaVista()}).catch(()=>{})}
const disegnaVista=()=>{if(P.vista==="pipeline")renderPipe();else if(P.vista==="calendario")renderCal();else if(P.vista==="aziende"||P.vista==="budget")renderAziende()};
// dalla pipeline o dal calendario: apre l'ultimo preventivo dell'azienda, oppure uno nuovo, e porta alla sezione 4
async function vaiAzienda(cf){
  if(P.p&&P.p.aziende.some(a=>cfNorm(a.cf)===cf)){P.reg=regVuota(cf);vista("preventivi");renderForm();mostraReg();return}
  if(!lascia("az:"+cf))return;
  const prima=P.p,eraSporco=P.dirty;P.dirty=false;
  const pv=P.lista.find(x=>String(x.cf||"").split(" + ").includes(cf));
  if(pv){await azione("apri",{dataset:{id:pv.id}});if(P.p===prima){P.dirty=eraSporco;return}}
  else{const p=nuovo();Object.assign(p.aziende[0],{nome:nomeDi(cf),cf});applicaSaldi(p);P.p=p;P.dirty=false;P.stato="";renderList();renderForm()}
  P.reg=regVuota(cf);vista("preventivi");renderForm();mostraReg()}
const mostraReg=()=>q("#pvReg")?.scrollIntoView({behavior:"smooth",block:"start"});

/* ---------- riepilogo ---------- */
function renderSum(){
  const p=P.p, c=pvCalcola(p);
  P.root.querySelectorAll("[data-out]").forEach(o=>{const k=o.dataset.out;
    if(k==="askrule")o.innerHTML=c.totale?(c.askPerc
      ?`${c.manuale?"Totale del piano":"Budget"} di ${eur(c.totale)}, da ${eur(c.soglia)} in su: si applica il <b>${esc(p.ask.perc)}%</b> = <b>${eur(c.askPrep)}</b> (arrotondato ai 10 € superiori).`
      :`${c.manuale?"Totale del piano":"Budget"} di ${eur(c.totale)}, sotto ${eur(c.soglia)}: quota Ask <b>${eur(c.askPrep+c.askGest)}</b> in tutto (${eur(c.askPrep)} preparatorie + ${eur(c.askGest)} gestione).`)
      :`Quota Ask: da ${eur(c.soglia)} in su la percentuale; sotto, 1.350 € oltre 3.000 €, 1.000 € da 2.000 a 3.000 €, niente sotto 2.000 €.`;
    else if(k.startsWith("az")){const a=p.aziende[+k.slice(2)];o.textContent=a?eur(pvNum(a.disponibile)+pvNum(a.maturando)):""}
    else if(k[0]==="q")o.textContent=eur(c.importi[+k.slice(1)]);
    else if(k[0]==="h"){const i=+k.slice(1);o.textContent=pvNum((p.corsi[i]||{}).ore)?eur(c.euroOraCorsi[i]):"– (mancano le ore)"}});
  P.root.querySelectorAll("[data-eh]").forEach(x=>{if(document.activeElement===x)return;const i=+x.dataset.eh;
    x.value=pvNum((p.corsi[i]||{}).ore)&&pvNum(p.corsi[i].importo)?cifra(c.euroOraCorsi[i]):""});
  const l=(lab,v,cls)=>`<div class="pv-l${cls?" "+cls:""}"><span title="${esc(lab)}">${esc(lab)}</span><b>${v}</b></div>`;
  const askLab=c.askPerc?` (${p.ask.perc}%)`:"";
  q("#pvSum").innerHTML=`<h2>Riepilogo</h2>
    ${l(c.manuale?"Totale del piano (a mano)":"Budget Fondimpresa",eur(c.totale),"big")}
    <div class="pv-sub">${c.manuale?"Budget "+eur(c.budget)+": ":""}${eur(c.disponibile)} disponibile + ${eur(c.maturando)} maturando</div>
    ${l("Docenza",eur(c.docenza))}
    ${l("di cui recupero spese azienda",eur(c.recupero))}
    ${c.fissi?`<div class="pv-sub">${["corsi a importo fisso "+eur(c.fissi),p.corsi.some(x=>x.residuo)?"residuo "+eur(c.residuo):""].filter(Boolean).join(" · ")}</div>`:""}
    ${l("Ask preparatorie"+askLab,eur(c.askPrep))}
    ${l("Ask gestione"+askLab,eur(c.askGest))}
    ${l("Revisore",eur(c.revisore))}
    ${l("Totale piano",eur(c.totalePiano),"tot")}
    ${l("Ore di formazione",n1(c.ore)+" / min "+c.oreMin)}
    ${l("€/ora piano",eur(c.euroOraPiano))}
    ${p.corsi.map((co,i)=>pvNum(co.ore)?l("€/ora "+(co.docente||co.titolo||"corso "+(i+1)),eur(c.euroOraCorsi[i])):"").join("")}
    ${c.avvisi.map(a=>`<p class="pv-av ${a.liv}">${esc(a.testo)}</p>`).join("")}
    <div class="pv-acts"><button type="button" class="btn pv-salva" data-pv="salva" ${P.busy?"disabled":""}>Salva</button><button type="button" class="btn" data-pv="excel" ${P.busy?"disabled":""}>Scarica Excel</button><button type="button" class="btn primary" data-pv="pdf" ${P.busy?"disabled":""}>Scarica PDF</button></div>
    <p class="pv-st${P.dirty&&!P.busy?" dirty":""}">${esc(P.busy?P.stato:P.dirty?"Modifiche non salvate":P.stato)}</p>
    ${p.fileUrl?`<a class="small" href="${esc(p.fileUrl)}" target="_blank" rel="noopener">Apri il file in Google Fogli</a>`:""}`;
}

/* ---------- azioni ---------- */
const sporco=()=>{P.dirty=true;P.stato=""};
// conferma con un secondo clic (le finestre del browser sono bloccate dentro il CRM)
function secondoClic(chiave,avviso){
  if(P.conferma===chiave){P.conferma=null;return true}
  P.conferma=chiave;clearTimeout(P._ct);P._ct=setTimeout(()=>{P.conferma=null;renderSum();if(P.p&&P.p.id)renderForm();else ridisegnaReg()},5000);
  if(avviso)toast(avviso);return false;
}
const lascia=chiave=>!P.dirty||secondoClic("lascia:"+chiave,"Ci sono modifiche non salvate: clicca di nuovo per lasciarle");
function scarica(nome,b64){const bin=atob(b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([u8],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
  const a=document.createElement("a");a.href=url;a.download=nome;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},2000)}
async function lavora(testo,fn){P.busy=true;P.stato=testo;renderSum();
  try{await fn()}catch(e){if(!/SESSIONE/.test(msg(e)))toast(msg(e).slice(0,140));P.stato="Non riuscito: "+msg(e).slice(0,100)}
  P.busy=false;renderSum()}
async function azione(a,el){
  const p=P.p, i=+el.dataset.i;
  if(a==="vista"){vista(el.dataset.v);return}
  if(a==="vai-az"){return vaiAzienda(el.dataset.cf)}
  if(a==="reg-salva")return regSalva();
  if(a==="az-riga"){const cf=el.dataset.cf;P.azAperta=P.azAperta===cf?null:cf;ridisegnaAziende();q(`[data-pv="az-riga"][data-cf="${cf}"]`)?.focus({preventScroll:true});return}
  if(a==="az-ord"){const k=el.dataset.k,o=P.azOrd||{k:"nome",d:1};P.azOrd={k,d:o.k===k?-o.d:(colonne().find(c=>c[0]===k)||[])[2]?-1:1};renderAziende();return}
  if(a==="az-azzera"){["azQ","azFase","azProv","azPv","azCon","azPasso","azScad","azAcq","azMin"].forEach(x=>P[x]="");renderAziende();return}
  if(a==="az-apripv"){if(!lascia("pv:"+el.dataset.id))return;P.dirty=false;await azione("apri",{dataset:{id:el.dataset.id}});vista("preventivi");window.scrollTo(0,0);return}
  if(a==="az-nuovopv"){const cf=el.dataset.cf;if(!lascia("az:"+cf))return;const np=nuovo();Object.assign(np.aziende[0],{nome:nomeDi(cf),cf});applicaSaldi(np);
    P.p=np;P.dirty=false;P.stato="";P.reg=null;vista("preventivi");renderList();renderForm();window.scrollTo(0,0);toast("Nuovo preventivo per "+np.aziende[0].nome);return}
  if(a==="reg-mod"){const x=P.contatti.find(z=>z.id===el.dataset.id);if(!x)return;
    P.reg={cf:x.cf,esito:x.esito||"",fase:x.fase||"Contattata",motivo:x.motivo||"",note:x.note||"",az:x.prossimaAzione||"",due:x.dataProssima||"",data:x.data||oggi(),canale:x.canale||"Telefono",
      autoSet:false,faseManual:true,apriMeta:true,hint:"",err:false,edit:x.id};
    ridisegnaReg();q("#pvReg")?.scrollIntoView({behavior:"smooth",block:"start"});return}
  if(a==="reg-annulla"){P.reg=regVuota(P.reg?P.reg.cf:"");ridisegnaReg();return}
  if(a==="reg-due"){const r=P.reg;if(!r)return;r.due=addDays(oggi(),+el.dataset.n);if(!r.az)r.az="Follow up";r.autoSet=false;ridisegnaReg();return}
  if(a==="reg-del"){const id=el.dataset.id;if(!secondoClic("regdel:"+id)){ridisegnaReg();return}
    return lavora("Elimino la chiamata…",async()=>{P.contatti=await api("pvEliminaContatto",id);P.reg=null;P.stato="";renderForm();toast("Chiamata eliminata")})}
  if(a==="pipe-altre"){P.lim[el.dataset.fase]=(P.lim[el.dataset.fase]||40)+40;ridisegnaBoard();return}
  if(a==="pipe-scorri"){q("#pvBoard")?.scrollBy({left:+el.dataset.d*300,behavior:"smooth"});return}
  if(a==="cal-day"){P.cal.sel=el.dataset.iso;renderCal();return}
  if(a==="cal-nav"){const c=P.cal,d=+el.dataset.d;if(!d){const t=oggi();c.y=+t.slice(0,4);c.m=+t.slice(5,7)-1;c.sel=t}else{c.m+=d;if(c.m<0){c.m=11;c.y--}if(c.m>11){c.m=0;c.y++}c.sel=`${c.y}-${pad2(c.m+1)}-01`}renderCal();return}
  if(a==="nuovo"){if(!lascia("nuovo"))return;P.p=nuovo();P.dirty=false;P.stato="";renderList();renderForm();return}
  if(a==="apri"){const id=el.dataset.id;if(!lascia("apri:"+id))return;q("#pvForm").innerHTML=`<div class="empty">Apro il preventivo…</div>`;
    try{const r=await api("pvApri",id);const x=P.lista.find(z=>z.id===id)||{};const n=nuovo();
      P.p=Object.assign(n,r,{ask:Object.assign(n.ask,r.ask||{}),fileUrl:x.file||""});P.dirty=false;P.stato="";renderList();renderForm()}
    catch(e){toast(msg(e));renderForm()}return}
  if(a==="del-az"){p.aziende.splice(i,1);sporco();renderForm();return}
  if(a==="add-corso"){p.corsi.push(corsoVuoto());sporco();renderForm();P.root.querySelectorAll('[data-k$=".titolo"]')[p.corsi.length-1]?.focus();return}
  if(a==="del-corso"){p.corsi.splice(i,1);sporco();renderForm();return}
  if(a==="residuo"){p.corsi[i].residuo=el.dataset.v==="1";sporco();renderForm();return}
  if(a==="az-apri"){if(P.azAperto===i){chiudiCat();return}P.catAperto=null;P.azAperto=i;renderForm();
    q("[data-az-cerca]")?.focus({preventScroll:true});const l=q(".pv-catlist"),on=l&&l.querySelector(".pv-cato.on");if(on)l.scrollTop=on.offsetTop-60;return}
  if(a==="az-scegli"){const r=saldoDi(el.dataset.cf),k=P.azAperto;if(!r||!p.aziende[k])return;
    Object.assign(p.aziende[k],{nome:r.nome,cf:r.cf});applicaSaldi(p);P.azAperto=null;sporco();renderForm();q(`[data-pv="az-apri"][data-i="${k}"]`)?.focus({preventScroll:true});return}
  if(a==="acq-apri"){const az=P.vista==="aziende"||P.vista==="budget";P.acq={nome:"",cf:"",disponibile:"",maturando:"",scadenza:"",az};renderSaldi();
    if(az){renderAziende();q('#pvAzForm [data-acq="nome"]')?.focus()}else q('#pvSaldi [data-acq="nome"]')?.focus();return}
  if(a==="acq-annulla"){const az=P.acq&&P.acq.az;P.acq=null;renderSaldi();if(az)renderAziende();return}
  if(a==="acq-salva"){const x=P.acq;if(!x.nome.trim()||!x.cf.trim()){toast("Scrivi la ragione sociale e il codice fiscale");return}
    return lavora("Salvo l'azienda…",async()=>{P.saldi=await api("pvAcquisita",x);const cf=cfNorm(x.cf);
      if(x.az){P.acq=null;P.azAperta=cf;["azQ","azFase","azProv","azPv","azCon","azPasso","azScad","azAcq","azMin"].forEach(z=>P[z]="");renderSaldi();renderAziende();
        q(`[data-pv="az-riga"][data-cf="${cf}"]`)?.scrollIntoView({block:"center"});toast("Azienda aggiunta: "+x.nome.trim());return}
      // se nel preventivo aperto c'è un'azienda ancora vuota, la usa lì; le aziende già scelte non vengono toccate
      const vuota=p.aziende.find(z=>!z.nome.trim()&&!cfNorm(z.cf));
      if(vuota){Object.assign(vuota,{nome:x.nome.trim(),cf});applicaSaldi(p);sporco()}
      P.acq=null;renderForm();toast(vuota?"Azienda aggiunta e inserita nel preventivo":"Azienda aggiunta: la trovi in «Scegli azienda…»")})}
  if(a==="cat-apri"){if(P.catAperto===i){chiudiCat();return}P.azAperto=null;P.catAperto=i;P.catArea=(P.corsi.find(z=>z.codice===p.corsi[i].codice)||{}).catalogo||null;renderForm();
    q("[data-cat-cerca]")?.focus({preventScroll:true});const l=q(".pv-catlist"),on=l&&l.querySelector(".pv-cato.on");if(on)l.scrollTop=on.offsetTop-60;return}
  if(a==="cat-area"){P.catArea=el.dataset.area||null;const l=q(".pv-catlist");if(!l)return;l.innerHTML=corpoCat("",(p.corsi[P.catAperto]||{}).codice);l.scrollTop=0;l.querySelector(".pv-cato,.mini")?.focus({preventScroll:true});return}
  if(a==="cat-scegli"){const c=p.corsi[P.catAperto],hit=P.corsi.find(z=>z.codice===el.dataset.cod),k=P.catAperto;if(!c)return;
    if(hit){c.codice=hit.codice;c.titolo=hit.titolo;const o=orePrese(hit);if(o)c.ore=o}else c.codice="";
    P.catAperto=null;sporco();renderForm();q(`[data-pv="cat-apri"][data-i="${k}"]`)?.focus({preventScroll:true});return}
  if(a==="ricarica-saldi")return lavora("Leggo il foglio dei saldi…",async()=>{P.saldi=await api("pvSaldi");const n=applicaSaldi(p);if(n)sporco();renderForm();
    toast(P.saldi.errore||(n?"Saldi aggiornati dal foglio":"Saldi ricaricati: nessuna azienda di questo preventivo è nel foglio"))});
  if(a==="imposta-saldi"){P.collega=!P.collega;renderForm();if(P.collega)q("#pvLinkSaldi")?.focus();return}
  if(a==="collega-saldi"){const link=(q("#pvLinkSaldi")?.value||"").trim();if(!link){toast("Incolla il link del Google Foglio");q("#pvLinkSaldi")?.focus();return}
    return lavora("Collego il foglio…",async()=>{P.saldi=await api("pvImpostaSaldi",link);P.collega=false;if(applicaSaldi(p))sporco();renderForm();
      toast("Foglio dei saldi collegato: "+P.saldi.righe.length+" aziende")})}
  if(a==="duplica"){P.p=Object.assign(JSON.parse(JSON.stringify(p)),{id:"",fileUrl:"",dataPreventivo:oggi()});P.dirty=true;renderList();renderForm();toast("Copia creata: modificala e salvala");return}
  if(a==="elimina"){if(!secondoClic("elimina:"+p.id)){renderForm();return}
    try{P.lista=await api("pvElimina",p.id);P.p=nuovo();P.dirty=false;renderList();renderForm();toast("Preventivo eliminato")}catch(e){toast(msg(e))}return}
  if(a==="salva")return lavora("Salvataggio…",async()=>{const r=await api("pvSalva",p);p.id=r.id;P.lista=r.lista;P.dirty=false;P.stato="Salvato ✓";renderList();renderForm();toast("Preventivo salvato")});
  if(a==="pdf")return lavora("Preparo il PDF…",async()=>{if(typeof pdfPreventivo!=="function")throw new Error("Manca il file pdf-preventivo.js sul server.");
    const r=await api("pvSalva",p);p.id=r.id;P.lista=r.lista;P.dirty=false;const nome=await pdfPreventivo(p,pvCalcola(p));P.stato="PDF scaricato ✓";renderList();renderForm();toast("Scaricato: "+nome)});
  if(a==="excel")return lavora("Preparo il file Excel…",async()=>{const r=await api("pvExcel",p);p.id=r.id;p.fileUrl=r.url;P.lista=r.lista;P.dirty=false;P.stato="Excel scaricato ✓";
    scarica(r.nome,r.b64);renderList();renderForm();toast("Scaricato: "+r.nome)});
}

/* ---------- nuovo preventivo dalla scheda azienda: azienda e corsi di interesse già compilati ---------- */
function perAzienda(az){
  const p=nuovo();
  p.aziende[0].nome=az.nome||""; p.aziende[0].cf=/^NUOVA-/.test(az.cf||"")?"":(az.cf||"");
  // i corsi di interesse del CRM hanno i codici del vecchio elenco: arrivano come titolo libero, da collegare al catalogo se serve
  const cs=(az.corsi||[]).map(c=>P.corsi.find(k=>k.codice===c)||Object.assign({},(P.corsiCrm||[]).find(k=>k.codice===c),{codice:""})).filter(k=>k.titolo);
  if(cs.length)p.corsi=cs.map(k=>Object.assign(corsoVuoto(),{titolo:k.titolo,codice:k.codice,ore:orePrese(k)}));
  applicaSaldi(p);
  return p;
}
function nuovoPer(az){
  if(P.dirty&&!secondoClic("lascia:per:"+az.cf,"Hai un preventivo non salvato aperto: salvalo, oppure premi di nuovo «Preventivo» nella scheda dell'azienda per lasciarlo"))return;
  P.catAperto=P.azAperto=P.acq=null;P.p=perAzienda(az);P.dirty=true;P.stato="";renderList();renderForm();
  const gia=P.lista.filter(x=>az.cf&&String(x.cf||"").split(" + ").includes(az.cf)).length;
  toast(gia===1?"C'è già un preventivo per questa azienda: lo trovi nell'elenco a sinistra"
    :gia?`Ci sono già ${gia} preventivi per questa azienda: li trovi nell'elenco a sinistra`:"Nuovo preventivo per "+az.nome);
  if(!saldoDi(az.cf))q("[data-k='aziende.0.disponibile']")?.focus();
}

/* ---------- avvio ---------- */
function mount(root){
  P.root=root;
  root.addEventListener("click",e=>{if(!e.target.closest(".pv-cat"))chiudiCat();const b=e.target.closest("[data-pv]");if(b&&root.contains(b)&&!P.busy)azione(b.dataset.pv,b)});
  // pipeline: una scheda si trascina nella colonna del nuovo status
  let dragCf=null;
  root.addEventListener("dragstart",e=>{const c=e.target.closest(".card");if(c){dragCf=c.dataset.cf;e.dataTransfer.effectAllowed="move"}});
  root.addEventListener("dragend",()=>{dragCf=null;root.querySelectorAll(".col.over").forEach(c=>c.classList.remove("over"))});
  root.addEventListener("dragover",e=>{const col=e.target.closest(".col");if(col&&dragCf){e.preventDefault();root.querySelectorAll(".col.over").forEach(c=>c!==col&&c.classList.remove("over"));col.classList.add("over")}});
  root.addEventListener("dragleave",e=>{const col=e.target.closest(".col");if(col&&!col.contains(e.relatedTarget))col.classList.remove("over")});
  root.addEventListener("drop",e=>{const col=e.target.closest(".col");if(!col||!dragCf)return;e.preventDefault();col.classList.remove("over");
    const cf=dragCf,st=col.dataset.fase;dragCf=null;
    if(st==="Da contattare"){toast("“Da contattare” non si sceglie: vale da solo per le aziende senza storico");return}
    cambiaStato(cf,st)});
  root.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="pvLinkSaldi"){e.preventDefault();azione("collega-saldi",e.target)}
    if(e.key==="Enter"&&e.target.matches('[role="button"][data-pv]')){e.preventDefault();e.target.click();return}
    const box=e.target.closest(".pv-catbox");if(!box)return;
    const op=[...box.querySelectorAll(".pv-cato")],i=op.indexOf(document.activeElement),giu=e.key==="ArrowDown";
    if(e.key==="Escape"){e.stopPropagation();chiudiCat()?.focus()}
    else if(giu||e.key==="ArrowUp"){e.preventDefault();const n=i<0?(giu?0:op.length-1):i+(giu?1:-1);(op[n]||box.querySelector("[data-cat-cerca]")).focus()}
    else if(e.key==="Enter"&&i<0){e.preventDefault();op[0]?.click()}});
  root.addEventListener("input",e=>{const t=e.target;
    if(t.id==="pvFiltro"){renderList();return}
    if(t.id==="pvPipeQ"){P.pipeQ=t.value;ridisegnaBoard();return}
    if(t.id==="pvAzQ"){P.azQ=t.value;ridisegnaAziende();return}
    if(t.id==="pvAzMin"){P.azMin=t.value;ridisegnaAziende();return}
    if(t.dataset.reg&&t.tagName!=="SELECT"&&t.type!=="radio"&&t.type!=="date"){P.reg&&(P.reg[t.dataset.reg]=t.value);return}
    if(t.dataset.acq){P.acq[t.dataset.acq]=t.value;return}
    if(t.dataset.azCerca!=null){const l=q(".pv-catlist");l.innerHTML=righeAziende(t.value,P.p.aziende[P.azAperto]||{});l.scrollTop=0;return}
    if(t.dataset.catCerca!=null){const l=q(".pv-catlist");l.innerHTML=corpoCat(t.value,(P.p.corsi[P.catAperto]||{}).codice);l.scrollTop=0;return}
    if(t.dataset.eh!=null){const i=+t.dataset.eh,c=P.p.corsi[i],ore=pvNum(c.ore);
      if(!ore){toast("Scrivi prima le ore del corso");return}
      c.importo=t.value.trim()?cifra(pvNum(t.value)*ore):"";const imp=q(`[data-k="corsi.${i}.importo"]`);if(imp)imp.value=c.importo;
      sporco();renderSum();return}
    const k=t.dataset.k;if(!k)return;setP(P.p,k,t.value);sporco();renderSum()});
  root.addEventListener("change",e=>{const t=e.target, k=t.dataset.k||"";let m;
    if(t.id==="pvFileSaldi"){const f=t.files[0];if(!f)return;
      return lavora("Leggo il file dei saldi…",async()=>{P.saldi=await api("pvCaricaSaldi",f.name,await leggiB64(f));const n=P.p?applicaSaldi(P.p):0;if(n)sporco();renderForm();
        toast("Saldi caricati: "+P.saldi.righe.filter(r=>!r.acquisita).length+" aziende")})}
    if(t.id==="pvCalMine"){P.cal.mine=t.checked;renderCal();return}
    if(t.id==="pvAzFase"){P.azFase=t.value;renderAziende();return}
    if(t.id==="pvAzProv"){P.azProv=t.value;renderAziende();return}
    if(t.id==="pvAzPv"){P.azPv=t.value;renderAziende();return}
    if(t.id==="pvAzCon"){P.azCon=t.value;renderAziende();return}
    if(t.id==="pvAzPasso"){P.azPasso=t.value;renderAziende();return}
    if(t.id==="pvAzScad"){P.azScad=t.checked;renderAziende();return}
    if(t.id==="pvAzAcq"){P.azAcq=t.checked;renderAziende();return}
    if(t.id==="pvAzMin"){renderAziende();return}
    if(t.id==="pvAzOrd"){const [k,d]=t.value.split(":");P.azOrd={k,d:+d};renderAziende();return}
    if(t.dataset.reg&&t.tagName!=="TEXTAREA"){regCambia(t);return}
    if((m=k.match(/^corsi\.(\d+)\.titolo$/))){const c=P.p.corsi[+m[1]], hit=P.corsi.find(z=>z.codice===c.codice);
      if(c.codice&&(!hit||hit.titolo!==t.value)){c.codice="";renderForm()}}});
  document.addEventListener("click",e=>{
    if(e.target.closest("#meBtn")){userMenu();return}
    const mm=e.target.closest("[data-mm]");if(mm){menuAction(mm.dataset.mm);return}
    if(!e.target.closest("#menuRoot"))el("#menuRoot").hidden=true;
  });
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){el("#menuRoot").hidden=true;closeDrawer()}});
  if(token)avvia();else mostraLogin();
}
// account non abilitato: nessun dato arriva dal server, resta solo il messaggio e la possibilità di cambiare account
function negato(){
  q("#pvWrap").hidden=true;q("#pvAltro").hidden=true;q("#pvTabs").hidden=true;
  el("#pvNegato").hidden=false;
  el("#pvEsci").onclick=async()=>{try{await api("logout")}catch(e){}token="";store("crm.token","");el("#pvNegato").hidden=true;mostraLogin()};
}
function avvia(){
  el("#pvNegato").hidden=true;q("#pvTabs").hidden=false;q("#pvWrap").hidden=P.vista!=="preventivi";
  api("pvInit").then(r=>{
    P.D=r.defaults;P.corsi=r.corsi;P.corsiCrm=r.corsiCrm||[];P.lista=r.lista;P.contatti=r.contatti||[];P.admin=!!r.admin;if(r.saldi)P.saldi=r.saldi;
    P.user=r.user;P.foglio="";P.avviso=r.avviso||"";
    el("#pvMe").innerHTML=`<button class="mebtn" id="meBtn" type="button" aria-haspopup="true"><span class="avi pv-avi">${esc(String(r.me||"?").trim().charAt(0).toUpperCase())}</span><span>${esc(r.me||"")}</span><span aria-hidden="true">▾</span></button>`;
    // azienda arrivata dal pulsante «Preventivo» della scheda azienda del CRM
    let az=null;try{az=JSON.parse(store("pv.dalcrm")||"null")}catch(e){}
    if(az)store("pv.dalcrm","");
    if(az)nuovoPer(az);else{P.p=nuovo();renderList();renderForm()}
    const v=store("pv.vista");if(!az&&(v==="pipeline"||v==="calendario"||v==="aziende"||v==="budget"))vista(v);
  }).catch(e=>{if(/SESSIONE/.test(msg(e)))return;
    if(/PV_NEGATO/.test(msg(e))){store("pv.dalcrm","");negato();return}
    q("#pvForm").innerHTML=`<div class="empty">Non riesco ad aprire i preventivi: ${esc(msg(e))}</div>`});
}
mount(document.getElementById("pv-root"));
})();
