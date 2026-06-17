window.editarContatoPremio=function(){
  const atual=localStorage.getItem('contato_premio_'+usuarioAtual.uid)||'';
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.innerHTML=`
    <div class="modal-box">
      <div class="modal-titulo">📱 Contato do Prêmio</div>
      <p class="modal-desc" style="font-size:0.78rem;margin-bottom:16px">
        Cadastre seu WhatsApp para receber o aviso se ganhar o 🎁 prêmio misterioso!
      </p>
      ${atual?`<div style="background:#f0ffe0;border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:0.82rem;color:var(--verde);font-weight:700">✅ Atual: ${atual}</div>`:''}
      <div style="position:relative;margin-bottom:4px">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:1rem">📱</span>
        <input 
          id="contatoPremioInput" 
          type="tel" 
          inputmode="numeric"
          pattern="[0-9\s\(\)\-\+]*"
          placeholder="(31) 99999-9999" 
          value="${atual}"
          autocomplete="tel"
          style="width:100%;padding:12px 14px 12px 36px;border:2px solid #e0d0c0;border-radius:10px;font-size:1rem;font-family:'Nunito',sans-serif;outline:none;color:var(--marrom);margin-bottom:0;-webkit-appearance:none;appearance:none"
          oninput="this.value=this.value.replace(/[^0-9\s\(\)\-\+]/g,'')"
        />
      </div>
      <div style="font-size:0.7rem;color:var(--cinza);margin-bottom:16px">Digite apenas números com DDD</div>
      <button onclick="window.salvarContatoPremio()" class="btn-login" style="margin-bottom:10px">💾 Salvar contato</button>
      ${atual?`<button onclick="window.removerContatoPremio()" style="width:100%;padding:10px;border-radius:12px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif;margin-bottom:10px">🗑️ Remover</button>`:''}
      <button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('contatoPremioInput')?.focus(),300);
};

function atualizarExibicaoContato(val){
  const info1=document.getElementById('amstelContatoInfo');
  if(info1)info1.innerHTML=val
    ?`✅ Contato cadastrado: <strong>${val}</strong>`
    :'⚠️ Cadastre seu contato para receber o prêmio!';
  const btn1=document.querySelector('[onclick="window.editarContatoPremio()"]');
  if(btn1)btn1.textContent=val?'📱 Editar contato':'📱 Cadastrar contato';
  const perfilInfo=document.getElementById('contatoPremioInfo');
  if(perfilInfo)renderContatoPremio();
}

function renderContatoPremio(){
  const el=document.getElementById('contatoPremioInfo');
  const btn=document.getElementById('btnContatoPremio');
  if(!el||!btn)return;
  const val=localStorage.getItem('contato_premio_'+usuarioAtual.uid)||'';
  if(val){
    el.innerHTML=`<div style="background:var(--creme);border-radius:10px;padding:10px 12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:0.75rem;color:var(--cinza);font-weight:700">Seu contato</div>
        <div style="font-size:0.9rem;font-weight:800;color:var(--marrom)">${val}</div>
      </div>
      <span style="font-size:1.3rem">✅</span>
    </div>`;
    btn.textContent='✏️ Editar contato';
  }else{
    el.innerHTML='';
    btn.textContent='📱 Adicionar contato';
  }
}

window.salvarContatoPremio=async function(){
  const val=document.getElementById('contatoPremioInput')?.value.trim();
  if(!val){mostrarNotif('Digite um contato','erro');return;}
  localStorage.setItem('contato_premio_'+usuarioAtual.uid,val);
  await db.collection('users').doc(usuarioAtual.uid).set({contatoPremio:val},{merge:true});
  document.querySelector('.modal-overlay')?.remove();
  atualizarExibicaoContato(val);
  mostrarNotif('✅ Contato salvo!');
};

window.removerContatoPremio=async function(){
  localStorage.removeItem('contato_premio_'+usuarioAtual.uid);
  await db.collection('users').doc(usuarioAtual.uid).set({contatoPremio:''},{merge:true});
  document.querySelector('.modal-overlay')?.remove();
  atualizarExibicaoContato('');
  mostrarNotif('Contato removido');
};

window.resetarAmstelUsuario=async function(uid,nome){
  if(!confirm(`Resetar Amstel de ${nome}? Remove os registros aprovados e o ranking Amstel deste usuário.`))return;
  try{
    const aprovSnap=await db.collection('amstel').doc('registros').collection('aprovados').where('uid','==',uid).get();
    for(const doc of aprovSnap.docs)await doc.ref.delete();
    const pendSnap=await db.collection('amstel').doc('registros').collection('pendentes').where('uid','==',uid).get();
    for(const doc of pendSnap.docs)await doc.ref.delete();
    await db.collection('amstel').doc('ranking').update({[uid]:firebase.firestore.FieldValue.delete()});
    mostrarNotif(`🍺 Amstel de ${nome} resetado!`,'erro');
    document.querySelector('.modal-overlay')?.remove();
  }catch(e){mostrarNotif('Erro ao resetar Amstel','erro');}
};
window.previewAmstelFoto=function(input){
  const file=input.files[0];if(!file)return;
  if(file.size>3*1024*1024){mostrarNotif('Foto muito grande! Máx 3MB','erro');return;}
  const reader=new FileReader();
  reader.onload=e=>{
    document.getElementById('amstelFotoImg').src=e.target.result;
    document.getElementById('amstelFotoPreview').style.display='block';
  };
  reader.readAsDataURL(file);
};

window.enviarRegistroAmstel=async function(){
  const msg=document.getElementById('amstelMsg');
const barNome=document.getElementById('amstelBarNomeDigitado')?.value.trim()||'';
const barId=BARES.find(b=>b.nome===barNome)?.id||'livre';
  const valor=parseFloat(document.getElementById('amstelValor')?.value)||0;
  const fotoInput=document.getElementById('amstelFotoInput');
 if(!barNome){msg.textContent='Informe o bar.';return;}
  if(valor<1){msg.textContent='Informe o valor gasto em Amstel.';return;}
  if(!fotoInput.files[0]){msg.textContent='Tire uma foto da comanda com Amstel.';return;}
  msg.textContent='Enviando...';msg.style.color='#f0a500';
const file=fotoInput.files[0];
const reader=new FileReader();
reader.onerror=()=>{msg.textContent='Erro ao ler a foto.';msg.style.color='#cc0000';};
reader.onload=async e=>{
  try{
    const blob=await fileParaBlob(e.target.result,600,0.5);
    if(!blob){msg.textContent='Erro ao processar foto.';msg.style.color='#cc0000';return;}
    const docRef=db.collection('amstel').doc('registros').collection('pendentes').doc();
    const fotoUrl=await uploadFotoStorage(blob,`fotos/amstel/${docRef.id}.jpg`);
    const nome=usuarioAtual.displayName||'Anônimo';
    const avatar=localStorage.getItem('avatar_'+usuarioAtual.uid)||'🍺';
    await docRef.set({
      uid:usuarioAtual.uid,nome,avatar,barId,barNome,valor,
      quantidade:window._qtdAmstel||1,
      fotoUrl,foto:'',ts:Date.now()
    });
    document.querySelector('.modal-overlay')?.remove();
    mostrarNotif('✅ Enviado! Aguarde aprovação.','info');
    _cacheAmstel=null;renderAmstel();
  }catch(err){
    console.error('Erro Amstel:',err);
    msg.textContent='Erro: '+(err.message||err.code||JSON.stringify(err));
    msg.style.color='#cc0000';
  }
};
reader.readAsDataURL(file);
};

window.verPendentesAmstel=async function(){
  document.getElementById('modalAdmin')?.remove();
  document.getElementById('modalAmstelPendentes')?.remove();
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
overlay.id='modalAmstelPendentes';
overlay.style.zIndex='var(--z-foto)';
overlay.style.alignItems='flex-start';
overlay.style.paddingTop='20px';
overlay.innerHTML=`
    <div class="modal-box" style="max-width:500px;max-height:85vh;overflow-y:auto;text-align:left;padding:20px 16px">
      <div class="modal-titulo">🍺 Amstel Pendentes</div>
      <div id="amstelPendentesLista"><p style="color:var(--cinza);font-size:0.82rem">Carregando...</p></div>
      <button onclick="document.getElementById('modalAmstelPendentes').remove()" class="btn-cadastro" style="margin-top:12px">Fechar</button>
    </div>`;
  document.body.appendChild(overlay);

  const snap=await db.collection('amstel').doc('registros').collection('pendentes').orderBy('ts','desc').get();
  const lista=document.getElementById('amstelPendentesLista');
  if(snap.empty){lista.innerHTML='<p style="color:var(--cinza)">Nenhum pendente!</p>';return;}

  lista.innerHTML=snap.docs.map(doc=>{
    const d=doc.data();
    const nomeEsc=(d.nome||'').replace(/'/g,"\\'");
    const barNomeEsc=(d.barNome||'').replace(/'/g,"\\'");
    return`<div id="amstel-card-${doc.id}" style="padding:16px 0;border-bottom:2px solid #f0e0d0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div>
          <div style="font-weight:800;font-size:0.95rem;color:var(--marrom)">${d.avatar||'🍺'} ${d.nome}</div>
          <div style="font-size:0.78rem;color:var(--cinza)">${d.barNome}</div>
          <div style="font-size:0.85rem;font-weight:700;color:#f0a500">R$ ${parseFloat(d.valor).toFixed(2)}${d.quantidade?` · ${d.quantidade} cerveja${d.quantidade>1?'s':''}`:''}</div>
          <div style="font-size:0.7rem;color:#bbb">${tempoRelativo(d.ts)}</div>
        </div>
      </div>
      <div style="margin-bottom:10px;cursor:pointer" onclick="window.verFotoAmstel('${doc.id}')">
        <img src="${d.fotoUrl||d.foto||''}" 
          style="width:100%;max-height:200px;border-radius:10px;object-fit:cover;border:2px solid #e0d0c0;display:block" 
          onerror="this.outerHTML='<div style=padding:20px;text-align:center;background:#f5f5f5;border-radius:10px;color:#999;font-size:0.8rem>⚠️ Foto não carregada</div>'"
        />
        <div style="font-size:0.7rem;color:var(--laranja);text-align:center;margin-top:4px;font-weight:700">🔍 Toque para ver em tela cheia</div>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="window.aprovarAmstel('${doc.id}','${d.uid}','${nomeEsc}','${barNomeEsc}',${d.valor},this)" style="flex:1;padding:10px;border-radius:10px;background:var(--verde);color:white;border:none;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">✅ Aprovar</button>
        <button onclick="window.recusarAmstel('${doc.id}',this)" style="flex:1;padding:10px;border-radius:10px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">❌ Recusar</button>
      </div>
    </div>`;
  }).join('');
};

window.verFotoAmstel=function(docId){
  const img=document.querySelector(`[onclick="window.verFotoAmstel('${docId}')"] img`);
  if(!img)return;
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;cursor:pointer';
  ov.innerHTML=`
    <div style="position:relative;width:100%;max-width:600px">
      <img src="${img.src}" style="width:100%;border-radius:10px;object-fit:contain;max-height:85vh"/>
      <button onclick="this.closest('div[style*=z-index]').remove()" style="position:absolute;top:-12px;right:-12px;width:36px;height:36px;border-radius:50%;background:white;border:none;font-size:1.2rem;cursor:pointer;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.3)">✕</button>
      <div style="color:white;text-align:center;margin-top:10px;font-size:0.8rem;opacity:0.7">Toque fora para fechar</div>
    </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
};

window.aprovarAmstel=async function(docId,uid,nome,barNome,valor,btn){
  btn.textContent='Aprovando...';btn.disabled=true;
  try{
    const pendRef=db.collection('amstel').doc('registros').collection('pendentes').doc(docId);
    const pendDoc=await pendRef.get();
    const data=pendDoc.data();
    await db.collection('amstel').doc('registros').collection('aprovados').add({...data,aprovadoEm:Date.now()});
    await pendRef.delete();
    const rankRef=db.collection('amstel').doc('ranking');
    const rankDoc=await rankRef.get();
    const rankData=rankDoc.exists?rankDoc.data():{};
    const atual=rankData[uid]||{uid,nome,total:0,registros:0};
    atual.total=parseFloat((atual.total+parseFloat(valor)).toFixed(2));
atual.registros=(atual.registros||0)+1;
atual.cervejas=(atual.cervejas||0)+(data.quantidade||1);
    await rankRef.set({[uid]:atual},{merge:true});
    const feedDoc=await db.collection('ranking').doc('feed').get();
    const feedAtual=feedDoc.exists?(feedDoc.data().eventos||[]):[];
    const avatar=data.avatar||'🍺';
    feedAtual.unshift({uid,nome,avatar,tipo:'amstel',barNome,valor,ts:Date.now()});
    await db.collection('ranking').doc('feed').set({eventos:feedAtual.slice(0,200),atualizado:Date.now()});
    cacheFeed=null;_cacheAmstel=null;
    const card=document.getElementById('amstel-card-'+docId);
if(card)card.style.opacity='0.4';
btn.textContent='✅ Aprovado!';
    mostrarNotif(`✅ ${nome} aprovado!`);
  }catch(e){btn.textContent='Erro';mostrarNotif('Erro ao aprovar','erro');}
};

window.recusarAmstel=async function(docId,btn){
  if(!confirm('Recusar este registro?'))return;
  await db.collection('amstel').doc('registros').collection('pendentes').doc(docId).delete();
  const card=document.getElementById('amstel-card-'+docId);
if(card)card.style.opacity='0.4';
  btn.textContent='❌ Recusado';
  mostrarNotif('Registro recusado','erro');
};

window.editarTelefone=function(){
  const telAtual=localStorage.getItem('tel_'+usuarioAtual.uid)||'';
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.innerHTML=`
    <div class="modal-box">
      <div class="modal-titulo">📱 Meu Telefone</div>
      <p class="modal-desc" style="font-size:0.78rem">Visível apenas para você. Não é compartilhado com ninguém.</p>
      <input class="input-field" id="telInput" type="tel" placeholder="(31) 99999-9999" value="${telAtual}"/>
      <button onclick="window.salvarTelefone()" class="btn-login" style="margin-bottom:10px">💾 Salvar</button>
      ${telAtual?`<button onclick="window.removerTelefone()" style="width:100%;padding:10px;border-radius:12px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:10px">🗑️ Remover</button>`:''}
      <button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('telInput')?.focus(),100);
};

window.salvarTelefone=function(){
  const tel=document.getElementById('telInput')?.value.trim();
  if(!tel){mostrarNotif('Digite um telefone','erro');return;}
  localStorage.setItem('tel_'+usuarioAtual.uid,tel);
  document.querySelector('.modal-overlay')?.remove();
  renderPerfil();
  mostrarNotif('📱 Telefone salvo!');
};

window.removerTelefone=function(){
  localStorage.removeItem('tel_'+usuarioAtual.uid);
  document.querySelector('.modal-overlay')?.remove();
  renderPerfil();
  mostrarNotif('Telefone removido');
};
async function renderAmstel(){
  const cont=document.getElementById('amstelConteudo');
  cont.innerHTML='<div class="empty"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';
  try{
    let ranking=[];
    if(_cacheAmstel&&(Date.now()-_cacheAmstelTs)<60000){
      ranking=_cacheAmstel;
    }else{
      const snap=await db.collection('amstel').doc('ranking').get();
      ranking=snap.exists?Object.values(snap.data()).filter(d=>d.total>0).sort((a,b)=>(b.cervejas||b.registros)-(a.cervejas||a.registros)):[];
      _cacheAmstel=ranking;_cacheAmstelTs=Date.now();
    }
    const meusDados=ranking.find(d=>d.uid===usuarioAtual.uid);
    cont.innerHTML=`
      <div style="background:linear-gradient(135deg,#f0a500,#e8650A);border-radius:14px;padding:20px;margin-bottom:16px;text-align:center;color:white">
        <div style="font-size:2rem;margin-bottom:4px">🍺</div>
        <div style="font-family:'Bebas Neue',cursive;font-size:1.5rem;letter-spacing:2px">RANKING AMSTEL</div>
        <div style="font-size:0.8rem;opacity:0.9;margin-bottom:12px">Beba Amstel nos bares do Comida di Buteco e concorra ao 🎁 prêmio misterioso!</div>
<div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px;font-size:0.82rem;margin-bottom:4px" id="amstelContatoInfo">
  ${localStorage.getItem('contato_premio_'+(auth.currentUser?.uid||''))?`✅ Contato cadastrado: <strong>${localStorage.getItem('contato_premio_'+(auth.currentUser?.uid||''))}</strong>`:'⚠️ Cadastre seu contato para receber o prêmio!'}
</div>
<button onclick="window.editarContatoPremio()" style="width:100%;padding:8px;border-radius:10px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.4);font-size:0.82rem;font-weight:700;cursor:pointer;margin-bottom:12px">📱 Cadastrar contato</button>
        ${meusDados?`<div style="background:rgba(255,255,255,0.2);border-radius:10px;padding:10px;font-size:0.85rem">Você gastou <strong>R$ ${meusDados.total.toFixed(2)}</strong> em Amstel · ${meusDados.registros} registro${meusDados.registros!==1?'s':''}</div>`:'<div style="font-size:0.82rem;opacity:0.8">Você ainda não registrou nenhuma Amstel</div>'}
      </div>
      <button onclick="window.abrirRegistroAmstel()" style="width:100%;padding:12px;border-radius:12px;background:#f0a500;color:white;border:none;font-size:0.95rem;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:20px">🍺 Registrar Amstel</button>
      <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;color:var(--marrom);letter-spacing:1px;margin-bottom:12px">🏆 Ranking</div>
      ${ranking.length?ranking.slice(0,10).map((d,i)=>`
        <div class="ranking-item" style="${d.uid===usuarioAtual.uid?'border:2px solid #f0a500':''};cursor:pointer" onclick="window.abrirPerfil('${d.uid}')">
          <div class="rank-pos ${i===0?'ouro':i===1?'prata':i===2?'bronze':''}">${i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)+'º'}</div>
          <div class="rank-info"><div class="rank-nome">${d.nome}</div><div class="rank-detalhe">${d.registros} registro${d.registros!==1?'s':''} · ${d.cervejas||d.registros} cerveja${(d.cervejas||d.registros)!==1?'s':''}</div></div>
          <div class="rank-valor" style="color:#f0a500">${d.cervejas||d.registros}🍺</div>
        </div>`).join(''):'<div class="empty"><div class="empty-icon">😶</div><p>Nenhum registro ainda. Seja o primeiro!</p></div>'}
      <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;color:var(--marrom);letter-spacing:1px;margin:20px 0 12px">📋 Meus registros</div>
      <div id="meusRegistrosAmstel"><div class="empty"><div class="empty-icon">⏳</div></div></div>`;
    carregarMeusRegistrosAmstel();
  }catch(e){cont.innerHTML='<div class="empty"><div class="empty-icon">⚠️</div><p>Erro ao carregar</p></div>';}
}

async function carregarMeusRegistrosAmstel(){
  const cont=document.getElementById('meusRegistrosAmstel');
  if(!cont)return;
   const [snap,aprov]=await Promise.all([
    db.collection('amstel').doc('registros').collection('pendentes').where('uid','==',usuarioAtual.uid).get(),
    db.collection('amstel').doc('registros').collection('aprovados').where('uid','==',usuarioAtual.uid).get()
  ]);
  const todos=[...snap.docs.map(d=>({...d.data(),id:d.id,status:'pendente'})),...aprov.docs.map(d=>({...d.data(),id:d.id,status:'aprovado'}))].sort((a,b)=>b.ts-a.ts);
  if(!todos.length){cont.innerHTML='<div class="empty"><div class="empty-icon">📋</div><p>Nenhum registro ainda</p></div>';return;}
  cont.innerHTML=todos.map(r=>`
    <div style="background:white;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:var(--shadow);display:flex;gap:12px;align-items:center">
      <img src="${r.fotoUrl||r.foto||''}" style="width:56px;height:56px;border-radius:8px;object-fit:cover;flex-shrink:0"/>
      <div style="flex:1">
        <div style="font-weight:800;font-size:0.88rem;color:var(--marrom)">${r.barNome}</div>
        <div style="font-size:0.78rem;color:var(--cinza)">R$ ${parseFloat(r.valor).toFixed(2)} em Amstel</div>
        <div style="font-size:0.7rem;margin-top:4px">${r.status==='aprovado'?'<span style="color:var(--verde);font-weight:700">✅ Aprovado</span>':'<span style="color:#f0a500;font-weight:700">⏳ Aguardando aprovação</span>'}</div>
      </div>
    </div>`).join('');
}

window.abrirRegistroAmstel=function(){
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.innerHTML=`
    <div class="modal-box" style="text-align:left">
      <div class="modal-titulo">🍺 Registrar Amstel</div>
      <p class="modal-desc">Tire foto da comanda ou notinha mostrando o pedido de Amstel em um bar do Comida di Buteco.</p>
      <div style="margin-bottom:10px">
        <label style="font-size:0.78rem;font-weight:700;color:var(--cinza);display:block;margin-bottom:4px">Bar do Comida di Buteco</label>
        <input id="amstelBarNomeDigitado" type="text" list="amstelBarList" placeholder="Digite ou escolha o bar..." style="width:100%;padding:9px 12px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.82rem;font-family:'Nunito',sans-serif;outline:none;color:var(--marrom)"/>
<datalist id="amstelBarList">
  ${BARES.map(b=>`<option value="${b.nome}"></option>`).join('')}
</datalist>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:0.78rem;font-weight:700;color:var(--cinza);display:block;margin-bottom:4px">Quantidade de Amstel</label>
<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
  <button type="button" onclick="window.ajustarQtdAmstel(-1)" style="width:36px;height:36px;border-radius:50%;background:var(--marrom);color:white;border:none;font-size:1.2rem;cursor:pointer;font-weight:700">−</button>
  <span id="qtdAmstelDisplay" style="font-family:'Bebas Neue',cursive;font-size:1.8rem;color:var(--marrom);min-width:40px;text-align:center">1</span>
  <button type="button" onclick="window.ajustarQtdAmstel(1)" style="width:36px;height:36px;border-radius:50%;background:var(--marrom);color:white;border:none;font-size:1.2rem;cursor:pointer;font-weight:700">+</button>
  <span style="font-size:0.8rem;color:var(--cinza);font-weight:700">cervejas</span>
</div>
<label style="font-size:0.78rem;font-weight:700;color:var(--cinza);display:block;margin-bottom:4px">Valor gasto em Amstel (R$)</label>
<input id="amstelValor" type="number" min="1" step="0.01" placeholder="Ex: 25.00" style="width:100%;padding:9px 12px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.85rem;font-family:'Nunito',sans-serif;outline:none;color:var(--marrom)"/>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:0.78rem;font-weight:700;color:var(--cinza);display:block;margin-bottom:4px">Foto da comanda/notinha com Amstel</label>
        <input type="file" accept="image/*" id="amstelFotoInput" style="display:none" onchange="window.previewAmstelFoto(this)"/>
        <button onclick="document.getElementById('amstelFotoInput').click()" style="width:100%;padding:10px;border-radius:10px;border:2px dashed #f0a500;background:transparent;color:#f0a500;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">📷 Tirar foto / Escolher</button>
        <div id="amstelFotoPreview" style="margin-top:8px;display:none">
          <img id="amstelFotoImg" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px"/>
        </div>
      </div>
      <div id="amstelMsg" style="font-size:0.78rem;color:#cc0000;margin-bottom:8px;min-height:18px"></div>
      <button onclick="window.enviarRegistroAmstel()" style="width:100%;padding:12px;border-radius:12px;background:#f0a500;color:white;border:none;font-size:0.95rem;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:10px">📤 Enviar para aprovação</button>
      <button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);
};

window._qtdAmstel=1;
window.ajustarQtdAmstel=function(dir){
  window._qtdAmstel=Math.max(1,Math.min(20,(window._qtdAmstel||1)+dir));
  document.getElementById('qtdAmstelDisplay').textContent=window._qtdAmstel;
};
let _cacheAmstel=null,_cacheAmstelTs=0;
