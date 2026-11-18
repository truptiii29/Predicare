(async()=>{
  const cls=await loadJSON("classification");
  if(!cls){empty("#cards");return}
  const M=cls.models,names=Object.keys(M),ok=names.filter(n=>M[n].status==="trained");
  const failed=names.filter(n=>!ok.includes(n));
  $("#cards").innerHTML=names.map(n=>{const e=M[n];
    return e.status!=="trained"?`<div class="card"><h3>${n}</h3><div class="empty">${e.status}</div></div>`:
    `<div class="card"><span class="tag">Classifier</span><h3>${n}</h3><div class="kpi"><strong>${f3(e.test.roc_auc)}</strong><small>test ROC-AUC</small></div><p class="note">CV ROC-AUC ${f3(e.cv.roc_auc.mean)} ± ${f3(e.cv.roc_auc.std)}<br>Recall ${f3(e.test.recall)} · Precision ${f3(e.test.precision)}</p></div>`}).join("");
  let metric="recall";
  $("#seg").innerHTML=Object.entries(METRICS).filter(([k])=>["accuracy","precision","recall","f1","roc_auc","pr_auc","specificity"].includes(k)).map(([k,v])=>`<button data-m="${k}" class="${k===metric?"on":""}">${v}</button>`).join("");
  const barTrace=(m)=>[{type:"bar",name:"Test",x:ok,y:ok.map(n=>M[n].test[m]),marker:{color:ok.map(n=>MODEL_COLORS[n])},text:ok.map(n=>f3(M[n].test[m])),textposition:"outside",hovertemplate:"%{x}<br>test "+METRICS[m]+": %{y:.3f}<extra></extra>"}];
  const drawBar=()=>{plot("c-bar",barTrace(metric),{yaxis:{title:METRICS[metric],range:[0,1.05]},xaxis:{title:"Classifier"},showlegend:false});$("#t-bar").textContent="Test "+METRICS[metric]+" by classifier";
    $("#n-bar").textContent=`Scores are measured on ${cls.split.test} held-out test patients; small gaps may be within sampling noise.`};
  $$("#seg button").forEach(b=>b.onclick=()=>{metric=b.dataset.m;$$("#seg button").forEach(x=>x.classList.toggle("on",x===b));drawBar();drawCV()});
  const drawCV=()=>{const key=metric;const cvm=ok.map(n=>M[n].cv[key]);
    plot("c-cvtest",[{type:"bar",name:"CV mean (5-fold)",x:ok,y:cvm.map(c=>c.mean),error_y:{type:"data",array:cvm.map(c=>c.std),color:C.char},marker:{color:C.char}},{type:"bar",name:"Held-out test",x:ok,y:ok.map(n=>M[n].test[key]),marker:{color:C.lime}}],{barmode:"group",yaxis:{title:METRICS[key],range:[0,1.05]},xaxis:{title:"Classifier"}})};
  drawBar();drawCV();
  plot("c-roc",[...ok.map(n=>({type:"scatter",mode:"lines",name:`${n} (AUC ${f3(M[n].test.roc_auc)})`,x:M[n].roc_curve.fpr,y:M[n].roc_curve.tpr,line:{color:MODEL_COLORS[n],width:2.5}})),{type:"scatter",mode:"lines",name:"Random",x:[0,1],y:[0,1],line:{dash:"dash",color:C.grey}}],{xaxis:{title:"False-positive rate (1 − specificity)"},yaxis:{title:"True-positive rate (recall)"}});
  plot("c-pr",[...ok.map(n=>({type:"scatter",mode:"lines",name:`${n} (AP ${f3(M[n].test.pr_auc)})`,x:M[n].pr_curve.recall,y:M[n].pr_curve.precision,line:{color:MODEL_COLORS[n],width:2.5}})),{type:"scatter",mode:"lines",name:"Prevalence baseline",x:[0,1],y:[cls.test_prevalence,cls.test_prevalence],line:{dash:"dash",color:C.grey}}],{xaxis:{title:"Recall"},yaxis:{title:"Precision",range:[0,1.02]}});
  $("#n-pr").innerHTML=`The dashed line is the no-skill baseline (progression prevalence ${pct(cls.test_prevalence)} in the test set). Curves are computed on predicted probabilities at all thresholds; the confusion matrices use the default 0.5 threshold.`;
  const sel=$("#msel");sel.innerHTML=ok.map(n=>`<option>${n}</option>`).join("");
  const drawCM=()=>{const n=sel.value,c=M[n].confusion_matrix,z=[[c.tn,c.fp],[c.fn,c.tp]];
    plot("c-cm",[{type:"heatmap",z,x:["Predicted: no progression","Predicted: progressed"],y:["Actual: no progression","Actual: progressed"],colorscale:[[0,C.white],[1,C.blue]],showscale:false,text:[["TN "+c.tn,"FP "+c.fp],["FN "+c.fn,"TP "+c.tp]],texttemplate:"%{text}",textfont:{size:18,family:"DM Mono"},hovertemplate:"%{y} / %{x}: %{z}<extra></extra>"}],{yaxis:{autorange:"reversed"},margin:{l:150,r:20,t:20,b:80}});
    $("#n-cm").innerHTML=`<b>${n}</b>: ${c.fn} of ${c.fn+c.tp} actual progressors were missed (false negatives); ${c.fp} of ${c.fp+c.tn} non-progressors were flagged (false positives). Specificity ${f3(M[n].test.specificity)}.`};
  sel.onchange=drawCM;drawCM();
  const ths=[["accuracy","Acc"],["precision","Prec"],["recall","Rec"],["f1","F1"],["roc_auc","ROC-AUC"],["pr_auc","PR-AUC"]];
  const cols=[...ths.map(([k,l])=>["cv",k,"CV "+l]),...ths.map(([k,l])=>["test",k,"Test "+l]),["test","specificity","Test Spec"]];
  $("#tbl").innerHTML=`<table><tr><th>Model</th>${cols.map(c=>`<th>${c[2]}</th>`).join("")}</tr>${ok.map(n=>`<tr>${`<td>${n}</td>`+cols.map(([s,k])=>`<td>${f3(s==="cv"?M[n].cv[k].mean:M[n].test[k])}</td>`).join("")}</tr>`).join("")}</table>`;
  const six=[["accuracy","Accuracy"],["precision","Precision"],["recall","Recall"],["f1","F1-score"],["roc_auc","ROC-AUC"],["pr_auc","PR-AUC"]];
  $("#small").innerHTML=six.map(([k,l])=>`<div class="card"><h3>Test ${l} comparison</h3><div id="s-${k}" class="chart" style="min-height:260px"></div></div>`).join("");
  six.forEach(([k,l])=>plot("s-"+k,barTrace(k),{yaxis:{title:l,range:[0,1.05]},showlegend:false,margin:{l:50,r:10,t:10,b:70}}));
  $("#dl").onclick=()=>{const L=["# PrediCare model comparison report","","Generated from results/classification.json.",`Split: train ${cls.split.train}, validation ${cls.split.validation}, test ${cls.split.test}.`,"","| Model | "+cols.map(c=>c[2]).join(" | ")+" |","|---|"+cols.map(()=>"---").join("|")+"|",...ok.map(n=>`| ${n} | `+cols.map(([s,k])=>f3(s==="cv"?M[n].cv[k].mean:M[n].test[k])).join(" | ")+" |"),"","Research demonstration only; not a medical diagnosis system."];
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([L.join("\n")],{type:"text/markdown"}));a.download="predicare_model_comparison.md";a.click()};
  if(failed.length)$("#cards").insertAdjacentHTML("afterend",`<div class="wrap"><div class="warn"><b>Failed models</b>${failed.map(n=>`${n}: ${M[n].status}`).join("<br>")}</div></div>`);
})();
