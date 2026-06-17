window.abrirResetSenha=function(){
  const overlay=document.createElement('div');
  overlay.className='modal-overlay';
  overlay.innerHTML=`
    <div class="modal-box">
      <div class="modal-titulo">🍺 Recuperar Acesso</div>
      <p class="modal-desc">Digite seu e-mail cadastrado e enviaremos um link para você criar uma nova senha.</p>
      <input class="input-field" id="resetEmail" type="email" placeholder="seu@email.com"/>
      <div id="resetMsg" style="font-size:0.78rem;min-height:18px;margin-bottom:12px;font-weight:700"></div>
      <button onclick="window.enviarResetSenha()" class="btn-login" style="margin-bottom:10px">📨 Enviar link</button>
      <button onclick="this.closest('.modal-overlay').remove()" class="btn-cadastro">Cancelar</button>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>document.getElementById('resetEmail')?.focus(),100);
};

window.enviarResetSenha=async function(){
  const email=document.getElementById('resetEmail')?.value.trim();
  const msg=document.getElementById('resetMsg');
  if(!email){msg.style.color='#cc0000';msg.textContent='Informe seu e-mail.';return;}
  try{
    await auth.sendPasswordResetEmail(email);
    document.querySelector('.modal-box').innerHTML=`
      <div style="font-size:3.5rem;margin-bottom:12px">📨</div>
      <div class="modal-titulo">E-mail enviado!</div>
      <p class="modal-desc">Enviamos um link de redefinição para<br><strong>${email}</strong><br><br>Verifique sua caixa de entrada e a pasta de spam. O link expira em 1 hora.</p>
      <button onclick="this.closest('.modal-overlay').remove()" class="btn-login">Entendi</button>`;
  }catch(e){
    const erros={
      'auth/user-not-found':'E-mail não encontrado.',
      'auth/invalid-email':'E-mail inválido.',
      'auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos.'
    };
    msg.style.color='#cc0000';
    msg.textContent=erros[e.code]||'Erro ao enviar. Tente novamente.';
  }
};
