function renderFiltros(){
  const regioes=['TODOS','SUL','CENTRO','LESTE','NORDESTE','NOROESTE','NORTE','OESTE'];
  document.getElementById('filtrosRegiao').innerHTML=regioes.map(r=>{
    if(r==='TODOS'){
      const totalFalta=BARES.filter(b=>!visitas[b.id]).length;
      return`<button class="filtro-btn ${r===regiaoFiltro?'active':''}" onclick="window.setRegiao('${r}')">TODOS <span style="font-size:0.65rem;opacity:0.8">${totalFalta} faltam</span></button>`;
    }
    const totalRegiao=BARES.filter(b=>b.regiao===r).length;
    const visitadosRegiao=BARES.filter(b=>b.regiao===r&&visitas[b.id]).length;
    const faltam=totalRegiao-visitadosRegiao;
    const completa=faltam===0;
    return`<button class="filtro-btn ${r===regiaoFiltro?'active':''}" onclick="window.setRegiao('${r}')">${completa?'✅':''} ${r} <span style="font-size:0.65rem;opacity:0.8">${completa?'completa':faltam+' faltam'}</span></button>`;
   }).join('');
}

window.setFiltroVisita=function(f){
  filtroVisita=f;
  if(!document.getElementById('filtroTodos'))return;
  document.getElementById('filtroTodos').style.background=f==='todos'?'var(--marrom)':'transparent';
  document.getElementById('filtroTodos').style.color=f==='todos'?'white':'var(--marrom)';
  document.getElementById('filtroNaoVisitados').style.background=f==='nao'?'var(--marrom)':'transparent';
  document.getElementById('filtroNaoVisitados').style.color=f==='nao'?'white':'var(--marrom)';
  document.getElementById('filtroVisitados').style.background=f==='sim'?'var(--marrom)':'transparent';
  document.getElementById('filtroVisitados').style.color=f==='sim'?'white':'var(--marrom)';
  renderBares();
};

window.setRegiao=function(r){regiaoFiltro=r;filtroVisita='todos';renderFiltros();renderBares();window.setFiltroVisita('todos');};
window.filtrarBares=function(){
  buscaTexto=document.getElementById('buscaInput').value.toLowerCase();
  if(buscaTexto)filtroVisita='todos';
  clearTimeout(window._debounceSearch);
  window._debounceSearch=setTimeout(()=>{
    if(buscaTexto)window.setFiltroVisita('todos');
    renderBares();
  },400);
};

async function renderBaresComDados(){
  const commCached=lerCache('commMap');
  const descCached=lerCache('descMap');
  if(commCached&&descCached){
    window._commMap=commCached;
    window._descMap=descCached;
    renderBares();
    setTimeout(()=>buscarDadosBares(),2000);
    return;
  }
  await buscarDadosBares();
}

async function buscarDadosBares(){
  const [descSnap, commSnap] = await Promise.all([
    db.collection('descricoes').get(),
    db.collection('comentarios').doc('resumo').get()
  ]);
  const descMap={};
  descSnap.forEach(d=>{descMap[d.id]=d.data();});
  const commMap=commSnap.exists?commSnap.data():{};
  BARES.forEach(b=>{if(!commMap[b.id])commMap[b.id]=[];});
  window._descMap=descMap;
  window._commMap=commMap;
  salvarCache('commMap',commMap);
  salvarCache('descMap',descMap);
  renderBares();
}

async function renderAmigosNoBar(barId,containerId){
  const amigos=await getAmigosNoBarCached(barId);
  const el=document.getElementById(containerId);
  if(!el||!amigos.length)return;
  el.innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0;border-top:1px solid #f5ece0;margin-top:4px">
    ${amigos.map(a=>`<div style="display:flex;align-items:center;gap:4px;background:#f0fff4;border-radius:20px;padding:3px 8px;font-size:0.72rem;font-weight:700;color:#2D6A2D">
      <span>${a.avatar.startsWith('data:')?'👤':a.avatar}</span>
      <span>${a.nome.split(' ')[0]}</span>
      ${a.nota?`<span style="color:var(--laranja)">·${'⭐'.repeat(a.nota)}${a.nota}</span>`:''}
    </div>`).join('')}
  </div>`;
}

window.setOrdemBares = function(ordem) {
  ordenacaoBares = ordem;
  document.getElementById('btnOrdemNormal').style.background = ordem === 'normal' ? 'var(--marrom)' : 'transparent';
  document.getElementById('btnOrdemNormal').style.color = ordem === 'normal' ? 'white' : 'var(--marrom)';
  document.getElementById('btnOrdemTop').style.background = ordem === 'top' ? 'var(--marrom)' : 'transparent';
  document.getElementById('btnOrdemTop').style.color = ordem === 'top' ? 'white' : 'var(--marrom)';
  renderBares();
};

function renderBares(){
  const descMap=window._descMap||{};
  const commMap=window._commMap||{};
  const filtrados=BARES.filter(b=>{
    const mR=regiaoFiltro==='TODOS'||b.regiao===regiaoFiltro;
    const desc=descMap[b.id]?.texto||'';
    const mB=!buscaTexto||b.nome.toLowerCase().includes(buscaTexto)||b.prato.toLowerCase().includes(buscaTexto)||b.end.toLowerCase().includes(buscaTexto)||desc.toLowerCase().includes(buscaTexto);
    const mV=filtroVisita==='todos'||(filtroVisita==='sim'&&!!visitas[b.id])||(filtroVisita==='nao'&&!visitas[b.id]);
    return mR&&mB&&mV;
  });
  if(ordenacaoBares === 'top') {
  const commMap = window._commMap || {};
  filtrados.sort((a, b) => {
    const notasA = (commMap[a.id] || []).filter(c => c.nota > 0);
    const notasB = (commMap[b.id] || []).filter(c => c.nota > 0);
    const mediaA = notasA.length ? notasA.reduce((s,c) => s + c.nota, 0) / notasA.length : null;
    const mediaB = notasB.length ? notasB.reduce((s,c) => s + c.nota, 0) / notasB.length : null;
    if(mediaA !== null && mediaB !== null) return mediaB - mediaA;
    if(mediaA !== null) return -1;
    if(mediaB !== null) return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

if(ordenacaoBares === 'top') {
  const commMap = window._commMap || {};
  filtrados.sort((a, b) => {
    const notasA = (commMap[a.id] || []).filter(c => c.nota > 0);
    const notasB = (commMap[b.id] || []).filter(c => c.nota > 0);
    const mediaA = notasA.length ? notasA.reduce((s,c) => s + c.nota, 0) / notasA.length : null;
    const mediaB = notasB.length ? notasB.reduce((s,c) => s + c.nota, 0) / notasB.length : null;
    if(mediaA !== null && mediaB !== null) return mediaB - mediaA;
    if(mediaA !== null) return -1;
    if(mediaB !== null) return 1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}
document.getElementById('contadorBares').textContent=`${filtrados.length} bar${filtrados.length!==1?'es':''} encontrado${filtrados.length!==1?'s':''}`;
  const lista=document.getElementById('listaBares');
  if(!filtrados.length){lista.innerHTML='<div class="empty"><div class="empty-icon">🔍</div><p>Nenhum bar encontrado</p></div>';return;}
  lista.innerHTML=filtrados.map(b=>{
    const v=visitas[b.id];const visitado=!!v;const nota=v?.nota||0;
    const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.nome+' '+b.end)}`;
    const dataVisita=v?.ts?new Date(v.ts).toLocaleDateString('pt-BR'):'';
    const comments=commMap[b.id]||[];
    const notasGroup=comments.filter(c=>c.nota>0);
const mediaGroup=notasGroup.length?(notasGroup.reduce((s,c)=>s+c.nota,0)/notasGroup.length).toFixed(1):null;
const mediaHtml=mediaGroup?`<div style="font-size:0.78rem;color:var(--cinza);margin-bottom:8px">⭐ ${mediaGroup}/10 média de ${notasGroup.length} avaliação${notasGroup.length>1?'ões':''} · ${comments.filter(c=>c.texto).length} comentário${comments.filter(c=>c.texto).length!==1?'s':''}</div>`:'';
    const commHtml='';
    const historicoHtml=window._historico?.[b.id]?.length?`<div style="margin-top:8px;border-top:1px solid #f0e0d0;padding-top:8px">
      <div style="font-size:0.75rem;font-weight:700;color:var(--cinza);margin-bottom:6px">📅 Suas visitas anteriores</div>
      ${window._historico[b.id].map(h=>`<div style="padding:5px 0;border-bottom:1px solid #f8f0e8;font-size:0.75rem;color:var(--cinza)">
        ${new Date(h.ts).toLocaleDateString('pt-BR')}${h.nota?` · ${'⭐'.repeat(h.nota)} ${h.nota}/10`:''}${h.comentario?` · ${h.comentario}`:''}
      </div>`).join('')}
    </div>`:'';
    return`<div class="bar-card ${visitado?'visitado':''}" id="card-${b.id}">
      <div class="bar-header" onclick="window.toggleCardProximo(this)">
        <div style="min-width:0;flex:1">
          <div class="bar-nome">${visitado?'✅ ':''}${b.nome}</div>
          <div style="font-size:0.72rem;color:var(--laranja);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">🍽 ${b.prato}</div>
          ${nota?`<div style="font-size:0.75rem;margin-top:2px">${'⭐'.repeat(nota)} ${nota}/10${v?.km?' · '+v.km+'km':''}</div>`:''}
          ${dataVisita?`<div style="font-size:0.7rem;color:var(--cinza);margin-top:1px">📅 ${dataVisita}</div>`:''}
        </div>
        <span class="bar-regiao-badge">${b.regiao}</span>
      </div>
      <div class="bar-info" style="display:none">
        <div class="bar-prato">${b.prato}</div>
${b.descricao?`<div style="font-size:0.8rem;color:#555;margin-bottom:8px;line-height:1.5;font-style:italic">📝 ${b.descricao}</div>`:''}
${b.horario?`<div style="font-size:0.75rem;color:var(--cinza);margin-bottom:4px">🕐 ${b.horario}</div>`:''}
${b.telefone?`<div style="font-size:0.75rem;color:var(--cinza);margin-bottom:8px">📞 ${b.telefone}</div>`:''}
${mediaHtml}
<div class="bar-preco">💰 R$ 40</div>
        <div class="bar-end">${b.end}</div>
        <div id="amigos-bar-bares-${b.id}" style="margin-bottom:8px"></div>
        <div class="bar-acoes">
          <button class="btn-visitar ${visitado?'visitado-btn':''}" onclick="${visitado?`window.toggleVisita('${b.id}')`:`window.abrirAvaliacaoObrigatoria('${b.id}')`}">${visitado?'✅ Visitado':'🍺 Marcar visita'}</button>
          <a class="btn-site" href="${b.link}" target="_blank">🔗 Site oficial</a>
          <a class="btn-maps" href="${mapsUrl}" target="_blank">🗺️</a>
        </div>
        <div class="nota-section ${visitado?'open':''}" id="nota-${b.id}">
          <div class="nota-label">Sua avaliação principal:</div>
          <div class="estrelas" id="stars-${b.id}">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<span class="estrela ${nota>=n?'on':''}" onclick="window.setNota('${b.id}',${n})">⭐</span>`).join('')}</div>
          <div class="km-input-row">
  <span style="font-size:0.78rem;color:var(--cinza);font-weight:700">Km percorridos:</span>
  <input class="km-input" type="number" min="0" max="500" step="1" inputmode="decimal" id="km-${b.id}" value="${v?.km||''}" placeholder="0"/>
</div>
<div class="km-input-row">
  <span style="font-size:0.78rem;color:var(--cinza);font-weight:700">Valor pago (R$):</span>
  <input class="km-input" type="number" min="0" max="999" step="0.01" inputmode="decimal" id="valor-${b.id}" value="${v?.valor||''}" placeholder="ex: 40"/>
</div>
          <textarea class="nota-comment" id="comment-${b.id}" rows="2" placeholder="Comentário (aparece no feed)...">${v?.comentario||''}</textarea>
          <button class="btn-salvar-nota" onclick="window.salvarNota('${b.id}')">💾 Salvar avaliação</button>

        <div style="margin-top:8px">
  <input type="file" accept="image/*" capture="environment"
         id="foto-input-${b.id}" style="display:none"
         onchange="window.previewFotoObrigatoria('${b.id}',this)"/>
  <button onclick="document.getElementById('foto-input-${b.id}').click()"
          style="width:100%;padding:10px;border-radius:10px;
                 border:2px solid var(--laranja);background:var(--laranja);
                 color:white;font-size:0.82rem;font-weight:700;
                 cursor:pointer;font-family:'Nunito',sans-serif">
    📸 Tirar foto do prato agora (obrigatório)
  </button>
  <div style="font-size:0.72rem;color:var(--cinza);text-align:center;margin-top:4px">
    ⚠️ Sem foto tirada na hora, a visita não é computada
  </div>
  <div id="foto-preview-${b.id}" style="display:none;margin-top:8px">
    <div style="background:#e8f5e9;border-radius:8px;padding:6px 10px;
                font-size:0.75rem;font-weight:700;color:#2D6A2D;margin-bottom:6px">
      ✅ Foto verificada — tirada agora na visita
    </div>
    <img id="foto-img-${b.id}"
         style="width:100%;max-height:160px;object-fit:cover;border-radius:8px"/>
  </div>
</div>
        </div>
        ${historicoHtml}
        ${visitado?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0e0d0">
          <div style="font-size:0.78rem;font-weight:700;color:var(--cinza);margin-bottom:6px">🔁 Registrar outra visita</div>
          <div class="estrelas" id="stars-extra-${b.id}">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<span class="estrela" onclick="window.setNotaExtra('${b.id}',${n})">⭐</span>`).join('')}</div>
          <textarea class="nota-comment" id="comment-extra-${b.id}" rows="2" placeholder="Como foi dessa vez?"></textarea>
          <button class="btn-salvar-nota" style="background:var(--marrom)" onclick="window.salvarVisitaExtra('${b.id}')">📝 Registrar visita extra</button>
        </div>`:''}
        ${commHtml}
        ${(v?.fotoUrl||v?.foto)?`<div style="margin:8px 0;border-radius:10px;overflow:hidden;cursor:pointer" onclick="window.verFotoVisita('${b.id}')">
  <img src="${v.fotoUrl||v.foto}" style="width:100%;max-height:180px;object-fit:cover"/>
  <div style="font-size:0.7rem;color:var(--cinza);text-align:center;padding:4px;background:#f9f0e8">📷 Sua foto · toque para ampliar</div>
</div>`:''}
        <button style="background:none;border:none;color:var(--laranja);font-size:0.75rem;cursor:pointer;font-family:'Nunito',sans-serif;font-weight:700;padding:4px 0;margin-top:8px" onclick="window.abrirFormDesc('${b.id}')">✏️ Adicionar descrição do prato</button>
        <div class="desc-form" id="desc-form-${b.id}" style="display:none">
          <textarea class="desc-textarea" id="desc-txt-${b.id}" rows="2" placeholder="Descreva o prato... (máx 200 chars)"></textarea>
          <button class="btn-enviar-desc" onclick="window.salvarDesc('${b.id}')">Enviar descrição</button>
        </div>
      </div>
    </div>`;
  }).join('');
  filtrados.slice(0,20).forEach(b=>renderAmigosNoBar(b.id,'amigos-bar-bares-'+b.id));
}

window.abrirFormDesc=function(barId){const form=document.getElementById('desc-form-'+barId);form.style.display=form.style.display==='none'?'block':'none';};

window.setNotaExtra=function(barId,n){
  if(!window._notaExtra)window._notaExtra={};
  window._notaExtra[barId]=n;
  document.querySelectorAll(`#stars-extra-${barId} .estrela`).forEach((el,i)=>el.classList.toggle('on',i<n));
};