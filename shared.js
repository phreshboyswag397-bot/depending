// shared chrome: nav + footer injected so every page stays in sync
const LOGO = `<img src="/logo.png?v=2" alt="depend" width="30" height="30">`;
const LOGO_SM = `<img src="/logo.png?v=2" alt="depend" width="24" height="24">`;
const INVITE = 'https://discord.gg/depend';
const NAV = [['Commands','/commands'],['Embeds','/embeds'],['Status','/status'],['Docs','/docs'],['Changelogs','/changelogs'],['Dashboard','/dashboard']];

// small inline icons shown beside each nav label
const NAV_ICONS = {
  Commands:'<path d="m4 7 5 5-5 5M12 17h8"/>',
  Embeds:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18"/>',
  Status:'<path d="M3 12h4l3 8 4-16 3 8h4"/>',
  Docs:'<path d="M4 4h7v16H6a2 2 0 0 1-2-2zM20 4h-7v16h5a2 2 0 0 0 2-2z"/>',
  Changelogs:'<path d="M3 6h13M3 12h13M3 18h9M19 8v6M19 17v.01"/>',
  Dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'
};
function navIcon(t){return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${NAV_ICONS[t]||''}</svg>`;}

// typewriter: types text into el, optional caret while typing, then stops.
// respects reduced-motion (instant). Returns a promise that resolves when done.
function typewriter(el, text, opts){
  opts=opts||{};
  const speed=opts.speed||38, start=opts.delay||0;
  if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches){
    el.textContent=text; return Promise.resolve();
  }
  el.textContent=''; el.classList.add('tw-typing');
  return new Promise(res=>{
    setTimeout(()=>{
      let i=0;
      const tick=()=>{
        if(i<=text.length){ el.textContent=text.slice(0,i); i++; setTimeout(tick,speed+(Math.random()*40-20)); }
        else { el.classList.remove('tw-typing'); res(); }
      };
      tick();
    },start);
  });
}
// type a heading made of multiple coloured spans in sequence
async function typeSequence(parts, opts){
  for(const p of parts){ await typewriter(p.el, p.text, {speed:opts&&opts.speed, delay:p.delay||0}); }
}

function mountChrome(active){
  mountWaves();
  mountLoader();
  const links = NAV.map(([t,h])=>{
    const on = t.toLowerCase()===active;
    return `<a href="${h}"${on?' class="active"':''}>${navIcon(t)}${t}</a>`;
  }).join('');
  document.body.insertAdjacentHTML('afterbegin',`
    <header class="nav"><div class="nav-bar">
      <a class="brand" href="/"><span class="logo">${LOGO}</span><span class="word">depend</span></a>
      <nav class="nav-pill" id="navlinks">${links}</nav>
      <a href="${INVITE}" class="nav-support">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.05-.02.07-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.05-.01.07.01.11.09.22.17.33.26.04.03.04.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.03.02.06.03.09.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"/></svg>
        support</a>
      <button class="nav-toggle" id="navtoggle" aria-label="Menu">☰</button>
    </div></header>`);
  const tgl=document.getElementById('navtoggle');
  if(tgl) tgl.onclick=()=>document.getElementById('navlinks').classList.toggle('open');

  document.body.insertAdjacentHTML('beforeend',`
    <footer class="ft"><div class="wrap ft-inner">
      <div class="ft-left"><span class="logo">${LOGO_SM}</span><span>© ${new Date().getFullYear()} depend</span></div>
      <div class="ft-links">
        <a href="/commands">Commands</a><a href="/docs">Docs</a><a href="/status">Status</a>
        <a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="${INVITE}">Support</a>
      </div>
    </div></footer>`);
}
function fmt(n){return (n??0).toLocaleString('en-US');}

// animate a number rolling up to its target, fast and smooth.
// format(value) -> string  (defaults to fmt). Respects reduced-motion.
function countUp(el, target, opts){
  if(!el) return;
  opts=opts||{};
  const format = opts.format || fmt;
  const dur = opts.dur || 900;
  target = +target || 0;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce || target<=0){ el.textContent = format(target); return; }
  const start = performance.now();
  const ease = t => 1 - Math.pow(1 - t, 3); // easeOutCubic — quick then settles
  function step(now){
    const p = Math.min(1, (now - start) / dur);
    const val = Math.round(ease(p) * target);
    el.textContent = format(val);
    if(p < 1) requestAnimationFrame(step);
    else el.textContent = format(target);
  }
  requestAnimationFrame(step);
}

// full-screen logo loader — flashes, rises, shrinks away on load,
// and reappears when navigating to another page on the site.
function mountLoader(){
  if(document.getElementById('loader')) return;
  const css=`
    #loader{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
      background:radial-gradient(circle at 50% 45%,#0b0a14 0%,#000 70%);
      transition:opacity .5s ease;}
    #loader.hide{opacity:0;pointer-events:none}
    #loader .ldr-wrap{position:relative;display:grid;place-items:center}
    #loader .halo{position:absolute;width:240px;height:240px;border-radius:50%;
      background:radial-gradient(circle,rgba(183,169,242,.35),rgba(183,169,242,0) 65%);
      filter:blur(6px);animation:ldr-halo 1.8s ease-in-out infinite}
    #loader .ring{position:absolute;width:140px;height:140px;border-radius:50%;
      border:2px solid transparent;border-top-color:rgba(183,169,242,.8);
      border-right-color:rgba(183,169,242,.25);animation:ldr-spin 1.1s linear infinite}
    #loader img{width:104px;height:104px;position:relative;
      filter:drop-shadow(0 0 14px rgba(183,169,242,.65)) drop-shadow(0 0 34px rgba(143,127,224,.45));
      animation:ldr-pulse 1.4s ease-in-out infinite}
    #loader.out .ldr-wrap{animation:ldr-out .62s cubic-bezier(.55,0,.25,1) forwards}
    @keyframes ldr-pulse{0%,100%{opacity:.82;transform:scale(1)}
      50%{opacity:1;transform:scale(1.07);filter:drop-shadow(0 0 22px rgba(183,169,242,.85)) drop-shadow(0 0 48px rgba(143,127,224,.6))}}
    @keyframes ldr-halo{0%,100%{opacity:.5;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}
    @keyframes ldr-spin{to{transform:rotate(360deg)}}
    @keyframes ldr-out{0%{opacity:1;transform:translateY(0) scale(1)}
      40%{opacity:1;transform:translateY(-18px) scale(1.1)}
      100%{opacity:0;transform:translateY(-46px) scale(.08)}}
    @media(prefers-reduced-motion:reduce){
      #loader img,#loader .halo,#loader .ring{animation:none}
      #loader.out .ldr-wrap{animation:none}}`;
  document.head.insertAdjacentHTML('beforeend',`<style>${css}</style>`);
  document.body.insertAdjacentHTML('afterbegin',
    `<div id="loader"><div class="ldr-wrap"><div class="halo"></div><div class="ring"></div><img src="/logo-lg.png?v=2" alt=""></div></div>`);
  const el=document.getElementById('loader');

  function dismiss(){
    el.classList.add('out');
    setTimeout(()=>el.classList.add('hide'),600);
    setTimeout(()=>{ if(el.classList.contains('hide')) el.style.display='none'; },1120);
  }
  const shownAt=performance.now();
  function ready(){ const wait=Math.max(0,520-(performance.now()-shownAt)); setTimeout(dismiss,wait); }
  if(document.readyState==='complete') ready();
  else window.addEventListener('load',ready);

  document.addEventListener('click',e=>{
    const a=e.target.closest && e.target.closest('a');
    if(!a) return;
    const href=a.getAttribute('href')||'';
    if(a.target==='_blank'||a.hasAttribute('download')) return;
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0) return;
    if(href.startsWith('http')||href.startsWith('//')||href.startsWith('#')||href.startsWith('mailto')) return;
    if(href==='') return;
    el.style.display='grid';el.classList.remove('out','hide');
  });
  window.addEventListener('pageshow',ev=>{ if(ev.persisted){ el.classList.add('out','hide');el.style.display='none'; }});
}

// site-wide background — soft, slow grayscale waves drifting on black
function mountWaves(){
  if(document.getElementById('waves')) return;
  document.body.insertAdjacentHTML('afterbegin','<canvas id="waves" aria-hidden="true"></canvas>');
  const c=document.getElementById('waves');
  Object.assign(c.style,{position:'fixed',inset:'0',width:'100%',height:'100%',
    zIndex:'-1',pointerEvents:'none'});
  const x=c.getContext('2d');
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dpr,t=0,raf;
  // each layer: amplitude, wavelength, drift speed, vertical position, fill opacities (white)
  const layers=[
    {amp:.085,len:1.75,inc:.0052,yoff:.66,top:.16,mid:.05},
    {amp:.060,len:1.10,inc:.0085,yoff:.73,top:.11,mid:.035},
    {amp:.120,len:2.35,inc:.0036,yoff:.58,top:.085,mid:.028}
  ];
  function resize(){ dpr=Math.min(devicePixelRatio||1,2);
    c.width=innerWidth*dpr; c.height=innerHeight*dpr; x.setTransform(dpr,0,0,dpr,0,0); }
  function wave(L,phase){
    const W=innerWidth,H=innerHeight,baseY=H*L.yoff,amp=H*L.amp,len=W*L.len;
    x.beginPath(); x.moveTo(0,H); x.lineTo(0,baseY);
    for(let px=0;px<=W;px+=10){
      const y=baseY
        + Math.sin(px/len*6.2832 + phase)*amp
        + Math.sin(px/(len*.5)*6.2832 + phase*1.35)*amp*.38;
      x.lineTo(px,y);
    }
    x.lineTo(W,H); x.closePath();
    const g=x.createLinearGradient(0,baseY-amp,0,H);
    g.addColorStop(0,`rgba(255,255,255,${L.top})`);
    g.addColorStop(.5,`rgba(255,255,255,${L.mid})`);
    g.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=g; x.fill();
  }
  function frame(){
    x.clearRect(0,0,innerWidth,innerHeight);
    t+=1;
    for(const L of layers) wave(L, t*L.inc);
    raf=requestAnimationFrame(frame);
  }
  resize();
  if(reduce){ layers.forEach(L=>wave(L, 1.2)); }
  else frame();
  let to; addEventListener('resize',()=>{clearTimeout(to);to=setTimeout(()=>{
    cancelAnimationFrame(raf); resize(); reduce?layers.forEach(L=>wave(L,1.2)):frame();
  },150);});
}
