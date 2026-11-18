/* 考研单词 5500 · 离线缓存 Service Worker
   策略：安装时预缓存全部本地资源；运行时「缓存优先」，命中即离线返回。
   发音走 dict.youdao.com（跨域），不拦截，交给浏览器联网处理。 */

const VER = 'kw-v1';
const ASSETS = [
  './',
  './index.html',
  './data.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VER).then(function (c) {
      return c.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k !== VER;
      }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* 只接管本站资源；有道发音等外链原样放行 */
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        /* 顺手把新请求到的本站资源补进缓存 */
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(VER).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});
