(async()=>{
  const [r,cls]=await Promise.all([loadJSON("interpretation"),loadJSON("classification")]);
  const box=$("#report");
  if(!r||!r.available){empty(box,r&&r.message);return}
  const H=r.highest_by_metric,M=cls.models;
  const q=[["Highest recall",H.recall.model,f3(H.recall.value)+" (test)"],["Highest ROC-AUC",H.roc_auc.model,f3(H.roc_auc.value)+" (test)"],["Best F1-score",H.f1.model,f3(H.f1.value)+" (test)"],["Highest accuracy",H.accuracy.model,f3(H.accuracy.value)+" (test)"],["Most consistent in CV",r.most_consistent_cv,"std "+f3(M[r.most_consistent_cv].cv.roc_auc.std)+" of ROC-AUC across folds"]];
  box.innerHTML=`<div class="grid g3">${q.map(([a,b,c],i)=>`<div class="card ${i==0?"dark":""}"><span class="eyebrow">${a}</span><h3>${b}</h3><p class="note" style="border:0;margin:0;padding:0">${c}</p></div>`).join("")}</div>
  <div class="grid asym2" style="margin-top:2.5rem"><div><span class="eyebrow">Automated summary</span><h2>What the results say</h2></div><div><ul>${r.summary_lines.map(l=>`<li style="margin-bottom:.7rem">${l}</li>`).join("")}</ul><div class="warn"><b>Read with care</b>${r.caveat}</div></div></div>
  <div class="grid g2" style="margin-top:2.5rem"><div class="card"><h3>Which model should be investigated further?</h3><p>Because test-set differences are small, ${Object.keys(M).length>1?"the models should be compared with repeated cross-validation, hyper-parameter tuning and confidence intervals":"further validation is needed"} before preferring one over another. A model with higher recall (${H.recall.model}) may be preferable if missing progressors is the main concern.</p></div>
  <div class="card"><h3>Why recall matters here</h3><p>${r.tradeoffs.why_recall_matters}</p></div></div>
  <div class="grid g2" style="margin-top:1.25rem"><div class="card"><h3>False positives vs false negatives</h3><p><b>Recall</b> — ${r.tradeoffs.recall}</p><p><b>Precision</b> — ${r.tradeoffs.precision}</p><p>Raising recall (e.g. lowering the decision threshold) generally lowers precision. Class-balanced training already shifts these models toward recall: test precision stays near ${f3(Math.min(...Object.values(M).filter(m=>m.test).map(m=>m.test.precision)))}–${f3(Math.max(...Object.values(M).filter(m=>m.test).map(m=>m.test.precision)))}.</p></div>
  <div class="card"><h3>CV minus test ROC-AUC</h3><div id="gap" class="chart" style="min-height:260px"></div><p class="note">Positive = CV score above test score (optimism); near zero is reassuring.</p></div></div>
  <div style="margin-top:2.5rem"><span class="eyebrow">Limitations by model</span><h2>Where each model falls short</h2>${Object.entries(r.limitations).map(([n,t])=>`<details><summary>${n}</summary><p>${t}</p></details>`).join("")}</div>
  <div style="margin-top:2.5rem" class="warn"><b>Why not just accuracy?</b>Roughly ${pct(1-cls.test_prevalence)} of test patients do not progress, so a model that never predicts progression scores about that accuracy while detecting nobody. Clustering and HMM scores are measured differently and are never compared with these classification metrics.</div>`;
  const n=Object.keys(r.cv_minus_test_roc_auc);
  plot("gap",[{type:"bar",x:n,y:n.map(k=>r.cv_minus_test_roc_auc[k]),marker:{color:n.map(k=>MODEL_COLORS[k])},hovertemplate:"%{x}: %{y:.4f}<extra></extra>"}],{yaxis:{title:"CV − test ROC-AUC"},showlegend:false});
})();
