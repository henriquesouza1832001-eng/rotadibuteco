window.fazerLogin=async function(){
  const email=document.getElementById('emailInput').value.trim();
  const senha=document.getElementById('senhaInput').value;
  const msg=document.getElementById('loginMsg');
  if(!email||!senha){msg.textContent='Preencha email e senha.';return;}
  try{
    if(modoLogin){await auth.signInWithEmailAndPassword(email,senha);}
    else{
      const nome=document.getElementById('nomeInput').value.trim();
const senha2=document.getElementById('senha2Input').value;
if(!nome){msg.textContent='Informe seu nome.';return;}
if(nome.length<2){msg.textContent='Nome muito curto.';return;}
if(senha!==senha2){msg.textContent='As senhas não coincidem.';return;}
const cred=await auth.createUserWithEmailAndPassword(email,senha);
await cred.user.updateProfile({displayName:nome});
await db.collection('users').doc(cred.user.uid).set({nome,email,criadoEm:Date.now()});
    }
    msg.textContent='';
  }catch(e){
    const erros={'auth/user-not-found':'Usuário não encontrado.','auth/wrong-password':'Senha incorreta.','auth/email-already-in-use':'Email já cadastrado.','auth/weak-password':'Senha fraca (mín. 6 chars).','auth/invalid-email':'Email inválido.'};
    msg.textContent=erros[e.code]||e.message;
    document.getElementById('btnReset').style.display='block';
  }
};
window.fazerLogout=async function(){await auth.signOut();};

auth.onAuthStateChanged(async user=>{
  if(window._authJaProcessado&&user)return;
  if(!user){
    window._authJaProcessado=false;
    document.getElementById('loginScreen').style.display='flex';
    document.getElementById('app').style.display='none';
    return;
  }
  window._authJaProcessado=true;
  clearTimeout(authTimeout);
  if(user){
    usuarioAtual=user;
    document.getElementById('loginScreen').style.display='none';
    const adminCheck=await db.collection('users').doc(user.uid).get();
if(adminCheck.data()?.admin){
  document.getElementById('btnAdmin').style.display='block';
  document.getElementById('headerNome').style.color='#FFD700';
}

    document.getElementById('app').style.display='block';
    document.getElementById('headerNome').textContent=user.displayName||user.email.split('@')[0];
    const likesKey='likes_'+user.uid;
    try{meusLikes=JSON.parse(localStorage.getItem(likesKey)||'{}');}catch(e){meusLikes={};}
    const userDoc=await db.collection('users').doc(user.uid).get();
    if(userDoc.exists&&userDoc.data()?.banido){
      await auth.signOut();
      document.getElementById('loginMsg').textContent='❌ Conta suspensa. Entre em contato com o administrador.';
      return;
    }

{
enqueueModal(fechar=>{
  if(window._premioMostrado){fechar();return;}
  window._premioMostrado=true;
  const vizKey='premio_visto_'+user.uid;
  const vezes=parseInt(localStorage.getItem(vizKey)||'0');
  if(vezes>=3)return;
  localStorage.setItem(vizKey,String(vezes+1));
  const ov=document.createElement('div');
  ov.className='modal-overlay';
  ov.innerHTML=`
    <div class="modal-box" style="text-align:center">
      <div style="font-size:3rem;margin-bottom:8px">🎁</div>
      <div class="modal-titulo" style="color:#f0a500">PRÊMIO MISTERIOSO!</div>
      <p class="modal-desc">
        Quem beber mais <strong>Amstel</strong> nos bares do Comida di Buteco 2026 vai ganhar um<br><br>
        <span style="font-size:1.5rem">🎁 prêmio misterioso!</span><br><br>
        Registre cada Amstel que você beber, envie a foto da comanda ou notinha e suba no ranking.<br><br>
        <span style="font-weight:800;color:var(--marrom)">Quanto mais você beber, mais chances você tem!</span><br><br>
        <span style="font-size:0.75rem;color:var(--cinza)">O vencedor será revelado no final do evento. 🍺</span>
      </p>
      <button onclick="modalFechou(this.closest('.modal-overlay'));window.irPara('amstel')" class="btn-login" style="background:#f0a500;margin-bottom:10px">🍺 Ver ranking Amstel</button>
      <button onclick="modalFechou(this.closest('.modal-overlay'))" class="btn-cadastro">Fechar</button>
    </div>`;
  document.body.appendChild(ov);
},2000);
}



    const tutKey='tutorial_visto_'+user.uid;
    if(!localStorage.getItem(tutKey)){
      try{localStorage.setItem(tutKey,'1');}catch(e){}
  const SLIDES=[
  {icon:'🍺',title:'Fala, butequeador!',desc:'Tutorial rápido antes de começar. Só aparece uma vez.',items:[]},
  {icon:'🏆',title:'Ranking',desc:'Veja quem tá na frente e disputa com seus amigos.',items:['Filtra por visitados, nota média, km rodados e mais','Alterna entre ranking geral e do seu grupo','Toca num nome para ver o perfil de quem tá na frente','Todo dia tem um bar em destaque pra te motivar','Quando você passa alguém no ranking aparece uma notificação']},
  {icon:'🍺',title:'Bares',desc:'Os 128 bares do Comida di Buteco BH 2026.',items:['Filtra por região ou busca pelo nome do bar ou prato','Marca como visitado e dá nota de 1 a 10','Adiciona foto da visita — aparece no feed e no seu perfil','Registra os km que rodou e quanto gastou','Tem algum bar fora do roteiro? Registra pelo botão +']},
  {icon:'📰',title:'Feed',desc:'O que seus amigos estão aprontando pelos botecos.',items:['Reage com 🍺 🔥 😍 🤢 nos posts','Vê as fotos das visitas dos amigos','Filtra entre feed geral ou só do seu grupo','Comenta e denuncia se precisar']},
  {icon:'🗺️',title:'Roteiro',desc:'Organize a rota dos bares com seu grupo.',items:['Mapa interativo com a ordem dos bares do dia','Botão pra abrir a rota completa no Google Maps','Barra de progresso mostrando o quanto já visitaram','Sugere bares pro organizador aprovar']},
  {icon:'📍',title:'Próximos',desc:'Quais bares estão mais perto de você agora.',items:['Lista ordenada por distância','Mapa com todos os bares — verde visitado, laranja não visitado','Vê quais amigos do grupo já foram em cada bar','Sua localização atualiza enquanto o mapa está aberto']},
  {icon:'🍺',title:'Amstel',desc:'Beba Amstel nos bares e concorra a um prêmio.',items:['Registra cada Amstel com foto da comanda','Quanto mais você beber, mais chances tem','Cadastra seu contato pra receber o prêmio se ganhar','O envio passa por aprovação antes de entrar no ranking']},
  {icon:'👤',title:'Perfil',desc:'Seu cantinho no app. Começa tocando na sua foto para escolher um avatar ou colocar uma foto sua.',items:['Toca na foto para trocar o avatar ou enviar uma foto da galeria','Stats com gastos e mapa de regiões de BH','Galeria de fotos das suas visitas','Emblemas pra colecionar por visitas e regiões','Grupo — gerencie e veja estatísticas']},
  {icon:'📲',title:'Instala o app!',desc:'Tem versão pra celular também.',items:['Android — baixa o APK direto, sem Play Store','iPhone — adiciona pelo Safari na tela inicial','Funciona igual app nativo com ícone próprio','Vai na aba App no menu pra baixar']}
];
      let atual=0;
      const ov=document.createElement('div');
      ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px';
      function renderSlide(){
        const s=SLIDES[atual];
        const progresso=SLIDES.map((_,i)=>`<div style="height:4px;flex:1;border-radius:4px;background:${i<=atual?'#E8650A':'#e0d0c0'}"></div>`).join('');
        ov.innerHTML=`
          <div style="background:white;border-radius:20px;padding:28px 24px;width:100%;max-width:380px;font-family:'Nunito',sans-serif">
            <div style="display:flex;gap:5px;margin-bottom:20px">${progresso}</div>
            <div style="font-size:2.5rem;margin-bottom:12px;text-align:center">${s.icon}</div>
            <div style="font-family:'Bebas Neue',cursive;font-size:1.5rem;color:#5C2E00;letter-spacing:1px;margin-bottom:8px;text-align:center">${s.title}</div>
            <div style="font-size:0.85rem;color:#6B6B6B;margin-bottom:${s.items.length?'16px':'0'};text-align:center;line-height:1.6">${s.desc}</div>
            ${s.items.map(item=>`<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px"><span style="color:#E8650A;font-size:1rem;flex-shrink:0">✓</span><span style="font-size:0.82rem;color:#444;line-height:1.5">${item}</span></div>`).join('')}
            <div style="display:flex;gap:10px;margin-top:20px">
              ${atual>0?`<button onclick="window._tutNav(-1)" style="flex:1;padding:10px;border-radius:10px;border:2px solid #e0d0c0;background:transparent;color:#6B6B6B;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">Voltar</button>`:''}
              <button onclick="window._tutNav(1)" style="flex:2;padding:10px;border-radius:10px;border:none;background:#E8650A;color:white;font-size:0.85rem;font-weight:700;cursor:pointer;font-family:'Nunito',sans-serif">${atual===SLIDES.length-1?'Começar! 🍺':'Próximo'}</button>
            </div>
            <div style="text-align:center;margin-top:12px">
              <button onclick="document.body.removeChild(document.getElementById('tutorialOverlay'))" style="background:none;border:none;color:#bbb;font-size:0.75rem;cursor:pointer;font-family:'Nunito',sans-serif">Pular tutorial</button>
            </div>
          </div>`;
        ov.id='tutorialOverlay';
      }
      window._tutNav=function(dir){
        atual+=dir;
        if(atual>=SLIDES.length){document.body.removeChild(ov);return;}
        if(atual<0)atual=0;
        renderSlide();
      };
      renderSlide();
      document.body.appendChild(ov);
    }

const alertaKey='alerta_foto_v2_'+user.uid;
if(!localStorage.getItem(alertaKey)){
  localStorage.setItem(alertaKey,'1');
  setTimeout(()=>{
    const ov=document.createElement('div');
    ov.id='alertaFotoOv';
    ov.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px';
    ov.innerHTML=`
      <div style="background:white;border-radius:20px;padding:28px 24px;width:100%;max-width:380px;font-family:'Nunito',sans-serif;text-align:center;position:relative">
        <div style="font-size:3rem;margin-bottom:8px">📸</div>
        <div style="font-family:'Bebas Neue',cursive;font-size:1.6rem;color:#cc0000;letter-spacing:1px;margin-bottom:8px">ATENÇÃO — NOVA REGRA</div>
        <div style="font-size:0.88rem;color:#444;line-height:1.7;margin-bottom:16px">
          Para registrar uma visita agora você precisa<br>
          <strong>tirar uma foto do prato na hora</strong>,<br>direto pela câmera do celular.<br><br>
          Fotos da galeria <strong>não são aceitas</strong>.<br>
          Sem foto, a visita não entra no ranking.<br><br>
          <span style="color:#cc0000;font-weight:800">⚠️ Fotos falsas = banimento permanente.</span><br>
          <span style="font-size:0.8rem;color:#888">Queremos um ranking justo para todo mundo 🍺</span>
        </div>
        <div id="alertaContador" style="font-size:0.78rem;color:#bbb;margin-bottom:12px">Fechando em 8s...</div>
        <button onclick="document.getElementById('alertaFotoOv').remove()" 
                style="width:100%;padding:11px;border-radius:12px;background:#cc0000;color:white;border:none;font-size:0.9rem;font-weight:800;cursor:pointer;font-family:'Nunito',sans-serif">
          Entendi, bora! 🍺
        </button>
      </div>`;
    document.body.appendChild(ov);
    let seg=20;
    const timer=setInterval(()=>{
      seg--;
      const el=document.getElementById('alertaContador');
      if(el)el.textContent='Fechando em '+seg+'s...';
      if(seg<=0){
        clearInterval(timer);
        const ovEl=document.getElementById('alertaFotoOv');
        if(ovEl){
          ovEl.style.transition='opacity 0.5s';
          ovEl.style.opacity='0';
          setTimeout(()=>ovEl.remove(),500);
        }
      }
    },1000);
  },3500);
}
    
    carregarDados();
    renderRankingTabs();
    setTimeout(()=>renderRankingAtivo(),1000);
    setTimeout(()=>renderDesafioDia(),1200);
    setTimeout(()=>renderContadorEvento(),1400);
}
});