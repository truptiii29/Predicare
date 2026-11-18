(async()=>{
  const k=await loadJSON("clustering"),body=$("#body");
  if(!k){empty(body);return}
  const cand=k.candidates,KM=cand.filter(r=>r.model==="K-Means"),GM=cand.filter(r=>r.model==="GMM"),sk=k.selected["K-Means"].k,sg=k.selected["GMM"].k;
  const cc=["#526BDB","#C3F36B","#F28B72","#2f8f6b","#a08be8","#e0b84a"];
  const C_=(id,t,n,cls="")=>card(t,id,n,cls);
  body.innerHTML=`<div class="warn" style="margin-bottom:2rem"><b>Exploratory only</b>${k.note} Cluster labels are arbitrary numbers and have not been matched to clinical categories.</div>
  <span class="eyebrow">K-Means</span><h2>Partitioning by baseline profile</h2>
  <div class="grid g2">${C_("e1","Elbow method — inertia vs k",`Inertia always falls as k grows; look for the bend. Notebook selects k by silhouette instead: <b>k = ${sk}</b>.`)}${C_("e2","Silhouette score vs k",`Higher is better (max 1). Best K-Means silhouette is <b>${f3(k.selected["K-Means"].silhouette)}</b> at k = ${sk}, which indicates weakly separated clusters — patients form a continuum rather than distinct groups.`)}
  ${C_("e3",`PCA projection (K-Means, k=${sk})`,`First two principal components explain ${pct(k.pca.explained_variance[0]+k.pca.explained_variance[1])} of variance. ${k.pca.points.length} of ${num(k.pca.n_total)} patients are plotted (random sample).`)}${C_("e4","Cluster-size distribution",`Patients per K-Means cluster.`)}</div>
  <div class="card" style="margin-top:1.25rem"><h3>K-Means cluster profile heatmap</h3><div id="e5" class="chart"></div><p class="note" id="n-e5"></p></div>
  <hr style="border:0;border-top:1px solid var(--line);margin:3rem 0"><span class="eyebrow">Gaussian Mixture Model</span><h2>Probabilistic membership</h2>
  <div class="grid g2">${C_("g1","AIC vs components","Lower is better. AIC penalises complexity less than BIC and tends to favour more components.")}${C_("g2","BIC vs components",`Lower is better. Notebook selects <b>${sg} components</b> by lowest BIC.`)}
  ${C_("g3","Silhouette: K-Means vs GMM","Same metric for both methods at each k; higher is better.")}${C_("g4","Highest membership probability per patient",`Mean max probability is <b>${f3(k.gmm_membership.mean_max_probability)}</b>; ${pct(k.gmm_membership["share_above_0.9"])} of patients are assigned with probability above 0.9. High values mean confident assignments, not clinically meaningful groups.`)}
  ${C_("g5",`PCA projection (GMM, ${sg} components)`,"Marker opacity follows the patient's highest membership probability (lighter = less certain).")}${C_("g6","GMM component sizes","Patients per component (hard assignment).")}</div>
  <div class="card" style="margin-top:1.25rem"><h3>GMM component profile heatmap</h3><div id="g7" class="chart"></div></div>
  <hr style="border:0;border-top:1px solid var(--line);margin:3rem 0"><span class="eyebrow">K-Means vs GMM</span><h2>Which grouping is better?</h2>
  <div class="controls"><span class="mono">Compare at k =</span><select id="ksel">${KM.map(r=>`<option ${r.k===sk?"selected":""}>${r.k}</option>`).join("")}</select></div><div class="card"><div class="scroll" id="cmp"></div><p class="note" id="n-cmp"></p></div>`;
  plot("e1",[{type:"scatter",mode:"lines+markers",x:KM.map(r=>r.k),y:KM.map(r=>r.inertia),line:{color:C.blue},marker:{size:8},hovertemplate:"k=%{x}: %{y:.0f}<extra></extra>"}],{xaxis:{title:"Number of clusters (k)",dtick:1},yaxis:{title:"Inertia (within-cluster sum of squares)"}});
  plot("e2",[{type:"scatter",mode:"lines+markers",x:KM.map(r=>r.k),y:KM.map(r=>r.silhouette),line:{color:C.blue},marker:{size:8}}],{xaxis:{title:"Number of clusters (k)",dtick:1},yaxis:{title:"Silhouette"}});
  const pts=k.pca.points,scat=(key,n,op)=>Array.from({length:n},(_,c)=>{const p=pts.filter(q=>q[key]===c);return{type:"scattergl",mode:"markers",name:"Cluster "+c,x:p.map(q=>q.x),y:p.map(q=>q.y),marker:{color:cc[c%6],size:6,opacity:op?p.map(q=>.25+.75*q.gmm_maxprob):.7},hovertemplate:"PC1 %{x:.2f}, PC2 %{y:.2f}<extra>Cluster "+c+"</extra>"}});
  plot("e3",scat("kmeans",sk),{xaxis:{title:"PC1"},yaxis:{title:"PC2"}});
  plot("g5",scat("gmm",sg,true),{xaxis:{title:"PC1"},yaxis:{title:"PC2"}});
  const sizes=(id,P)=>plot(id,[{type:"bar",x:P.clusters.map(c=>"Cluster "+c),y:P.sizes,marker:{color:P.clusters.map(c=>cc[c%6])},text:P.sizes,textposition:"outside",hovertemplate:"%{x}: %{y} patients<extra></extra>"}],{yaxis:{title:"Patients"},showlegend:false});
  sizes("e4",k.kmeans_profiles);sizes("g6",k.gmm_profiles);
  const heat=(id,P)=>plot(id,[{type:"heatmap",z:P.zscores,x:P.features,y:P.clusters.map(c=>`Cluster ${c} (n=${P.sizes[c]}, ${pct(P.progression_rate[c])} progressed)`),zmin:-2,zmax:2,colorscale:heatScale,text:P.means.map(r=>r.map(v=>v.toFixed(1))),texttemplate:"%{text}",hovertemplate:"%{y}<br>%{x}: mean %{text} (z=%{z:.2f})<extra></extra>"}],{yaxis:{autorange:"reversed"},margin:{l:230,r:20,t:20,b:80}});
  heat("e5",k.kmeans_profiles);heat("g7",k.gmm_profiles);
  const P=k.kmeans_profiles,hi=P.progression_rate.indexOf(Math.max(...P.progression_rate)),lo=P.progression_rate.indexOf(Math.min(...P.progression_rate));
  $("#n-e5").innerHTML=`Colour = feature mean in the cluster relative to the whole cohort (z-score); printed numbers are original-unit means. Observed progression ranges from ${pct(P.progression_rate[lo])} (cluster ${lo}) to ${pct(P.progression_rate[hi])} (cluster ${hi}) — shown for description only, since outcome was not used to form clusters.`;
  plot("g1",[{type:"scatter",mode:"lines+markers",x:GM.map(r=>r.k),y:GM.map(r=>r.aic),line:{color:C.coral},marker:{size:8}}],{xaxis:{title:"Components",dtick:1},yaxis:{title:"AIC"}});
  plot("g2",[{type:"scatter",mode:"lines+markers",x:GM.map(r=>r.k),y:GM.map(r=>r.bic),line:{color:C.coral},marker:{size:8}}],{xaxis:{title:"Components",dtick:1},yaxis:{title:"BIC"}});
  plot("g3",[{type:"scatter",mode:"lines+markers",name:"K-Means",x:KM.map(r=>r.k),y:KM.map(r=>r.silhouette),line:{color:C.blue}},{type:"scatter",mode:"lines+markers",name:"GMM",x:GM.map(r=>r.k),y:GM.map(r=>r.silhouette),line:{color:C.coral}}],{xaxis:{title:"k / components",dtick:1},yaxis:{title:"Silhouette"}});
  const h=k.gmm_membership.histogram;plot("g4",[{type:"bar",x:h.counts.map((_,i)=>`${h.edges[i].toFixed(1)}–${h.edges[i+1].toFixed(1)}`),y:h.counts,marker:{color:C.coral}}],{xaxis:{title:"Max membership probability"},yaxis:{title:"Patients"},showlegend:false});
  const rows=[["silhouette","Silhouette (↑)",1],["davies_bouldin","Davies–Bouldin (↓)",-1],["calinski_harabasz","Calinski–Harabasz (↑)",1]];
  const draw=()=>{const kk=+$("#ksel").value,a=KM.find(r=>r.k===kk),b=GM.find(r=>r.k===kk);
    $("#cmp").innerHTML=`<table><tr><th>Metric</th><th>K-Means</th><th>GMM</th><th>Better</th></tr>${rows.map(([m,l,d])=>{const w=(a[m]-b[m])*d>0?"K-Means":"GMM";return `<tr><td>${l}</td><td>${a[m].toFixed(3)}</td><td>${b[m].toFixed(3)}</td><td><span class="tag ${w==="GMM"?"coral":""}">${w}</span></td></tr>`}).join("")}<tr><td>Inertia (K-Means only)</td><td>${a.inertia.toFixed(0)}</td><td>–</td><td>n/a</td></tr><tr><td>AIC / BIC (GMM only)</td><td>–</td><td>${b.aic.toFixed(0)} / ${b.bic.toFixed(0)}</td><td>n/a</td></tr></table>`;
    $("#n-cmp").innerHTML=`At k = ${kk}. Each metric rewards a different property, so there is no single winner. Selected models differ in size (K-Means k=${sk}, GMM ${sg} components), so their notebook-selected scores are not like-for-like. Agreement between the two selected partitions (adjusted Rand index): <b>${f3(k.agreement.adjusted_rand_index)}</b> (1 = identical, 0 = chance). AIC/BIC apply only to the GMM; inertia only to K-Means.`};
  $("#ksel").onchange=draw;draw();
})();
