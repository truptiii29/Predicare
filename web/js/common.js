/* PrediCare shared helpers: nav, data loading, chart defaults */
const PAGES=[["index.html","Home"],["study.html","Study design"],["analytics.html","Dataset analytics"],["models.html","Model comparison"],["interpretation.html","Interpretation"],["clustering.html","Clustering"],["hmm.html","HMM"],["features.html","Features"]];
const C={char:"#20272B",warm:"#F4F1EA",blue:"#526BDB",lime:"#C3F36B",coral:"#F28B72",white:"#FFFEFA",grey:"#8a949a"};
const MODEL_COLORS={"Logistic Regression":C.blue,"Random Forest":"#2f8f6b","XGBoost":C.coral,"SVM (RBF)":"#a08be8"};
const METRICS={accuracy:"Accuracy",precision:"Precision",recall:"Recall",f1:"F1-score",roc_auc:"ROC-AUC",pr_auc:"PR-AUC",specificity:"Specificity"};
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const f3=v=>v==null?"–":(+v).toFixed(3),pct=v=>v==null?"–":(100*v).toFixed(1)+"%",num=v=>v==null?"–":Number(v).toLocaleString();
const cache={};
async function loadJSON(name){
  if(cache[name])return cache[name];
  try{const r=await fetch(`../results/${name}.json`);if(!r.ok)throw new Error(r.status);return cache[name]=await r.json();}
  catch(e){return null}
}
function empty(el,msg){(typeof el==="string"?$(el):el).innerHTML=`<div class="empty"><b>No results available.</b> ${msg||"Run <code>python pipeline/run_all.py</code> to generate the JSON results, then serve the project with <code>python serve.py</code>."}</div>`}
function mountChrome(){
  const here=location.pathname.split("/").pop()||"index.html";
  $("#chrome-top").innerHTML=`<header class="top"><div class="wrap bar"><a class="brand" href="index.html"><i></i>PrediCare</a><button class="burger" aria-label="Menu" id="burger">Menu</button><nav class="main" id="nav">${PAGES.map(([h,t])=>`<a href="${h}" class="${h===here?"on":""}">${t}</a>`).join("")}</nav></div></header>`;
  $("#burger").onclick=()=>$("#nav").classList.toggle("open");
  $("#chrome-foot").innerHTML=`<footer><div class="wrap"><span><b>PrediCare</b> — academic machine-learning research demonstration. Not a medical diagnosis system.</span><span class="mono">All figures are computed from the supplied datasets by <code>pipeline/run_all.py</code>.</span></div></footer>`;
}
const baseLayout=(o={})=>Object.assign({font:{family:"Space Grotesk, sans-serif",color:C.char,size:12},paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",margin:{l:56,r:20,t:40,b:50},legend:{orientation:"h",y:-0.22},hoverlabel:{font:{family:"DM Mono"}},xaxis:{gridcolor:"rgba(32,39,43,.08)",zeroline:false},yaxis:{gridcolor:"rgba(32,39,43,.08)",zeroline:false}},o);
const plot=(id,data,layout={},cfg={})=>Plotly.newPlot(id,data,baseLayout(layout),Object.assign({responsive:true,displaylogo:false},cfg));
const div=(heat)=>heat;
function card(title,id,note,cls=""){return `<div class="card ${cls}"><h3>${title}</h3><div id="${id}" class="chart"></div><p class="note">${note||""}</p></div>`}
const heatScale=[[0,C.blue],[.5,C.white],[1,C.coral]];
document.addEventListener("DOMContentLoaded",mountChrome);
