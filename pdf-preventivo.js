/* PDF del preventivo, sullo stesso schema del «Documento Master per Conto Formazione» di Ask Consulting.
   Si crea nel browser con jsPDF (file jspdf.umd.min.js accanto a questo): i numeri arrivano già calcolati dal riepilogo (pvCalcola di app.js), così PDF, Excel e riepilogo coincidono. */
"use strict";
(function(){
const LOGO="data:image/png;base64,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";
let jspdfPronto=null;
function caricaJsPDF(){return jspdfPronto||(jspdfPronto=new Promise((ok,ko)=>{
  if(window.jspdf)return ok(window.jspdf);
  const sc=document.createElement("script");sc.src="jspdf.umd.min.js";
  sc.onload=()=>ok(window.jspdf);sc.onerror=()=>{jspdfPronto=null;ko(new Error("Non riesco a caricare il generatore di PDF."))};
  document.head.appendChild(sc)}))}

// 1.902,59 €  ·  zero = «-   €» come nel modello
const eu=v=>{v=Math.round((Number(v)||0)*100)/100;if(!v)return "-   €";
  const s=Math.abs(v).toFixed(2).split("."),i=s[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");return (v<0?"-":"")+i+","+s[1]+" €"};
const dIt=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||"")?s.split("-").reverse().join("/"):(s||"");
const numTxt=v=>{const s=String(v==null?"":v).trim();return s};

// colonne (in punti, pagina A4 595 x 842)
const X=[56,127,342.6,408.8,461,518.6,568];
const BLU_BAR=[54,96,146], BLU_TOT=[31,73,125], BAND=[184,204,228], TOTDOC=[220,230,241], CHIARO=[235,245,255];

async function crea(p,c){
  const {jsPDF}=await caricaJsPDF();
  const num=v=>{let s=String(v==null?"":v).trim().replace(/[\s€]/g,"");if(s.indexOf(",")>=0)s=s.replace(/\./g,"").replace(",",".");const x=Number(s);return isFinite(x)?x:0};
  const doc=new jsPDF({unit:"pt",format:"a4"});
  const font=(stile,size,col)=>{doc.setFont("helvetica",stile||"normal");doc.setFontSize(size||6.8);doc.setTextColor(...(col||[0,0,0]))};
  const fill=(x1,y1,x2,y2,col)=>{doc.setFillColor(...col);doc.rect(x1,y1,x2-x1,y2-y1,"F")};
  const linea=(x1,y1,x2,y2,w)=>{doc.setDrawColor(0,0,0);doc.setLineWidth(w||0.6);doc.line(x1,y1,x2,y2)};
  // testo allineato in una cella: a = "l" | "c" | "r"; y = centro verticale
  const txt=(t,x1,x2,y,a,pad)=>{pad=pad==null?2.5:pad;t=String(t==null?"":t);if(!t)return;
    const x=a==="r"?x2-pad:a==="c"?(x1+x2)/2:x1+pad;doc.text(t,x,y,{align:a==="r"?"right":a==="c"?"center":"left",baseline:"middle"})};
  const righe=(t,w)=>t?doc.splitTextToSize(String(t),w):[];
  const multi=(ls,x1,x2,yc,a,lh)=>{const h=(ls.length-1)*lh;ls.forEach((l,k)=>txt(l,x1,x2,yc-h/2+k*lh,a))};
  const L=X[0],R=X[6], SP=1.3, sp=0.6;

  /* ---- intestazione ---- */
  let y=51;
  font("normal",6.8);multi(["Fondimpresa","Conto Formazione","aziendale"],X[0],X[1],y+24,"c",8.4);
  try{doc.addImage(LOGO,"PNG",442.3,55.2,89,38.3)}catch(e){}
  linea(L,y,R,y,SP);linea(X[1],y,X[1],118.6,SP);

  /* ---- barra blu: azienda, data, importo per il nuovo piano ---- */
  y=99;const yb=118.4;
  fill(L,y,R,yb,BLU_BAR);
  const nome=(p.aziende||[]).map(a=>a.nome).filter(Boolean).join(" + ")||"Azienda";
  font("italic",6.8,[255,255,255]);txt("Importo per nuovo Piano al",X[1],X[2],(y+yb)/2,"r",3);
  const labW=doc.getTextWidth("Importo per nuovo Piano al")+10;
  txt(dIt(p.dataPreventivo),X[2],X[3],(y+yb)/2,"l",2);
  font("bold",6.8,[255,255,255]);
  let nl=righe(nome,X[1]-X[0]-5);
  if(nl.length<=2)multi(nl,X[0],X[1],(y+yb)/2,"c",7.6);
  else{let fs=6.8;nl=righe(nome,X[2]-labW-X[0]-6);while(nl.length>2&&fs>5){fs-=0.4;doc.setFontSize(fs);nl=righe(nome,X[2]-labW-X[0]-6)}
    multi(nl.slice(0,2),X[0],X[2],(y+yb)/2,"l",fs+0.8)}
  font("bold",6.8,[255,255,255]);txt(eu(c.totale),X[3],X[4],(y+yb)/2,"r",4);
  linea(L,y,R,y,SP);[X[2],X[3],X[4]].forEach(x=>linea(x,y,x,150.1));

  /* ---- intestazione delle colonne ---- */
  y=yb;const yh=150.1;
  fill(X[3],y,X[4],yh,CHIARO);
  font("italic",6.8);
  txt("Docente / Fornitore",X[0],X[1],(y+yh)/2,"c");txt("Attività svolta",X[1],X[2],(y+yh)/2,"c");txt("Periodo",X[2],X[3],(y+yh)/2,"c");
  doc.setFontSize(6.1);txt("PREVENTIVO",X[3],X[4],(y+yh)/2,"c");
  doc.setFontSize(6.8);multi(["N. minimo","lavoratori in","formazione"],X[4],X[5],(y+yh)/2,"c",8.5);txt("Totale ore",X[5],X[6],(y+yh)/2,"c");
  linea(L,y,R,y);linea(X[1],y,X[1],yh);linea(X[5],y,X[5],yh);

  /* ---- DOCENZA ---- */
  y=yh;fill(L,y,R,169.1,BAND);font("normal",6.8);txt("DOCENZA",L,R,(y+169.1)/2,"l",1.5);linea(L,y,R,y);
  y=169.1;linea(L,y,R,y);
  const corsi=(p.corsi||[]).filter(co=>co.titolo||co.docente||num(co.ore)||(!co.residuo&&num(co.importo)));
  const per=corsi.map(co=>String(co.periodo||p.periodo||"").trim());
  const perUnico=corsi.length>1&&per.every(x=>x===per[0]);
  const y0Corsi=y;
  corsi.forEach((co,k)=>{
    const i=(p.corsi||[]).indexOf(co);
    font("normal",7.4);const dl=righe(co.docente||"",X[1]-X[0]-5);font("normal",8.2);const tl=righe(co.titolo||"",X[2]-X[1]-5);
    font("normal",6.8);const pl=perUnico?[]:righe(per[k],X[3]-X[2]-5);
    const h=Math.max(19.5,Math.max(tl.length,dl.length)*9.6+12,pl.length*8+10);
    if(y+h>780){doc.addPage();y=50;linea(L,y,R,y)}
    fill(X[3],y,X[4],y+h,CHIARO);
    const yc=y+h/2;
    font("normal",7.4);multi(dl,X[0],X[1],yc,"r",9);font("normal",8.2);multi(tl,X[1],X[2],yc,"l",9.6);
    font("normal",6.8);if(!perUnico)multi(pl,X[2],X[3],yc,"c",8);
    txt(eu(c.importi[i]),X[3],X[4],yc,"r",4);
    font("normal",7.6);txt(numTxt(co.partecipanti),X[4],X[5],yc,"c");font("normal",6.8);txt(numTxt(co.ore),X[5],X[6],yc,"c");
    [X[1],X[3],X[4],X[5]].forEach(x=>linea(x,y,x,y+h));
    linea(L,y+h,perUnico?X[2]:R,y+h);
    y+=h;
  });
  if(perUnico){linea(X[2],y0Corsi,X[2],y);font("normal",6.8);multi(righe(per[0],X[3]-X[2]-5),X[2],X[3],(y0Corsi+y)/2,"c",8);linea(X[2],y,R,y)}
  else if(corsi.length)linea(X[2],y0Corsi,X[2],y);
  // recupero spese
  let h=19.2;fill(X[3],y,X[4],y+h,CHIARO);font("normal",6.8);
  txt("Recupero spese",X[0],X[1],y+h/2,"c");txt("Spese forfettarie Azienda cliente",X[1],X[2],y+h/2,"l");txt(eu(c.recupero),X[3],X[4],y+h/2,"r",4);
  [X[1],X[2],X[3],X[4],X[5]].forEach(x=>linea(x,y,x,y+h));y+=h;linea(L,y,R,y);
  // totale docenza
  h=12;fill(L,y,R,y+h,TOTDOC);
  txt("Totale docenza importo finanziato",X[1],X[3],y+h/2,"r");txt(eu(c.docenza),X[3],X[4],y+h/2,"r",4);
  txt("Totale ore",X[4],X[5],y+h/2,"c");font("italic",6.8);txt(String(c.ore).replace(".",","),X[5],X[6],y+h/2,"c");
  [X[3],X[4],X[5]].forEach(x=>linea(x,y,x,y+h));y+=h;linea(L,y,R,y);

  /* ---- PROGETTAZIONE-GESTIONE-RENDICONTAZIONE ---- */
  h=19.2;fill(L,y,R,y+h,BAND);font("normal",6.8);txt("PROGETTAZIONE-GESTIONE-RENDICONTAZIONE",L,R,y+h/2,"l",1.5);y+=h;linea(L,y,R,y);
  [["Ask Consulting S.r.l.","Attività preparatorie e di accompagnamento",c.askPrep],
   ["Ask Consulting S.r.l.","Attività di gestione e rendicontazione",c.askGest],
   ["Revisore dei Conti","Attività di certificazione delle spese sostenute",c.revisore]].forEach(r=>{
    h=16.35;font("italic",6.8);txt(r[0],X[0],X[1],y+h/2,"l",1.5);font("normal",6.8);txt(r[1],X[1],X[2],y+h/2,"l",2);txt(eu(r[2]),X[3],X[4],y+h/2,"r",4);
    [X[1],X[2],X[3],X[4]].forEach(x=>linea(x,y,x,y+h));y+=h;linea(L,y,R,y)});
  const yTab=y;

  /* ---- totale del piano ---- */
  y+=3.8;h=21;fill(L,y,R,y+h,BLU_TOT);
  font("normal",7.6,[255,255,255]);txt("TOTALE PIANO FINANZIATO - RIMBORSO SPESE SOSTENUTE ------------)",X[1],X[3],y+h/2,"l",1.2);txt(eu(c.totalePiano),X[3],X[4],y+h/2,"r",4);
  linea(X[1],y,X[3],y);linea(X[1],y+h,X[3],y+h);linea(X[1],y,X[1],y+h);linea(X[3],y,X[3],y+h);
  // bordi esterni spessi della tabella
  linea(L,51,L,y+h,SP);linea(R,51,R,y+h,SP);linea(L,99,R,99,SP);
  y+=h;

  /* ---- piè di pagina con i dati di Ask ---- */
  y+=5.5;doc.setDrawColor(200,200,200);doc.setLineWidth(0.5);doc.line(131,y,493.5,y);
  y+=13.5;font("bold",5.6,[17,81,154]);txt("Ask Consulting S.r.l.",0,595.3,y,"c",0);
  font("normal",4.9,[29,29,27]);txt("Cuneo – Via Statuto, 8 – Tel: 0171 453820 – email: progetti@askconsulting.it",0,595.3,y+7.5,"c",0);
  txt("C.F e P.IVA 02923810044 – Registro Imprese di Cuneo n. 02923810044 – REA n. 247716",0,595.3,y+14.8,"c",0);

  /* ---- cronoprogramma (le date vuote si completano a mano) ---- */
  y+=29;const d=p.date||{};
  const cr=[["Presentazione Piano a Fondimpresa","entro il:",d.presentazione,13.2,0],["Avvio corsi di formazione","a partire da:",d.avvio,10,1],
    ["Scadenza termine corsi","entro il:",d.fine,10,0],["Rendicontazione e certificazione spese sostenute","entro il:",d.rendicontazione,10,0],
    ["Presentazione prossimo Piano di formazione Finanziato da Fondimpresa dal:","",d.prossimo,10,0]];
  const yc0=y;
  cr.forEach((r,k)=>{h=r[3];fill(L,y,X[3],y+h,TOTDOC);font(r[4]?"bold":"normal",6.8);txt(r[0],L,X[3],y+h/2,"l",1.5);
    if(r[1])txt(r[1],X[2],X[3],y+h/2,"l",1.5);txt(dIt(r[2]),X[3],R,y+h/2,"c");
    if(k===0||k===1)linea(L,y,R,y,SP);else if(k===4)linea(L,y,R,y,SP);else linea(X[3],y,R,y,SP);y+=h});
  linea(L,y,R,y,SP);linea(L,yc0,L,y,SP);linea(R,yc0,R,y,SP);linea(X[3],yc0,X[3],y,SP);

  return doc;
}

// nome del file: «Preventivo AZIENDA 17-11-2026.pdf»
function nomeFile(p){const n=(p.aziende||[]).map(a=>a.nome).filter(Boolean).join(" + ")||"azienda";
  return ("Preventivo "+n+" "+dIt(p.dataPreventivo).replace(/\//g,"-")).replace(/[\\/:*?"<>|]+/g,"_").slice(0,150).trim()+".pdf"}

window.pdfPreventivo=async function(p,c){
  const doc=await crea(p,c), nome=nomeFile(p), blob=doc.output("blob");
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=nome;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},4000);
  return nome;
};
window.pdfPreventivoBlob=async(p,c)=>(await crea(p,c)).output("blob");
})();
