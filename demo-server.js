/* DEMO online dell'app Preventivi.
   Fa girare nel browser lo stesso server.js del NAS: al posto di Node ci sono piccoli sostituti
   (database SQLite con sql.js, niente file, niente rete). I dati sono di fantasia e restano solo
   nel browser di chi apre la pagina. Le chiamate «api/…» dell'app non escono dalla pagina. */
"use strict";
(function(){
const CHIAVE_DB="pvdemo.db.v1", TOKEN="demo-sessione-locale";
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
ls.set("crm.token",TOKEN); // l'app entra già con l'utente demo

/* ---- piccoli sostituti dei moduli di Node usati da server.js ---- */
const b64da=u8=>{let s="";for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)};
const b64a=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
class DemoBuffer extends Uint8Array{toString(enc){if(enc==="base64")return b64da(this);if(enc==="hex")return Array.from(this,x=>x.toString(16).padStart(2,"0")).join("");return new TextDecoder().decode(this)}}
const Buffer={from(x,enc){
  if(typeof x==="string"){const u=enc==="base64"?b64a(x):new TextEncoder().encode(x);return new DemoBuffer(u)}
  if(x instanceof ArrayBuffer)return new DemoBuffer(new Uint8Array(x.slice(0)));
  if(ArrayBuffer.isView(x))return new DemoBuffer(new Uint8Array(x.buffer.slice(x.byteOffset,x.byteOffset+x.byteLength)));
  return new DemoBuffer(0)}};
const cryptoShim={
  randomBytes:n=>new DemoBuffer(window.crypto.getRandomValues(new Uint8Array(n))),
  // nella demo le password non contano: basta un'impronta qualsiasi
  scryptSync:(pw,salt,len)=>{let h=2166136261;const s=String(pw)+"|"+salt;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}
    const u=new Uint8Array(len||64);for(let i=0;i<u.length;i++){h=Math.imul(h^(h>>>15),2246822507)>>>0;u[i]=h&255}return new DemoBuffer(u)}};
const fsShim={mkdirSync(){},writeFileSync(){},appendFileSync(){},copyFileSync(){},unlinkSync(){},existsSync:()=>false,readdirSync:()=>[],readFile:(f,cb)=>cb(new Error("no")),
  readFileSync(f){if(/config\.json$/.test(f))return JSON.stringify({porta:0,cartellaBackup:"demo",giorniBackup:30});throw new Error("File non disponibile nella demo")}};
const pathShim={join:(...a)=>a.join("/").replace(/\/+/g,"/"),extname:f=>(String(f).match(/\.[^./]*$/)||[""])[0],basename:f=>String(f).split("/").pop()};
const httpShim={createServer:()=>({on(){},listen(){}})};
// node:sqlite → sql.js (stesse chiamate usate da server.js: exec, prepare().all/get/run)
let SQLDB=null;
const pulisci=p=>p.map(v=>v===undefined?null:typeof v==="boolean"?+v:v);
class DatabaseSync{
  exec(sql){SQLDB.exec(sql)}
  prepare(sql){return{
    all:(...p)=>{const st=SQLDB.prepare(sql);try{st.bind(pulisci(p));const o=[];while(st.step())o.push(st.getAsObject());return o}finally{st.free()}},
    get:(...p)=>{const st=SQLDB.prepare(sql);try{st.bind(pulisci(p));return st.step()?st.getAsObject():undefined}finally{st.free()}},
    run:(...p)=>{const st=SQLDB.prepare(sql);try{st.bind(pulisci(p));st.step();return{changes:SQLDB.getRowsModified()}}finally{st.free()}}}}}

function richiedi(nome){
  switch(nome){
    case"node:http":return httpShim;case"node:fs":return fsShim;case"node:path":return pathShim;case"node:crypto":return cryptoShim;
    case"node:sqlite":return{DatabaseSync};case"exceljs":return window.ExcelJS;
    case"./lib/calcola":return window.__demoModuli.calcola();case"./lib/catalogo.json":return window.__demoModuli.catalogo;
  }
  throw new Error("Modulo non disponibile nella demo: "+nome);
}

/* ---- dati di fantasia ---- */
const AZ=[
  ["09990000011","OFFICINE BERTOLA S.R.L.",6120.40,1850.00,0,"SALUZZO (CN)",34],
  ["09990000029","VALLE GRANA LEGNAMI S.R.L.",2410.75,980.00,620.00,"CARAGLIO (CN)",18],
  ["09990000037","TECNOPLAST LANGHE S.P.A.",11850.00,3200.00,0,"ALBA (CN)",96],
  ["09990000045","CASCINA ROERO ALIMENTARI S.R.L.",3922.59,0,0,"CANALE (CN)",22],
  ["09990000052","MECCANICA STURA S.N.C.",1480.30,640.00,0,"BORGO SAN DALMAZZO (CN)",9],
  ["09990000060","STUDIO MONVISO ENGINEERING S.R.L.",4350.00,1120.50,900.00,"CUNEO (CN)",27],
  ["09990000078","LOGISTICA TANARO S.R.L.",7790.10,2050.00,0,"ASTI (AT)",58],
  ["09990000086","EDIL MAIRA S.R.L.",2890.00,0,350.00,"DRONERO (CN)",15],
  ["09990000094","GRAFICHE ALPI MARITTIME S.R.L.",5210.65,1430.00,0,"MONDOVI' (CN)",41],
  ["09990000102","TERMOIDRAULICA PESIO S.A.S.",1960.00,420.00,0,"CHIUSA DI PESIO (CN)",11],
  ["09990000110","AUTOMAZIONI CANAVESE S.R.L.",9340.20,2780.00,1500.00,"IVREA (TO)",73],
  ["09990000128","SERVIZI SANITARI SUBALPINI S.R.L.",3310.00,760.00,0,"TORINO (TO)",31]];
const giorno=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};

function semina(srv){
  const API=srv.API,db=srv.db,ora=new Date().toISOString();
  db.prepare("INSERT INTO utenti (user,nome,ruolo,stato,hash,salt,creato) VALUES (?,?,?,?,?,?,?)").run("demo","Utente Demo","admin","attivo","","",ora);
  db.prepare("INSERT INTO sessioni (token,user,scade) VALUES (?,?,?)").run(TOKEN,"demo",Date.now()+3650*864e5);
  const ins=db.prepare("INSERT INTO saldi (cf,nome,disponibile,maturando,scadenza,data,extra) VALUES (?,?,?,?,?,?,?)");
  AZ.forEach(a=>ins.run(a[0],a[1],a[2],a[3],a[4],giorno(-3),JSON.stringify({Sede:a[5],Dipendenti:a[6]})));
  const imp=db.prepare("INSERT OR REPLACE INTO impostazioni (k,v) VALUES (?,?)");
  imp.run("saldiData",giorno(-3));imp.run("saldiFile","Saldi Fondimpresa (dati di fantasia).xlsx");imp.run("backupUltimo",giorno(0));
  // chiamate: lo status di ogni azienda è quello dell'ultima
  const ch=(g,i,esito,fase,note,pross,gp)=>API.pvRegistra(TOKEN,{data:giorno(g),cf:AZ[i][0],nome:AZ[i][1],canale:"Telefono",esito,fase,note,prossimaAzione:pross||"",dataProssima:gp==null?"":giorno(gp)});
  ch(-20,0,"Risposto – interessato","Interessata","Vuole formare i capireparto sulla sicurezza.","Richiamare",-2);
  ch(-6,0,"Appuntamento fissato","Appuntamento fissato","Incontro in azienda con il responsabile HR.","Appuntamento",2);
  ch(-15,2,"Risposto – interessato","Interessata","Interesse per lean e inglese tecnico.","Inviare proposta",1);
  ch(-4,2,"Email inviata","Piano presentato","Inviato il piano formativo.","Richiamare",5);
  ch(-9,3,"Risposto – interessato in futuro","Interesse futuro","Ripensano a gennaio.","Richiamare",40);
  ch(-30,6,"Acquisita – contratto firmato","Acquisita","Piano approvato.","",null);
  ch(-3,8,"Non risponde","Contattata","","Richiamare",0);
  ch(-12,10,"Risposto – interessato","Interessata","Formazione su PLC e manutenzione.","Inviare proposta",-1);
  ch(-25,4,"Risposto – non interessato","Archiviata","Nessun budget per quest'anno.","",null);
  // due preventivi di esempio
  const corso=(docente,titolo,periodo,ore,part,residuo,importo)=>({docente,titolo,codice:"",periodo,partecipanti:String(part),ore:String(ore),residuo,importo:importo||"",note:""});
  const pv=(i,corsi,extra)=>API.pvSalva(TOKEN,Object.assign({id:"",dataPreventivo:giorno(-2),dataSaldi:giorno(-3),periodo:"",aziende:[{nome:AZ[i][1],cf:AZ[i][0],disponibile:AZ[i][2].toFixed(2).replace(".",","),maturando:AZ[i][3].toFixed(2).replace(".",",")}],
    corsi,ask:{valore:"675",perc:"16",soglia:"4230"},totaleManuale:"",revisore:"150",recupero:"0",parametro:"165",scadenza:AZ[i][4]?AZ[i][4].toFixed(2).replace(".",","):"",
    date:{presentazione:"",avvio:"",fine:"",rendicontazione:"",prossimo:""},note:"",fileUrl:""},extra||{}));
  pv(3,[corso("Laura Fenoglio","ISO 9001:2015 - Auditor interni","18 e 19 marzo 2027",16,1,false,"570"),corso("Marco Giraudo","HACCP per addetti alla produzione","aprile 2027",24,1,true)],{revisore:"100"});
  pv(2,[corso("Paolo Allasia","Lean manufacturing in reparto","febbraio – aprile 2027",24,6,true),corso("Sara Bonetto","Inglese tecnico per l'ufficio acquisti","marzo – giugno 2027",40,4,true),corso("Paolo Allasia","Problem solving con il metodo A3","maggio 2027",16,6,true)],{periodo:"febbraio – giugno 2027"});
}

/* ---- avvio: database salvato nel browser oppure nuovo con i dati di fantasia ---- */
let SRV=null;
const pronto=(async()=>{
  const SQL=await window.initSqlJs({});
  const salvato=ls.get(CHIAVE_DB);
  try{SQLDB=salvato?new SQL.Database(b64a(salvato)):new SQL.Database()}catch(e){SQLDB=new SQL.Database()}
  const module={exports:{}};const req=richiedi;req.main=null;
  window.__serverFactory(req,module,module.exports,"/demo",{version:"demo nel browser",exit(){},env:{}},Buffer);
  SRV=module.exports;
  if(!salvato||!SRV.db.prepare("SELECT 1 FROM sessioni WHERE token = ?").get(TOKEN)){semina(SRV);salva()}
})();
function salva(){try{ls.set(CHIAVE_DB,b64da(SQLDB.export()))}catch(e){}}
// SQL.Database.export() chiude le istruzioni preparate ma non serve altro: server.js le crea a ogni chiamata

/* ---- le chiamate «api/…» dell'app restano nella pagina ---- */
const fetchVero=window.fetch.bind(window);
window.fetch=async(url,opz)=>{
  const u=String(url&&url.url||url);
  const m=u.match(/(?:^|\/)api\/([A-Za-z0-9_]+)$/);
  if(!m)return fetchVero(url,opz);
  let r;
  try{
    await pronto;
    let args=[];try{args=JSON.parse(opz&&opz.body||"[]")}catch(e){}
    const fn=m[1];
    if(fn==="login"||fn==="register")r={ok:true,r:fn==="login"?{token:TOKEN}:{msg:"Nella demo si entra direttamente: premi Accedi con qualsiasi nome."}};
    else{
      if(!Object.prototype.hasOwnProperty.call(SRV.API,fn))throw new Error("Funzione sconosciuta: "+fn);
      if(!args[0])args[0]=TOKEN;
      r={ok:true,r:await SRV.API[fn](...args)};salva();
    }
  }catch(e){r={ok:false,error:String(e&&e.message||e)}}
  return new Response(JSON.stringify(r===undefined?null:r),{status:200,headers:{"Content-Type":"application/json"}});
};

/* ---- download: su claude.ai i file si offrono con la conferma della piattaforma; su un sito normale si scaricano come sempre ---- */
const clickVero=HTMLAnchorElement.prototype.click;
const suClaude=!!(window.claude&&window.claude.use);
HTMLAnchorElement.prototype.click=function(){
  if(!suClaude||!this.hasAttribute("download")||!/^blob:/.test(this.href))return clickVero.call(this);
  const nome=this.getAttribute("download")||"file",href=this.href;
  (async()=>{
    const blob=await (await fetchVero(href)).blob();
    const dl=window.claude&&window.claude.use?await window.claude.use("downloads"):null;
    if(!dl){avviso("In questa vista il download non è disponibile: apri la demo su claude.ai.");return}
    try{await dl.save({filename:nome,data:blob})}
    catch(e){if(e&&e.code==="declined")return;avviso(e&&e.code==="rate_limited"?"C'è già una richiesta di download aperta.":"Download non riuscito: "+(e&&e.message||e))}
  })();
};
function avviso(t){document.querySelectorAll(".toast").forEach(o=>o.remove());const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=t;document.body.appendChild(el);setTimeout(()=>el.remove(),4000)}

/* ---- striscia «demo» con il pulsante per ripartire dai dati iniziali ---- */
function striscia(){
  const s=document.createElement("div");s.className="demo-bar";
  s.innerHTML='<span><b>Demo</b> · aziende e importi di fantasia, i dati restano solo in questo browser</span><button type="button" id="demoReset" class="demo-btn">Ricomincia da capo</button>';
  document.body.prepend(s);
  let conf=false,t=null;
  s.querySelector("#demoReset").onclick=e=>{
    if(!conf){conf=true;e.target.textContent="Sicuro? Clicca di nuovo";t=setTimeout(()=>{conf=false;e.target.textContent="Ricomincia da capo"},4000);return}
    clearTimeout(t);ls.del(CHIAVE_DB);ls.set("crm.token",TOKEN);location.reload()};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",striscia);else striscia();
})();
