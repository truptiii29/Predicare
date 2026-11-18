(async()=>{
  // Abstract illustration (decorative, not data): two signals that diverge over time
  const sv=$("#hv");let a="",b="",dots="";
  for(let x=0;x<=460;x+=4){const t=x/460;a+=`${x?"L":"M"}${20+x},${230-30*Math.sin(t*9)-t*20}`;b+=`${x?"L":"M"}${20+x},${230-30*Math.sin(t*9+.6)-t*t*170}`}
  for(let i=0;i<9;i++)dots+=`<line x1="${20+i*57.5}" x2="${20+i*57.5}" y1="40" y2="350" stroke="#fff" stroke-opacity=".07"/>`;
  sv.innerHTML=`${dots}<path d="${a}" fill="none" stroke="#526BDB" stroke-width="3"/><path d="${b}" fill="none" stroke="#C3F36B" stroke-width="3"/><circle cx="480" cy="${230-170-0}" r="6" fill="#F28B72"/><text x="24" y="30" fill="#F4F1EA" font-family="DM Mono" font-size="11" opacity=".7">BASELINE → FOLLOW-UP</text><text x="24" y="384" fill="#F4F1EA" font-family="DM Mono" font-size="10" opacity=".5">abstract illustration · not plotted data</text>`;
  const [eda,cls]=await Promise.all([loadJSON("eda"),loadJSON("classification")]);
  const st=$("#stats");
  if(!eda)empty(st);else{const t=eda.totals;
    st.innerHTML=[[num(t.records),"records across 5 cohorts"],[num(t.unique_patients),"unique patients"],[num(t.eligible_cohort),"baseline-prediabetes patients"],[pct(t.progression_rate),`progressed to T2D (${num(t.progressed)})`],[t.n_features,"baseline features"]]
      .map(([v,l],i)=>`<div class="card ${i==3?"dark":""}"><div class="kpi"><strong>${v}</strong><small>${l}</small></div></div>`).join("");}
  const A=[["Logistic Regression","Classification","Interpretable baseline estimating progression probability."],["Random Forest","Classification","Tree ensemble capturing non-linear effects and interactions."],["XGBoost","Classification","Gradient-boosted trees suited to tabular data."],["SVM (RBF)","Classification","Non-linear kernel decision boundary."],["K-Means","Clustering","Hard partition of patients into baseline profiles."],["Gaussian Mixture","Clustering","Probabilistic soft clustering with AIC/BIC."],["Hidden Markov Model","Sequential","Hidden states across visits (exploratory)."]];
  $("#algos").innerHTML=A.map(([n,t,d])=>`<div class="card"><span class="tag ${t=="Classification"?"":t=="Clustering"?"lime":"coral"}">${t}</span><h3>${n}</h3><p class="note" style="border:0;margin:0;padding:0">${d}</p></div>`).join("");
})();
