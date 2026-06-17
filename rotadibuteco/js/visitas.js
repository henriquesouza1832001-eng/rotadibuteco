window.salvarNota=async function(id){
  if(!usuarioAtual)return;
  if(window._salvandoNota===id)return;
  window._salvandoNota=id;
  setTimeout(()=>{window._salvandoNota=null;},3000);
  const btnSalvar=document.querySelector(`#nota-${id} .btn-salvar-nota`);
  const txtOriginal=btnSalvar?.textContent||'💾 Salvar avaliação';
  if(btnSalvar){btnSalvar.textContent='⏳ Salvando...';btnSalvar.disabled=true;}

  const d=await _salvarDadosVisita(id,'');
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
  const paginaAtivaNota=document.querySelector('.page.active')?.id;
  if(paginaAtivaNota==='page-proximos')renderProximos();
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
window.toggleVisita=async function(id){
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
  const cardAberto2=cardAberto;
renderBares();renderPerfil();
const paginaAtiva=document.querySelector('.page.active')?.id;
if(paginaAtiva==='page-proximos')renderProximos();
if(cardAberto2){
  const info=document.getElementById('info-'+cardAberto2);
  if(info)info.style.display='block';
  cardAberto=cardAberto2;
}
  clearTimeout(window._cacheTimer);
window._cacheTimer=setTimeout(()=>window.atualizarCacheGlobal(),3000);
delete _cacheAmigos[id];
_cacheVisitasGrupo=null;
const paginaAtivaToggle=document.querySelector('.page.active')?.id;
if(paginaAtivaToggle==='page-roteiro')renderRoteiro();
};
window.abrirAvaliacaoObrigatoriaProximo=function(barId){
  const notaSection=document.getElementById('nota-prox-'+barId);
  if(notaSection)notaSection.classList.add('open');
  const info=document.getElementById('info-prox-'+barId);
  if(info)info.style.display='block';
  mostrarNotif('⭐ Dê uma nota para registrar sua visita!','info');
  setTimeout(()=>notaSection?.scrollIntoView({behavior:'smooth',block:'center'}),100);
};
async function uploadFotoStorage(blob,path){
  const ref=storage.ref(path);
  const snap=await ref.put(blob);
  return await snap.ref.getDownloadURL();
}

async function fileParaBlob(dataUrl,maxWidth,qualidade){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      if(w>maxWidth){h=Math.round(h*maxWidth/w);w=maxWidth;}
      const canvas=document.createElement('canvas');
      canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      canvas.toBlob(blob=>resolve(blob),'image/jpeg',qualidade);
    };
    img.onerror=()=>resolve(null);
    img.src=dataUrl;
  });
}
window.previewFotoObrigatoria=function(barId,input,prefixo){
  prefixo=prefixo||'';
  const file=input.files[0];
  if(!file)return;
  if(file.size>10*1024*1024){mostrarNotif('Foto muito grande! Máx 10MB','erro');return;}
  const reader=new FileReader();
  reader.onload=e=>{
    if(!window._fotosVisita)window._fotosVisita={};
    window._fotosVisita[barId]=e.target.result;
    const preview=document.getElementById('foto-preview-'+prefixo+barId);
    const img=document.getElementById('foto-img-'+prefixo+barId);
    if(preview)preview.style.display='block';
    if(img)img.src=e.target.result;
    mostrarNotif('📸 Foto capturada! Agora salve a avaliação.','info');
  };
  reader.readAsDataURL(file);
};
window.verFotoVisita=function(barId){
  const v=visitas[barId];
  if(!v?.fotoUrl&&!v?.foto)return;
  const bar=BARES.find(b=>b.id===barId);
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML=`
    <div style="position:relative;width:100%;max-width:500px">
      <img src="${v.fotoUrl||v.foto}" style="width:100%;border-radius:10px;object-fit:contain;max-height:70vh"/>
      <div style="color:white;text-align:center;margin-top:12px">
        <div style="font-weight:800;font-size:1rem">${bar?.nome||''}</div>
        ${v.nota?`<div style="font-size:0.85rem;opacity:0.8;margin-top:4px">${'⭐'.repeat(v.nota)} ${v.nota}/10</div>`:''}
        ${v.comentario?`<div style="font-size:0.82rem;opacity:0.7;margin-top:4px;font-style:italic">"${v.comentario}"</div>`:''}
      </div>
      <button onclick="this.closest('div[style*=z-index]').remove()" style="position:absolute;top:-12px;right:-12px;width:36px;height:36px;border-radius:50%;background:white;border:none;font-size:1.2rem;cursor:pointer;font-weight:700">✕</button>
    </div>`;
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
  document.body.appendChild(ov);
};
async function _salvarDadosVisita(id,prefixo){
  const nota=visitas[id]?.nota||0;
  if(nota===0){mostrarNotif('⭐ Dê pelo menos nota 1 para salvar!');return false;}
  if(!window._fotosVisita?.[id]){
    mostrarNotif('📸 Tire uma foto do prato para confirmar a visita!','erro');
    return false;
  }
  const km=parseFloat(document.getElementById('km-'+prefixo+id)?.value)||0;
  const comentario=filtrarTexto(document.getElementById('comment-'+prefixo+id)?.value||'');
  const valor=parseFloat(document.getElementById('valor-'+prefixo+id)?.value)||40;
  const d={visitado:true,nota,km,valor,comentario,ts:visitas[id]?.ts||Date.now()};
  await db.collection('users').doc(usuarioAtual.uid).collection('visits').doc(id).set(d);
  if(nota > 0){
    await db.collection('comentarios').doc(id).collection('posts').add({uid:usuarioAtual.uid,nome:usuarioAtual.displayName||'Anônimo',texto:comentario,nota,tipo:'avaliacao',ts:Date.now()});
  }
  const resumoRef=db.collection('comentarios').doc('resumo');
  const resumoSnap=await resumoRef.get();
  const resumoAtual=resumoSnap.exists?resumoSnap.data():{};
  const postsAtualizados=await db.collection('comentarios').doc(id).collection('posts').orderBy('ts','desc').limit(10).get();
  resumoAtual[id]=postsAtualizados.docs.map(d=>({...d.data(),docId:d.id}));
  await resumoRef.set(resumoAtual);
  localStorage.removeItem('commMap');
  visitas[id]=d;
  salvarCache('visitas_'+usuarioAtual.uid,visitas);
  return d;
}
