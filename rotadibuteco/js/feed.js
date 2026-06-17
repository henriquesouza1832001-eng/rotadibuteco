async function renderFeed(){
  const lista=document.getElementById('feedLista');
  lista.innerHTML='<div class="empty"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  try{
    if(feedFiltro==='grupo'&&grupoAtual){
      const grupoDoc=await db.collection('grupos').doc(grupoAtual).get();
      const membros=grupoDoc.data()?.membros||[];
      if(membros.length){
        const lotes=[];
        for(let i=0;i<membros.length;i+=10)lotes.push(membros.slice(i,i+10));
        const todosDocs=[];
        for(const lote of lotes){
          const snap=await db.collection('feed').where('uid','in',lote).orderBy('ts','desc').limit(100).get();
          snap.docs.forEach(d=>todosDocs.push({id:d.id,...d.data()}));
        }
        todosDocs.sort((a,b)=>b.ts-a.ts);
        feedEventosCache=todosDocs.slice(0,100);
      }
    }else{
      if(cacheFeed&&(Date.now()-cacheFeed.ts)<30000){
        feedEventosCache=cacheFeed.eventos;
      }else{
        const snap=await db.collection('feed').orderBy('ts','desc').limit(100).get();
window._feedUltimoDoc=snap.docs[snap.docs.length-1]||null;
feedEventosCache=snap.docs.map(d=>({id:d.id,...d.data()}));
cacheFeed={eventos:feedEventosCache,ts:Date.now()};
      }
    }
    renderFeedLista(feedEventosCache);
  }catch(err){lista.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div><p>Erro ao carregar feed</p></div>';}
}
window.setFeedFiltro=function(filtro){
  feedFiltro=filtro;
  document.getElementById('btnFeedGlobal').className=filtro==='global'?'ativo':'inativo';
  document.getElementById('btnFeedGrupo').className=filtro==='grupo'?'ativo':'inativo';
  renderFeed();
};
window.compartilharFotoFeed=async function(barId){
  const v=visitas[barId];
  if(!v?.fotoUrl&&!v?.foto)return;
  const bar=BARES.find(b=>b.id===barId);
  if(!bar)return;
  const nome=usuarioAtual.displayName||'Anônimo';
  const avatar=localStorage.getItem('avatar_'+usuarioAtual.uid)||'🍺';
  const feedDoc=await db.collection('ranking').doc('feed').get();
  const feedAtual=feedDoc.exists?(feedDoc.data().eventos||[]):[];
  const evento={
    uid:usuarioAtual.uid,nome,avatar,
    tipo:'foto_visita',
    bar:bar.nome,barId,
    nota:v.nota||0,
    comentario:v.comentario||'',
    fotoUrl:v.fotoUrl||'',
    foto:'',
    ts:Date.now()
  };
  feedAtual.unshift(evento);
  await db.collection('ranking').doc('feed').set({eventos:feedAtual.slice(0,200),atualizado:Date.now()});
  cacheFeed=null;
  mostrarNotif('📷 Foto compartilhada no feed!');
};

window._verFotoFeed=function(eventoId){
  const img=document.querySelector(`[onclick="window._verFotoFeed('${eventoId}')"]`);
  if(!img)return;
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;cursor:pointer';
  ov.innerHTML=`
    <button onclick="document.getElementById('fotoFeedOv').remove()" style="position:fixed;top:16px;right:16px;width:44px;height:44px;border-radius:50%;background:white;border:none;font-size:1.4rem;cursor:pointer;font-weight:700;z-index:2001;box-shadow:0 2px 8px rgba(0,0,0,0.4)">✕</button>
    <img src="${img.src}" style="max-width:100%;max-height:90vh;border-radius:10px;object-fit:contain"/>`;
  ov.id='fotoFeedOv';
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
};
window.filtrarFeed=function(){
  const busca=document.getElementById('feedBusca')?.value.toLowerCase()||'';
  if(!busca){renderFeedLista(feedEventosCache);return;}
  const filtrados=feedEventosCache.filter(e=>{
    return(e.bar||'').toLowerCase().includes(busca)||(e.nome||'').toLowerCase().includes(busca)||(e.comentario||'').toLowerCase().includes(busca)||(e.emblema||'').toLowerCase().includes(busca);
  });
  renderFeedLista(filtrados);
};
function tempoRelativo(ts){
  const diff=Date.now()-ts;const min=Math.floor(diff/60000),h=Math.floor(diff/3600000),d=Math.floor(diff/86400000);
  if(min<1)return'agora mesmo';if(min<60)return`há ${min} min`;if(h<24)return`há ${h}h`;return`há ${d} dia${d>1?'s':''}`;
}
async function verificarNovasVisitasGrupo(){
  if(!grupoAtual||!usuarioAtual)return;
  const chave='ultima_check_grupo_'+usuarioAtual.uid;
  const ultimoCheck=parseInt(localStorage.getItem(chave)||'0');
  const agora=Date.now();
  if(agora-ultimoCheck<5*60*1000)return; 
  localStorage.setItem(chave,String(agora));
  try{
    const feedDoc=await db.collection('ranking').doc('feed').get();
    if(!feedDoc.exists)return;
    const grupoDoc=await db.collection('grupos').doc(grupoAtual).get();
    const membros=new Set(grupoDoc.data()?.membros||[]);
    const eventos=(feedDoc.data().eventos||[])
      .filter(e=>membros.has(e.uid)&&e.uid!==usuarioAtual.uid&&e.ts>ultimoCheck&&e.tipo!=='emblema');
    if(!eventos.length)return;
    const ev=eventos[0];
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--marrom);color:white;padding:10px 16px;border-radius:14px;font-size:0.82rem;font-weight:700;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,0.3);cursor:pointer;font-family:Nunito,sans-serif;white-space:nowrap';
    ov.innerHTML=`🍺 ${ev.nome} visitou ${ev.bar||ev.barNome||'um buteco'}`;
    ov.onclick=()=>{ov.remove();window.irPara('feed');};
    document.body.appendChild(ov);
    setTimeout(()=>ov.remove(),4000);
  }catch(e){}
}window.enviarComentarioFeed=async function(barId){
  const txt=document.getElementById('feedcomm-txt-'+barId)?.value.trim();
  if(!txt){mostrarNotif('Escreva algo antes de comentar');return;}
  await db.collection('comentarios').doc(barId).collection('posts').add({
    uid:usuarioAtual.uid,
    nome:usuarioAtual.displayName||'Anônimo',
    texto:txt,
    nota:0,
    tipo:'comentario',
    ts:Date.now()
  });
  document.getElementById('feedcomm-txt-'+barId).value='';
  mostrarNotif('💬 Comentário enviado!');
  window.toggleComentariosFeed(barId,document.querySelector(`[onclick="window.toggleComentariosFeed('${barId}',this)"]`));
  setTimeout(()=>window.toggleComentariosFeed(barId,document.querySelector(`[onclick="window.toggleComentariosFeed('${barId}',this)"]`)),100);
};

window.toggleComentariosFeed=async function(barId,btn){
  const cont=document.getElementById('feed-comm-'+barId);
  if(!cont)return;
  if(cont.style.display!=='none'){cont.style.display='none';btn.textContent='💬 Ver';return;}
  cont.style.display='block';
  btn.textContent='💬 Fechar';
  cont.innerHTML='<p style="font-size:0.78rem;color:var(--cinza);padding:4px 0">Carregando...</p>';
  const snap=await db.collection('comentarios').doc(barId).collection('posts').orderBy('ts','desc').limit(5).get();
  if(snap.empty){cont.innerHTML='<p style="font-size:0.78rem;color:var(--cinza);padding:4px 0">Nenhum comentário ainda</p>';return;}
  const posts=snap.docs.map(d=>d.data()).filter(c=>c.texto&&c.tipo==='comentario');
const countEl=document.getElementById('commcount-'+barId);
if(countEl)countEl.textContent=posts.length;
cont.innerHTML=(posts.length?posts.map(c=>`<div style="padding:8px 0;border-bottom:1px solid #f0e0d0">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
    <div>
      <div style="font-size:0.8rem;font-weight:700;color:var(--marrom)">${c.nome}</div>
      <div style="font-size:0.78rem;color:var(--cinza)">${c.texto}</div>
      <div style="font-size:0.7rem;color:#bbb">${tempoRelativo(c.ts)}</div>
    </div>
    <button onclick="window.denunciarComentario('${barId}','${c.uid}','${c.nome}')" style="background:none;border:none;color:#bbb;font-size:0.72rem;cursor:pointer;font-family:'Nunito',sans-serif;padding:2px 6px;flex-shrink:0">🚩</button>
  </div>
</div>`).join(''):'<p style="font-size:0.78rem;color:var(--cinza);padding:4px 0">Nenhum comentário ainda</p>')+`
  <div style="margin-top:10px">
    <textarea id="feedcomm-txt-${barId}" rows="2" placeholder="Escreva um comentário..." style="width:100%;padding:8px 10px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.82rem;font-family:'Nunito',sans-serif;resize:none;outline:none;color:var(--marrom);margin-bottom:6px"></textarea>
    <button onclick="window.enviarComentarioFeed('${barId}')" style="width:100%;padding:8px;border-radius:8px;background:var(--laranja);color:white;border:none;font-size:0.82rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">Comentar</button>
  </div>`;
};
async function renderFeedLista(eventos){
  const lista=document.getElementById('feedLista');
  if(!eventos.length){lista.innerHTML='<div class="empty"><div class="empty-icon">🔍</div><p>Nenhum resultado encontrado</p></div>';return;}
  lista.innerHTML='<div class="empty"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';

  const eventIds=eventos.map(e=>getEventoId(e));
  let reacoesMapa={};
  try{
    const lotes=[];
    for(let i=0;i<eventIds.length;i+=10)lotes.push(eventIds.slice(i,i+10));
    for(const lote of lotes){
      const snaps=await Promise.all(lote.map(id=>db.collection('reacoes').doc(id).get()));
      snaps.forEach((snap,i)=>{
        reacoesMapa[lote[i]]=snap.exists?snap.data():{};
      });
    }
  }catch(e){}

  const REACOES=['🍺','🔥','😍','🤢'];

  lista.innerHTML=eventos.map(e=>{
    const eventoId=getEventoId(e);
    const minhasReacoes=JSON.parse(localStorage.getItem('reacoes_'+usuarioAtual.uid)||'{}');
    const minhaReacao=minhasReacoes[eventoId]||null;
    const dadosReacoes=reacoesMapa[eventoId]||{};
    const avatarHtml=(e.avatar&&(e.avatar.startsWith('data:')||e.avatar.startsWith('https://')))?`<img src="${e.avatar}" style="width:38px;height:38px;border-radius:50%;object-fit:cover" alt=""/>`:`<span class="feed-avatar-emoji">${e.avatar||'🍺'}</span>`;

    const reacoesHtml=`
      <div style="position:relative">
        <button onclick="window.togglePicker('${eventoId}')" style="display:flex;align-items:center;gap:5px;background:none;border:1.5px solid #e0d0c0;border-radius:20px;padding:5px 12px;font-size:0.8rem;font-weight:700;color:var(--cinza);cursor:pointer;font-family:'Nunito',sans-serif">
          ${minhaReacao||'👍'} Reagir
        </button>
        <div class="reacao-picker" id="picker-${eventoId}">
          ${REACOES.map(r=>`<span class="reacao-op" onclick="window.reagir('${eventoId}','${r}')">${r}</span>`).join('')}
        </div>
      </div>
      <div class="reacoes-bar">
        ${REACOES.filter(r=>dadosReacoes[r]>0).map(r=>`
          <button class="reacao-btn ${minhaReacao===r?'ativo':''}" onclick="window.reagir('${eventoId}','${r}')">
            ${r} <span>${dadosReacoes[r]}</span>
          </button>`).join('')}
      </div>`;

    if(e.tipo==='amstel'){
      return`<div class="feed-card">
        <div class="feed-card-header" onclick="window.abrirPerfil('${e.uid}')">
          <div class="feed-avatar-wrap">${avatarHtml}</div>
          <div class="feed-header-info">
            <div class="feed-nome">${e.nome}</div>
            <div class="feed-sub">bebeu Amstel 🍺</div>
          </div>
          <div class="feed-tempo">${tempoRelativo(e.ts)}</div>
        </div>
        <div style="padding:8px 14px 12px;display:flex;align-items:center;gap:10px">
          <div style="font-size:2rem">🍺</div>
          <div>
            <div style="font-weight:800;font-size:0.9rem;color:var(--marrom)">${e.barNome}</div>
            <div style="font-size:0.82rem;color:#f0a500;font-weight:700">R$ ${parseFloat(e.valor).toFixed(2)} em Amstel</div>
          </div>
        </div>
        <div class="feed-actions">${reacoesHtml}
          ${window._perfilAdminCache?.admin?`<button onclick="window.invalidarVisita('${e.uid}','${e.barId}','${e.nome}')" style="background:none;border:1px solid #cc0000;color:#cc0000;font-size:0.72rem;cursor:pointer;font-family:'Nunito',sans-serif;padding:4px 8px;border-radius:8px;font-weight:700">🚫 Invalidar</button>`:''}
<button onclick="window.denunciarEvento('${eventoId}','${e.uid}','${e.nome}')" style="background:none;border:none;color:#bbb;font-size:0.75rem;cursor:pointer;font-family:'Nunito',sans-serif;margin-left:auto;padding:5px">🚩</button>
        </div>
      </div>`;
    }
if(e.tipo==='foto_visita'){
  const notaStars=e.nota?`<div class="feed-nota-stars">${'⭐'.repeat(e.nota)} ${e.nota}/10</div>`:'';
  const comentarioHtml=e.comentario
      ?`<div class="feed-comentario">${e.comentario}</div>`
      :e.nota?`<div style="font-size:0.82rem;color:var(--cinza);padding:0 14px 10px;font-style:italic">Sem comentário</div>`:'';
  return`<div class="feed-card">
    <div class="feed-card-header" onclick="window.abrirPerfil('${e.uid}')">
      <div class="feed-avatar-wrap">${avatarHtml}</div>
      <div class="feed-header-info">
        <div class="feed-nome">${e.nome}</div>
        <div class="feed-sub">compartilhou uma foto 📷</div>
      </div>
      <div class="feed-tempo">${tempoRelativo(e.ts)}</div>
    </div>
    <div class="feed-bar-nome">🍺 ${e.bar}</div>
    ${notaStars}
    ${comentarioHtml}
    <img src="${e.fotoUrl||e.foto||''}" style="width:100%;max-height:280px;object-fit:cover;cursor:pointer" onclick="window._verFotoFeed('${eventoId}')"/>
    <div class="feed-actions">
      ${reacoesHtml}
      ${window._perfilAdminCache?.admin?`<button onclick="window.invalidarVisita('${e.uid}','${e.barId}','${e.nome}')" style="background:none;border:1px solid #cc0000;color:#cc0000;font-size:0.72rem;cursor:pointer;font-family:'Nunito',sans-serif;padding:4px 8px;border-radius:8px;font-weight:700">🚫 Invalidar</button>`:''}
<button onclick="window.denunciarEvento('${eventoId}','${e.uid}','${e.nome}')" style="background:none;border:none;color:#bbb;font-size:0.75rem;cursor:pointer;font-family:'Nunito',sans-serif;margin-left:auto;padding:5px">🚩</button>
    </div>
  </div>`;
}
    if(e.tipo==='emblema'){
      return`<div class="feed-card">
        <div class="feed-card-header" onclick="window.abrirPerfil('${e.uid}')">
          <div class="feed-avatar-wrap">${avatarHtml}</div>
          <div class="feed-header-info">
            <div class="feed-nome">${e.nome}</div>
            <div class="feed-sub">conquistou um emblema 🎉</div>
          </div>
          <div class="feed-tempo">${tempoRelativo(e.ts)}</div>
        </div>
        <div class="feed-emblema">
          <div class="feed-emblema-icon">${e.icon}</div>
          <div class="feed-emblema-texto">
            <div class="feed-emblema-nome">${e.emblema}</div>
          </div>
        </div>
        <div class="feed-actions">${reacoesHtml}</div>
      </div>`;
    }

    const notaStars=e.nota?`<div class="feed-nota-stars">${'⭐'.repeat(e.nota)} ${e.nota}/10</div>`:'';
    const comentarioHtml=e.comentario
      ?`<div class="feed-comentario">${e.comentario}</div>`
      :e.nota?`<div style="font-size:0.82rem;color:var(--cinza);padding:0 14px 10px;font-style:italic">Avaliou sem comentário</div>`:'';
    const descHtml=e.desc?`<div style="font-size:0.78rem;color:var(--cinza);padding:0 14px 8px;font-style:italic">🍽️ ${e.desc}</div>`:'';
    const kmHtml=e.km?`<span class="feed-km">🚗 ${e.km}km</span>`:'';

    return`<div class="feed-card">
      <div class="feed-card-header" onclick="window.abrirPerfil('${e.uid}')">
        <div class="feed-avatar-wrap">${avatarHtml}</div>
        <div class="feed-header-info">
          <div class="feed-nome">${e.nome}</div>
          <div class="feed-sub">${e.visita_extra?`visitou pela ${e.numero_visita||2}ª vez 🔁`:'visitou um buteco'}</div>
        </div>
        <div class="feed-tempo">${tempoRelativo(e.ts)}</div>
      </div>
      <div class="feed-bar-nome">🍺 ${e.bar}</div>
      ${notaStars}
      ${comentarioHtml}
      ${descHtml}
      ${(e.fotoUrl||e.foto)?`<img src="${e.fotoUrl||e.foto}" style="width:100%;max-height:280px;object-fit:cover;margin-bottom:8px;cursor:pointer" onclick="window._verFotoFeed('${eventoId}')"/>`:''}
      <div class="feed-actions">
        ${reacoesHtml}
        ${e.barId?`<button onclick="window.toggleComentariosFeed('${e.barId}',this)" style="display:flex;align-items:center;gap:5px;background:none;border:1.5px solid #e0d0c0;border-radius:20px;padding:5px 12px;font-size:0.8rem;font-weight:700;color:var(--cinza);cursor:pointer;font-family:'Nunito',sans-serif">💬 <span id="commcount-${e.barId}">${window._commMap?.[e.barId]?.filter(c=>c.texto&&c.tipo==='comentario')?.length||0}</span></button>`:''}
        ${kmHtml}
        ${window._perfilAdminCache?.admin?`<button onclick="window.invalidarVisita('${e.uid}','${e.barId}','${e.nome}')" style="background:none;border:1px solid #cc0000;color:#cc0000;font-size:0.72rem;cursor:pointer;font-family:'Nunito',sans-serif;padding:4px 8px;border-radius:8px;font-weight:700">🚫 Invalidar</button>`:''}
<button onclick="window.denunciarEvento('${eventoId}','${e.uid}','${e.nome}')" style="background:none;border:none;color:#bbb;font-size:0.75rem;cursor:pointer;font-family:'Nunito',sans-serif;margin-left:auto;padding:5px">🚩</button>
      </div>
      <div id="feed-comm-${e.barId}" style="display:none;padding:0 14px 12px"></div>
    </div>`;
  }).join('');

  if(window._feedUltimoDoc){
  const btnMais=document.createElement('button');
  btnMais.textContent='Carregar mais';
  btnMais.style.cssText='width:100%;padding:10px;border-radius:10px;border:2px solid var(--marrom);background:transparent;color:var(--marrom);font-size:0.85rem;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif;margin-top:8px';
  btnMais.onclick=async function(){
    btnMais.textContent='Carregando...';
    btnMais.disabled=true;
    const snap=await db.collection('feed').orderBy('ts','desc').startAfter(window._feedUltimoDoc).limit(50).get();
    window._feedUltimoDoc=snap.docs[snap.docs.length-1]||null;
    const novos=snap.docs.map(d=>({id:d.id,...d.data()}));
    feedEventosCache=[...feedEventosCache,...novos];
    btnMais.remove();
    const temp=document.createElement('div');
    novos.forEach(e=>{
      const card=document.createElement('div');
      card.innerHTML=renderEventoFeed(e);
      lista.appendChild(card.firstChild);
    });
    if(window._feedUltimoDoc){
      lista.appendChild(btnMais);
      btnMais.textContent='Carregar mais';
      btnMais.disabled=false;
    }
  };
  lista.appendChild(btnMais);
}
}
function renderEventoFeed(e){
  const eventoId=getEventoId(e);
  const minhasReacoes=JSON.parse(localStorage.getItem('reacoes_'+usuarioAtual.uid)||'{}');
  const minhaReacao=minhasReacoes[eventoId]||null;
  const dadosReacoes={};
  const avatarHtml=(e.avatar&&(e.avatar.startsWith('data:')||e.avatar.startsWith('https://')))?`<img src="${e.avatar}" style="width:38px;height:38px;border-radius:50%;object-fit:cover" alt=""/>`:`<span class="feed-avatar-emoji">${e.avatar||'🍺'}</span>`;
  const REACOES=['🍺','🔥','😍','🤢'];
  const reacoesHtml=`<div style="position:relative"><button onclick="window.togglePicker('${eventoId}')" style="display:flex;align-items:center;gap:5px;background:none;border:1.5px solid #e0d0c0;border-radius:20px;padding:5px 12px;font-size:0.8rem;font-weight:700;color:var(--cinza);cursor:pointer;font-family:'Nunito',sans-serif">${minhaReacao||'👍'} Reagir</button><div class="reacao-picker" id="picker-${eventoId}">${REACOES.map(r=>`<span class="reacao-op" onclick="window.reagir('${eventoId}','${r}')">${r}</span>`).join('')}</div></div><div class="reacoes-bar"></div>`;
  if(e.tipo==='emblema')return`<div class="feed-card"><div class="feed-card-header" onclick="window.abrirPerfil('${e.uid}')"><div class="feed-avatar-wrap">${avatarHtml}</div><div class="feed-header-info"><div class="feed-nome">${e.nome}</div><div class="feed-sub">conquistou um emblema 🎉</div></div><div class="feed-tempo">${tempoRelativo(e.ts)}</div></div><div class="feed-emblema"><div class="feed-emblema-icon">${e.icon}</div><div class="feed-emblema-texto"><div class="feed-emblema-nome">${e.emblema}</div></div></div><div class="feed-actions">${reacoesHtml}</div></div>`;
  const notaStars=e.nota?`<div class="feed-nota-stars">${'⭐'.repeat(e.nota)} ${e.nota}/10</div>`:'';
  const comentarioHtml=e.comentario?`<div class="feed-comentario">${e.comentario}</div>`:e.nota?`<div style="font-size:0.82rem;color:var(--cinza);padding:0 14px 10px;font-style:italic">Avaliou sem comentário</div>`:'';
  const kmHtml=e.km?`<span class="feed-km">🚗 ${e.km}km</span>`:'';
  return`<div class="feed-card"><div class="feed-card-header" onclick="window.abrirPerfil('${e.uid}')"><div class="feed-avatar-wrap">${avatarHtml}</div><div class="feed-header-info"><div class="feed-nome">${e.nome}</div><div class="feed-sub">${e.visita_extra?`visitou pela ${e.numero_visita||2}ª vez 🔁`:'visitou um buteco'}</div></div><div class="feed-tempo">${tempoRelativo(e.ts)}</div></div><div class="feed-bar-nome">🍺 ${e.bar}</div>${notaStars}${comentarioHtml}${(e.fotoUrl||e.foto)?`<img src="${e.fotoUrl||e.foto}" style="width:100%;max-height:280px;object-fit:cover;margin-bottom:8px;cursor:pointer" onclick="window._verFotoFeed('${eventoId}')"/>`:''}<div class="feed-actions">${reacoesHtml}${e.barId?`<button onclick="window.toggleComentariosFeed('${e.barId}',this)" style="display:flex;align-items:center;gap:5px;background:none;border:1.5px solid #e0d0c0;border-radius:20px;padding:5px 12px;font-size:0.8rem;font-weight:700;color:var(--cinza);cursor:pointer;font-family:'Nunito',sans-serif">💬 <span id="commcount-${e.barId}">0</span></button>`:''} ${kmHtml}${window._perfilAdminCache?.admin?`<button onclick="window.invalidarVisita('${e.uid}','${e.barId}','${e.nome}')" style="background:none;border:1px solid #cc0000;color:#cc0000;font-size:0.72rem;cursor:pointer;font-family:'Nunito',sans-serif;padding:4px 8px;border-radius:8px;font-weight:700">🚫 Invalidar</button>`:''}
<button onclick="window.denunciarEvento('${eventoId}','${e.uid}','${e.nome}')" style="background:none;border:none;color:#bbb;font-size:0.75rem;cursor:pointer;font-family:'Nunito',sans-serif;margin-left:auto;padding:5px">🚩</button></div><div id="feed-comm-${e.barId}" style="display:none;padding:0 14px 12px"></div></div>`;
}
async function carregarEstabelecimentos(){
  const chave='estab_cdb_2026_v1';
  const cached=lerCache(chave);
  if(cached&&cached.length){BARES=cached;return;}
  try{
    const snap=await db.collection('estabelecimentos')
      .where('tipo','array-contains','comida-di-buteco-2026')
      .where('aprovado','==',true)
      .get();
    if(snap.docs.length>0){
      BARES=snap.docs.map(d=>d.data());
      salvarCache(chave,BARES);
    }else{
      BARES=window.BARES_ESTATICO||[];
    }
  }catch(e){
    BARES=window.BARES_ESTATICO||[];
  }
}

async function carregarDados(){
  if(!usuarioAtual)return;
  await carregarEstabelecimentos();
  const apkKey='apk_notif_visto_'+usuarioAtual.uid;
if(!localStorage.getItem(apkKey)){
  localStorage.setItem(apkKey,'1');
  enqueueModal(fechar=>{
    const ov=document.createElement('div');
    ov.className='modal-overlay';
    ov.innerHTML=`
      <div class="modal-box" style="text-align:center">
        <div style="font-size:2.5rem;margin-bottom:8px">📲</div>
        <div class="modal-titulo">App disponível!</div>
        <p class="modal-desc">
          O <strong>Rota di Buteco</strong> agora tem app para celular!<br><br>
          <span style="font-size:1.1rem">🤖 Android</span><br>
          <span style="font-size:0.82rem;color:var(--cinza)">Baixe o APK e instale direto no seu celular</span><br><br>
          <span style="font-size:1.1rem">🍎 iPhone</span><br>
          <span style="font-size:0.82rem;color:var(--cinza)">Em breve! Por enquanto use pelo Safari e adicione na tela inicial para ter a mesma experiência</span>
        </p>
        <a href="https://drive.google.com/uc?export=download&id=1ppb02DErANcIEPVOFP1zT5DOHexak8Kp" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;border-radius:12px;background:#3DDC84;color:white;font-size:0.88rem;font-weight:800;text-decoration:none;font-family:'Nunito',sans-serif;margin-bottom:10px;box-sizing:border-box">
          📲 Baixar para Android
        </a>
        <a href="https://wa.me/5531988924409?text=Quero%20instalar%20o%20Rota%20di%20Buteco%20no%20iPhone!" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;border-radius:12px;background:#25D366;color:white;font-size:0.88rem;font-weight:800;text-decoration:none;font-family:'Nunito',sans-serif;margin-bottom:10px;box-sizing:border-box">
          📱 Avisar quando sair pro iPhone
        </a>
        <button onclick="modalFechou(this.closest('.modal-overlay'))" class="btn-cadastro">Fechar</button>
      </div>`;
    document.body.appendChild(ov);
  },3000);
}
const isIphone=/iPhone|iPad|iPod/i.test(navigator.userAgent);
const iosPwaKey='ios_pwa_visto_'+usuarioAtual.uid;
const isStandalone=window.navigator.standalone;
if(isIphone&&!isStandalone&&!localStorage.getItem(iosPwaKey)){
  localStorage.setItem(iosPwaKey,'1');
  enqueueModal(fechar=>{
    const ov=document.createElement('div');
    ov.className='modal-overlay';
    ov.innerHTML=`
      <div class="modal-box" style="text-align:center">
        <div style="font-size:2.5rem;margin-bottom:8px">🍎</div>
        <div class="modal-titulo">Instale no iPhone!</div>
        <p class="modal-desc" style="line-height:1.8">
          Adicione o app na sua tela inicial para usar sem barra do navegador:<br><br>
          1. Toque em <strong>⎙ Compartilhar</strong> no Safari<br>
          2. Toque em <strong>Adicionar à Tela de Início</strong><br>
          3. Toque em <strong>Adicionar</strong><br><br>
          <span style="font-size:0.78rem;color:var(--cinza)">Só funciona pelo Safari — não pelo Chrome</span>
        </p>
        <button onclick="modalFechou(this.closest('.modal-overlay'))" class="btn-login">Entendi!</button>
      </div>`;
    document.body.appendChild(ov);
  },3500);
}
  const cachedVisitas=lerCache('visitas_'+usuarioAtual.uid);
  const cachedExtras=lerCache('extras_'+usuarioAtual.uid);
  if(cachedVisitas&&cachedExtras){
    visitas=cachedVisitas;extras=cachedExtras;
    renderPerfil();renderExtras();
    atualizarDadosBackground();
  }else{await buscarDadosFirebase();}
  window._historico={};
  for(const barId of Object.keys(visitas)){
    const hSnap=await db.collection('users').doc(usuarioAtual.uid).collection('visits').doc(barId).collection('historico').orderBy('ts','desc').get();
    if(!hSnap.empty){window._historico[barId]=hSnap.docs.map(d=>d.data());}
  }
  const notifDoc=await db.collection('notificacoes').doc(usuarioAtual.uid).get();
if(notifDoc.exists&&!notifDoc.data()?.vista&&notifDoc.data()?.tipo==='visita_invalidada'){
  const n=notifDoc.data();
  const bar=BARES.find(b=>b.id===n.barId);
  setTimeout(()=>{
    const ov=document.createElement('div');
    ov.className='modal-overlay';
    ov.innerHTML=`
      <div class="modal-box" style="text-align:center">
        <div style="font-size:3rem;margin-bottom:8px">🚫</div>
        <div class="modal-titulo" style="color:#cc0000">Avaliação Invalidada</div>
        <p class="modal-desc">
          Sua avaliação no <strong>${bar?.nome||n.barId}</strong> foi invalidada.<br><br>
          <span style="color:#cc0000;font-weight:700">${n.msg}</span><br><br>
          <span style="font-size:0.78rem;color:var(--cinza)">Se acredita que houve um engano, entre em contato.</span>
        </p>
        <a href="https://wa.me/5531988924409?text=Ol%C3%A1%20Henrique!%20Minha%20avalia%C3%A7%C3%A3o%20no%20${encodeURIComponent(bar?.nome||n.barId)}%20foi%20invalidada." 
           target="_blank"
           style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;border-radius:12px;background:#25D366;color:white;font-size:0.88rem;font-weight:800;text-decoration:none;font-family:'Nunito',sans-serif;margin-bottom:10px;box-sizing:border-box">
          📱 Falar com o administrador
        </a>
        <button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro">Entendi</button>
      </div>`;
    document.body.appendChild(ov);
    db.collection('notificacoes').doc(usuarioAtual.uid).update({vista:true});
  },2000);
}
  await renderBaresComDados();
  await carregarGrupo();
  window.atualizarCacheGlobal();
   setInterval(verificarNovasVisitasGrupo, 5*60*1000);
  verificarNovasVisitasGrupo();
}
window.irPara=function(pagina){
  window.scrollTo(0,0);
  document.getElementById('perfilPublicoPage').style.display='none';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  const paginaEl=document.getElementById('page-'+pagina);
  if(paginaEl)paginaEl.classList.add('active');
  document.querySelectorAll('.tab').forEach(t=>{
    if(t.getAttribute('onclick')&&t.getAttribute('onclick').includes("'"+pagina+"'"))t.classList.add('active');
  });
  if(pagina!=='proximos'&&_watchId){navigator.geolocation.clearWatch(_watchId);_watchId=null;}
  if(pagina==='ranking'){renderRankingAtivo();renderDesafioDia();renderContadorEvento();}
  if(pagina==='feed')renderFeed();
  if(pagina==='perfil')renderPerfil();
  if(pagina==='proximos')renderProximos();
  if(pagina==='amstel')renderAmstel();
  if(pagina==='downloads')renderDownloads();
  if(pagina==='roteiro'){
  if(!grupoAtual){
    carregarGrupo().then(()=>renderRoteiro());
  }else{
    renderRoteiro();
  }
}
};
window.salvarVisitaExtra=async function(barId){
  if(!usuarioAtual)return;
  const nota=window._notaExtra?.[barId]||0;
 const comentario=filtrarTexto(document.getElementById('comment-extra-'+barId)?.value||'');
  const d={nota,comentario,ts:Date.now()};
  await db.collection('users').doc(usuarioAtual.uid).collection('visits').doc(barId).collection('historico').add(d);
  if(comentario){
    await db.collection('comentarios').doc(barId).collection('posts').add({uid:usuarioAtual.uid,nome:usuarioAtual.displayName||'Anônimo',texto:comentario,nota,ts:Date.now()});
  }
  if(!window._historico)window._historico={};
  if(!window._historico[barId])window._historico[barId]=[];
  window._historico[barId].unshift(d);
  if(window._notaExtra)window._notaExtra[barId]=0;
  document.getElementById('comment-extra-'+barId).value='';
  mostrarNotif('✅ Visita extra registrada!');
  renderBares();
};
window.toggleCard=function(id){
  const info=document.getElementById('info-'+id);
  const isOpen=info.style.display!=='none';
  if(cardAberto&&cardAberto!==id){const prev=document.getElementById('info-'+cardAberto);if(prev)prev.style.display='none';}
  info.style.display=isOpen?'none':'block';
  cardAberto=isOpen?null:id;
};
window.setNota=function(id,n){
  if(!visitas[id])visitas[id]={visitado:true,ts:Date.now()};
  visitas[id].nota=n;
  document.querySelectorAll(`#stars-${id} .estrela`).forEach((el,i)=>el.classList.toggle('on',i<n));
};
window.salvarDesc=async function(barId){
  const txt=document.getElementById('desc-txt-'+barId)?.value.trim();
  if(!txt||txt.length<10){mostrarNotif('Descrição muito curta!');return;}
  if(txt.length>200){mostrarNotif('Máximo 200 caracteres');return;}
  const nome=usuarioAtual.displayName||'Anônimo';
  await db.collection('descricoes').doc(barId).set({texto:txt,autor:nome,uid:usuarioAtual.uid,ts:Date.now()});
  if(!window._descMap)window._descMap={};
  window._descMap[barId]={texto:txt,autor:nome,ts:Date.now()};
  localStorage.removeItem('descMap');
  document.getElementById('desc-form-'+barId).style.display='none';
  document.getElementById('desc-txt-'+barId).value='';
  mostrarNotif('✅ Descrição salva!');
};
window.setVistaGlobal=function(global){
  vistaGlobal=global;
  document.getElementById('btnGlobal').className=global?'ativo':'inativo';
  document.getElementById('btnGrupo').className=global?'inativo':'ativo';
  renderRankingAtivo();
};
let cacheRanking=null,cacheFeed=null,cacheGrupoRanking={},cacheRoteiro=null,cacheRoteiroTs=0;
window.adicionarExtra=async function(){
  if(!usuarioAtual)return;
  const nome=document.getElementById('extraNome').value.trim();
  const prato=document.getElementById('extraPrato').value.trim();
  const nota=parseInt(document.getElementById('extraNota').value)||0;
  const comentario=document.getElementById('extraComentario').value.trim();
  if(!nome){mostrarNotif('Informe o nome do bar');return;}
  const d={nome,prato,nota,comentario,ts:Date.now()};
  const ref=await db.collection('users').doc(usuarioAtual.uid).collection('extras').add(d);
  extras.push({id:ref.id,...d});
  ['extraNome','extraPrato','extraNota','extraComentario'].forEach(id=>document.getElementById(id).value='');
  mostrarNotif('✅ Bar extra registrado!');renderExtras();renderPerfil();
  clearTimeout(window._cacheGlobalTimer);
  window._cacheGlobalTimer=setTimeout(()=>window.atualizarCacheGlobal(),15000);
};
function renderExtras(){
  const lista=document.getElementById('listaExtras');
  if(!lista)return;
  if(!extras.length){lista.innerHTML='<div class="empty"><div class="empty-icon">➕</div><p>Nenhum bar extra ainda</p></div>';return;}
  lista.innerHTML=extras.slice().reverse().map(e=>`
    <div class="bar-card">
      <div class="bar-header"><div>
        <div class="bar-nome">${e.nome}</div>
        ${e.nota?`<div style="font-size:0.75rem;margin-top:2px">${'⭐'.repeat(e.nota)} ${e.nota}/10</div>`:''}
        ${e.ts?`<div style="font-size:0.7rem;color:var(--cinza)">📅 ${new Date(e.ts).toLocaleDateString('pt-BR')}</div>`:''}
      </div><span class="bar-regiao-badge">EXTRA</span></div>
      <div class="bar-info">
        ${e.prato?`<div class="bar-prato">${e.prato}</div>`:''}
        ${e.comentario?`<div style="font-size:0.82rem;color:#555;font-style:italic;margin-top:4px">${e.comentario}</div>`:''}
        <button onclick="window.excluirExtra('${e.id}')" style="margin-top:10px;padding:6px 14px;border-radius:8px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🗑️ Excluir</button>
      </div>
    </div>`).join('');
}
function getEventoId(e){
  if(e.tipo==='emblema')return`emblema_${e.uid}_${e.emblema}`;
  return`visita_${e.uid}_${e.barId}`;
}
window.darLike=async function(eventoId,btn){
  if(!usuarioAtual)return;
  const jaLikei=meusLikes[eventoId];
  meusLikes[eventoId]=!jaLikei;
  try{localStorage.setItem('likes_'+usuarioAtual.uid,JSON.stringify(meusLikes));}catch(e){}

  const ref=db.collection('likes').doc(eventoId);
  try{
    if(!jaLikei){
      await ref.set({count:firebase.firestore.FieldValue.increment(1),uids:firebase.firestore.FieldValue.arrayUnion(usuarioAtual.uid)},{merge:true});
    }else{
      await ref.set({count:firebase.firestore.FieldValue.increment(-1),uids:firebase.firestore.FieldValue.arrayRemove(usuarioAtual.uid)},{merge:true});
    }
  }catch(e){console.log('erro like',e);}
  const likei=meusLikes[eventoId];
  const countEl=btn.querySelector('.like-count');
  const curCount=parseInt(countEl?.textContent||'0');
  if(countEl)countEl.textContent=likei?curCount+1:Math.max(0,curCount-1);
  btn.classList.toggle('liked',likei);
};
let _posUsuario=null;

window.renderProximos=function(){
  if(!usuarioAtual)return;
  const cont=document.getElementById('proximosConteudo');
  if(_posUsuario){
    _renderListaProximos(_posUsuario.lat,_posUsuario.lng);
    return;
  }
  cont.innerHTML='<div class="empty"><div class="empty-icon">⏳</div><p>Obtendo sua localização...</p></div>';
  if(!navigator.geolocation){
    cont.innerHTML='<div class="empty"><div class="empty-icon">❌</div><p>Geolocalização não suportada</p></div>';
    return;
  }
  navigator.geolocation.getCurrentPosition(pos=>{
    _posUsuario={lat:pos.coords.latitude,lng:pos.coords.longitude};
    _renderListaProximos(_posUsuario.lat,_posUsuario.lng);
  },err=>{
    cont.innerHTML='<div class="empty"><div class="empty-icon">❌</div><p>Não foi possível obter sua localização.</p></div>';
  },{enableHighAccuracy:true,timeout:10000});
};

function _renderListaProximos(lat,lng){
  const cont=document.getElementById('proximosConteudo');
  const cardAberto2=cardAberto;
  const baresComDist=BARES
    .filter(b=>b.lat&&b.lng)
    .map(b=>({...b,dist:haversine(lat,lng,b.lat,b.lng)}))
    .sort((a,b)=>a.dist-b.dist);

  cont.innerHTML=`
    <div style="font-size:0.78rem;color:var(--cinza);margin-bottom:14px;font-weight:600">
      📍 ${baresComDist.length} bares ordenados por distância
    </div>
    ${baresComDist.map(b=>{
      const v=visitas[b.id];const visitado=!!v;const nota=v?.nota||0;
      const distStr=b.dist<1?Math.round(b.dist*1000)+'m':b.dist.toFixed(1)+'km';
      const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.nome+' '+b.end)}`;
      return`<div class="bar-card ${visitado?'visitado':''}" id="card-prox-${b.id}">
        <div class="bar-header" onclick="window.toggleCardProximo(this)">
          <div style="min-width:0;flex:1">
            <div class="bar-nome">${visitado?'✅ ':''}${b.nome}</div>
            <div style="font-size:0.72rem;color:var(--laranja);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🍽 ${b.prato}</div>
            <div style="font-size:0.72rem;margin-top:2px;color:var(--cinza);font-weight:700">📍 ${distStr} de você</div>
            ${nota?`<div style="font-size:0.75rem;margin-top:2px">${'⭐'.repeat(nota)} ${nota}/10${v?.km?' · '+v.km+'km':''}</div>`:''}
          </div>
          <span class="bar-regiao-badge">${b.regiao}</span>
        </div>
        <div class="bar-info" id="info-prox-${b.id}" style="display:none">
          <div class="bar-prato">${b.prato}</div>
          ${b.descricao?`<div style="font-size:0.8rem;color:#555;margin-bottom:8px;line-height:1.5;font-style:italic">📝 ${b.descricao}</div>`:''}
          ${b.horario?`<div style="font-size:0.75rem;color:var(--cinza);margin-bottom:6px">🕐 ${b.horario}</div>`:''}
          ${b.telefone?`<div style="font-size:0.75rem;color:var(--cinza);margin-bottom:8px">📞 ${b.telefone}</div>`:''}
          <div class="bar-preco">💰 R$ 40</div>
          <div class="bar-end">${b.end}</div>
          <div id="amigos-bar-${b.id}" style="margin-bottom:8px"></div>
          <div class="bar-acoes">
            <button class="btn-visitar ${visitado?'visitado-btn':''}" onclick="${visitado?`window.toggleVisitaProximo('${b.id}')`:`window.abrirAvaliacaoObrigatoriaProximo('${b.id}')`}">${visitado?'✅ Visitado':'🍺 Marcar visita'}</button>
            <a class="btn-site" href="${b.link}" target="_blank">🔗 Site oficial</a>
            <a class="btn-maps" href="${mapsUrl}" target="_blank">🗺️</a>
          </div>
          <div class="nota-section ${visitado?'open':''}" id="nota-prox-${b.id}">
            <div class="nota-label">Sua avaliação principal:</div>
            <div class="estrelas" id="stars-prox-${b.id}">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<span class="estrela ${nota>=n?'on':''}" onclick="window.setNotaProximo('${b.id}',${n})">⭐</span>`).join('')}</div>
            <div class="km-input-row">
              <span style="font-size:0.78rem;color:var(--cinza);font-weight:700">Km percorridos:</span>
              <input class="km-input" type="number" min="0" max="500" step="1" inputmode="decimal" id="km-prox-${b.id}" value="${v?.km||''}" placeholder="0"/>
            </div>
            <div class="km-input-row">
              <span style="font-size:0.78rem;color:var(--cinza);font-weight:700">Valor pago (R$):</span>
              <input class="km-input" type="number" min="0" max="999" step="0.01" inputmode="decimal" id="valor-prox-${b.id}" value="${v?.valor||''}" placeholder="ex: 40"/>
            </div>
            <textarea class="nota-comment" id="comment-prox-${b.id}" rows="2" placeholder="Comentário (aparece no feed)...">${v?.comentario||''}</textarea>
            <button class="btn-salvar-nota" onclick="window.salvarNotaProximo('${b.id}')">💾 Salvar avaliação</button>
            <div style="margin-top:8px">
  <input type="file" accept="image/*" capture="environment"
         id="foto-input-prox-${b.id}" style="display:none"
         onchange="window.previewFotoObrigatoria('${b.id}',this,'prox-')"/>
  <button onclick="document.getElementById('foto-input-prox-${b.id}').click()"
          style="width:100%;padding:10px;border-radius:10px;
                 border:2px solid var(--laranja);background:var(--laranja);
                 color:white;font-size:0.82rem;font-weight:700;
                 cursor:pointer;font-family:'Nunito',sans-serif">
    📸 Tirar foto do prato agora (obrigatório)
  </button>
  <div style="font-size:0.72rem;color:var(--cinza);text-align:center;margin-top:4px">
    ⚠️ Sem foto tirada na hora, a visita não é computada
  </div>
  <div id="foto-preview-prox-${b.id}" style="display:none;margin-top:8px">
    <div style="background:#e8f5e9;border-radius:8px;padding:6px 10px;
                font-size:0.75rem;font-weight:700;color:#2D6A2D;margin-bottom:6px">
      ✅ Foto verificada — tirada agora na visita
    </div>
    <img id="foto-img-prox-${b.id}"
         style="width:100%;max-height:160px;object-fit:cover;border-radius:8px"/>
  </div>
</div>
          </div>
          ${visitado?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0e0d0">
            <div style="font-size:0.78rem;font-weight:700;color:var(--cinza);margin-bottom:6px">🔁 Registrar outra visita</div>
            <div class="estrelas" id="stars-extra-prox-${b.id}">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<span class="estrela" onclick="window.setNotaExtraProximo('${b.id}',${n})">⭐</span>`).join('')}</div>
            <textarea class="nota-comment" id="comment-extra-prox-${b.id}" rows="2" placeholder="Como foi dessa vez?"></textarea>
            <button class="btn-salvar-nota" style="background:var(--marrom)" onclick="window.salvarVisitaExtraProximo('${b.id}')">📝 Registrar visita extra</button>
          </div>`:''}
        </div>
      </div>`;
    }).join('')}`;

baresComDist.slice(0,20).forEach(b=>renderAmigosNoBar(b.id,'amigos-bar-'+b.id));

  if(cardAberto2){
    const info=document.getElementById('info-prox-'+cardAberto2.replace('prox-',''));
    if(info)info.style.display='block';
  }
}


window.setNotaProximo=function(id,n){
  if(!visitas[id])visitas[id]={visitado:true,ts:Date.now()};
  visitas[id].nota=n;
  document.querySelectorAll(`#stars-prox-${id} .estrela`).forEach((el,i)=>el.classList.toggle('on',i<n));
};

window.setNotaExtraProximo=function(barId,n){
  if(!window._notaExtra)window._notaExtra={};
  window._notaExtra['prox-'+barId]=n;
  document.querySelectorAll(`#stars-extra-prox-${barId} .estrela`).forEach((el,i)=>el.classList.toggle('on',i<n));
};

window.toggleVisitaProximo=async function(id){
  if(!usuarioAtual)return;
  const ref=db.collection('users').doc(usuarioAtual.uid).collection('visits').doc(id);
  if(visitas[id]){
    await ref.delete();
    delete visitas[id];
    await db.collection('feed').doc(usuarioAtual.uid+'_'+id).delete();
    const feedDoc=await db.collection('ranking').doc('feed').get();
    if(feedDoc.exists){
      const eventos=(feedDoc.data().eventos||[]).filter(e=>!(e.uid===usuarioAtual.uid&&e.barId===id));
      await db.collection('ranking').doc('feed').set({eventos,atualizado:Date.now()});
    }
    cacheFeed=null;
    mostrarNotif('Visita removida');
  }
  else{const d={visitado:true,ts:Date.now()};await ref.set(d);visitas[id]=d;mostrarNotif('✅ Visita registrada!');const barStories=BARES.find(b=>b.id===id);}
  renderBares();renderPerfil();_renderListaProximos(_posUsuario.lat,_posUsuario.lng);
if(_vistaProximos==='mapa'&&_posUsuario)_renderMapaLeaflet(_posUsuario.lat,_posUsuario.lng);
  clearTimeout(window._cacheGlobalTimer);
  window._cacheGlobalTimer=setTimeout(()=>window.atualizarCacheGlobal(),30000);
  delete _cacheAmigos[id];
  _cacheVisitasGrupo=null;
  const paginaAtivaToggle=document.querySelector('.page.active')?.id;
if(paginaAtivaToggle==='page-roteiro')renderRoteiro();
};


window.salvarNotaProximo=async function(id){
  if(!usuarioAtual)return;
  if(window._salvandoNota===id)return;
  window._salvandoNota=id;
  setTimeout(()=>{window._salvandoNota=null;},3000);
  const btnSalvar=document.querySelector(`#nota-prox-${id} .btn-salvar-nota`);
  const txtOriginal=btnSalvar?.textContent||'💾 Salvar avaliação';
  if(btnSalvar){btnSalvar.textContent='⏳ Salvando...';btnSalvar.disabled=true;}

  const d=await _salvarDadosVisita(id,'prox-');
  if(!d){
    if(btnSalvar){btnSalvar.textContent=txtOriginal;btnSalvar.disabled=false;}
    window._salvandoNota=null;
    return;
  }
if(window._fotosVisita?.[id]){
  const fotoRaw=window._fotosVisita[id];
  console.log('Foto existe, tamanho:', fotoRaw?.length);
  const blob=await fileParaBlob(fotoRaw,600,0.5);
  console.log('Blob gerado:', blob?.size);
  if(!blob){
    mostrarNotif('📸 Erro ao processar foto. Tente novamente.','erro');
    if(btnSalvar){btnSalvar.textContent=txtOriginal;btnSalvar.disabled=false;}
    window._salvandoNota=null;
    return;
  }
  const url=await uploadFotoStorage(blob,`fotos/visitas/${usuarioAtual.uid}/${id}_${Date.now()}.jpg`);
  d.fotoUrl=url;
  d.fotoVerificada=true;
  d.foto='';
  await db.collection('users').doc(usuarioAtual.uid).collection('visits').doc(id).set(d);

    const bar=BARES.find(b=>b.id===id);
    if(bar){
      const nome=usuarioAtual.displayName||'Anônimo';
      const avatar=localStorage.getItem('avatar_'+usuarioAtual.uid)||'🍺';
      const feedDoc2=await db.collection('ranking').doc('feed').get();
      const feedAtual2=feedDoc2.exists?(feedDoc2.data().eventos||[]):[];
      feedAtual2.unshift({
        uid:usuarioAtual.uid,nome,avatar,
        tipo:'foto_visita',
        bar:bar.nome,barId:id,
        nota:d.nota||0,
        comentario:d.comentario||'',
        fotoUrl:d.fotoUrl||'',
        foto:'',
        fotoVerificada:true,
        ts:Date.now()
      });
      await db.collection('ranking').doc('feed').set({eventos:feedAtual2.slice(0,200),atualizado:Date.now()});
      await db.collection('feed').doc(usuarioAtual.uid+'_'+id).set({
  uid:usuarioAtual.uid,nome,avatar,
  tipo:'foto_visita',
  bar:bar.nome,barId:id,
  nota:d.nota||0,
  comentario:d.comentario||'',
  fotoUrl:d.fotoUrl||'',
  foto:'',
  fotoVerificada:true,
  ts:Date.now()
});
      cacheFeed=null;
    }
    delete window._fotosVisita[id];
  }
  mostrarNotif('💾 Avaliação salva!');
  renderBares();
  renderPerfil();
  _renderListaProximos(_posUsuario.lat,_posUsuario.lng);
  if(_vistaProximos==='mapa'&&_posUsuario)_renderMapaLeaflet(_posUsuario.lat,_posUsuario.lng);
  if(btnSalvar){
    btnSalvar.textContent='✅ Salvo!';
    btnSalvar.style.background='var(--verde)';
    btnSalvar.disabled=false;
    setTimeout(()=>{btnSalvar.textContent=txtOriginal;btnSalvar.style.background='';},3000);
  }
  clearTimeout(window._cacheGlobalTimer);
  window._cacheGlobalTimer=setTimeout(()=>window.atualizarCacheGlobal(),30000);
  verificarUltrapassagem();
};

window.salvarVisitaExtraProximo=async function(barId){
  if(!usuarioAtual)return;
  const nota=window._notaExtra?.['prox-'+barId]||0;
const comentario=filtrarTexto(document.getElementById('comment-extra-prox-'+barId)?.value||'');
  const d={nota,comentario,ts:Date.now()};
  await db.collection('users').doc(usuarioAtual.uid).collection('visits').doc(barId).collection('historico').add(d);
  if(comentario){
    await db.collection('comentarios').doc(barId).collection('posts').add({uid:usuarioAtual.uid,nome:usuarioAtual.displayName||'Anônimo',texto:comentario,nota,ts:Date.now()});
  }
  if(!window._historico)window._historico={};
  if(!window._historico[barId])window._historico[barId]=[];
  window._historico[barId].unshift(d);
  if(window._notaExtra)window._notaExtra['prox-'+barId]=0;
  document.getElementById('comment-extra-prox-'+barId).value='';
  mostrarNotif('✅ Visita extra registrada!');
  const barExtra=BARES.find(b=>b.id===barId);
  if(barExtra&&usuarioAtual){
    const nomeU=usuarioAtual.displayName||'Anônimo';
    const avatarU=localStorage.getItem('avatar_'+usuarioAtual.uid)||'🍺';
    const feedDoc2=await db.collection('ranking').doc('feed').get();
    const feedAtual2=feedDoc2.exists?(feedDoc2.data().eventos||[]):[];
    const visitasAnteriores=feedAtual2.filter(e=>e.uid===usuarioAtual.uid&&e.barId===barId&&e.tipo!=='emblema').length;
    feedAtual2.unshift({
      uid:usuarioAtual.uid,nome:nomeU,avatar:avatarU,
      tipo:'visita_com_comentario',
      bar:barExtra.nome,barId,
      nota,comentario,
      visita_extra:true,
      numero_visita:visitasAnteriores+1,
      ts:Date.now()
    });
    await db.collection('ranking').doc('feed').set({eventos:feedAtual2.slice(0,200),atualizado:Date.now()});
    await db.collection('feed').doc(usuarioAtual.uid+'_'+id).set({
  uid:usuarioAtual.uid,nome,avatar,
  tipo:'foto_visita',
  bar:bar.nome,barId:id,
  nota:d.nota||0,
  comentario:d.comentario||'',
  fotoUrl:d.fotoUrl||'',
  foto:'',
  fotoVerificada:true,
  ts:Date.now()
});
    cacheFeed=null;
  }
  renderBares();
  _renderListaProximos(_posUsuario.lat,_posUsuario.lng);
};

window.toggleCardProximo=function(header){
  const info=header.parentElement.querySelector('.bar-info');
  const isOpen=info.style.display!=='none';
  info.style.opacity='0';
  info.style.display=isOpen?'none':'block';
  if(!isOpen)setTimeout(()=>{info.style.opacity='1';},10);
};

window.abrirAvaliacaoObrigatoria=function(barId){
  if(visitas[barId]){
    const info=document.getElementById('info-'+barId);
    if(info)info.style.display=info.style.display==='none'?'block':'none';
    cardAberto=barId;
    return;
  }
  const notaSection=document.getElementById('nota-'+barId);
  if(notaSection)notaSection.classList.add('open');
  const info=document.getElementById('info-'+barId);
  if(info)info.style.display='block';
  cardAberto=barId;
  mostrarNotif('⭐ Dê uma nota para registrar sua visita!','info');
  setTimeout(()=>{
    notaSection?.scrollIntoView({behavior:'smooth',block:'center'});
  },100);
};
