async function carregarGrupo(){
  if(!usuarioAtual)return;
  const userDoc=await db.collection('users').doc(usuarioAtual.uid).get();
  const data=userDoc.data()||{};
  gruposAtual=data.grupos||[];
  if(data.grupoId&&!gruposAtual.includes(data.grupoId))gruposAtual=[data.grupoId,...gruposAtual];
  grupoAtual=gruposAtual[0]||null;grupoSelecionado=grupoAtual;
  renderGrupoCard();
}
window.criarGrupo=async function(){
  const codigo=Math.random().toString(36).substring(2,8).toUpperCase();
  gruposAtual=[...gruposAtual,codigo];
  await db.collection('users').doc(usuarioAtual.uid).set({grupos:gruposAtual},{merge:true});
  await db.collection('grupos').doc(codigo).set({criadoPor:usuarioAtual.uid,criadoEm:Date.now(),membros:[usuarioAtual.uid]});
  if(!grupoSelecionado){grupoAtual=codigo;grupoSelecionado=codigo;}
  renderGrupoCard();mostrarNotif('Grupo criado! Código: '+codigo);
};
window.entrarNoGrupo=async function(){
  const codigo=document.getElementById('codigoEntrar').value.trim().toUpperCase();
  if(!codigo||codigo.length<4){mostrarNotif('Código inválido');return;}
  if(gruposAtual.includes(codigo)){mostrarNotif('Você já está neste grupo!');return;}
  const grupoDoc=await db.collection('grupos').doc(codigo).get();
  if(!grupoDoc.exists){mostrarNotif('Grupo não encontrado');return;}
  gruposAtual=[...gruposAtual,codigo];
  await db.collection('users').doc(usuarioAtual.uid).set({grupos:gruposAtual},{merge:true});
  await db.collection('grupos').doc(codigo).update({membros:firebase.firestore.FieldValue.arrayUnion(usuarioAtual.uid)});
  if(!grupoSelecionado){grupoAtual=codigo;grupoSelecionado=codigo;}
  renderGrupoCard();mostrarNotif('Entrou no grupo '+codigo+'!');
};
window.selecionarGrupo=function(codigo){grupoAtual=codigo;grupoSelecionado=codigo;renderGrupoCard();mostrarNotif('Grupo '+codigo+' ativo no ranking!');};
window.copiarCodigoGrupo=function(codigo){navigator.clipboard.writeText(codigo);mostrarNotif('Código '+codigo+' copiado!');};
window.sairDoGrupoEspecifico=async function(codigo){
  if(!confirm('Sair do grupo '+codigo+'?'))return;
  gruposAtual=gruposAtual.filter(g=>g!==codigo);
  await db.collection('users').doc(usuarioAtual.uid).set({grupos:gruposAtual},{merge:true});
  await db.collection('grupos').doc(codigo).update({membros:firebase.firestore.FieldValue.arrayRemove(usuarioAtual.uid)});
  if(grupoSelecionado===codigo){grupoAtual=gruposAtual[0]||null;grupoSelecionado=grupoAtual;}
  renderGrupoCard();mostrarNotif('Saiu do grupo '+codigo);
};
function renderGrupoCard(){
  const cont=document.getElementById('grupoConteudo');if(!cont)return;let html='';
  if(gruposAtual.length>0){
    html+=`<p style="font-size:0.82rem;color:var(--cinza);margin-bottom:8px">Seus grupos:</p>`;
    html+=gruposAtual.map(g=>`
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--creme);border-radius:10px;padding:10px 14px;margin-bottom:8px;${grupoSelecionado===g?'border:2px solid var(--laranja)':'border:2px solid transparent'}">
        <div>
          <div style="font-family:'Bebas Neue',cursive;font-size:1.3rem;color:var(--laranja);letter-spacing:3px">${g}</div>
          ${grupoSelecionado===g?'<div style="font-size:0.7rem;color:var(--verde);font-weight:700">✅ Grupo ativo no ranking</div>':''}
        </div>
        <div style="display:flex;gap:6px">
          ${grupoSelecionado!==g?`<button onclick="window.selecionarGrupo('${g}')" style="padding:5px 10px;border-radius:8px;background:var(--marrom);color:white;border:none;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">Ativar</button>`:''}
          <button onclick="window.copiarCodigoGrupo('${g}')" style="padding:5px 10px;border-radius:8px;background:#f0e0d0;color:var(--marrom);border:none;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">📋</button>
          <button onclick="window.sairDoGrupoEspecifico('${g}')" style="padding:5px 10px;border-radius:8px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">Sair</button>
        </div>
      </div>`).join('');
  }
  html+=`<div style="margin-top:12px">
    <button class="btn-grupo btn-criar-grupo" style="margin-bottom:8px" onclick="window.criarGrupo()">➕ Criar novo grupo</button>
    <div style="display:flex;gap:8px">
      <input id="codigoEntrar" type="text" placeholder="Código do grupo" style="flex:1;padding:9px 12px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.85rem;font-family:'Nunito',sans-serif;outline:none;color:var(--marrom);text-transform:uppercase"/>
      <button class="btn-grupo btn-entrar-grupo" style="width:auto;padding:9px 14px" onclick="window.entrarNoGrupo()">Entrar</button>
    </div>
  </div>`;
  cont.innerHTML=html;
}
async function renderRoteiro(){
  if(!usuarioAtual){return;}
  if(!grupoAtual){
    document.getElementById('roteiroConteudo').innerHTML='<div class="empty"><div class="empty-icon">👥</div><p>Entre em um grupo para ver o roteiro</p></div>';
    return;
  }
   document.querySelectorAll('[id^="mapa-dia-"]').forEach(el=>{
    if(window._mapasDia&&window._mapasDia[el.id]){
      window._mapasDia[el.id].remove();
      delete window._mapasDia[el.id];
    }
  });
  if(!window._mapasDia)window._mapasDia={};
  const cont=document.getElementById('roteiroConteudo');
  cont.innerHTML='<div class="empty"><div class="empty-icon">⏳</div><p>Carregando...</p></div>';

  const grupoDoc=await db.collection('grupos').doc(grupoAtual).get();
  const grupoData=grupoDoc.data()||{};
  const isDono=grupoData.criadoPor===usuarioAtual.uid;

  let dias=[];
  let sugestoes=[];
  const agora=Date.now();
  if(cacheRoteiro&&cacheRoteiro.grupoId===grupoAtual&&(agora-cacheRoteiroTs)<60000){
    dias=cacheRoteiro.dias;
    sugestoes=cacheRoteiro.sugestoes;
  }else{
    const diasSnap=await db.collection('grupos').doc(grupoAtual).collection('roteiro').orderBy('ordem').get();
    diasSnap.forEach(d=>dias.push({id:d.id,...d.data()}));
    const sugestoesSnap=await db.collection('grupos').doc(grupoAtual).collection('sugestoes').orderBy('ts','desc').get();
    sugestoesSnap.forEach(s=>sugestoes.push({id:s.id,...s.data()}));
    cacheRoteiro={grupoId:grupoAtual,dias,sugestoes};
    cacheRoteiroTs=agora;
  }
  const pendentes=sugestoes.filter(s=>s.status==='pendente');

  let html='';

  if(isDono){
    html+=`<button onclick="window.abrirEditarRoteiro()" style="width:100%;padding:10px;border-radius:10px;background:var(--marrom);color:white;border:none;font-size:0.88rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:16px">✏️ Editar Roteiro</button>`;
    if(pendentes.length){
      html+=`<div style="background:white;border-radius:14px;padding:16px;box-shadow:var(--shadow);margin-bottom:16px">
        <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;color:var(--marrom);letter-spacing:1px;margin-bottom:12px">📬 Sugestões Pendentes <span style="background:var(--laranja);color:white;border-radius:20px;padding:2px 8px;font-size:0.75rem">${pendentes.length}</span></div>`;
      pendentes.forEach(s=>{
        html+=`<div class="sugestao-card sugestao-pendente">
          <div style="font-size:0.85rem;font-weight:800;color:var(--marrom)">${s.barNome}</div>
          <div style="font-size:0.78rem;color:var(--cinza);margin:4px 0">${s.nome}: "${s.comentario}"</div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <button class="btn-aprovar" onclick="window.aprovarSugestao('${s.id}','${s.barId}')">✅ Aprovar</button>
            <button class="btn-recusar" onclick="window.recusarSugestao('${s.id}')">❌ Recusar</button>
          </div>
        </div>`;
      });
      html+='</div>';
    }
  }

  if(!dias.length){
    html+='<div class="empty"><div class="empty-icon">🗺️</div><p>Nenhum roteiro definido ainda</p></div>';
  }else{
    dias.forEach((dia,diaIdx)=>{
      const baresIds=dia.bares||[];
      const baresInfo=baresIds.map(id=>BARES.find(b=>b.id===id)).filter(Boolean);
      const visitados=baresInfo.filter(b=>visitas[b.id]).length;
      const total=baresInfo.length;
      const pct=total?Math.round((visitados/total)*100):0;
      const mapaDiaId='mapa-dia-'+diaIdx;

      const pontosGmaps=baresInfo.filter(b=>b.lat&&b.lng).map(b=>b.lat+','+b.lng).join('/');
      const gmapsUrl=baresInfo.length?`https://www.google.com/maps/dir/${pontosGmaps}`:'';

      html+=`<div style="background:white;border-radius:14px;box-shadow:var(--shadow);margin-bottom:20px;overflow:hidden">
        <div style="background:var(--marrom);padding:14px 16px;display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font-family:'Bebas Neue',cursive;font-size:1.3rem;color:white;letter-spacing:1px">📅 ${dia.titulo||'Dia '+(diaIdx+1)}</div>
            <div style="font-size:0.75rem;color:#ccc;margin-top:2px">${total} bar${total!==1?'es':''} · ${visitados} visitado${visitados!==1?'s':''}</div>
          </div>
          ${gmapsUrl?`<a href="${gmapsUrl}" target="_blank" style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:10px;background:#4285f4;color:white;font-size:0.78rem;font-weight:700;text-decoration:none;font-family:'Nunito',sans-serif;white-space:nowrap">🧭 Navegar</a>`:''}
        </div>
        <div style="padding:12px 16px 8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <div style="flex:1;background:#f0e0d0;border-radius:10px;height:8px">
              <div style="width:0%;background:${pct===100?'var(--verde)':'var(--laranja)'};height:8px;border-radius:10px;transition:width 0.6s ease" data-pct="${pct}"></div>
            </div>
            <span style="font-size:0.75rem;font-weight:700;color:${pct===100?'var(--verde)':'var(--laranja)'};">${pct}%</span>
          </div>
        </div>
        ${baresInfo.filter(b=>b.lat&&b.lng).length>0?`<div id="${mapaDiaId}" style="height:220px;margin:0 0 8px 0"></div>`:''}
        <div style="padding:0 16px 16px">
          ${baresInfo.map((b,idx)=>{
            const v=visitas[b.id];const visitado=!!v;const nota=v?.nota||0;
            return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f5ece0;${idx===baresInfo.length-1?'border-bottom:none':''}">
              <div style="width:24px;height:24px;border-radius:50%;background:${visitado?'var(--verde)':'var(--laranja)'};color:white;font-size:0.72rem;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${idx+1}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:0.88rem;font-weight:800;color:var(--marrom);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${visitado?'✅ ':''} ${b.nome}</div>
                <div style="font-size:0.72rem;color:var(--laranja)">🍽 ${b.prato}</div>
                ${nota?`<div style="font-size:0.7rem;color:var(--cinza)">${'⭐'.repeat(nota)} ${nota}/10</div>`:''}
              </div>
              <button onclick="window.irPara('bares');setTimeout(()=>{document.getElementById('buscaInput').value='${b.nome}';window.filtrarBares();},300)" style="padding:6px 10px;border-radius:8px;background:${visitado?'var(--verde)':'transparent'};color:${visitado?'white':'var(--verde)'};border:2px solid var(--verde);font-size:0.72rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;white-space:nowrap;flex-shrink:0">${visitado?'✅':'🍺 Ir'}</button>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    });
  }

  html+=`<div style="background:white;border-radius:14px;padding:16px;box-shadow:var(--shadow);margin-bottom:16px">
    <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;color:var(--marrom);letter-spacing:1px;margin-bottom:12px">💡 Sugerir bar</div>
    <select id="sugestaoBarId" style="width:100%;padding:9px 12px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.82rem;font-family:'Nunito',sans-serif;outline:none;color:var(--marrom);margin-bottom:8px">
      <option value="">Escolha um bar...</option>
      ${BARES.map(b=>`<option value="${b.id}">${b.nome} (${b.regiao})</option>`).join('')}
    </select>
    <textarea id="sugestaoComentario" rows="2" placeholder="Por que sugere este bar?" style="width:100%;padding:8px 10px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.82rem;font-family:'Nunito',sans-serif;resize:none;outline:none;color:var(--marrom);margin-bottom:8px"></textarea>
    <button onclick="window.enviarSugestao()" style="width:100%;padding:9px;border-radius:10px;background:var(--laranja);color:white;border:none;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">Enviar sugestão</button>
  </div>`;

  cont.innerHTML=html;
  setTimeout(()=>{
    document.querySelectorAll('[data-pct]').forEach(el=>{
      el.style.width=el.getAttribute('data-pct')+'%';
    });
  },100);

  dias.forEach((dia,diaIdx)=>{
    const baresIds=dia.bares||[];
    const baresInfo=baresIds.map(id=>BARES.find(b=>b.id===id)).filter(Boolean).filter(b=>b.lat&&b.lng);
    if(!baresInfo.length)return;
    const mapaDiaId='mapa-dia-'+diaIdx;
    const container=document.getElementById(mapaDiaId);
    if(!container)return;
    setTimeout(()=>{
      const centro=[baresInfo[0].lat,baresInfo[0].lng];
      if(window._mapasDia[mapaDiaId]){window._mapasDia[mapaDiaId].remove();}
      const m=L.map(mapaDiaId,{zoomControl:false,attributionControl:false}).setView(centro,13);
      window._mapasDia[mapaDiaId]=m;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
      const coords=[];
      baresInfo.forEach((b,idx)=>{
        const visitado=!!visitas[b.id];
        const cor=visitado?'#2D6A2D':'#E8650A';
        const icone=L.divIcon({
          html:`<div style="width:22px;height:22px;background:${cor};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:800;color:white;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${idx+1}</div>`,
          iconSize:[22,22],iconAnchor:[11,11],className:''
        });
        const popup=`<div style="font-family:'Nunito',sans-serif;min-width:140px">
          <div style="font-weight:800;font-size:0.85rem;color:#5C2E00">${b.nome}</div>
          <div style="font-size:0.72rem;color:#E8650A;margin:2px 0">🍽 ${b.prato}</div>
          <div style="font-size:0.7rem;color:#888">${b.regiao}</div>
          ${visitado?'<div style="font-size:0.72rem;color:#2D6A2D;font-weight:700;margin-top:4px">✅ Visitado</div>':'<div style="font-size:0.72rem;color:#E8650A;font-weight:700;margin-top:4px">🍺 Não visitado</div>'}
        </div>`;
        L.marker([b.lat,b.lng],{icon:icone}).addTo(m).bindPopup(popup);
        coords.push([b.lat,b.lng]);
      });
      if(coords.length>1){
        L.polyline(coords,{color:'#E8650A',weight:2,opacity:0.6,dashArray:'6,6'}).addTo(m);
      }
      if(coords.length)m.fitBounds(coords,{padding:[20,20]});
      m.invalidateSize();
    },200);
  });
}
window.aprovarSugestao=async function(sugestaoId,barId){
  const diasSnap=await db.collection('grupos').doc(grupoAtual).collection('roteiro').orderBy('ordem').get();
  const dias=[];
  diasSnap.forEach(d=>dias.push({id:d.id,...d.data()}));

  if(!dias.length){mostrarNotif('Crie um dia no roteiro primeiro');return;}

  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML=`
    <div style="background:var(--creme);border-radius:20px;padding:24px 16px;width:100%;max-width:400px;position:relative">
      <button onclick="this.closest('div[style*=z-index]').remove()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--cinza)">✕</button>
      <div style="font-family:'Bebas Neue',cursive;font-size:1.2rem;color:var(--marrom);margin-bottom:16px">📅 Adicionar ao dia</div>
      <p style="font-size:0.82rem;color:var(--cinza);margin-bottom:12px">Escolha em qual dia adicionar este bar:</p>
      ${dias.map(d=>`
        <button onclick="window.confirmarAprovacao('${sugestaoId}','${barId}','${d.id}')" style="width:100%;padding:10px;border-radius:10px;background:white;border:2px solid var(--laranja);color:var(--marrom);font-size:0.88rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:8px;text-align:left">
          📅 ${d.titulo} <span style="font-size:0.75rem;color:var(--cinza)">(${(d.bares||[]).length} bares)</span>
        </button>`).join('')}
    </div>`;
  document.body.appendChild(overlay);
};

window.confirmarAprovacao=async function(sugestaoId,barId,diaId){
  const diaDoc=await db.collection('grupos').doc(grupoAtual).collection('roteiro').doc(diaId).get();
  const baresAtuais=diaDoc.data()?.bares||[];
  if(!baresAtuais.includes(barId)){
    await db.collection('grupos').doc(grupoAtual).collection('roteiro').doc(diaId).update({
      bares:firebase.firestore.FieldValue.arrayUnion(barId)
    });
  }
  await db.collection('grupos').doc(grupoAtual).collection('sugestoes').doc(sugestaoId).update({status:'aprovado'});
  document.querySelectorAll('div[style*="z-index:300"]').forEach(e=>e.remove());
  cacheRoteiro=null;
  mostrarNotif('✅ Bar adicionado ao roteiro!');
  renderRoteiro();
};

window.recusarSugestao=async function(sugestaoId){
  await db.collection('grupos').doc(grupoAtual).collection('sugestoes').doc(sugestaoId).update({status:'recusado'});
  cacheRoteiro=null;
  mostrarNotif('❌ Sugestão recusada');
  renderRoteiro();
};
window.abrirEditarRoteiro=async function(){
  const diasSnap=await db.collection('grupos').doc(grupoAtual).collection('roteiro').orderBy('ordem').get();
  const dias=[];
  diasSnap.forEach(d=>dias.push({id:d.id,...d.data()}));

  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML=`
    <div style="background:var(--creme);border-radius:20px;padding:24px 16px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;position:relative">
      <button onclick="document.querySelectorAll('div[style*=z-index]').forEach(e=>e.remove())" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--cinza)">✕</button>
      <div style="font-family:'Bebas Neue',cursive;font-size:1.3rem;color:var(--marrom);letter-spacing:1px;margin-bottom:16px">✏️ Editar Roteiro</div>
      <div id="editarDias">
        ${dias.map((dia)=>`
          <div class="dia-editor" data-id="${dia.id}" style="background:white;border-radius:10px;padding:12px;margin-bottom:10px;box-shadow:var(--shadow)">
            <input type="text" value="${dia.titulo||''}" placeholder="Ex: Dom 26/04" id="titulodia-${dia.id}" style="width:100%;padding:7px 10px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.85rem;font-family:'Nunito',sans-serif;outline:none;color:var(--marrom);margin-bottom:8px"/>
            <input type="text" placeholder="🔍 Buscar bar..." oninput="window.filtrarBaresEditor('${dia.id}',this.value)" style="width:100%;padding:7px 10px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.82rem;font-family:'Nunito',sans-serif;outline:none;color:var(--marrom);margin-bottom:6px"/>
            <div id="baresdia-${dia.id}" style="max-height:180px;overflow-y:auto;border:1.5px solid #e0d0c0;border-radius:8px;padding:8px;margin-bottom:8px">
              ${BARES.map(b=>`<label style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f0e0d0;font-size:0.78rem;font-family:'Nunito',sans-serif;color:var(--marrom);cursor:pointer">
                <input type="checkbox" value="${b.id}" ${(dia.bares||[]).includes(b.id)?'checked':''} style="width:16px;height:16px;accent-color:var(--laranja);flex-shrink:0"/>
                ${b.nome} <span style="font-size:0.65rem;color:var(--cinza);margin-left:auto">${b.regiao}</span>
              </label>`).join('')}
            </div>
            <div style="font-size:0.75rem;color:var(--cinza);margin-bottom:6px;font-weight:700">📋 Ordem dos bares selecionados:</div>
            <div id="ordem-${dia.id}" style="min-height:40px;border:1.5px dashed #e0d0c0;border-radius:8px;padding:6px;font-size:0.78rem;color:var(--marrom)">
              ${(dia.bares||[]).map((barId,i)=>{const b=BARES.find(x=>x.id===barId);return b?`<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;background:#f9f0e8;border-radius:6px;margin-bottom:4px"><span>${i+1}. ${b.nome}</span><div style="display:flex;gap:4px"><button onclick="window.moverBar('${dia.id}',${i},-1)" style="background:none;border:none;cursor:pointer;font-size:0.8rem">⬆️</button><button onclick="window.moverBar('${dia.id}',${i},1)" style="background:none;border:none;cursor:pointer;font-size:0.8rem">⬇️</button></div></div>`:''}).join('')}
            </div>
            <button onclick="window.removerDiaEditor('${dia.id}',this)" style="margin-top:8px;padding:5px 12px;border-radius:8px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🗑️ Remover dia</button>
          </div>`).join('')}
      </div>
      <button onclick="window.adicionarDiaEditor()" style="width:100%;padding:9px;border-radius:10px;background:#f0e0d0;color:var(--marrom);border:none;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:10px">➕ Adicionar dia</button>
      <button onclick="window.salvarRoteiro()" style="width:100%;padding:10px;border-radius:10px;background:var(--marrom);color:white;border:none;font-size:0.9rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">💾 Salvar roteiro</button>
    </div>`;
  document.body.appendChild(overlay);

  window._ordemBares={};
  dias.forEach(dia=>{window._ordemBares[dia.id]=[...(dia.bares||[])];});

  document.querySelectorAll('[id^="baresdia-"]').forEach(container=>{
    const diaId=container.id.replace('baresdia-','');
    container.querySelectorAll('input[type=checkbox]').forEach(cb=>{
      cb.addEventListener('change',()=>window.atualizarOrdem(diaId));
    });
  });
};

window.filtrarBaresEditor=function(diaId,busca){
  const container=document.getElementById('baresdia-'+diaId);
  const labels=container.querySelectorAll('label');
  labels.forEach(label=>{
    const texto=label.textContent.toLowerCase();
    label.style.display=!busca||texto.includes(busca.toLowerCase())?'flex':'none';
  });
};

window.atualizarOrdem=function(diaId){
  if(!window._ordemBares)window._ordemBares={};
  const container=document.getElementById('baresdia-'+diaId);
  const checados=Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(c=>c.value);
  const atual=window._ordemBares[diaId]||[];
  const novos=checados.filter(id=>!atual.includes(id));
  const removidos=new Set(atual.filter(id=>!checados.includes(id)));
  window._ordemBares[diaId]=[...atual.filter(id=>!removidos.has(id)),...novos];
  renderizarOrdem(diaId);
};

window.moverBar=function(diaId,idx,dir){
  const arr=window._ordemBares[diaId]||[];
  const novoIdx=idx+dir;
  if(novoIdx<0||novoIdx>=arr.length)return;
  [arr[idx],arr[novoIdx]]=[arr[novoIdx],arr[idx]];
  window._ordemBares[diaId]=arr;
  renderizarOrdem(diaId);
};

function renderizarOrdem(diaId){
  const cont=document.getElementById('ordem-'+diaId);
  if(!cont)return;
  const arr=window._ordemBares[diaId]||[];
  cont.innerHTML=arr.map((barId,i)=>{
    const b=BARES.find(x=>x.id===barId);
    return b?`<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 6px;background:#f9f0e8;border-radius:6px;margin-bottom:4px"><span>${i+1}. ${b.nome}</span><div style="display:flex;gap:4px"><button onclick="window.moverBar('${diaId}',${i},-1)" style="background:none;border:none;cursor:pointer;font-size:0.8rem">⬆️</button><button onclick="window.moverBar('${diaId}',${i},1)" style="background:none;border:none;cursor:pointer;font-size:0.8rem">⬇️</button></div></div>`:'';
  }).join('');
}

window.removerDiaEditor=async function(diaId,btn){
  if(diaId&&!diaId.startsWith('novo-')){
    await db.collection('grupos').doc(grupoAtual).collection('roteiro').doc(diaId).delete();
  }
  btn.closest('.dia-editor').remove();
  if(window._ordemBares)delete window._ordemBares[diaId];
};

window.adicionarDiaEditor=function(){
  const cont=document.getElementById('editarDias');
  const tempId='novo-'+Date.now();
  if(!window._ordemBares)window._ordemBares={};
  window._ordemBares[tempId]=[];
  const div=document.createElement('div');
  div.className='dia-editor';
  div.setAttribute('data-id',tempId);
  div.style.cssText='background:white;border-radius:10px;padding:12px;margin-bottom:10px;box-shadow:var(--shadow)';
  div.innerHTML=`
    <input type="text" placeholder="Ex: Dom 26/04" id="titulodia-${tempId}" style="width:100%;padding:7px 10px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.85rem;font-family:'Nunito',sans-serif;outline:none;color:var(--marrom);margin-bottom:8px"/>
    <input type="text" placeholder="🔍 Buscar bar..." oninput="window.filtrarBaresEditor('${tempId}',this.value)" style="width:100%;padding:7px 10px;border:1.5px solid #e0d0c0;border-radius:8px;font-size:0.82rem;font-family:'Nunito',sans-serif;outline:none;color:var(--marrom);margin-bottom:6px"/>
    <div id="baresdia-${tempId}" style="max-height:180px;overflow-y:auto;border:1.5px solid #e0d0c0;border-radius:8px;padding:8px;margin-bottom:8px">
      ${BARES.map(b=>`<label style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #f0e0d0;font-size:0.78rem;font-family:'Nunito',sans-serif;color:var(--marrom);cursor:pointer">
        <input type="checkbox" value="${b.id}" style="width:16px;height:16px;accent-color:var(--laranja);flex-shrink:0"/>
        ${b.nome} <span style="font-size:0.65rem;color:var(--cinza);margin-left:auto">${b.regiao}</span>
      </label>`).join('')}
    </div>
    <div style="font-size:0.75rem;color:var(--cinza);margin-bottom:6px;font-weight:700">📋 Ordem dos bares selecionados:</div>
    <div id="ordem-${tempId}" style="min-height:40px;border:1.5px dashed #e0d0c0;border-radius:8px;padding:6px;font-size:0.78rem;color:var(--marrom)"></div>
    <button onclick="window.removerDiaEditor('${tempId}',this)" style="margin-top:8px;padding:5px 12px;border-radius:8px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.75rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">🗑️ Remover dia</button>`;
  cont.appendChild(div);
  div.querySelectorAll('input[type=checkbox]').forEach(cb=>{
    cb.addEventListener('change',()=>window.atualizarOrdem(tempId));
  });
};

window.removerDia=async function(diaId,btn){
  await db.collection('grupos').doc(grupoAtual).collection('roteiro').doc(diaId).delete();
  btn.closest('div[style]').remove();
};

window.salvarRoteiro=async function(){
  const cont=document.getElementById('editarDias');
  const divsDia=cont.querySelectorAll('.dia-editor');
  let ordem=1;
  const diasExistentes=await db.collection('grupos').doc(grupoAtual).collection('roteiro').get();
  for(const doc of diasExistentes.docs)await doc.ref.delete();
  for(const div of divsDia){
    const diaId=div.getAttribute('data-id');
    const tituloEl=document.getElementById('titulodia-'+diaId);
    if(!tituloEl)continue;
    const titulo=tituloEl.value.trim();
    if(!titulo)continue;
    const bares=window._ordemBares?.[diaId]||Array.from(div.querySelectorAll('input[type=checkbox]:checked')).map(c=>c.value);
    await db.collection('grupos').doc(grupoAtual).collection('roteiro').add({titulo,bares,ordem});
    ordem++;
  }
  document.querySelectorAll('div[style*="z-index"]').forEach(e=>e.remove());
  cacheRoteiro=null;
  mostrarNotif('✅ Roteiro salvo!');
  renderRoteiro();
};
window.enviarSugestao=async function(){
  const barId=document.getElementById('sugestaoBarId').value;
  const comentario=document.getElementById('sugestaoComentario').value.trim();
  if(!barId){mostrarNotif('Escolha um bar');return;}
  if(!comentario){mostrarNotif('Adicione um comentário');return;}
  const bar=BARES.find(b=>b.id===barId);
  const nome=usuarioAtual.displayName||'Anônimo';
  await db.collection('grupos').doc(grupoAtual).collection('sugestoes').add({
    barId,barNome:bar.nome,comentario,
    uid:usuarioAtual.uid,nome,
    status:'pendente',ts:Date.now()
  });
  cacheRoteiro=null;
  mostrarNotif('✅ Sugestão enviada!');
  renderRoteiro();
};
async function renderStatsGrupo(){
  if(!grupoAtual){document.getElementById('statsGrupo').innerHTML='';return;}
  if(window._cacheStatsGrupo&&window._cacheStatsGrupoId===grupoAtual&&(Date.now()-window._cacheStatsGrupoTs)<120000){
    document.getElementById('statsGrupo').innerHTML=window._cacheStatsGrupo;return;
  }
  const grupoDoc=await db.collection('grupos').doc(grupoAtual).get();
  const membros=grupoDoc.data()?.membros||[];
  const contBares={};let totalVisitas=0,totalGasto=0;
  for(const uid of membros){
    const vSnap=await db.collection('users').doc(uid).collection('visits').get();
    vSnap.forEach(v=>{totalVisitas++;totalGasto+=40;contBares[v.id]=(contBares[v.id]||0)+1;});
  }
  const barMaisVisitado=Object.entries(contBares).sort((a,b)=>b[1]-a[1])[0];
  const barInfo=barMaisVisitado?BARES.find(b=>b.id===barMaisVisitado[0]):null;
  document.getElementById('statsGrupo').innerHTML=`
    <div style="background:white;border-radius:14px;padding:16px;box-shadow:var(--shadow);margin-bottom:16px">
      <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;color:var(--marrom);letter-spacing:1px;margin-bottom:12px">📊 Estatísticas do Grupo</div>
      <div class="gasto-row"><span class="gasto-label">Total de visitas do grupo</span><span class="gasto-valor">${totalVisitas}</span></div>
      <div class="gasto-row"><span class="gasto-label">Total gasto pelo grupo</span><span class="gasto-valor">R$ ${totalGasto}</span></div>
      <div class="gasto-row"><span class="gasto-label">Membros no grupo</span><span class="gasto-valor">${membros.length}</span></div>
      ${barInfo?`<div class="gasto-row"><span class="gasto-label">Bar favorito do grupo</span><span class="gasto-valor" style="font-size:0.85rem;text-align:right;max-width:60%">${barInfo.nome}</span></div>`:''}
    </div>`;
    window._cacheStatsGrupo=document.getElementById('statsGrupo').innerHTML;
  window._cacheStatsGrupoId=grupoAtual;
  window._cacheStatsGrupoTs=Date.now();
}
let _cacheVisitasGrupo=null;
let _cacheVisitasGrupoTs=0;
const _VISITAS_GRUPO_TTL=3*60*1000;

async function getAmigosNoBar(barId){
  if(!grupoAtual)return[];
  try{
    const agora=Date.now();
    if(!_cacheVisitasGrupo||agora-_cacheVisitasGrupoTs>_VISITAS_GRUPO_TTL){
      const grupoDoc=await db.collection('grupos').doc(grupoAtual).get();
      const membros=(grupoDoc.data()?.membros||[]).filter(uid=>uid!==usuarioAtual.uid);
      const rankDoc=await db.collection('ranking').doc('global').get();
      const dados=rankDoc.exists?rankDoc.data():{};
      const mapa={};
      await Promise.all(membros.map(async uid=>{
        const d=dados[uid];if(!d)return;
        const vSnap=await db.collection('users').doc(uid).collection('visits').get();
        mapa[uid]={nome:d.nome,avatar:d.avatar||'🍺',visitas:{}};
        vSnap.forEach(v=>{mapa[uid].visitas[v.id]={nota:v.data()?.nota||0};});
      }));
      _cacheVisitasGrupo=mapa;
      _cacheVisitasGrupoTs=agora;
    }
    const amigos=[];
    for(const [uid,info] of Object.entries(_cacheVisitasGrupo)){
      if(info.visitas[barId]!==undefined){
        amigos.push({nome:info.nome,avatar:info.avatar,nota:info.visitas[barId].nota});
      }
    }
    return amigos;
  }catch(e){return[];}
}

const _cacheAmigos={};
const _cacheAmigosTs={};
const _AMIGOS_TTL=5*60*1000;

async function getAmigosNoBarCached(barId){
  const agora=Date.now();
  if(_cacheAmigos[barId]&&(agora-(_cacheAmigosTs[barId]||0))<_AMIGOS_TTL){
    return _cacheAmigos[barId];
  }
  const resultado=await getAmigosNoBar(barId);
  _cacheAmigos[barId]=resultado;
  _cacheAmigosTs[barId]=agora;
  return resultado;
}
