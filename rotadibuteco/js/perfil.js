async function renderPerfil(){
  if(!usuarioAtual)return;
  if(!window._perfilAdminCache){
    const adminDoc2=await db.collection('users').doc(usuarioAtual.uid).get();
    window._perfilAdminCache=adminDoc2.data()||{};
  }
  const adminDoc2={data:()=>window._perfilAdminCache};
  document.getElementById('perfilNome').innerHTML=(usuarioAtual.displayName||'Butequeador')+' <span style="font-size:0.75rem;color:var(--laranja);cursor:pointer;opacity:0.7">✏️</span>';
  document.getElementById('perfilEmail').textContent=usuarioAtual.email;
  const telSalvo=localStorage.getItem('tel_'+usuarioAtual.uid)||'';
  if(adminDoc2.data()?.admin){
    document.getElementById('perfilTelefone').innerHTML=telSalvo
      ?`📱 ${telSalvo} <span style="font-size:0.7rem;color:var(--laranja);cursor:pointer" onclick="window.editarTelefone()">✏️</span>`
      :`<span style="font-size:0.75rem;color:#bbb;cursor:pointer" onclick="window.editarTelefone()">➕ Adicionar telefone</span>`;
  }else{
    document.getElementById('perfilTelefone').innerHTML='';
  }
  const vList=Object.values(visitas);
  const totalVisitas=vList.length+extras.length;
  const notas=[...vList.filter(v=>v.nota),...extras.filter(e=>e.nota)];
  const media=notas.length?(notas.reduce((s,v)=>s+(v.nota||0),0)/notas.length).toFixed(1):'-';
  const km=vList.reduce((s,v)=>s+(v.km||0),0);
  document.getElementById('statVisitas').textContent=totalVisitas;
  document.getElementById('statMedia').textContent=media;
  document.getElementById('statKm').textContent=km;
  const userInfo=window._perfilAdminCache||{};
const avatarSalvo=userInfo.avatarUrl||userInfo.avatarFoto||userInfo.avatar||localStorage.getItem('avatar_'+usuarioAtual.uid);
  const el=document.getElementById('perfilAvatar');
  if(el&&avatarSalvo){
    if(avatarSalvo.startsWith('data:')||avatarSalvo.startsWith('https://')){
      el.innerHTML='<img src="'+avatarSalvo+'" class="perfil-avatar-img"/>';
    }else{
      el.textContent=avatarSalvo;
    }
  }
  if(!window._abaPerfilAtiva)window._abaPerfilAtiva='stats';
  window.setAbaPerfil(window._abaPerfilAtiva);
}
window.abrirEdicaoAvatar=function(){
  window.setAbaPerfil('config');
  setTimeout(()=>{
    const editor=document.getElementById('avatarEditor');
    if(!editor)return;
    const aberto=editor.style.display!=='none';
    editor.style.display=aberto?'none':'block';
    if(!aberto){
      const avatarAtual=localStorage.getItem('avatar_'+usuarioAtual.uid)||'🍺';
      document.getElementById('avatarOpcoes').innerHTML=AVATARES_EMOJI.map(e=>`<span class="avatar-op ${e===avatarAtual?'selecionado':''}" onclick="window.salvarAvatar('${e}')">${e}</span>`).join('');
    }
  },100);
};
window.salvarAvatar=async function(emoji){
  try{localStorage.setItem('avatar_'+usuarioAtual.uid,emoji);}catch(e){}
  await db.collection('users').doc(usuarioAtual.uid).set({avatar:emoji},{merge:true});
  document.getElementById('perfilAvatar').textContent=emoji;
  document.getElementById('avatarEditor').style.display='none';
  window._perfilAdminCache=null;
  mostrarNotif('Avatar salvo!');
};
window.uploadFoto=function(input){
  const file=input.files[0];if(!file)return;
  if(file.size>2*1024*1024){mostrarNotif('Foto muito grande! Máx 2MB');return;}
  const reader=new FileReader();
  reader.onload=async function(e){
    const blob=await fileParaBlob(e.target.result,200,0.7);
    if(!blob){mostrarNotif('Erro ao processar foto','erro');return;}
    const url=await uploadFotoStorage(blob,`fotos/avatares/${usuarioAtual.uid}.jpg`);
    try{localStorage.setItem('avatar_'+usuarioAtual.uid,url);}catch(e){}
    await db.collection('users').doc(usuarioAtual.uid).set({avatarUrl:url,avatarFoto:''},{merge:true});
    const el=document.getElementById('perfilAvatar');el.innerHTML=`<img src="${url}" class="perfil-avatar-img"/>`;
    window._perfilAdminCache=null;
    document.getElementById('avatarEditor').style.display='none';mostrarNotif('Foto salva!');
    window.atualizarCacheGlobal();
  };
  reader.readAsDataURL(file);
};
window.setAbaPerfil=function(aba){
  ['stats','fotos','emblemas','grupo','config'].forEach(a=>{
    const btn=document.getElementById('aba'+a.charAt(0).toUpperCase()+a.slice(1));
    if(btn){btn.style.background=a===aba?'var(--marrom)':'transparent';btn.style.color=a===aba?'white':'var(--marrom)';}
  });
  window._abaPerfilAtiva=aba;
  renderAbaPerfilAtiva();
};
function calcularEmblemas(numVisitas,boresIds){
  const conquistados=new Set();
  EMBLEMAS_QUANTIDADE.forEach(e=>{if(numVisitas>=e.min)conquistados.add(e.nome);});
  let regioesCompletas=0;
  Object.keys(REGIOES_COUNT).forEach(r=>{
    if(BARES.filter(b=>b.regiao===r).every(b=>boresIds.has(b.id))){
      const emb=EMBLEMAS_REGIAO.find(e=>e.regiao===r);if(emb)conquistados.add(emb.nome);regioesCompletas++;
    }
  });
  if(regioesCompletas===7){const emb=EMBLEMAS_REGIAO.find(e=>e.regiao==='TODAS');if(emb)conquistados.add(emb.nome);}
  return conquistados;
}
window.editarNome=async function(){
  if(!usuarioAtual)return;
  const userDoc=await db.collection('users').doc(usuarioAtual.uid).get();
  const data=userDoc.data()||{};
  const trocas=data.trocasNome||0;
  if(trocas>=2){mostrarNotif('❌ Você já alterou seu nome 2 vezes','erro');return;}

  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.innerHTML=`
    <div class="modal-box">
      <div class="modal-titulo">✏️ Editar Nome</div>
      <p class="modal-desc">Você pode trocar seu nome <strong>${2-trocas}</strong> vez${2-trocas>1?'es':''} ainda.</p>
      <input class="input-field" id="nomeNovoInput" type="text" placeholder="Seu novo nome" maxlength="30"/>
      <div id="nomeMsg" style="font-size:0.78rem;min-height:18px;margin-bottom:12px;font-weight:700"></div>
      <button onclick="window.confirmarNome()" class="btn-login" style="margin-bottom:10px">💾 Salvar nome</button>
      <button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('nomeNovoInput')?.focus(),100);
};
window.abrirPerfil=async function(uid){
  if(uid===usuarioAtual.uid){window.irPara('perfil');return;}
  paginaAnterior=document.querySelector('.page.active')?.id?.replace('page-','')||'ranking';
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  const pp=document.getElementById('perfilPublicoPage');
  pp.style.display='block';
  document.getElementById('perfilPublicoConteudo').innerHTML='<div class="empty"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  try{
    const rankDoc=await db.collection('ranking').doc(uid).get();
    const dados=rankDoc.exists?rankDoc.data():{};
    const vSnap=await db.collection('users').doc(uid).collection('visits').get();
    const boresIds=new Set();vSnap.forEach(v=>boresIds.add(v.id));
    const totalVisitas=boresIds.size;
    const nome=dados.nome||'Butequeador';
    const avatar=dados.avatar||'🍺';
    const conquistados=calcularEmblemas(totalVisitas,boresIds);
    const avatarHtml=(avatar.startsWith('data:')||avatar.startsWith('https://'))?`<img src="${avatar}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;display:block"/>`:`<span style="font-size:1.8rem">${avatar}</span>`;
    document.getElementById('perfilPublicoConteudo').innerHTML=`
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--laranja);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">${avatarHtml}</div>
        <div>
          <div style="font-size:1.1rem;font-weight:800;color:var(--marrom)">${nome}</div>
          <div style="font-size:0.8rem;color:var(--cinza)">${totalVisitas} bares · ${dados.media&&dados.media!=='-'?dados.media+'/10':'sem notas'} · ${dados.km||0}km</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
        <div style="background:white;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:var(--shadow)"><div style="font-family:'Bebas Neue',cursive;font-size:1.4rem;color:var(--laranja)">${totalVisitas}</div><div style="font-size:0.65rem;color:var(--cinza);font-weight:700;text-transform:uppercase">Bares</div></div>
        <div style="background:white;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:var(--shadow)"><div style="font-family:'Bebas Neue',cursive;font-size:1.4rem;color:var(--laranja)">${dados.media&&dados.media!=='-'?dados.media:'-'}</div><div style="font-size:0.65rem;color:var(--cinza);font-weight:700;text-transform:uppercase">Nota média</div></div>
        <div style="background:white;border-radius:10px;padding:10px 8px;text-align:center;box-shadow:var(--shadow)"><div style="font-family:'Bebas Neue',cursive;font-size:1.4rem;color:var(--laranja)">${dados.regioes||0}</div><div style="font-size:0.65rem;color:var(--cinza);font-weight:700;text-transform:uppercase">Regiões</div></div>
      </div>
      <div style="font-family:'Bebas Neue',cursive;font-size:1rem;color:var(--marrom);letter-spacing:1px;margin-bottom:10px">🍺 Emblemas de Visitas</div>
      <div class="emblemas-grid">${EMBLEMAS_QUANTIDADE.map(e=>{const c=conquistados.has(e.nome);return`<div class="emblema-card ${c?'conquistado':''}"><div class="emblema-icon">${e.icon}</div><div class="emblema-nome">${e.nome}</div><div class="emblema-desc">${e.desc||''}</div></div>`;}).join('')}</div>
      <div style="font-family:'Bebas Neue',cursive;font-size:1rem;color:var(--marrom);letter-spacing:1px;margin:16px 0 10px">🗺️ Emblemas de Regiões</div>
      <div class="emblemas-grid">${EMBLEMAS_REGIAO.map(e=>{const c=conquistados.has(e.nome);return`<div class="emblema-card ${c?'conquistado':''}"><div class="emblema-icon">${e.icon}</div><div class="emblema-nome">${e.nome}</div><div class="emblema-desc">${e.desc||''}</div></div>`;}).join('')}</div>`;
  }catch(err){
    document.getElementById('perfilPublicoConteudo').innerHTML='<div class="empty"><div class="empty-icon">⚠️</div><p>Erro ao carregar perfil</p></div>';
  }
};
window.fecharPerfilPublico=function(){
  document.getElementById('perfilPublicoPage').style.display='none';
  window.irPara(paginaAnterior||'ranking');
};
window.excluirExtra=async function(id){
  if(!confirm('Excluir este bar extra?'))return;
  await db.collection('users').doc(usuarioAtual.uid).collection('extras').doc(id).delete();
  extras=extras.filter(e=>e.id!==id);
  salvarCache('extras_'+usuarioAtual.uid,extras);
  renderExtras();renderPerfil();
  clearTimeout(window._cacheGlobalTimer);
  window._cacheGlobalTimer=setTimeout(()=>window.atualizarCacheGlobal(),15000);
  mostrarNotif('Extra excluído');
};
window.confirmarNome=async function(){
  const novoNome=document.getElementById('nomeNovoInput')?.value.trim();
  const msg=document.getElementById('nomeMsg');
  if(!novoNome){msg.style.color='#cc0000';msg.textContent='Digite um nome.';return;}
  if(novoNome.length<2){msg.style.color='#cc0000';msg.textContent='Nome muito curto.';return;}
  if(novoNome.length>30){msg.style.color='#cc0000';msg.textContent='Máximo 30 caracteres.';return;}

  const userDoc=await db.collection('users').doc(usuarioAtual.uid).get();
  const trocas=(userDoc.data()?.trocasNome)||0;

  await usuarioAtual.updateProfile({displayName:novoNome});
  await db.collection('users').doc(usuarioAtual.uid).set({nome:novoNome,trocasNome:trocas+1},{merge:true});

  document.querySelector('.modal-overlay')?.remove();

  document.getElementById('headerNome').textContent=novoNome;
  document.getElementById('perfilNome').innerHTML=novoNome+' <span style="font-size:0.75rem;color:var(--laranja);cursor:pointer;opacity:0.7">✏️</span>';

  const restantes=2-trocas-1;
  mostrarNotif(restantes>0
    ?`✅ Nome salvo! Você ainda pode trocar mais ${restantes} vez${restantes>1?'es':''}`
    :`✅ Nome salvo! Não é possível trocar mais`,'info');
  window._perfilAdminCache=null;
  clearTimeout(window._cacheGlobalTimer);
  window._cacheGlobalTimer=setTimeout(()=>window.atualizarCacheGlobal(),15000);
};
window.excluirConta=async function(){
  if(!confirm('Tem certeza? Todos os seus dados serão apagados permanentemente.'))return;
  if(!confirm('Confirma a exclusão definitiva da sua conta?'))return;
  try{
    mostrarNotif('Excluindo dados...');
    const vSnap=await db.collection('users').doc(usuarioAtual.uid).collection('visits').get();
    for(const doc of vSnap.docs)await doc.ref.delete();
    const eSnap=await db.collection('users').doc(usuarioAtual.uid).collection('extras').get();
    for(const doc of eSnap.docs)await doc.ref.delete();
    await db.collection('ranking').doc('global').update({[usuarioAtual.uid]:firebase.firestore.FieldValue.delete()});
    await db.collection('users').doc(usuarioAtual.uid).delete();
    for(const codigo of gruposAtual){await db.collection('grupos').doc(codigo).update({membros:firebase.firestore.FieldValue.arrayRemove(usuarioAtual.uid)});}
    await usuarioAtual.delete();mostrarNotif('Conta excluída.');
  }catch(e){
    if(e.code==='auth/requires-recent-login'){alert('Por segurança, faça logout e login novamente antes de excluir a conta.');}
    else{mostrarNotif('Erro ao excluir: '+e.message);}
  }
};
function renderAbaPerfilAtiva(){
  const aba=window._abaPerfilAtiva||'stats';
  const cont=document.getElementById('abaPerfilConteudo');
  if(!cont)return;
  const vList=Object.values(visitas);
  const totalVisitas=vList.length+extras.length;
  const boresIds=new Set(Object.keys(visitas));
  const conquistados=calcularEmblemas(totalVisitas,boresIds);

  if(aba==='stats'){
    const notas=[...vList.filter(v=>v.nota),...extras.filter(e=>e.nota)];
    const totalGasto=vList.reduce((s,v)=>s+(v.valor||40),0)+(extras.length*40);
    const diasSet=new Set();
    vList.forEach(v=>{if(v.ts)diasSet.add(new Date(v.ts).toDateString());});
    const diasAtivos=diasSet.size||1;
    const mediaDia=(totalGasto/diasAtivos).toFixed(0);
    cont.innerHTML=`
      <div class="gastos-card">
        <h3>💰 Meus Gastos</h3>
        <div class="gasto-row"><span class="gasto-label">Total gasto</span><span class="gasto-valor">R$ ${totalGasto}</span></div>
        <div class="gasto-row"><span class="gasto-label">Dias de buteco</span><span class="gasto-valor">${diasAtivos} dia${diasAtivos!==1?'s':''}</span></div>
        <div class="gasto-row"><span class="gasto-label">Média por dia</span><span class="gasto-valor">R$ ${mediaDia}</span></div>
        <div class="gasto-row"><span class="gasto-label">Média por visita</span><span class="gasto-valor">R$ 40,00</span></div>
      </div>
      <div id="mapaRegioes"></div>`;
    document.getElementById('mapaRegioes').innerHTML=renderMapaRegioes(boresIds);

  }else if(aba==='fotos'){
    const visitasComFoto=Object.entries(visitas).filter(([id,v])=>v.foto);
    if(!visitasComFoto.length){
      cont.innerHTML='<div class="empty"><div class="empty-icon">📷</div><p>Nenhuma foto ainda<br><span style="font-size:0.78rem">Adicione fotos ao marcar visitas nos bares</span></p></div>';
      return;
    }
    cont.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;border-radius:12px;overflow:hidden">
      ${visitasComFoto.map(([id,v])=>{
        const bar=BARES.find(b=>b.id===id);
        return`<div style="position:relative;aspect-ratio:1;cursor:pointer" onclick="window.verFotoVisita('${id}')">
          <img src="${v.foto}" style="width:100%;height:100%;object-fit:cover"/>
          ${v.nota?`<div style="position:absolute;bottom:4px;right:4px;background:rgba(0,0,0,0.6);color:white;font-size:0.65rem;font-weight:700;padding:2px 5px;border-radius:6px">⭐${v.nota}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;

  }else if(aba==='emblemas'){
    let html='<div style="font-family:\'Bebas Neue\',cursive;font-size:1rem;color:var(--marrom);letter-spacing:1px;margin-bottom:10px">🍺 Emblemas de Visitas</div><div class="emblemas-grid">';
    EMBLEMAS_QUANTIDADE.forEach(e=>{
      const conquistou=conquistados.has(e.nome);
      const msgWpp=encodeURIComponent('🏆 Conquistei o emblema "'+e.nome+'" '+e.icon+' no Rota di Buteco BH 2026! Acesse: https://rotadibuteco.web.app');
      let progressoHtml='';
      if(!conquistou&&e.min){const pct=Math.round((Math.min(totalVisitas,e.min)/e.min)*100);progressoHtml='<div style="margin-top:6px;background:#f0e0d0;border-radius:10px;height:6px"><div style="width:'+pct+'%;background:var(--laranja);height:6px;border-radius:10px"></div></div><div style="font-size:0.65rem;color:var(--cinza);margin-top:2px">'+Math.min(totalVisitas,e.min)+'/'+e.min+' bares</div>';}
      const compartilhar=conquistou?'<a href="https://wa.me/?text='+msgWpp+'" target="_blank" style="display:block;margin-top:8px;font-size:0.72rem;color:white;background:#25D366;padding:5px 10px;border-radius:10px;text-decoration:none;font-weight:700">📤 Compartilhar</a>':'';
      html+='<div class="emblema-card '+(conquistou?'conquistado':'')+'"><div class="emblema-icon">'+e.icon+'</div><div class="emblema-nome">'+e.nome+'</div><div class="emblema-desc">'+(e.desc||'')+'</div>'+progressoHtml+compartilhar+'</div>';
    });
    html+='</div><div style="font-family:\'Bebas Neue\',cursive;font-size:1rem;color:var(--marrom);letter-spacing:1px;margin:16px 0 10px">🗺️ Emblemas de Regiões</div><div class="emblemas-grid">';
    EMBLEMAS_REGIAO.forEach(e=>{
      const conquistou=conquistados.has(e.nome);
      const msgWpp=encodeURIComponent('🏆 Conquistei o emblema "'+e.nome+'" '+e.icon+' no Rota di Buteco BH 2026! Acesse: https://rotadibuteco.web.app');
      let progressoHtml='';
      if(!conquistou){
        if(e.regiao&&e.regiao!=='TODAS'){const total=REGIOES_COUNT[e.regiao]||0;const feitos=BARES.filter(b=>b.regiao===e.regiao&&boresIds.has(b.id)).length;const pct=Math.round((feitos/total)*100);progressoHtml='<div style="margin-top:6px;background:#f0e0d0;border-radius:10px;height:6px"><div style="width:'+pct+'%;background:var(--laranja);height:6px;border-radius:10px"></div></div><div style="font-size:0.65rem;color:var(--cinza);margin-top:2px">'+feitos+'/'+total+' bares</div>';}
        else if(e.regiao==='TODAS'){const regioesFeitas=Object.keys(REGIOES_COUNT).filter(r=>BARES.filter(b=>b.regiao===r).every(b=>boresIds.has(b.id))).length;const pct=Math.round((regioesFeitas/7)*100);progressoHtml='<div style="margin-top:6px;background:#f0e0d0;border-radius:10px;height:6px"><div style="width:'+pct+'%;background:var(--laranja);height:6px;border-radius:10px"></div></div><div style="font-size:0.65rem;color:var(--cinza);margin-top:2px">'+regioesFeitas+'/7 regiões completas</div>';}
      }
      const compartilhar=conquistou?'<a href="https://wa.me/?text='+msgWpp+'" target="_blank" style="display:block;margin-top:8px;font-size:0.72rem;color:white;background:#25D366;padding:5px 10px;border-radius:10px;text-decoration:none;font-weight:700">📤 Compartilhar</a>':'';
      html+='<div class="emblema-card '+(conquistou?'conquistado':'')+'"><div class="emblema-icon">'+e.icon+'</div><div class="emblema-nome">'+e.nome+'</div><div class="emblema-desc">'+(e.desc||'')+'</div>'+progressoHtml+compartilhar+'</div>';
    });
    html+='</div>';
    cont.innerHTML=html;

  }else if(aba==='grupo'){
    cont.innerHTML=`
      <div class="grupo-card" id="grupoCard"><h3>👥 Meu Grupo</h3><div id="grupoConteudo"></div></div>
      <div id="statsGrupo"></div>`;
    renderGrupoCard();
    renderStatsGrupo();

  }else if(aba==='config'){
    cont.innerHTML=`
      <div id="avatarEditor" class="avatar-editor-card" style="display:none">
        <p style="font-size:0.82rem;font-weight:700;color:var(--cinza);margin-bottom:8px">Escolha um emoji:</p>
        <div class="avatar-opcoes" id="avatarOpcoes"></div>
        <p style="font-size:0.82rem;font-weight:700;color:var(--cinza);margin:8px 0">Ou envie uma foto:</p>
        <input type="file" accept="image/*" class="foto-upload" id="fotoUpload" onchange="window.uploadFoto(this)"/>
        <button class="btn-upload-foto" onclick="document.getElementById('fotoUpload').click()">📷 Escolher foto da galeria</button>
      </div>
      <button onclick="clearTimeout(window._cacheGlobalTimer);window._cacheGlobalTimer=setTimeout(()=>window.atualizarCacheGlobal().then(()=>window.mostrarNotif('✅ Perfil salvo!')),500)" style="width:100%;padding:10px;border-radius:10px;background:var(--laranja);color:white;border:none;font-size:0.88rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:12px">💾 Salvar perfil</button>
      <div style="background:white;border-radius:14px;padding:16px;box-shadow:var(--shadow);margin-bottom:16px;text-align:center">
        <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;color:var(--marrom);letter-spacing:1px;margin-bottom:4px">💬 Dúvidas ou Sugestões?</div>
        <a href="https://wa.me/5531988924409" target="_blank" style="display:inline-flex;align-items:center;gap:8px;margin-top:10px;padding:10px 20px;border-radius:12px;background:#25D366;color:white;font-size:0.88rem;font-weight:700;text-decoration:none;font-family:'Nunito',sans-serif">
          <span style="font-size:1.1rem">📱</span> Chamar no WhatsApp
        </a>
      </div>
      <div style="background:white;border-radius:14px;padding:16px;box-shadow:var(--shadow);margin-bottom:16px">
        <div style="font-size:0.88rem;font-weight:800;color:#cc0000;margin-bottom:8px">⚠️ Zona de Perigo</div>
        <p style="font-size:0.78rem;color:var(--cinza);margin-bottom:12px">Excluir sua conta remove permanentemente todos os seus dados.</p>
        <button onclick="window.excluirConta()" style="width:100%;padding:10px;border-radius:10px;background:transparent;color:#cc0000;border:2px solid #cc0000;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🗑️ Excluir minha conta</button>
      </div>`;
  }
}
window.toggleCadastro=function(){
  modoLogin=!modoLogin;
  document.getElementById('loginTitle').textContent=modoLogin?'Entrar':'Criar conta';
  document.getElementById('nomeInput').style.display=modoLogin?'none':'block';
  document.getElementById('senha2Input').style.display=modoLogin?'none':'block';
  document.getElementById('btnLogin').textContent=modoLogin?'Entrar':'Cadastrar';
  document.getElementById('btnCadastro').textContent=modoLogin?'Criar conta':'Já tenho conta';
  document.getElementById('avisoLgpd').style.display=modoLogin?'none':'block';
  document.getElementById('btnReset').style.display=modoLogin?'block':'none';

};
