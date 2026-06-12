// shared chrome: nav + footer injected so every page stays in sync
const LOGO = `<img src="/logo.png" alt="depend" width="30" height="30">`;
const LOGO_SM = `<img src="/logo.png" alt="depend" width="24" height="24">`;
const INVITE = 'https://discord.gg/depend';
const NAV = [['Commands','/commands'],['Embeds','/embeds'],['Status','/status'],['Docs','/docs'],['Changelogs','/changelogs'],['Dashboard','/dashboard']];

function mountChrome(active){
  mountSparkles();
  const links = NAV.map(([t,h])=>{
    const on = t.toLowerCase()===active;
    return `<a href="${h}"${on?' class="active"':''}>${t}</a>`;
  }).join('');
  document.body.insertAdjacentHTML('afterbegin',`
    <header class="nav"><div class="nav-bar">
      <a class="brand" href="/"><span class="logo">${LOGO}</span><span class="word">depend</span></a>
      <nav class="nav-pill" id="navlinks">${links}</nav>
      <a href="${INVITE}" class="nav-support">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4a18 18 0 0 0-4.5-1.4l-.2.5a16 16 0 0 1 3.4 1.1A15 15 0 0 0 5.3 4.2a16 16 0 0 1 3.4-1.1l-.2-.5A18 18 0 0 0 4 4C1.7 7.5 1 11 1.2 14.4A18 18 0 0 0 6.6 17l.6-.9c-.6-.2-1.1-.5-1.6-.8l.4-.3a12 12 0 0 0 10 0l.4.3c-.5.3-1 .6-1.6.8l.6.9a18 18 0 0 0 5.4-2.6C23 10.8 22 7 20 4ZM8.4 13.2c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Zm7.2 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Z"/></svg>
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

// site-wide ambient sparkles — soft white dots that drift and twinkle
function mountSparkles(){
  if(document.getElementById('sparkles')) return;
  document.body.insertAdjacentHTML('afterbegin','<canvas id="sparkles" aria-hidden="true"></canvas>');
  const c=document.getElementById('sparkles');
  Object.assign(c.style,{position:'fixed',inset:'0',width:'100%',height:'100%',
    zIndex:'-1',pointerEvents:'none'});
  const x=c.getContext('2d');
  let w,h,stars,raf;
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  function init(){
    w=c.width=innerWidth*devicePixelRatio; h=c.height=innerHeight*devicePixelRatio;
    x.scale(devicePixelRatio,devicePixelRatio);
    const count=Math.min(140,Math.round(innerWidth*innerHeight/12000));
    stars=Array.from({length:count},()=>({
      x:Math.random()*innerWidth, y:Math.random()*innerHeight,
      r:Math.random()*1.3+.35,
      base:Math.random()*.5+.25,            // base brightness
      tw:Math.random()*Math.PI*2,           // twinkle phase
      tws:Math.random()*.025+.008,          // twinkle speed
      vy:Math.random()*.06+.015,            // slow upward drift
      vx:(Math.random()-.5)*.04
    }));
  }
  function frame(){
    x.clearRect(0,0,innerWidth,innerHeight);
    for(const s of stars){
      s.tw+=s.tws;
      const a=s.base+Math.sin(s.tw)*.35;
      x.beginPath();x.arc(s.x,s.y,s.r,0,7);
      x.fillStyle='rgba(255,255,255,'+Math.max(0,a)+')';
      x.shadowColor='rgba(255,255,255,.8)';x.shadowBlur=s.r*2.2;
      x.fill();
      s.y-=s.vy;s.x+=s.vx;
      if(s.y<-3){s.y=innerHeight+3;s.x=Math.random()*innerWidth;}
      if(s.x<-3)s.x=innerWidth+3; if(s.x>innerWidth+3)s.x=-3;
    }
    x.shadowBlur=0;
    raf=requestAnimationFrame(frame);
  }
  init();
  if(reduce){ // draw once, no animation
    for(const s of stars){x.beginPath();x.arc(s.x,s.y,s.r,0,7);
      x.fillStyle='rgba(255,255,255,'+s.base+')';x.fill();}
  } else frame();
  let t;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>{cancelAnimationFrame(raf);init();if(!reduce)frame();},200);});
}
