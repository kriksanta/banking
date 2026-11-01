const CACHE_PREFIX='cash-tool-'+new URL(self.registration.scope).pathname.replace(/[^a-z0-9]/gi,'-')+'-';
const CACHE_NAME=CACHE_PREFIX+'20261101a';
const APP_FILES=["./index.html", "./admin-panel.css", "./business-margins.json", "./challan-access.js", "./icon-192.png", "./icon-512.png", "./logo-light.png", "./logo-night.png", "./logo-rainbow-mask.png", "./manifest.webmanifest", "./print-tools-integration.css", "./print-tools-integration.js", "./print-tools.html", "./firebase-config.json", "./notice.json", "./release.json", "./skeuomorphic.css?v=20261101a", "./firebase-service.js?v=20261101a", "./firebase-admin.js?v=20261101a", "./account-approvals.js?v=20261101a", "./tool-permissions.js?v=20261101a", "./print-tool-access.js?v=20261101a"];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_FILES)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith(CACHE_PREFIX)||key.startsWith('bfil-cash-tools-'))&&key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}return response;}).catch(async()=>{const cached=await caches.match(event.request);if(cached)return cached;if(event.request.mode==='navigate')return(await caches.match('./index.html'))||Response.error();return Response.error();}));
});
