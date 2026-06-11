// shared chrome: nav + footer injected so every page stays in sync
const LOGO = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="6.4" y="3.8" width="2.6" height="7.6" rx="1.3"/><rect x="15.0" y="3.8" width="2.6" height="7.6" rx="1.3"/><path fill-rule="evenodd" d="M4.5 11.6a4.8 4.8 0 0 1 4.8-4.8h5.4a4.8 4.8 0 0 1 4.8 4.8v3a4.8 4.8 0 0 1-4.8 4.8h-5.4a4.8 4.8 0 0 1-4.8-4.8zM7.4 12a2.1 2.1 0 0 1 2.1-2.1h5a2.1 2.1 0 0 1 2.1 2.1v2.5a2.1 2.1 0 0 1-2.1 2.1h-5a2.1 2.1 0 0 1-2.1-2.1z"/><path d="M11.15 11.4 11.15 14.6 8 15.2 8 13.7Z"/><path d="M12.85 11.4 12.85 14.6 16 15.2 16 13.7Z"/></svg>`;
const INVITE = 'https://discord.gg/depend';
const NAV = [
  ['Home','/'],['Commands','/commands'],['Servers','/#servers'],
  ['Embeds','/embeds'],['Status','/status'],['Docs','/docs'],['Changelogs','/changelogs']
];

function mountChrome(active){
  const links = NAV.map(([t,h])=>{
    const on = (active==='home'&&t==='Home')||t.toLowerCase()===active;
    return `<a href="${h}"${on?' class="active"':''}>${t}</a>`;
  }).join('');
  document.body.insertAdjacentHTML('afterbegin',`
    <div class="glow"></div><div class="grid-bg"></div>
    <header class="nav"><div class="nav-inner">
      <a class="brand" href="/"><span class="logo">${LOGO}</span>depend</a>
      <nav class="nav-links" id="navlinks">${links}
        <a href="${INVITE}" class="nav-cta" style="display:none" id="m-invite">Add to server</a>
      </nav>
      <a href="${INVITE}" class="nav-cta">Add to server</a>
      <button class="nav-toggle" id="navtoggle" aria-label="Menu">☰</button>
    </div></header>`);
  const tgl=document.getElementById('navtoggle');
  if(tgl) tgl.onclick=()=>{
    const n=document.getElementById('navlinks');
    n.classList.toggle('open');
    document.getElementById('m-invite').style.display=n.classList.contains('open')?'flex':'none';
  };
  document.body.insertAdjacentHTML('beforeend',`
    <footer class="ft"><div class="wrap ft-inner">
      <a class="brand" href="/"><span class="logo">${LOGO}</span>depend</a>
      <div class="ft-links">
        <a href="/commands">Commands</a><a href="/docs">Docs</a>
        <a href="/status">Status</a><a href="${INVITE}">Support</a>
      </div>
      <span class="muted">© ${new Date().getFullYear()} depend · built by @tearybf</span>
    </div></footer>`);
}
function fmt(n){return (n??0).toLocaleString('en-US');}