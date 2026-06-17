window.invalidarVisita=async function(uid,barId,nome){
  if(!window._perfilAdminCache?.admin)return;
  if(!confirm(`Invalidar visita de ${nome} no bar ${barId}?`))return;
  await db.collection('users').doc(uid).collection('visits').doc(barId).delete();
  if(uid===usuarioAtual.uid){
    delete visitas[barId];
    salvarCache('visitas_'+usuarioAtual.uid,visitas);
    renderBares();
  }
  await db.collection('feed').doc(uid+'_'+barId).delete();
  const feedDoc=await db.collection('ranking').doc('feed').get();
  if(feedDoc.exists){
    const eventos=(feedDoc.data().eventos||[]).filter(e=>!(e.uid===uid&&e.barId===barId));
    await db.collection('ranking').doc('feed').set({eventos,atualizado:Date.now()});
  }
  const vSnap=await db.collection('users').doc(uid).collection('visits').get();
  let totalVisitas=0,totalNota=0,countNota=0,totalKm=0,totalGasto=0;
  const regioesVisitadas=new Set();
  const boresIds=new Set();
  vSnap.forEach(v=>{
    const d=v.data();
    if(d.invalidada)return;
    totalVisitas++;
    if(d.nota){totalNota+=d.nota;countNota++;}
    if(d.km)totalKm+=d.km;
    totalGasto+=(d.valor||40);
    const bar=BARES.find(b=>b.id===v.id);
    if(bar)regioesVisitadas.add(bar.regiao);
    boresIds.add(v.id);
  });
  const media=countNota?(totalNota/countNota).toFixed(1):'-';
  const rankDoc=await db.collection('ranking').doc(uid).get();
  if(rankDoc.exists){
    await db.collection('ranking').doc(uid).update({
      totalVisitas,
      media,
      mediaNum:countNota?parseFloat(media):0,
      km:totalKm,
      totalGasto,
      regioes:regioesVisitadas.size,
      fiel:Math.round((totalVisitas/127)*100)
    });
  }
  await db.collection('notificacoes').doc(uid).set({
    tipo:'visita_invalidada',barId,
    msg:'Sua avaliação foi invalidada por suspeita de adulteração de foto ou avaliação.',
    ts:Date.now(),vista:false
  },{merge:true});
  cacheFeed=null;
  mostrarNotif(`🚫 Visita de ${nome} invalidada e ranking atualizado!`,'erro');
  renderFeed();
};
window.denunciarEvento=async function(eventoId,uid,nome){
  if(!confirm(`Denunciar conteúdo de ${nome}?`))return;
  await db.collection('denuncias').add({
    eventoId,uid,nome,
    denunciadoPor:usuarioAtual.uid,
    ts:Date.now()
  });
  mostrarNotif('🚩 Denúncia enviada. Vamos analisar.','info');
};

window.verDenuncias=async function(){
  document.querySelector('.modal-overlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.innerHTML=`
    <div class="modal-box" style="max-width:500px;max-height:85vh;overflow-y:auto;text-align:left">
      <div class="modal-titulo">🚩 Denúncias</div>
      <div id="denunciasLista"><p style="color:var(--cinza)">Carregando...</p></div>
      <button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro" style="margin-top:12px">Fechar</button>
    </div>`;
  document.body.appendChild(overlay);
  const snap=await db.collection('denuncias').orderBy('ts','desc').limit(50).get();
  const lista=document.getElementById('denunciasLista');
  if(snap.empty){lista.innerHTML='<p style="color:var(--cinza)">Nenhuma denúncia!</p>';return;}
  lista.innerHTML=snap.docs.map(doc=>{
    const d=doc.data();
    return`<div style="padding:10px 0;border-bottom:1px solid #f0e0d0">
      <div style="font-weight:800;font-size:0.88rem;color:var(--marrom)">${d.nome}</div>
      <div style="font-size:0.72rem;color:var(--cinza);margin-bottom:6px">${new Date(d.ts).toLocaleString('pt-BR')}</div>
      <div style="display:flex;gap:6px">
        <button onclick="window.banirUsuario('${d.uid}','${d.nome}')" style="padding:5px 10px;border-radius:8px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🚫 Banir</button>
        <button onclick="db.collection('denuncias').doc('${doc.id}').delete();this.closest('div[style*=padding]').remove();mostrarNotif('Denúncia arquivada')" style="padding:5px 10px;border-radius:8px;background:#f0e0d0;color:var(--marrom);border:none;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">✅ Arquivar</button>
      </div>
    </div>`;
  }).join('');
};
window.abrirAdmin=async function(){
  const adminDoc=await db.collection('users').doc(usuarioAtual.uid).get();
  if(!adminDoc.data()?.admin)return;
  const overlay=document.createElement('div');
 overlay.className='modal-overlay';
overlay.id='modalAdmin';
overlay.style.zIndex='var(--z-foto)';
overlay.innerHTML=`
    <div class="modal-box" style="max-width:500px;max-height:80vh;overflow-y:auto;text-align:left">
      <div class="modal-titulo">🛡️ Painel Admin</div>
      <button onclick="window.verPendentesAmstel()" style="width:100%;padding:9px;border-radius:10px;background:#f0a500;color:white;border:none;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:12px">🍺 Aprovar Amstel pendentes</button>
      <button onclick="window.verDenuncias()" style="width:100%;padding:9px;border-radius:10px;background:#cc0000;color:white;border:none;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:8px">🚩 Ver denúncias</button>
<div id="adminConteudo"><p style="color:var(--cinza);font-size:0.82rem">Carregando usuários...</p></div>
<button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro" style="margin-top:8px">Fechar</button>
    </div>`;
  document.body.appendChild(overlay);

  const rankDoc=await db.collection('ranking').doc('global').get();
  const dados=rankDoc.exists?Object.values(rankDoc.data()).filter(d=>d&&d.uid&&d.nome):[];
  const usersSnap=await db.collection('users').get();
const usersMap={};
usersSnap.forEach(d=>{usersMap[d.id]=d.data();});

document.getElementById('adminConteudo').innerHTML=dados.map(u=>{
  const info=usersMap[u.uid]||{};
  const contato=info.contatoPremio||'';
  return`<div style="padding:10px 0;border-bottom:1px solid #f0e0d0">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <div>
        <div style="font-weight:800;font-size:0.88rem;color:var(--marrom)">${u.avatar||'🍺'} ${u.nome}</div>
        <div style="font-size:0.72rem;color:var(--cinza)">${u.totalVisitas||0} bares · ${u.uid}</div>
        ${contato?`<div style="font-size:0.78rem;color:var(--verde);font-weight:700;margin-top:2px">📱 ${contato}</div>`:'<div style="font-size:0.72rem;color:#bbb">sem contato cadastrado</div>'}
      </div>
      <button onclick="window.banirUsuario('${u.uid}','${u.nome}')" style="padding:5px 10px;border-radius:8px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🚫 Banir</button>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
  <button onclick="window.verComentariosAdmin('${u.uid}','${u.nome}')" style="padding:4px 10px;border-radius:8px;background:#f0e0d0;color:var(--marrom);border:none;font-size:0.72rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">💬 Comentários</button>
  <button onclick="window.resetarRankingUsuario('${u.uid}','${u.nome}')" style="padding:4px 10px;border-radius:8px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.72rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🗑️ Reset ranking</button>
  <button onclick="window.resetarAmstelUsuario('${u.uid}','${u.nome}')" style="padding:4px 10px;border-radius:8px;background:transparent;color:#f0a500;border:1px solid #f0a500;font-size:0.72rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🍺 Reset Amstel</button>
</div>
<div id="comms-${u.uid}" style="display:none;margin-top:8px"></div>
  </div>`;
}).join('');
};

window.banirUsuario=async function(uid,nome){
  if(!confirm(`Banir ${nome}? Isso vai apagar todos os dados dele.`))return;
  try{
    await db.collection('users').doc(uid).set({banido:true,nome,banitoEm:Date.now()},{merge:true});
    await db.collection('ranking').doc('global').update({[uid]:firebase.firestore.FieldValue.delete()});
    mostrarNotif(`🚫 ${nome} banido!`,'erro');
    document.querySelector('.modal-overlay')?.remove();
  }catch(e){mostrarNotif('Erro ao banir','erro');}
};

window.verComentariosAdmin=async function(uid,nome){
  const cont=document.getElementById('comms-'+uid);
  if(cont.style.display!=='none'){cont.style.display='none';return;}
  cont.style.display='block';
  cont.innerHTML='<p style="font-size:0.75rem;color:var(--cinza)">Carregando...</p>';

  try{
    const comentarios=[];
    const resumoSnap=await db.collection('comentarios').doc('resumo').get();
    if(resumoSnap.exists){
      const resumo=resumoSnap.data();
      for(const [barId,posts] of Object.entries(resumo)){
        const bar=BARES.find(b=>b.id===barId);
        if(!bar)continue;
        const doUsuario=(posts||[]).filter(p=>p.uid===uid&&p.texto);
        doUsuario.forEach(p=>comentarios.push({id:p.docId,barId,barNome:bar.nome,...p}));
      }
    }
    if(!comentarios.length){cont.innerHTML='<p style="font-size:0.75rem;color:var(--cinza)">Nenhum comentário</p>';return;}
    cont.innerHTML=comentarios.map(c=>`
      <div style="padding:6px 0;border-bottom:1px solid #f8f0e8;display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
        <div>
          <div style="font-size:0.72rem;font-weight:700;color:var(--laranja)">${c.barNome}</div>
          <div style="font-size:0.75rem;color:var(--marrom)">${c.texto||'(sem texto)'}</div>
        </div>
        <button onclick="window.apagarComentarioAdmin('${c.barId}','${c.id}','${uid}')" style="flex-shrink:0;padding:3px 8px;border-radius:6px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.7rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🗑️</button>
      </div>`).join('');
  }catch(e){
    cont.innerHTML='<p style="font-size:0.75rem;color:var(--cinza)">Erro ao carregar comentários</p>';
  }
};

window.apagarComentarioAdmin=async function(barId,postId,uid){
  if(!confirm('Apagar este comentário?'))return;
  await db.collection('comentarios').doc(barId).collection('posts').doc(postId).delete();

  const resumoRef=db.collection('comentarios').doc('resumo');
  const resumoSnap=await resumoRef.get();
  if(resumoSnap.exists){
    const resumo=resumoSnap.data();
    if(resumo[barId]){
      resumo[barId]=resumo[barId].filter(c=>c.docId!==postId);
      await resumoRef.set(resumo);
    }
  }
  localStorage.removeItem('commMap');

  const feedDoc=await db.collection('ranking').doc('feed').get();
  if(feedDoc.exists){
    const eventos=feedDoc.data().eventos||[];
    const novos=eventos.map(e=>{
      if(e.barId===barId&&e.uid===uid)return{...e,comentario:''};
      return e;
    });
    await db.collection('ranking').doc('feed').set({eventos:novos,atualizado:Date.now()});
  }
  cacheFeed=null;
  mostrarNotif('🗑️ Comentário apagado!','erro');
  window.verComentariosAdmin(uid,'');
};
