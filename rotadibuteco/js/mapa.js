function _renderMapaLeaflet(lat,lng){
  const container=document.getElementById('mapaLeaflet');
  if(!container)return;
  if(_mapaLeaflet){
    _mapaLeaflet.remove();
    _mapaLeaflet=null;
  }
  container.innerHTML='';
  setTimeout(()=>{
    _mapaLeaflet=L.map('mapaLeaflet').setView([lat,lng],13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution:'© OpenStreetMap',maxZoom:19
    }).addTo(_mapaLeaflet);
    const iconUsuario=L.divIcon({
      html:'<div style="width:16px;height:16px;background:#4285f4;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
      iconSize:[16,16],iconAnchor:[8,8],className:''
    });
    _marcadorUsuario=L.marker([lat,lng],{icon:iconUsuario}).addTo(_mapaLeaflet).bindPopup('📍 Você está aqui');
if(_watchId)navigator.geolocation.clearWatch(_watchId);
_watchId=navigator.geolocation.watchPosition(pos=>{
  const novaLat=pos.coords.latitude;
  const novaLng=pos.coords.longitude;
  _posUsuario={lat:novaLat,lng:novaLng};
  if(_marcadorUsuario)_marcadorUsuario.setLatLng([novaLat,novaLng]);
},()=>{},{enableHighAccuracy:true,maximumAge:5000});
    const baresComDist=BARES
  .filter(b=>b.lat&&b.lng)
  .map(b=>({...b,dist:haversine(lat,lng,b.lat,b.lng)}))
  .sort((a,b)=>a.dist-b.dist);
baresComDist.forEach(b=>{
      const visitado=!!visitas[b.id];
      const nota=visitas[b.id]?.nota||0;
      const cor=visitado?'#2D6A2D':'#E8650A';
      const icone=L.divIcon({
        html:`<div style="width:14px;height:14px;background:${cor};border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize:[14,14],iconAnchor:[7,7],className:''
      });
      const distStr=b.dist<1?Math.round(b.dist*1000)+'m':b.dist.toFixed(1)+'km';
      const popup=`
        <div style="font-family:'Nunito',sans-serif;min-width:160px">
          <div style="font-weight:800;font-size:0.9rem;color:#5C2E00;margin-bottom:2px">${b.nome}</div>
          <div style="font-size:0.75rem;color:#E8650A;margin-bottom:2px">🍽 ${b.prato}</div>
          <div style="font-size:0.72rem;color:#888;margin-bottom:6px">📍 ${distStr} · ${b.regiao}</div>
          ${visitado?`<div style="font-size:0.75rem;color:#2D6A2D;font-weight:700">✅ Visitado${nota?' · '+'⭐'.repeat(nota)+' '+nota+'/10':''}</div>`:'<div style="font-size:0.75rem;color:#E8650A;font-weight:700">🍺 Não visitado ainda</div>'}
        </div>`;
      L.marker([b.lat,b.lng],{icon:icone}).addTo(_mapaLeaflet).bindPopup(popup);
    });
    _mapaLeaflet.invalidateSize();
    const legenda=L.control({position:'bottomright'});
legenda.onAdd=function(){
  const div=L.DomUtil.create('div');
  div.style.cssText='background:white;padding:8px 10px;border-radius:10px;font-family:Nunito,sans-serif;font-size:0.72rem;box-shadow:0 2px 8px rgba(0,0,0,0.15);pointer-events:none';
  div.innerHTML='<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><div style="width:10px;height:10px;background:#2D6A2D;border-radius:50%"></div> Visitado</div><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><div style="width:10px;height:10px;background:#E8650A;border-radius:50%"></div> Não visitado</div><div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;background:#4285f4;border-radius:50%"></div> Você</div>';
  return div;
};
legenda.addTo(_mapaLeaflet);
  },100);
}
window.setVistaProximos=function(vista){
  _vistaProximos=vista;
  document.getElementById('btnVistaLista').className=vista==='lista'?'ativo':'inativo';
  document.getElementById('btnVistaMapa').className=vista==='mapa'?'ativo':'inativo';
  if(vista==='lista'&&_watchId){navigator.geolocation.clearWatch(_watchId);_watchId=null;}
  document.getElementById('proximosConteudo').style.display=vista==='lista'?'block':'none';
  document.getElementById('mapaLeaflet').style.display=vista==='mapa'?'block':'none';
  if(vista==='mapa'){
    if(!_posUsuario){
      mostrarNotif('📍 Obtendo localização...','info');
      navigator.geolocation.getCurrentPosition(pos=>{
        _posUsuario={lat:pos.coords.latitude,lng:pos.coords.longitude};
        _renderMapaLeaflet(_posUsuario.lat,_posUsuario.lng);
      },()=>mostrarNotif('Não foi possível obter localização','erro'),{enableHighAccuracy:true,timeout:10000});
    }else{
      _renderMapaLeaflet(_posUsuario.lat,_posUsuario.lng);
    }
  }
};
function renderMapaRegioes(boresIds){
  const regioes={
    NORTE:{x:200,y:30,w:160,h:120,label:'NORTE'},
    NORDESTE:{x:320,y:120,w:120,h:100,label:'NORDESTE'},
    LESTE:{x:280,y:200,w:120,h:100,label:'LESTE'},
    CENTRO:{x:180,y:180,w:110,h:80,label:'CENTRO'},
    SUL:{x:160,y:240,w:120,h:100,label:'SUL'},
    OESTE:{x:40,y:160,w:140,h:120,label:'OESTE'},
    NOROESTE:{x:60,y:60,w:150,h:110,label:'NOROESTE'},
  };
  const cores={completa:'#2D6A2D',parcial:'#E8650A',vazia:'#e0d0c0'};
  const textoCores={completa:'white',parcial:'white',vazia:'#888'};
  let svgRegioes='';
  Object.entries(regioes).forEach(([regiao,r])=>{
    const total=BARES.filter(b=>b.regiao===regiao).length;
    const feitos=BARES.filter(b=>b.regiao===regiao&&boresIds.has(b.id)).length;
    const status=feitos===0?'vazia':feitos===total?'completa':'parcial';
    const pct=Math.round((feitos/total)*100);
    svgRegioes+=`
      <g onclick="window.mostrarNotif('${regiao}: ${feitos}/${total} bares (${pct}%)')" style="cursor:pointer">
        <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="8" fill="${cores[status]}" stroke="white" stroke-width="2"/>
        <text x="${r.x+r.w/2}" y="${r.y+r.h/2-8}" text-anchor="middle" font-family="Bebas Neue,cursive" font-size="13" fill="${textoCores[status]}">${r.label}</text>
        <text x="${r.x+r.w/2}" y="${r.y+r.h/2+10}" text-anchor="middle" font-family="Nunito,sans-serif" font-size="11" font-weight="700" fill="${textoCores[status]}">${feitos}/${total}</text>
        <text x="${r.x+r.w/2}" y="${r.y+r.h/2+24}" text-anchor="middle" font-family="Nunito,sans-serif" font-size="10" fill="${textoCores[status]}">${pct}%</text>
      </g>`;
  });
  return`<div style="background:white;border-radius:14px;padding:16px;box-shadow:var(--shadow);margin-bottom:16px">
    <div style="font-family:'Bebas Neue',cursive;font-size:1.1rem;color:var(--marrom);letter-spacing:1px;margin-bottom:4px">🗺️ Mapa de BH</div>
    <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;border-radius:3px;background:#2D6A2D"></div><span style="font-size:0.72rem;color:var(--cinza)">Completa</span></div>
      <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;border-radius:3px;background:#E8650A"></div><span style="font-size:0.72rem;color:var(--cinza)">Em progresso</span></div>
      <div style="display:flex;align-items:center;gap:4px"><div style="width:12px;height:12px;border-radius:3px;background:#e0d0c0"></div><span style="font-size:0.72rem;color:var(--cinza)">Não iniciada</span></div>
    </div>
    <svg viewBox="0 0 460 360" style="width:100%;border-radius:10px;background:#f5f0e8">${svgRegioes}</svg>
    <div style="font-size:0.72rem;color:var(--cinza);text-align:center;margin-top:8px">Toque em uma região para ver o progresso</div>
  </div>`;
}
function haversine(lat1,lng1,lat2,lng2){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
let _mapaLeaflet=null;
let _vistaProximos='lista';
let _watchId=null;
let _marcadorUsuario=null;
