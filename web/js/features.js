(async()=>{
  const [imp,cls]=await Promise.all([loadJSON("importance"),loadJSON("classification")]),body=$("#body");
  if(!imp){empty(body);return}
  const F=imp.features,ms=Object.keys(imp.model_specific),ps=Object.keys(imp.permutation),sel=cls&&cls.selection.selected;
  const top=(v)=>F[v.map(Math.abs).indexOf(Math.max(...v.map(Math.abs)))];
  body.innerHTML=`<div class="grid g3">${F.map((f,i)=>`<div class="card"><span class="tag">${String(i+1).padStart(2,"0")}</span><h3>${f}</h3></div>`).join("")}</div>
  <div class="grid g2" style="margin-top:1.25rem"><div class="card"><div class="controls"><select id="m1">${ms.map(m=>`<option>${m}</option>`).join("")}</select></div><h3>Model-specific importance</h3><div id="f1" class="chart"></div><p class="note" id="n1"></p></div>
  <div class="card"><div class="controls"><select id="m2">${ps.map(m=>`<option ${m===sel?"selected":""}>${m}</option>`).join("")}</select></div><h3>Permutation importance (test set)</h3><div id="f2" class="chart"></div><p class="note" id="n2"></p></div></div>
  <div class="grid g2" style="margin-top:1.25rem" id="shapbox"></div>
  <div class="grid g2" style="margin-top:1.25rem"><div class="card"><h3>Clinical research interpretation</h3><div id="interp"></div></div><div class="warn"><b>Association is not causation</b>Importance scores show which inputs a model relies on to separate progressors from non-progressors in this cohort. They do not show that changing a feature would change the outcome, and they are affected by correlated features (e.g. SBP, DBP and pulse pressure overlap by construction), missing data and the single train/test split.</div></div>`;
  const d1=()=>{const m=$("#m1").value,e=imp.model_specific[m],o=e.values.map((v,i)=>i).sort((a,b)=>Math.abs(e.values[a])-Math.abs(e.values[b]));
    plot("f1",[{type:"bar",orientation:"h",y:o.map(i=>F[i]),x:o.map(i=>e.values[i]),marker:{color:o.map(i=>e.values[i]>=0?C.blue:C.coral)},hovertemplate:"%{y}: %{x:.3f}<extra></extra>"}],{xaxis:{title:e.type},margin:{l:110,r:20,t:20,b:60}});
    $("#n1").innerHTML=`Largest for ${m}: <b>${top(e.values)}</b>. ${m==="Logistic Regression"?"Coefficients are per 1 SD of the feature; blue raises, coral lowers the log-odds of progression.":"Tree importances are non-negative and measure how much a feature reduces impurity or loss, not direction."}`};
  const d2=()=>{const m=$("#m2").value,e=imp.permutation[m],o=e.mean.map((v,i)=>i).sort((a,b)=>e.mean[a]-e.mean[b]);
    plot("f2",[{type:"bar",orientation:"h",y:o.map(i=>F[i]),x:o.map(i=>e.mean[i]),error_x:{type:"data",array:o.map(i=>e.std[i]),color:C.char},marker:{color:C.blue},hovertemplate:"%{y}: %{x:.4f}<extra></extra>"}],{xaxis:{title:"Drop in test ROC-AUC"},margin:{l:110,r:20,t:20,b:60}});
    $("#n2").innerHTML=`${e.metric}. Most important for ${m}: <b>${top(e.mean)}</b>. Values near zero (or slightly negative) mean the model barely uses that feature.`};
  $("#m1").onchange=d1;$("#m2").onchange=d2;d1();d2();
  const sb=$("#shapbox"),s=imp.shap;
  if(s&&s.mean_abs){sb.innerHTML=card(`SHAP mean |value| — ${s.model}`,"f3","Average absolute contribution to the model's output on test patients (tree explainer).")+card("SHAP value distribution","f4","Each dot is a test patient. Position = effect on prediction; colour = the (standardised) feature value. Dots are subsampled.");
    const o=s.mean_abs.map((v,i)=>i).sort((a,b)=>s.mean_abs[a]-s.mean_abs[b]);
    plot("f3",[{type:"bar",orientation:"h",y:o.map(i=>F[i]),x:o.map(i=>s.mean_abs[i]),marker:{color:C.char}}],{xaxis:{title:"Mean |SHAP|"},margin:{l:110,r:20,t:20,b:60}});
    plot("f4",o.map(i=>{const p=s.beeswarm[i].points;return{type:"scattergl",mode:"markers",y:p.map((_,j)=>F[i]+""),x:p.map(q=>q.shap),marker:{color:p.map(q=>q.value),colorscale:[[0,C.blue],[.5,"#d9d4c7"],[1,C.coral]],cmin:-2.5,cmax:2.5,size:5,opacity:.75,showscale:false},showlegend:false,hovertemplate:F[i]+"<br>SHAP %{x:.3f}<extra></extra>"}}),{xaxis:{title:"SHAP value (impact on model output)"},yaxis:{type:"category",categoryorder:"array",categoryarray:o.map(i=>F[i])},margin:{l:110,r:20,t:20,b:60}});
  }else sb.innerHTML=`<div class="empty">SHAP analysis was not computed${s&&s.status?": "+s.status:""}.</div>`;
  const cands=[["permutation importance ("+sel+")",imp.permutation[sel]&&top(imp.permutation[sel].mean)],["SHAP ("+(s&&s.model)+")",s&&s.mean_abs&&top(s.mean_abs)],...ms.map(m=>[m,top(imp.model_specific[m].values)])].filter(x=>x[1]);
  $("#interp").innerHTML=`<p>Top feature by method:</p><ul>${cands.map(([a,b])=>`<li>${a}: <b>${b}</b></li>`).join("")}</ul><p>Agreement across methods strengthens the evidence that a feature carries predictive signal; disagreement usually reflects correlated features or method differences. Glycaemic measures (glucose, HbA1c) are expected to dominate because progression to diabetes is defined by glycaemic status — which also means the model may largely rediscover how diabetes is diagnosed rather than uncover new risk factors.</p>`;
})();
