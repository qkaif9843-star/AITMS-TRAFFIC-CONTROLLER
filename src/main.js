const ASSET = '/assets/';
const VEHICLE_CLASSES = new Set(['car', 'bus', 'truck', 'motorcycle']);
const DEMO_VIDEO = { A: 'road-A-demo.mp4', B: 'road-B-demo.mp4', C: 'road-C-demo.mp4', D: 'road-D-demo.mp4' };
const ROAD_META = [
  { id: 'A', direction: 'East', accent: 'cyan' },
  { id: 'B', direction: 'West', accent: 'green' },
  { id: 'C', direction: 'South', accent: 'amber' },
  { id: 'D', direction: 'North', accent: 'violet' }
];

const state = {
  page: 'home', city: '', location: '', model: null, modelPromise: null, modelKind: null, yoloModule: null,
  roads: Object.fromEntries(ROAD_META.map(r => [r.id, {
    ...r, count: 0, lanes: 3, source: `Built-in Road ${r.id} demo`, status: 'Ready for detection',
    detections: [], mediaUrl: null, mediaType: null, videoEl: null, stream: null,
    timer: null, busy: false, lastAnalyzed: 0, detectStarted: false, lastStableCount: 0, smoothDetections: [], modelReady: false, stopLoop: false
  }])),
  history: JSON.parse(localStorage.getItem('stc-history') || '[]'),
  current: 'A', next: 'C', signalSeconds: 28
};

const app = document.querySelector('#app');
const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
const totalVehicles = () => Object.values(state.roads).reduce((s, r) => s + r.count, 0);
const trafficLevel = n => n >= 12 ? 'High' : n >= 6 ? 'Medium' : n > 0 ? 'Low' : 'Very Low';
const calcSeconds = n => Math.max(12, Math.min(60, 12 + n * 2));

function recalcSignal() {
  const ranked = [...Object.values(state.roads)].sort((a, b) => b.count - a.count);
  state.current = ranked[0]?.id || 'A';
  state.next = ranked.find(r => r.id !== state.current)?.id || (state.current === 'A' ? 'C' : 'A');
  state.signalSeconds = calcSeconds(state.roads[state.current]?.count || 0);
}

function saveHistory(road, source) {
  const item = {
    time: new Date().toLocaleString(), road: `Road ${road.id}`, direction: road.direction,
    vehicles: road.count, lanes: road.lanes, level: trafficLevel(road.count), source
  };
  state.history.unshift(item);
  state.history = state.history.slice(0, 80);
  localStorage.setItem('stc-history', JSON.stringify(state.history));
}

function icon(name) {
  return ({home:'⌂', history:'◷', live:'◉', camera:'▣', upload:'↥', image:'▧', signal:'🚦'}[name] || '•');
}

function nav() {
  return `<header class="topbar">
    <div class="brand"><span class="brand-signal">🚦</span><span>SMART TRAFFIC</span><small>CONTROLLER SYSTEM</small></div>
    <nav>
      <button class="nav-btn ${state.page==='home'?'active':''}" data-nav="home">${icon('home')} Control Centre</button>
      <button class="nav-btn ${state.page==='history'?'active':''}" data-nav="history">${icon('history')} Traffic History</button>
      <button class="nav-btn ${state.page==='live'?'active':''}" data-nav="live">${icon('live')} Live Detection</button>
    </nav>
    <div class="online"><i></i> SYSTEM ONLINE</div>
  </header>`;
}

function home() {
  return `<main class="page home-page">
    <section class="home-content">
      <div class="home-ui">
        <div class="eyebrow">SMART TRAFFIC CONTROLLER SYSTEM</div>
        <div class="location-card glass">
          <label>ENTER CITY<input id="city" value="${esc(state.city)}" placeholder="Enter city" /></label>
          <label>LOCATION NAME<input id="loc" value="${esc(state.location)}" placeholder="Traffic location" /></label>
          <button id="controlBtn" class="car-control-btn" aria-label="Open Control Centre">
            <svg class="car-svg" viewBox="0 0 220 96" aria-hidden="true">
              <path class="car-shadow" d="M29 72h162"/>
              <path class="car-body" d="M25 61c2-14 12-22 28-25l19-5 13-18c4-5 10-8 17-8h31c8 0 14 3 19 9l13 17 20 5c13 3 20 10 22 25v10H25V61Z"/>
              <path class="car-window" d="M91 18 78 34h27V18H91Zm34 0v16h31l-13-16h-18Z"/>
              <path class="car-bumper" d="M25 62h170v9H25z"/>
              <circle class="car-wheel" cx="62" cy="72" r="15"/><circle class="car-wheel" cx="158" cy="72" r="15"/>
              <circle class="car-hub" cx="62" cy="72" r="6"/><circle class="car-hub" cx="158" cy="72" r="6"/>
              <path class="car-light" d="M32 50h14v8H31c0-3 0-5 1-8Zm142 0h14c1 2 1 5 1 8h-15v-8Z"/>
            </svg>
            <span class="car-btn-label">CONTROL CENTRE</span><b>→</b>
          </button>
        </div>
      </div>
      <div class="video-frame">
        <div class="frame-head"><span><i></i> ROAD CAMERA</span><span>LIVE PREVIEW</span></div>
        <video src="${ASSET}page1-road-video.mp4" autoplay muted loop playsinline></video>
      </div>
    </section>

  </main>`;
}

function historyPage() {
  const rows = state.history.length ? state.history : ROAD_META.map(r => ({time:'—', road:`Road ${r.id}`, direction:r.direction, vehicles:0, lanes:3, level:'Waiting', source:'No detection yet'}));
  return `<main class="page history-page"><div class="history-shade"></div><section class="history-wrap">
    <div class="section-title"><div><span class="eyebrow">HISTORICAL INTELLIGENCE</span><h2>Road & Traffic History</h2><p>Stored road-wise detections help the controller observe recurring traffic patterns by time, direction and vehicle volume.</p></div><button class="secondary-btn" id="liveFromHistory">Open Live Detection →</button></div>
    <div class="history-grid">
      <div class="history-stat glass"><span>RECORDED EVENTS</span><strong>${state.history.length}</strong><small>stored in this browser</small></div>
      <div class="history-stat glass"><span>CURRENT VEHICLES</span><strong>${totalVehicles()}</strong><small>latest detected counts</small></div>
      <div class="history-stat glass"><span>CURRENT OPENING</span><strong>ROAD ${state.current}</strong><small>${state.roads[state.current].direction}</small></div>
      <div class="history-stat glass"><span>NEXT OPENING</span><strong>ROAD ${state.next}</strong><small>${state.roads[state.next].direction}</small></div>
    </div>
    <div class="history-panel glass"><div class="panel-title"><span>ROAD-WISE TRAFFIC LOG</span><button id="clearHistory" class="tiny-btn">Clear History</button></div>
      <div class="table-wrap"><table><thead><tr><th>TIME</th><th>ROAD</th><th>DIRECTION</th><th>VEHICLES</th><th>LANES</th><th>TRAFFIC</th><th>SOURCE</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${esc(r.time)}</td><td><b>${esc(r.road)}</b></td><td>${esc(r.direction)}</td><td><strong>${r.vehicles}</strong></td><td>${r.lanes}</td><td><span class="level ${String(r.level).toLowerCase().replace(' ','-')}">${esc(r.level)}</span></td><td>${esc(r.source)}</td></tr>`).join('')}
      </tbody></table></div>
    </div>
    <div class="pattern-card glass"><div><span class="eyebrow">ADAPTIVE MEMORY</span><h3>Historical data feeds the controller</h3><p>Every successful photo, video or live-camera analysis records the road, direction, time, lane count and detected vehicles. The current signal decision uses the latest counts while the history remains available for pattern review.</p></div><div class="pattern-bars"><i style="height:35%"></i><i style="height:58%"></i><i style="height:44%"></i><i style="height:80%"></i><i style="height:63%"></i><i style="height:92%"></i><i style="height:51%"></i></div></div>
  </section></main>`;
}

function roadCard(r) {
  const media = r.mediaUrl
    ? (r.mediaType === 'image'
      ? `<img src="${r.mediaUrl}" alt="Road ${r.id} detection" class="media-preview" id="img-${r.id}" />`
      : `<video id="vid-${r.id}" src="${r.mediaUrl}" muted playsinline loop controls preload="metadata" class="media-preview"></video>`)
    : `<div class="empty-media"><span>🚦</span><b>ROAD ${r.id} • ${r.direction.toUpperCase()}</b><small>Live camera, video or photo</small></div>`;
  return `<article class="road-card" data-road="${r.id}">
    <div class="road-head"><div class="road-id ${r.accent}">${r.id}</div><div><b>ROAD ${r.id} — ${r.direction.toUpperCase()}</b><small class="road-status">${esc(r.status)}</small></div><span class="road-live">${r.mediaType==='live'?'● LIVE':'● READY'}</span></div>
    <div class="media-box">${media}<canvas class="detect-canvas" id="canvas-${r.id}"></canvas><div class="scanline"></div></div>
    <div class="metrics"><div><span>VEHICLES</span><strong class="vehicle-count">${r.count}</strong></div><div><span>TRAFFIC</span><strong class="traffic-level">${trafficLevel(r.count)}</strong></div><div><span>LANES</span><strong>${r.lanes}</strong></div></div>
    <div class="controls"><button class="control-btn live-btn" data-road="${r.id}">${icon('camera')} Live Camera</button><label class="control-btn">${icon('upload')} Upload Video<input hidden type="file" accept="video/*" data-video="${r.id}" /></label><label class="control-btn">${icon('image')} Upload Photo<input hidden type="file" accept="image/*" data-photo="${r.id}" /></label></div>
    <div class="card-bottom"><label>Lane count<select data-lanes="${r.id}"><option ${r.lanes===2?'selected':''}>2</option><option ${r.lanes===3?'selected':''}>3</option><option ${r.lanes===4?'selected':''}>4</option></select></label><button class="demo-btn" data-demo="${r.id}">Run detection demo</button></div>
  </article>`;
}

function livePage() {
  recalcSignal();
  const current = state.roads[state.current], next = state.roads[state.next];
  return `<main class="page live-page"><div class="live-bg"></div><section class="live-wrap">
    <div class="live-heading"><div><span class="eyebrow">LIVE DETECTION SYSTEM</span><h2>Direction-wise Vehicle Detection</h2><p>Each road accepts a live camera, uploaded video or photo. The browser runs a real vehicle-detection model on the supplied media.</p></div><div class="model-status" id="modelStatus"><i></i> Ready — detection starts when you run a demo or upload media</div></div>
    <div class="road-grid">${ROAD_META.map(r=>roadCard(state.roads[r.id])).join('')}</div>
    <section class="control-board glass"><div class="board-head"><div><span class="eyebrow">ADAPTIVE SIGNAL CONTROL</span><h3>Four-Road Decision Centre</h3></div><span class="adaptive-pill">● ADAPTIVE MODE</span></div>
      <div class="signal-grid">${ROAD_META.map(r=>{const x=state.roads[r.id], active=r.id===state.current;return `<div class="signal-card ${active?'active':''}" data-signal="${r.id}"><div class="sig-name"><b>ROAD ${r.id}</b><span>${r.direction}</span></div><div class="signal-light ${active?'green':'red'}"><i></i><span>${active?'GREEN':'RED'}</span></div><strong class="signal-time">${active?state.signalSeconds:calcSeconds(x.count)}s</strong><small class="signal-meta">${x.count} vehicles • ${trafficLevel(x.count)}</small></div>`}).join('')}</div>
      <div class="opening-row"><div class="opening current"><span>CURRENT OPENING LANE</span><b id="currentLane">ROAD ${current.id} — ${current.direction}</b><strong id="currentTime">GREEN • ${state.signalSeconds}s</strong></div><div class="opening next"><span>NEXT OPENING LANE</span><b id="nextLane">ROAD ${next.id} — ${next.direction}</b><strong>Queued after current cycle</strong></div><div class="decision"><span>DECISION</span><b id="decisionText">Road ${current.id} receives the opening based on the highest current detected vehicle count.</b></div></div>
    </section>
    <section class="prototype glass"><div class="prototype-head"><div><span class="eyebrow">RUNNING PROTOTYPE</span><h3>4-Lane Traffic Controller</h3></div><span class="prototype-live">▶ LIVE SIMULATION</span></div>
      <div class="prototype-stage"><div class="proto-tint"></div><div class="proto-road road-horizontal"></div><div class="proto-road road-vertical"></div><div class="proto-crosswalk cw-top"></div><div class="proto-crosswalk cw-bottom"></div><div class="proto-crosswalk cw-left"></div><div class="proto-crosswalk cw-right"></div><div class="intersection-cross"></div>
        ${['a','b','c','d','e','f','g','h','i','j','k','l'].map((x,i)=>`<span class="proto-car car-${x}" style="--d:${(i%4)*0.8}s">${i%4===0?'🚗':i%4===1?'🚌':i%4===2?'🚙':'🏍️'}</span>`).join('')}
        <div class="proto-label label-a">ROAD A • EAST</div><div class="proto-label label-b">ROAD B • WEST</div><div class="proto-label label-c">ROAD C • SOUTH</div><div class="proto-label label-d">ROAD D • NORTH</div>
        <div class="proto-signal s1"><i></i><i></i><i></i></div><div class="proto-signal s2"><i></i><i></i><i></i></div><div class="proto-signal s3"><i></i><i></i><i></i></div><div class="proto-signal s4"><i></i><i></i><i></i></div>
        <div class="proto-centre"><b>ADAPTIVE</b><span>ROAD ${current.id} OPEN</span></div>
      </div>
    </section>
  </section></main>`;
}

function render() {
  stopAllMediaForPage();
  app.innerHTML = `${nav()}${state.page==='home'?home():state.page==='history'?historyPage():livePage()}`;
  bind();
}

function stopAllMediaForPage() {
  Object.values(state.roads).forEach(r => {
    if (r.timer) { clearInterval(r.timer); r.timer = null; }
    if (r.stream) { r.stream.getTracks().forEach(t => t.stop()); r.stream = null; }
    r.videoEl = null;
  });
}

const DETECT_CONF = 0.12;
const DETECT_INTERVAL = 280;
const ANALYSIS_MAX_WIDTH = 640;

async function loadModel() {
  if (state.model) return state.model;
  if (!state.modelPromise) {
    state.modelPromise = (async () => {
      if (!window.tf || !window.cocoSsd) throw new Error('Browser detection runtime is unavailable');
      await window.tf.ready();
      // Lite MobileNet is deliberately used here so video/live detection does not
      // get blocked by a remote model download or a slow WebGPU/ONNX runtime.
      const fallback = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' });
      state.modelKind = 'coco';
      state.model = fallback;
      return fallback;
    })().catch(err => {
      state.modelPromise = null;
      throw err;
    });
  }
  state.model = await state.modelPromise;
  return state.model;
}

function makeAnalysisCanvas(sourceEl) {
  const sw = sourceEl.videoWidth || sourceEl.naturalWidth || sourceEl.width || 1;
  const sh = sourceEl.videoHeight || sourceEl.naturalHeight || sourceEl.height || 1;
  const scale = Math.min(1, ANALYSIS_MAX_WIDTH / sw);
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha:false, willReadFrequently:false });
  ctx.drawImage(sourceEl, 0, 0, w, h);
  return { canvas, scale, width:w, height:h };
}

async function runDetection(sourceEl) {
  const model = await loadModel();
  const isVideo = sourceEl?.tagName === 'VIDEO';
  let input = sourceEl;
  let scale = 1;
  if (isVideo) {
    const a = makeAnalysisCanvas(sourceEl);
    input = a.canvas;
    scale = a.scale;
  }
  const predictions = await model.detect(input, 40, DETECT_CONF);
  const filtered = predictions.filter(p => VEHICLE_CLASSES.has(p.class));
  if (isVideo && scale !== 1) {
    for (const p of filtered) p.bbox = p.bbox.map(v => v / scale);
  }
  return { predictions: filtered, engine: 'Fast browser vehicle detector • COCO-SSD Lite' };
}

function showModelStatus(text, ok=false) {
  const el = document.querySelector('#modelStatus');
  if (el) el.innerHTML = `<i class="${ok?'ok':''}"></i> ${esc(text)}`;
}

function updateRoadUI(road) {
  const card = document.querySelector(`[data-road="${road.id}"]`);
  if (!card) return;
  card.querySelector('.vehicle-count').textContent = road.count;
  card.querySelector('.traffic-level').textContent = trafficLevel(road.count);
  card.querySelector('.road-status').textContent = road.status;
  updateSignalUI();
}

function updateSignalUI() {
  recalcSignal();
  document.querySelectorAll('[data-signal]').forEach(el => {
    const id = el.dataset.signal, r = state.roads[id], active = id === state.current;
    el.classList.toggle('active', active);
    const light = el.querySelector('.signal-light');
    light.classList.toggle('green', active); light.classList.toggle('red', !active);
    light.querySelector('span').textContent = active ? 'GREEN' : 'RED';
    el.querySelector('.signal-time').textContent = `${active ? state.signalSeconds : calcSeconds(r.count)}s`;
    el.querySelector('.signal-meta').textContent = `${r.count} vehicles • ${trafficLevel(r.count)}`;
  });
  const c = state.roads[state.current], n = state.roads[state.next];
  document.querySelector('#currentLane')?.replaceChildren(document.createTextNode(`ROAD ${c.id} — ${c.direction}`));
  document.querySelector('#currentTime')?.replaceChildren(document.createTextNode(`GREEN • ${state.signalSeconds}s`));
  document.querySelector('#nextLane')?.replaceChildren(document.createTextNode(`ROAD ${n.id} — ${n.direction}`));
  const d = document.querySelector('#decisionText');
  if (d) d.textContent = `Road ${c.id} receives the opening because it currently has the highest detected vehicle count (${c.count}).`;
  const centre = document.querySelector('.proto-centre span');
  if (centre) centre.textContent = `ROAD ${c.id} OPEN • ${state.signalSeconds}s`;
}

function drawDetections(road, sourceEl, predictions) {
  const canvas = document.querySelector(`#canvas-${road.id}`);
  if (!canvas || !sourceEl) return;
  const parent = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = Math.max(1, Math.floor(parent.width));
  const ch = Math.max(1, Math.floor(parent.height));
  canvas.width = Math.max(1, Math.floor(cw * dpr));
  canvas.height = Math.max(1, Math.floor(ch * dpr));
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);

  const sw = sourceEl.videoWidth || sourceEl.naturalWidth || sourceEl.width || 1;
  const sh = sourceEl.videoHeight || sourceEl.naturalHeight || sourceEl.height || 1;
  // The media uses object-fit:cover. Match that exact crop so boxes stay on the vehicles.
  const scale = Math.max(cw / sw, ch / sh);
  const rw = sw * scale, rh = sh * scale;
  const ox = (cw - rw) / 2, oy = (ch - rh) / 2;

  predictions.filter(p => VEHICLE_CLASSES.has(p.class)).forEach(p => {
    const [x,y,w,h] = p.bbox;
    const px=x*scale+ox, py=y*scale+oy, pw=w*scale, ph=h*scale;
    if (px+pw < 0 || py+ph < 0 || px > cw || py > ch) return;
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px,py,pw,ph);
    const label=`${p.class} ${Math.round(p.score*100)}%`;
    ctx.font='bold 10px Inter, sans-serif';
    const tw=ctx.measureText(label).width+10;
    const ly=Math.max(0,py-19);
    ctx.fillStyle='rgba(5,12,22,.92)';
    ctx.fillRect(Math.max(0,px),ly,tw,19);
    ctx.fillStyle='#ffd43b';
    ctx.fillText(label,Math.max(5,px+5),Math.max(12,ly+13));
  });
}

function iou(a,b){
  const [ax,ay,aw,ah]=a,[bx,by,bw,bh]=b;
  const x1=Math.max(ax,bx), y1=Math.max(ay,by), x2=Math.min(ax+aw,bx+bw), y2=Math.min(ay+ah,by+bh);
  const inter=Math.max(0,x2-x1)*Math.max(0,y2-y1);
  const union=aw*ah+bw*bh-inter;
  return union>0?inter/union:0;
}

function smoothPredictions(road, predictions){
  const incoming=predictions.filter(p=>VEHICLE_CLASSES.has(p.class));
  const previous=road.smoothDetections || [];
  const result=incoming.map(p=>{
    let best=null,bestIoU=0;
    for(const q of previous){
      if(q.class!==p.class) continue;
      const score=iou(q.bbox,p.bbox);
      if(score>bestIoU){bestIoU=score;best=q;}
    }
    if(best && bestIoU>=0.25){
      const alpha=0.62;
      return {...p,bbox:p.bbox.map((v,i)=>v*alpha+best.bbox[i]*(1-alpha))};
    }
    return p;
  });
  road.smoothDetections=result;
  return result;
}

function applyPredictions(road, predictions, source, sourceEl, save=true) {
  const vehicles = smoothPredictions(road, predictions);
  road.count = vehicles.length;
  road.lastStableCount = vehicles.length;
  road.detections = vehicles;
  road.status = `${vehicles.length} vehicle${vehicles.length===1?'':'s'} detected`;
  road.lastAnalyzed = Date.now();
  if (sourceEl) drawDetections(road, sourceEl, vehicles);
  if (save && (Date.now() - (road._lastSaved || 0) > 5000)) {
    saveHistory(road, source);
    road._lastSaved = Date.now();
  }
  updateRoadUI(road);
}

async function detectImage(road, file) {
  road.status='Analyzing photo…'; updateRoadUI(road);
  try {
    const model = await loadModel();
    const img = document.querySelector(`#img-${road.id}`);
    if (!img) throw new Error('Photo element not ready');
    if (!img.complete) await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
    const result = await runDetection(img);
    showModelStatus(result.engine, state.modelKind === 'yolo');
    applyPredictions(road, result.predictions, 'Photo', img, true);
  } catch (e) {
    road.status='Detection failed — try another image';
    updateRoadUI(road);
    console.error(e);
  }
}

async function analyzeVideoFrame(road, video) {
  if (!video || video.readyState < 2 || road.busy || road.stopLoop) return;
  road.busy = true;
  try {
    const result = await runDetection(video);
    showModelStatus(result.engine, state.modelKind === 'yolo');
    applyPredictions(road, result.predictions, road.mediaType==='live' ? 'Live Camera' : road.source || 'Video', video, true);
  } catch (e) {
    road.status='Detection retrying…';
    updateRoadUI(road);
    console.error(e);
  } finally {
    road.busy=false;
  }
}

async function startVideoLoop(road, video) {
  if (road.detectStarted || !video) return;
  road.detectStarted = true;
  road.videoEl = video;
  road.stopLoop = false;
  road.status='Loading fast detection model…';
  updateRoadUI(road);
  try {
    await loadModel();
    showModelStatus('Fast vehicle detector ready', true);
    road.modelReady = true;
    road.status='Detection active';
    updateRoadUI(road);
    await video.play().catch(()=>{});

    const loop = async () => {
      if (road.stopLoop || road.videoEl !== video) return;

      // Demo videos must behave like a continuous camera feed.
      if (video.ended) {
        try {
          video.currentTime = 0;
          await video.play();
        } catch (_) {}
      }

      if (!video.paused && !video.ended) {
        await analyzeVideoFrame(road, video);
      }

      if (road.stopLoop || road.videoEl !== video) return;
      road.timer = setTimeout(loop, DETECT_INTERVAL);
    };
    clearTimeout(road.timer);
    road.timer = setTimeout(loop, 40);
  } catch (e) {
    road.detectStarted=false;
    road.status='Detection model unavailable — retry';
    updateRoadUI(road);
    showModelStatus('Vehicle detector could not load — retry', false);
    console.error(e);
  }
}

function setupVideoDetection(road) {
  const video=document.querySelector(`#vid-${road.id}`);
  if(!video) return;
  road.videoEl=video;
  road.detectStarted=false;
  road.stopLoop=false;
  const begin=()=>startVideoLoop(road,video);
  video.onloadedmetadata=begin;
  video.onloadeddata=begin;
  video.oncanplay=begin;
  video.onended=()=>{
    if (road.stopLoop) return;
    try { video.currentTime = 0; video.play().catch(()=>{}); } catch (_) {}
  };
  if (video.readyState >= 1) begin();
}

function handleVideo(road,file) {
  if (road.timer) clearTimeout(road.timer);
  road.stopLoop=true;
  road.detectStarted=false;
  if (road.mediaUrl && road.mediaUrl.startsWith('blob:')) URL.revokeObjectURL(road.mediaUrl);
  road.mediaUrl=URL.createObjectURL(file);
  road.mediaType='video';
  road.source=file.name;
  road.count=0;
  road.smoothDetections=[];
  road.status='Video loaded — starting detection…';
  render();
  requestAnimationFrame(()=>setupVideoDetection(road));
}

function handlePhoto(road,file) {
  if (road.timer) clearInterval(road.timer);
  road.detectStarted=false;
  if (road.mediaUrl && road.mediaUrl.startsWith('blob:')) URL.revokeObjectURL(road.mediaUrl);
  road.mediaUrl=URL.createObjectURL(file);
  road.mediaType='image';
  road.source=file.name;
  road.count=0;
  road.smoothDetections=[];
  road.status='Loading photo…';
  render();
  requestAnimationFrame(()=>detectImage(road,file));
}

async function startCamera(road) {
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API unavailable');
    if (road.timer) clearInterval(road.timer);
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    road.mediaType='live'; road.status='Live camera active'; road.count=0; road.source='Live Camera'; road.stream=stream;
    render();
    const box=document.querySelector(`[data-road="${road.id}"] .media-box`);
    box.innerHTML=`<video id="vid-${road.id}" class="media-preview" autoplay muted playsinline></video><canvas class="detect-canvas" id="canvas-${road.id}"></canvas><div class="scanline"></div>`;
    const v=box.querySelector('video'); v.srcObject=stream; await v.play(); road.videoEl=v;
    await loadModel(); showModelStatus('Vehicle model ready',true);
    road.detectStarted=false; startVideoLoop(road,v);
  } catch(e) {
    road.status='Camera unavailable — use upload instead'; updateRoadUI(road); alert('Camera could not be opened. Allow camera permission or use Upload Video / Upload Photo.');
  }
}

function bind() {
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{state.page=b.dataset.nav;render();});
  const cb=document.querySelector('#controlBtn'); if(cb) cb.onclick=()=>{state.city=document.querySelector('#city').value.trim();state.location=document.querySelector('#loc').value.trim();state.page='history';render();};
  const liveH=document.querySelector('#liveFromHistory'); if(liveH) liveH.onclick=()=>{state.page='live';render();};
  const clear=document.querySelector('#clearHistory'); if(clear) clear.onclick=()=>{state.history=[];localStorage.removeItem('stc-history');render();};
  document.querySelectorAll('[data-video]').forEach(i=>i.onchange=e=>{const f=e.target.files?.[0];if(f)handleVideo(state.roads[i.dataset.video],f);});
  document.querySelectorAll('[data-photo]').forEach(i=>i.onchange=e=>{const f=e.target.files?.[0];if(f)handlePhoto(state.roads[i.dataset.photo],f);});
  document.querySelectorAll('.live-btn').forEach(b=>b.onclick=()=>startCamera(state.roads[b.dataset.road]));
  document.querySelectorAll('[data-lanes]').forEach(s=>s.onchange=()=>{state.roads[s.dataset.lanes].lanes=Number(s.value);render();});
  document.querySelectorAll('[data-demo]').forEach(b=>b.onclick=()=>{const r=state.roads[b.dataset.demo]; if(r.timer) clearTimeout(r.timer); r.stopLoop=true; r.detectStarted=false; if(r.mediaUrl && r.mediaUrl.startsWith('blob:')) URL.revokeObjectURL(r.mediaUrl); r.mediaUrl=ASSET+DEMO_VIDEO[r.id]; r.mediaType='video'; r.source=`Built-in Road ${r.id} demo`; r.status='Demo video loading…'; r.count=0; r.smoothDetections=[]; render(); requestAnimationFrame(()=>{ const v=document.querySelector(`#vid-${r.id}`); if(v){ v.loop=true; v.muted=true; v.playsInline=true; } setupVideoDetection(r); });});
  document.querySelectorAll('.media-preview').forEach(v=>{if(v.tagName==='VIDEO'){const id=v.id?.replace('vid-','');if(id && state.roads[id].mediaType==='video')setupVideoDetection(state.roads[id]);}});
}

render();
