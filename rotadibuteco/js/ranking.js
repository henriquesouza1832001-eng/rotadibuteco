async function getRankingDados(){
  if(!vistaGlobal&&grupoAtual){
    if(cacheGrupoRanking[grupoAtual]&&(Date.now()-cacheGrupoRanking[grupoAtual].ts)<60000)return cacheGrupoRanking[grupoAtual].dados;
    const grupoDoc=await db.collection('grupos').doc(grupoAtual).get();
    const membros=grupoDoc.data()?.membros||[];
    const lotes=[];
    for(let i=0;i<membros.length;i+=10)lotes.push(membros.slice(i,i+10));
    const dados=[];
    for(const lote of lotes){
      const snap=await db.collection('ranking')
        .where(firebase.firestore.FieldPath.documentId(),'in',lote).get();
      snap.docs.forEach(d=>dados.push(d.data()));
    }
    cacheGrupoRanking[grupoAtual]={dados,ts:Date.now()};
    return dados;
  }
  if(cacheRanking&&(Date.now()-cacheRanking.ts)<300000)return cacheRanking.dados;
  const snap=await db.collection('ranking').orderBy('totalVisitas','desc').limit(100).get();
  const dados=snap.docs.map(d=>d.data()).filter(d=>d.totalVisitas>0);
  cacheRanking={dados,ts:Date.now()};
  return dados;
}
async function renderRankingAtivo(){
  const cont=document.getElementById('rankingConteudo');
  cont.innerHTML='<div class="empty"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  const cfg=RANKING_CONFIGS[rankingAtivo];
  try{
    const dados=await getRankingDados();
    let ordenados=[];
    if(cfg.id==='visitados')ordenados=[...dados].sort((a,b)=>b.totalVisitas-a.totalVisitas);
    else if(cfg.id==='media')ordenados=[...dados].filter(d=>d.mediaNum>0).sort((a,b)=>b.mediaNum-a.mediaNum);
    else if(cfg.id==='km')ordenados=[...dados].sort((a,b)=>b.km-a.km);
    else if(cfg.id==='explorador')ordenados=[...dados].sort((a,b)=>b.regioes-a.regioes);
    else if(cfg.id==='fiel')ordenados=[...dados].sort((a,b)=>b.fiel-a.fiel);
    else if(cfg.id==='exigente')ordenados=[...dados].filter(d=>d.notaMin>0).sort((a,b)=>a.notaMin-b.notaMin);
    else if(cfg.id==='gastao')ordenados=[...dados].sort((a,b)=>b.totalGasto-a.totalGasto);
    else if(cfg.id==='madrugador')ordenados=[...dados].filter(d=>d.primeiro).sort((a,b)=>a.primeiro-b.primeiro);
    else if(cfg.id==='regioes')ordenados=[...dados].sort((a,b)=>b.regioesComp-a.regioesComp);
    window._rankingTodos=[...ordenados];
  
    const getValor=d=>{
      if(cfg.id==='visitados')return d.totalVisitas+' bares';
      if(cfg.id==='media')return d.media+' pts';
      if(cfg.id==='km')return d.km+'km';
      if(cfg.id==='explorador')return d.regioes+' regiões';
      if(cfg.id==='fiel')return d.fiel+'%';
      if(cfg.id==='exigente')return(d.notaMin||'-')+' pts (min)';
      if(cfg.id==='gastao')return 'R$'+d.totalGasto;
      if(cfg.id==='madrugador')return d.primeiro?new Date(d.primeiro).toLocaleDateString('pt-BR'):'';
      if(cfg.id==='regioes')return d.regioesComp+' regiões';
    };
    cont.innerHTML=`<div class="section-title">${cfg.label}</div><div class="section-desc">${cfg.desc}</div>
      ${ordenados.length?`<div id="rankingItems">${ordenados.slice(0,10).map((d,i)=>`
        <div class="ranking-item" onclick="window.abrirPerfil('${d.uid}')" style="cursor:pointer">
  <div class="rank-pos ${i===0?'ouro':i===1?'prata':i===2?'bronze':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'º'}</div>
  <div style="width:32px;height:32px;border-radius:50%;background:var(--laranja);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;font-size:1.1rem">${d.avatar&&(d.avatar.startsWith('data:')||d.avatar.startsWith('https://'))?`<img src="${d.avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover"/>`:d.avatar||'🍺'}</div>
  <div class="rank-info"><div class="rank-nome">${d.nome}</div><div class="rank-detalhe">${cfg.desc}</div></div>
  <div class="rank-valor">${getValor(d)}</div>
</div>`).join('')}</div>${ordenados.length>10?`<button onclick="window.expandirRanking()" id="btnVerMais" style="width:100%;margin-top:10px;padding:10px;border-radius:10px;border:2px solid var(--marrom);background:transparent;color:var(--marrom);font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">Ver todos (${ordenados.length})</button>`:''}
<button onclick="window.compartilharRanking()" style="width:100%;margin-top:10px;padding:10px;border-radius:10px;border:2px solid #25D366;background:transparent;color:#25D366;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">📤 Compartilhar no WhatsApp</button>
`:`<div class="empty"><div class="empty-icon">😶</div><p>Sem dados ainda</p>${!vistaGlobal?'<p style="font-size:0.78rem;color:var(--cinza);margin-top:8px">Os membros do grupo precisam registrar visitas para aparecer aqui</p>':''}</div>`}`;
  }catch(e){cont.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div><p>Erro ao carregar ranking</p></div>';}
}
function renderRankingTabs(){
  const tabsEl=document.getElementById('rankingTabs');
  if(!tabsEl)return;
  tabsEl.innerHTML=RANKING_CONFIGS.map((r,i)=>`<button class="ranking-tab ${i===rankingAtivo?'active':''}" onclick="window.setRanking(${i})">${r.label}</button>`).join('');
}
window.setRanking=function(i){rankingAtivo=i;renderRankingTabs();renderRankingAtivo();};
window.atualizarCacheGlobal=async function(){
  try{
    const vSnap={forEach:cb=>Object.entries(visitas).forEach(([id,data])=>cb({id,data:()=>data}))};
const eSnap={forEach:cb=>extras.forEach(e=>cb({data:()=>e}))};
const s=calcularStats(vSnap,eSnap);
    const userDoc=await db.collection('users').doc(usuarioAtual.uid).get();
    const info=userDoc.data()||{};
    const nome=info.nome||usuarioAtual.displayName||usuarioAtual.uid.slice(0,8);
    const avatar=info.avatarUrl||info.avatarFoto||info.avatar||localStorage.getItem('avatar_'+usuarioAtual.uid)||'🍺';
    const regioesCompletas=Object.keys(REGIOES_COUNT).filter(r=>BARES.filter(b=>b.regiao===r).every(b=>s.boresVisitadosIds.has(b.id))).length;
    const mediaNum=s.media==='-'?0:parseFloat(s.media);
    const notas=Object.values(visitas).map(v=>v.nota).filter(n=>n>0);
const notaMin=notas.length?Math.min(...notas):0;
const dadosRanking={nome,avatar,totalVisitas:s.totalVisitas,media:s.media,mediaNum,notaMin,km:s.km,totalGasto:s.totalGasto,regioes:s.regioesVisitadas.size,fiel:Math.round((s.visitas/127)*100),regioesComp:regioesCompletas,primeiro:s.primeiro,uid:usuarioAtual.uid,ts:Date.now()};
    const cachedRanking=lerCache('ranking_proprio_'+usuarioAtual.uid);
    const mudou=!cachedRanking||cachedRanking.totalVisitas!==dadosRanking.totalVisitas||cachedRanking.media!==dadosRanking.media||cachedRanking.km!==dadosRanking.km;
    if(mudou){
      await db.collection('ranking').doc(usuarioAtual.uid).set(dadosRanking);
      salvarCache('ranking_proprio_'+usuarioAtual.uid,dadosRanking);

      const feedAtual=[];
      const feedSemUsuario=[];

     const eventosVisita=[];
      for(const [barId,vData] of Object.entries(visitas)){
        const bar=BARES.find(b=>b.id===barId);if(!bar)continue;
        const desc=window._descMap?.[barId]?.texto||'';
        const evento={
  uid:usuarioAtual.uid,nome,avatar,
  tipo:(vData.comentario||vData.nota)?'visita_com_comentario':'visita',
  bar:bar.nome,
  barId:barId,
  nota:vData.nota||0,
  comentario:vData.comentario||'',
  foto:vData.foto||null,
  desc,
  km:vData.km||0,
  ts:vData.ts||Date.now()
};
        eventosVisita.push(evento);
      }

    const conquistados=calcularEmblemas(s.visitas,s.boresVisitadosIds);
const emblemaNofeed=feedAtual.filter(e=>e.tipo==='emblema'&&e.uid===usuarioAtual.uid).map(e=>e.emblema);
const eventosEmblemas=[];
      conquistados.forEach(nomeEmblema=>{
        if(!emblemaNofeed.includes(nomeEmblema)){
          const emb=[...EMBLEMAS_QUANTIDADE,...EMBLEMAS_REGIAO].find(e=>e.nome===nomeEmblema);
          if(emb)eventosEmblemas.push({uid:usuarioAtual.uid,nome,avatar,tipo:'emblema',emblema:nomeEmblema,icon:emb.icon,ts:Date.now()});
        }
      });

      const outrosEventos=feedAtual.filter(e=>e.uid!==usuarioAtual.uid);
eventosVisita.sort((a,b)=>b.ts-a.ts);
const meusEmblemásJaNoFeed=feedAtual.filter(e=>e.tipo==='emblema'&&e.uid===usuarioAtual.uid);
const meusAmstelJaNoFeed=feedAtual.filter(e=>e.tipo==='amstel'&&e.uid===usuarioAtual.uid);
const minhasFotosJaNoFeed=feedAtual.filter(e=>e.tipo==='foto_visita'&&e.uid===usuarioAtual.uid);

const emblemaNomesNovos=new Set(eventosEmblemas.map(e=>e.emblema));
const emblemásAntigos=meusEmblemásJaNoFeed.filter(e=>!emblemaNomesNovos.has(e.emblema));
for(const ev of eventosEmblemas){
        const jaExiste=await db.collection('feed')
          .where('uid','==',usuarioAtual.uid)
          .where('tipo','==','emblema')
          .where('emblema','==',ev.emblema)
          .limit(1).get();
        if(jaExiste.empty)await db.collection('feed').add({...ev,fotoUrl:'',foto:''});
      }
       for(const ev of eventosVisita.slice(0,1)){
        const feedExistente=await db.collection('feed').doc(usuarioAtual.uid+'_'+ev.barId).get();
        if(feedExistente.exists&&feedExistente.data()?.fotoUrl){
  continue;
}
        await db.collection('feed')
          .doc(usuarioAtual.uid+'_'+ev.barId)
          .set({...ev,fotoUrl:ev.foto||'',foto:''});
      }
    }
    cacheGrupoRanking={};
  }catch(e){console.log('Erro ao atualizar cache:',e);}
};
function calcularStats(vSnap,eSnap){
  let tv=0,tn=0,tk=0,cn=0,primeiro=Infinity;
  const diasSet=new Set(),regioesVisitadas=new Set(),boresVisitadosIds=new Set();
  vSnap.forEach(v=>{
    const d=v.data();tv++;
    if(d.nota){tn+=d.nota;cn++;}
    if(d.km)tk+=d.km;
    if(d.ts){if(d.ts<primeiro)primeiro=d.ts;diasSet.add(new Date(d.ts).toDateString());}
    const bar=BARES.find(b=>b.id===v.id);
    if(bar)regioesVisitadas.add(bar.regiao);
    boresVisitadosIds.add(v.id);
  });
  let te=0;
  eSnap.forEach(v=>{const d=v.data();te++;if(d.nota){tn+=d.nota;cn++;}});
  let totalGasto=0;
vSnap.forEach(v=>{totalGasto+=(v.data().valor||40);});
eSnap.forEach(()=>{totalGasto+=40;});
  const totalDias=diasSet.size||1;
  return{visitas:tv,extras:te,totalVisitas:tv+te,media:cn?(tn/cn).toFixed(1):'-',km:tk,totalGasto,mediaDia:(totalGasto/totalDias).toFixed(0),diasAtivos:totalDias,regioesVisitadas,boresVisitadosIds,primeiro:primeiro===Infinity?null:primeiro};
}
async function verificarUltrapassagem(){
  try{
    const rankDoc=await db.collection('ranking').doc('global').get();
    if(!rankDoc.exists)return;
    const todos=Object.values(rankDoc.data());

    const rankings={
      visitados:{key:'ultima_pos_visitados_'+usuarioAtual.uid,lista:[...todos].filter(d=>d.totalVisitas>0).sort((a,b)=>b.totalVisitas-a.totalVisitas),label:'bares visitados'},
      km:{key:'ultima_pos_km_'+usuarioAtual.uid,lista:[...todos].sort((a,b)=>b.km-a.km),label:'km rodados'},
      media:{key:'ultima_pos_media_'+usuarioAtual.uid,lista:[...todos].filter(d=>d.mediaNum>0).sort((a,b)=>b.mediaNum-a.mediaNum),label:'nota média'},
    };

    for(const [tipo,cfg] of Object.entries(rankings)){
      const minhaPos=cfg.lista.findIndex(d=>d.uid===usuarioAtual.uid);
      if(minhaPos===-1)continue;
      const posAnterior=parseInt(localStorage.getItem(cfg.key)||'999');
      localStorage.setItem(cfg.key,String(minhaPos+1));
      if(posAnterior===999||minhaPos>=posAnterior)continue;
      const quemUltrapassei=cfg.lista[minhaPos+1];
      if(!quemUltrapassei||quemUltrapassei.uid===usuarioAtual.uid)continue;
      const ov=document.createElement('div');
      ov.className='modal-overlay';
      ov.innerHTML=`
        <div class="modal-box" style="text-align:center">
          <div style="font-size:3rem;margin-bottom:8px">🚀</div>
          <div class="modal-titulo" style="color:var(--laranja)">Você subiu no ranking!</div>
          <p class="modal-desc">
            Você ultrapassou <strong>${quemUltrapassei.nome}</strong> no ranking de <strong>${cfg.label}</strong>!<br><br>
            <span style="font-family:'Bebas Neue',cursive;font-size:2.5rem;color:var(--laranja)">${minhaPos+1}º lugar</span><br><br>
            <span style="font-size:0.78rem;color:var(--cinza)">Continue assim! 🍺</span>
          </p>
          <button onclick="this.closest('.modal-overlay').remove();window.irPara('ranking')" class="btn-login" style="margin-bottom:10px">🏆 Ver ranking</button>
          <button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro">Fechar</button>
        </div>`;
      document.body.appendChild(ov);
      break;
    }
  }catch(e){}
}
window.compartilharRanking=async function(){
  const cfg=RANKING_CONFIGS[rankingAtivo];
  const dados=await getRankingDados();
  let ordenados=[];
  if(cfg.id==='visitados')ordenados=[...dados].sort((a,b)=>b.totalVisitas-a.totalVisitas);
  else if(cfg.id==='media')ordenados=[...dados].filter(d=>d.mediaNum>0).sort((a,b)=>b.mediaNum-a.mediaNum);
  else if(cfg.id==='km')ordenados=[...dados].sort((a,b)=>b.km-a.km);
  const top5=ordenados.slice(0,5);
  const emojis=['🥇','🥈','🥉','4️⃣','5️⃣'];
  const getValor=d=>{
    if(cfg.id==='visitados')return d.totalVisitas+' bares';
    if(cfg.id==='media')return d.media+'/10';
    if(cfg.id==='km')return d.km+'km';
    return d.totalVisitas+' bares';
  };
  const meuPlacar=ordenados.findIndex(d=>d.uid===usuarioAtual.uid);
  const linhas=top5.map((d,i)=>`${emojis[i]} ${d.nome} — ${getValor(d)}`).join('\n');
  const texto=`🍺 *Rota di Buteco BH 2026*\n🏆 *${cfg.label}*\n\n${linhas}\n\n${meuPlacar>=0?`Minha posição: ${meuPlacar+1}º lugar\n`:''}Acesse: https://rotadibuteco.web.app`;
  window.open('https://wa.me/?text='+encodeURIComponent(texto),'_blank');
};
window.expandirRanking=function(){
  const cont=document.getElementById('rankingItems');
  const cfg=RANKING_CONFIGS[rankingAtivo];
  const getValor=d=>{
    if(cfg.id==='visitados')return d.totalVisitas+' bares';
    if(cfg.id==='media')return d.media+' pts';
    if(cfg.id==='km')return d.km+'km';
    if(cfg.id==='explorador')return d.regioes+' regiões';
    if(cfg.id==='fiel')return d.fiel+'%';
    if(cfg.id==='exigente')return(d.notaMin||'-')+' pts (min)';
    if(cfg.id==='gastao')return 'R$'+d.totalGasto;
    if(cfg.id==='madrugador')return d.primeiro?new Date(d.primeiro).toLocaleDateString('pt-BR'):'';
    if(cfg.id==='regioes')return d.regioesComp+' regiões';
  };
  cont.innerHTML=window._rankingTodos.map((d,i)=>`
    <div class="ranking-item" onclick="window.abrirPerfil('${d.uid}')" style="cursor:pointer">
      <div class="rank-pos ${i===0?'ouro':i===1?'prata':i===2?'bronze':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'º'}</div>
      <div style="width:32px;height:32px;border-radius:50%;background:var(--laranja);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;font-size:1.1rem">${d.avatar&&(d.avatar.startsWith('data:')||d.avatar.startsWith('https://'))?`<img src="${d.avatar}" style="width:32px;height:32px;border-radius:50%;object-fit:cover"/>`:d.avatar||'🍺'}</div>
      <div class="rank-info"><div class="rank-nome">${d.nome}</div><div class="rank-detalhe">${cfg.desc}</div></div>
      <div class="rank-valor">${getValor(d)}</div>
    </div>`).join('');
  document.getElementById('btnVerMais')?.remove();
};
window.resetarRankingUsuario=async function(uid,nome){
  if(!confirm(`Resetar dados do ranking de ${nome}?`))return;
  const digitado=prompt(`Digite RESETAR para confirmar:`);
  if(digitado!=='RESETAR'){mostrarNotif('Cancelado','erro');return;}
  try{
    await db.collection('ranking').doc('global').update({[uid]:firebase.firestore.FieldValue.delete()});
    const amstelRankDoc=await db.collection('amstel').doc('ranking').get();
    if(amstelRankDoc.exists&&amstelRankDoc.data()[uid]){
      await db.collection('amstel').doc('ranking').update({[uid]:firebase.firestore.FieldValue.delete()});
    }
    mostrarNotif(`🗑️ Ranking de ${nome} resetado!`,'erro');
    document.querySelector('.modal-overlay')?.remove();
  }catch(e){mostrarNotif('Erro ao resetar','erro');}
};
