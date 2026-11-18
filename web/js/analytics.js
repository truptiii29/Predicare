(async()=>{
  const eda=await loadJSON("eda");const box=$("#charts");
  if(!eda){empty(box);return}
  const H=eda.histograms,B=eda.boxplots_by_outcome,pc=eda.per_cohort;
  const defs=[["records","1 · Records by cohort","c1","Rows per workbook. Every patient contributes two rows, so the larger cohorts simply followed more patients."],
   ["patients","2 · Unique patients by cohort","c2","Patients are not shared across cohorts (no ID appears in more than one workbook)."],
   ["prog","3 · Progression vs non-progression","c3",`Overall <b>${pct(eda.totals.progression_rate)}</b> of eligible patients progressed (${num(eda.totals.progressed)} of ${num(eda.totals.eligible_cohort)}) — a moderately imbalanced outcome, which is why accuracy alone is misleading.`],
   ["miss","4 · Missing values by feature","c4","Share of eligible patients with a missing baseline value; these are median-imputed inside training folds."],
   ...[["Age","5 · Age distribution","c5","years"],["BMI","6 · BMI distribution","c6","kg/m²"],["Glucose","7 · Glucose distribution","c7","mmol/L (as recorded)"],["HbA1c","8 · HbA1c distribution","c8","%"]].map(([k,t,id,u])=>[k,t,id,""]),
   ["bp","9 · Blood pressure distribution","c9","Systolic and diastolic values for all eligible patients."],["Heart Rate","10 · Heart rate distribution","c10",""],
   ["box","11 · Outlier analysis (boxplot)","c11",""],["corr","12 · Feature correlation heatmap","c12","Pearson correlations between baseline features and the outcome (blue negative, coral positive). Correlation is association, not causation."]];
  box.innerHTML=defs.map(([k,t,id,n])=>{const cls=(k=="box"||k=="corr")?"":"";return `<div class="card" ${k=="corr"?'style="grid-column:1/-1"':""}><h3>${t}</h3>${k=="box"?'<div class="controls"><select id="bsel"></select></div>':""}<div id="${id}" class="chart ${k=="corr"?"tall":""}"></div><p class="note" id="n-${id}">${n}</p></div>`}).join("");
  const x=pc.map(r=>r.followup_years+"-year");
  plot("c1",[{type:"bar",x,y:pc.map(r=>r.records),marker:{color:C.char},hovertemplate:"%{x}: %{y:,} records<extra></extra>"}],{xaxis:{title:"Cohort"},yaxis:{title:"Records"}});
  plot("c2",[{type:"bar",x,y:pc.map(r=>r.unique_patients),marker:{color:C.blue},hovertemplate:"%{x}: %{y:,} patients<extra></extra>"}],{xaxis:{title:"Cohort"},yaxis:{title:"Unique patients"}});
  plot("c3",[{type:"bar",name:"No progression",x,y:pc.map(r=>r.not_progressed),marker:{color:C.blue}},{type:"bar",name:"Progressed to T2D",x,y:pc.map(r=>r.progressed),marker:{color:C.coral}}],{barmode:"stack",xaxis:{title:"Cohort"},yaxis:{title:"Eligible patients"}});
  const rates=pc.map(r=>pct(r.progression_rate)).join(", ");$("#n-c3").innerHTML+=` Progression rate by cohort (4→8 y): ${rates}.`;
  const mf=eda.missing_by_feature;plot("c4",[{type:"bar",orientation:"h",y:mf.map(m=>m.feature),x:mf.map(m=>m.missing_pct),marker:{color:mf.map(m=>m.missing_pct>10?C.coral:C.blue)},customdata:mf.map(m=>m.missing_n),hovertemplate:"%{y}: %{x:.1f}% (%{customdata} patients)<extra></extra>"}],{xaxis:{title:"Missing (%)"},yaxis:{autorange:"reversed"},margin:{l:110,r:20,t:20,b:50}});
  const hmax=mf.reduce((a,b)=>a.missing_pct>b.missing_pct?a:b);$("#n-c4").innerHTML=`<b>${hmax.feature}</b> has the most missing data (${hmax.missing_pct.toFixed(1)}%); other features are mostly complete. Share of eligible patients with a missing baseline value; median-imputed within training folds.`;
  const hist=(id,name,unit)=>{const h=H[name],mid=h.edges.slice(0,-1).map((e,i)=>(e+h.edges[i+1])/2),w=h.edges[1]-h.edges[0];
    plot(id,[{type:"bar",name:"No progression",x:mid,y:h.groups["No progression"],marker:{color:C.blue},opacity:.75,width:w*.95},{type:"bar",name:"Progressed",x:mid,y:h.groups["Progressed"],marker:{color:C.coral},opacity:.75,width:w*.95}],{barmode:"overlay",xaxis:{title:`${name} ${unit?`(${unit})`:""}`},yaxis:{title:"Patients"}});
    const b=B[name];if(b)$("#n-"+id).innerHTML=`Median ${name}: <b>${b["No progression"].median.toFixed(1)}</b> (no progression) vs <b>${b["Progressed"].median.toFixed(1)}</b> (progressed). Overlapping distributions mean no single value separates the groups perfectly.`};
  hist("c5","Age","years");hist("c6","BMI","kg/m²");hist("c7","Glucose","");hist("c8","HbA1c","%");hist("c10","Heart Rate","bpm");
  const bp=(n,col)=>{const h=H[n],mid=h.edges.slice(0,-1).map((e,i)=>(e+h.edges[i+1])/2);return{type:"bar",name:n,x:mid,y:h.groups["No progression"].map((v,i)=>v+h.groups["Progressed"][i]),marker:{color:col},opacity:.7}};
  plot("c9",[bp("SBP",C.char),bp("DBP",C.lime)],{barmode:"overlay",xaxis:{title:"Blood pressure (mmHg)"},yaxis:{title:"Patients"}});
  $("#n-c9").innerHTML+=` Median SBP ${eda.boxplots.SBP.median.toFixed(0)} and DBP ${eda.boxplots.DBP.median.toFixed(0)} mmHg.`;
  const bs=$("#bsel");bs.innerHTML=Object.keys(B).map(k=>`<option>${k}</option>`).join("");
  const drawBox=()=>{const f=bs.value,tr=[];["No progression","Progressed"].forEach((g,i)=>{const s=B[f][g],col=i?C.coral:C.blue;
    tr.push({type:"box",name:g,x:[g],q1:[s.q1],median:[s.median],q3:[s.q3],lowerfence:[s.lower_whisker],upperfence:[s.upper_whisker],marker:{color:col},line:{color:col},boxpoints:false});
    tr.push({type:"scatter",mode:"markers",name:g+" outliers",x:s.outliers_sample.map(()=>g),y:s.outliers_sample,marker:{color:col,opacity:.5,size:5},showlegend:false,hovertemplate:"%{y}<extra>outlier</extra>"})});
    plot("c11",tr,{yaxis:{title:f},xaxis:{title:"Outcome"}});
    const a=B[f]["No progression"],b=B[f]["Progressed"];$("#n-c11").innerHTML=`Outliers (beyond 1.5×IQR) in <b>${f}</b>: ${a.n_outliers} (${a.outlier_pct.toFixed(1)}%) in non-progressors, ${b.n_outliers} (${b.outlier_pct.toFixed(1)}%) in progressors. Up to 60 outlier points are drawn per group. Outliers are retained; only physiologically impossible values were blanked earlier.`};
  bs.onchange=drawBox;drawBox();
  const L=eda.correlation.labels,M=eda.correlation.matrix;
  plot("c12",[{type:"heatmap",z:M,x:L,y:L,zmin:-1,zmax:1,colorscale:heatScale,text:M.map(r=>r.map(v=>v.toFixed(2))),texttemplate:"%{text}",hovertemplate:"%{y} × %{x}: %{z:.2f}<extra></extra>"}],{yaxis:{autorange:"reversed"},margin:{l:110,r:20,t:20,b:90}});
})();
