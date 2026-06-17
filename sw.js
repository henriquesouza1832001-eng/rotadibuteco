self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
));
self.addEventListener('fetch', e => {
  if(e.request.mode === 'navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp=>{
      if(resp&&resp.status===200&&resp.type==='basic'){
        const clone=resp.clone();
        caches.open('rota-v1').then(cache=>cache.put(e.request,clone));
      }
      return resp;
    }))
  );
});