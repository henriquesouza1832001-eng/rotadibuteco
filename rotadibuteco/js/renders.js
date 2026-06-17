const _modalQueue=[];
let _modalAberto=false;
function enqueueModal(fn,delay){
  setTimeout(()=>{_modalQueue.push(fn);processModalQueue();},delay||0);
}
function processModalQueue(){
  if(_modalAberto||!_modalQueue.length)return;
  _modalAberto=true;
  const fn=_modalQueue.shift();
  fn(()=>{_modalAberto=false;processModalQueue();});
}
function modalFechou(overlay){
  if(overlay)overlay.remove();
  _modalAberto=false;
  processModalQueue();
}regiaoFiltro="TODOS",buscaTexto="",cardAberto=null,rankingAtivo=0,gruposAtual=[],grupoAtual=null,vistaGlobal=true,feedFiltro='global',grupoSelecionado=null,feedEventosCache=[],paginaAnterior=null,filtroVisita='todos';
let ordenacaoBares = 'normal';
let meusLikes={};
let BARES=window.BARES_ESTATICO||[];
const CACHE_TTL=10*60*1000;
function salvarCache(chave,dados){try{localStorage.setItem(chave,JSON.stringify({dados,ts:Date.now()}));}catch(e){}}
function lerCache(chave){try{const item=JSON.parse(localStorage.getItem(chave));if(item&&(Date.now()-item.ts)<CACHE_TTL)return item.dados;}catch(e){}return null;}
const authTimeout=setTimeout(()=>{document.getElementById('loginScreen').style.display='flex';},5000);
let modoLogin=true;
async function buscarDadosFirebase(){
  const [snap,snapE]=await Promise.all([
    db.collection('users').doc(usuarioAtual.uid).collection('visits').get(),
    db.collection('users').doc(usuarioAtual.uid).collection('extras').get()
  ]);
  visitas={};snap.forEach(doc=>{visitas[doc.id]=doc.data();});
  salvarCache('visitas_'+usuarioAtual.uid,visitas);
  extras=[];snapE.forEach(doc=>{extras.push({id:doc.id,...doc.data()});});
  salvarCache('extras_'+usuarioAtual.uid,extras);
  renderBares();renderPerfil();renderExtras();
}
async function atualizarDadosBackground(){setTimeout(async()=>{await buscarDadosFirebase();},2000);}
window.abrirModalExtras=function(){
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.style.alignItems='flex-start';
  overlay.style.paddingTop='20px';
  overlay.innerHTML=`
    <div class="modal-box" style="text-align:left;max-height:85vh;overflow-y:auto">
      <div class="modal-titulo">➕ Bar Extra</div>
      <div class="form-group"><label>Nome do bar</label><input id="extraNome" type="text" placeholder="Ex: Bar do Zé"/></div>
      <div class="form-group"><label>Petisco experimentado</label><input id="extraPrato" type="text" placeholder="Ex: Costelinha caipira"/></div>
      <div class="form-group"><label>Nota (1-10)</label><input id="extraNota" type="number" min="1" max="10" placeholder="8"/></div>
      <div class="form-group"><label>Comentário</label><textarea id="extraComentario" rows="2" placeholder="O que achou?"></textarea></div>
      <button onclick="window.adicionarExtra().then(()=>window.atualizarListaExtrasModal())" style="width:100%;padding:10px;border-radius:10px;background:var(--marrom);color:white;border:none;font-size:0.88rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;margin-bottom:12px">Registrar</button>
      <div id="listaExtrasModal"></div>
      <button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro" style="margin-top:8px">Fechar</button>
    </div>`;
  document.body.appendChild(overlay);
  window.atualizarListaExtrasModal();
};
window.atualizarListaExtrasModal=function(){
  const lista=document.getElementById('listaExtrasModal');
  if(!lista)return;
  if(!extras.length){lista.innerHTML='<div style="font-size:0.82rem;color:var(--cinza);text-align:center;padding:12px">Nenhum bar extra ainda</div>';return;}
  lista.innerHTML=extras.slice().reverse().map(e=>`
    <div class="bar-card" style="margin-bottom:8px">
      <div style="padding:10px 14px;display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div class="bar-nome">${e.nome}</div>
          ${e.nota?`<div style="font-size:0.75rem;margin-top:2px">${'⭐'.repeat(e.nota)} ${e.nota}/10</div>`:''}
          ${e.prato?`<div style="font-size:0.8rem;color:var(--laranja);margin-top:2px">🍽 ${e.prato}</div>`:''}
          ${e.comentario?`<div style="font-size:0.78rem;color:#555;font-style:italic;margin-top:4px">${e.comentario}</div>`:''}
        </div>
        <button onclick="window.excluirExtra('${e.id}').then(()=>window.atualizarListaExtrasModal())" style="padding:4px 10px;border-radius:8px;background:transparent;color:#cc0000;border:1px solid #cc0000;font-size:0.72rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif;flex-shrink:0">🗑️</button>
      </div>
    </div>`).join('');
};
const PALAVRAS_PROIBIDAS=[
  'fdp','filho da puta','filhodaputa','filho de uma puta',
  'vai se foder','vsf','vai tomar no cu','vtnc',
  'arrombado','arrombada',
  'cuzao','cuzão',
  'desgraça','desgraçado','desgraçada',
  'babaca','otario','otária','otário',
  'imbecil','cretino','cretina',
  'puta que pariu','puta merda',
  'viado','viadinho','viadão','viadao',
  'sapatão','sapatao','bichona','bichinha','traveco',
  'vagabunda','vadia','piranha','rapariga','prostituta',
  'puta velha','puta feia',
  'vou te matar','te mato','vai apanhar','vou te bater',
  'retardado','retardada','mongoloide',
  'uai seu burro','sô idiota','trem fedorento',
  'mineiro safado','mineiro safada',
  'uai viado','uai otário',
  'fuck you','motherfucker','son of a bitch','asshole',
  'v1ado','f*ck','fdp1','vtnc1','4rrombado',
];
function filtrarTexto(txt){
  if(!txt)return txt;
  let resultado=txt;
  PALAVRAS_PROIBIDAS.forEach(p=>{
    const escaped=p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const regex=new RegExp(escaped,'gi');
    resultado=resultado.replace(regex,match=>'*'.repeat(match.length));
  });
  return resultado;
}
window._rankingTodos=[];
window.denunciarComentario=async function(barId,uid,nome){
  if(!confirm('Denunciar comentário de '+nome+'?'))return;
  await db.collection('denuncias').add({
    tipo:'comentario',
    barId,uid,nome,
    denunciadoPor:usuarioAtual.uid,
    ts:Date.now()
  });
  mostrarNotif('🚩 Denúncia enviada. Vamos analisar.','info');
};
function renderDownloads(){
  document.getElementById('downloadsConteudo').innerHTML=`
    <div style="background:linear-gradient(135deg,#5C2E00,#E8650A);border-radius:14px;padding:24px 20px;margin-bottom:20px;text-align:center;color:white">
      <div style="font-size:2.5rem;margin-bottom:8px">📲</div>
      <div style="font-family:'Bebas Neue',cursive;font-size:1.8rem;letter-spacing:2px">Instale o App</div>
      <div style="font-size:0.85rem;opacity:0.9;margin-top:4px">Tenha o Rota di Buteco sempre na sua tela inicial</div>
    </div>
    <div style="background:white;border-radius:14px;padding:18px;box-shadow:var(--shadow);margin-bottom:14px;border-left:4px solid #3DDC84">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="font-size:2rem">🤖</div>
        <div>
          <div style="font-family:'Bebas Neue',cursive;font-size:1.2rem;color:var(--marrom);letter-spacing:1px">Android</div>
          <div style="background:#3DDC84;color:white;font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:10px;display:inline-block">✅ DISPONÍVEL AGORA</div>
        </div>
      </div>
      <p style="font-size:0.82rem;color:#444;line-height:1.6;margin-bottom:14px">Baixe o arquivo APK direto no seu celular Android. Não precisa da Play Store.</p>
      <div style="background:#f0fff4;border-radius:10px;padding:12px;margin-bottom:14px">
        <div style="font-size:0.78rem;font-weight:700;color:#2D6A2D;margin-bottom:8px">📋 Como instalar:</div>
        <div style="font-size:0.78rem;color:#444;line-height:1.8">
          1. Toque em <strong>Baixar APK</strong> abaixo<br>
          2. Abra o arquivo baixado<br>
          3. Se aparecer aviso de segurança, toque em <strong>Instalar mesmo assim</strong><br>
          4. Pronto — o app aparece na sua tela inicial
        </div>
      </div>
      <a href="https://drive.google.com/uc?export=download&id=1ppb02DErANcIEPVOFP1zT5DOHexak8Kp" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border-radius:12px;background:#3DDC84;color:white;font-size:0.95rem;font-weight:800;text-decoration:none;font-family:'Nunito',sans-serif;box-sizing:border-box">
        📲 Baixar APK — Android
      </a>
      <div style="font-size:0.72rem;color:var(--cinza);text-align:center;margin-top:8px">Arquivo de 1,2MB · Instala direto no celular</div>
    </div>
    <div style="background:white;border-radius:14px;padding:18px;box-shadow:var(--shadow);margin-bottom:14px;border-left:4px solid #555;opacity:0.7">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
        <div style="font-size:2rem">🍎</div>
        <div>
          <div style="font-family:'Bebas Neue',cursive;font-size:1.2rem;color:var(--marrom);letter-spacing:1px">iPhone</div>
          <div style="background:#888;color:white;font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:10px;display:inline-block">EM BREVE</div>
        </div>
      </div>
      <p style="font-size:0.82rem;color:#444;line-height:1.6;margin-bottom:14px">Versão para iPhone em breve. Por enquanto adicione na tela inicial pelo Safari.</p>
      <div style="background:#f5f5f5;border-radius:10px;padding:12px">
        <div style="font-size:0.78rem;font-weight:700;color:var(--cinza);margin-bottom:8px">📋 Usar pelo Safari agora:</div>
        <div style="font-size:0.78rem;color:#444;line-height:1.8">
          1. Abra o app no Safari<br>
          2. Toque no ícone de compartilhar <strong>⎙</strong><br>
          3. Toque em <strong>Adicionar à Tela de Início</strong><br>
          4. Pronto — funciona como um app normal
        </div>
      </div>
    </div>
    <div style="background:white;border-radius:14px;padding:18px;box-shadow:var(--shadow);margin-bottom:14px">
      <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;color:var(--marrom);letter-spacing:1px;margin-bottom:12px">❓ Dúvidas sobre a instalação?</div>
      <a href="https://wa.me/5531988924409" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;border-radius:12px;background:#25D366;color:white;font-size:0.88rem;font-weight:700;text-decoration:none;font-family:'Nunito',sans-serif;box-sizing:border-box">
        📱 Chamar Henrique no WhatsApp
      </a>
    </div>`;
}
window.togglePicker=function(eventoId){
  document.querySelectorAll('.reacao-picker.open').forEach(p=>{
    if(p.id!=='picker-'+eventoId)p.classList.remove('open');
  });
  document.getElementById('picker-'+eventoId)?.classList.toggle('open');
};
window.reagir=async function(eventoId,reacao){
  document.getElementById('picker-'+eventoId)?.classList.remove('open');
  const key='reacoes_'+usuarioAtual.uid;
  const minhasReacoes=JSON.parse(localStorage.getItem(key)||'{}');
  const reacaoAnterior=minhasReacoes[eventoId]||null;

  const ref=db.collection('reacoes').doc(eventoId);

  if(reacaoAnterior===reacao){
    delete minhasReacoes[eventoId];
    localStorage.setItem(key,JSON.stringify(minhasReacoes));
    await ref.set({[reacao]:firebase.firestore.FieldValue.increment(-1)},{merge:true});
  }else{
    if(reacaoAnterior){
      await ref.set({[reacaoAnterior]:firebase.firestore.FieldValue.increment(-1)},{merge:true});
    }
    minhasReacoes[eventoId]=reacao;
    localStorage.setItem(key,JSON.stringify(minhasReacoes));
    await ref.set({[reacao]:firebase.firestore.FieldValue.increment(1)},{merge:true});
  }
 const minhasReacoesAtual=JSON.parse(localStorage.getItem(key)||'{}');
  const minhaReacaoAtual=minhasReacoesAtual[eventoId]||null;
  const refAtual=await db.collection('reacoes').doc(eventoId).get();
  const dadosAtual=refAtual.exists?refAtual.data():{};
  const picker=document.getElementById('picker-'+eventoId);
  if(picker){
    const btn=picker.previousElementSibling;
    if(btn)btn.innerHTML=`${minhaReacaoAtual||'👍'} Reagir`;
  }
  const barraEl=picker?.parentElement?.nextElementSibling;
  if(barraEl&&barraEl.classList.contains('reacoes-bar')){
    const REACOES=['🍺','🔥','😍','🤢'];
    barraEl.innerHTML=REACOES.filter(r=>dadosAtual[r]>0).map(r=>`
      <button class="reacao-btn ${minhaReacaoAtual===r?'ativo':''}" onclick="window.reagir('${eventoId}','${r}')">
        ${r} <span>${dadosAtual[r]}</span>
      </button>`).join('');
  }
};
document.addEventListener('click',e=>{
  if(!e.target.closest('.reacao-picker')&&!e.target.closest('[onclick*="togglePicker"]')){
    document.querySelectorAll('.reacao-picker.open').forEach(p=>p.classList.remove('open'));
  }
});
window.addEventListener('scroll',()=>{
  const btn=document.getElementById('btnTopo');
  if(!btn)return;
  btn.style.display='block';
  btn.classList.toggle('visivel',window.scrollY>300);
});
async function renderDesafioDia(){
  if(!usuarioAtual)return;
  const hoje=new Date().toDateString();
  const key='desafio_'+hoje+'_'+usuarioAtual.uid;
  const cached=localStorage.getItem(key);
  let barDesafio;
  if(cached){
    barDesafio=BARES.find(b=>b.id===cached);
  }else{
    const naoVisitados=BARES.filter(b=>!visitas[b.id]);
    if(!naoVisitados.length)return;
    const seed=hoje.split('').reduce((a,c)=>a+c.charCodeAt(0),0)+usuarioAtual.uid.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
    barDesafio=naoVisitados[seed%naoVisitados.length];
    localStorage.setItem(key,barDesafio.id);
  }
  if(!barDesafio||visitas[barDesafio.id])return;
  const mapsUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barDesafio.nome+' '+barDesafio.end)}`;
  const el=document.getElementById('desafioDia');
  if(!el)return;
  el.innerHTML=`
    <div style="background:linear-gradient(135deg,#5C2E00,#E8650A);border-radius:14px;padding:16px;margin-bottom:16px;color:white">
      <div style="font-size:0.72rem;font-weight:700;opacity:0.8;letter-spacing:1px;margin-bottom:4px">⚡ DESAFIO DO DIA</div>
      <div style="font-family:'Bebas Neue',cursive;font-size:1.4rem;letter-spacing:1px;margin-bottom:4px">${barDesafio.nome}</div>
      <div style="font-size:0.82rem;opacity:0.9;margin-bottom:4px">🍽 ${barDesafio.prato}</div>
      <div style="font-size:0.75rem;opacity:0.8;margin-bottom:12px">📍 ${barDesafio.regiao} · ${barDesafio.end.split('-')[0].trim()}</div>
      <div style="display:flex;gap:8px">
        <button onclick="window.irPara('bares');setTimeout(()=>{document.getElementById('buscaInput').value='${barDesafio.nome}';window.filtrarBares();},300)" style="flex:1;padding:9px;border-radius:10px;background:white;color:var(--marrom);border:none;font-size:0.82rem;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">🍺 Ver no app</button>
        <a href="${mapsUrl}" target="_blank" style="padding:9px 14px;border-radius:10px;background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.4);font-size:0.82rem;font-weight:700;text-decoration:none;font-family:'Nunito',sans-serif;display:flex;align-items:center">🗺️</a>
      </div>
    </div>`;
}
function renderContadorEvento(){
  const el=document.getElementById('contadorEvento');
  if(!el)return;
  clearTimeout(window._contadorTimer);
  const fim=new Date('2026-05-10T23:59:59');
  const agora=new Date();
  const diff=fim-agora;
  if(diff<=0){el.innerHTML='';return;}
  const dias=Math.floor(diff/86400000);
  const horas=Math.floor((diff%86400000)/3600000);
  const min=Math.floor((diff%3600000)/60000);
  const urgente=dias<=3;
  el.innerHTML=`
    <div style="background:${urgente?'linear-gradient(135deg,#cc0000,#ff4444)':'linear-gradient(135deg,#2D6A2D,#4CAF50)'};border-radius:14px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;color:white">
      <div>
        <div style="font-size:0.72rem;font-weight:700;opacity:0.85;letter-spacing:1px">${urgente?'⚠️ ÚLTIMOS DIAS':'⏳ EVENTO TERMINA EM'}</div>
        <div style="font-family:'Bebas Neue',cursive;font-size:1.5rem;letter-spacing:2px;margin-top:2px">${dias}d ${horas}h ${min}min</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:0.72rem;opacity:0.85">10 maio</div>
        <div style="font-size:0.82rem;font-weight:700;margin-top:2px">Comida di Buteco</div>
      </div>
    </div>`;
  window._contadorTimer=setTimeout(renderContadorEvento,60000);
}
window.mostrarNotif=function mostrarNotif(msg,tipo='sucesso'){
  const n=document.getElementById('notif');
  n.textContent=msg;
  n.style.background=tipo==='erro'?'#cc0000':tipo==='info'?'#4285f4':'var(--verde)';
  n.classList.add('show');
  setTimeout(()=>n.classList.remove('show'),2500);
}
document.getElementById('senhaInput').addEventListener('keydown',e=>{if(e.key==='Enter')window.fazerLogin();});
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js');}