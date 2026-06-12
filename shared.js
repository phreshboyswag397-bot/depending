// shared chrome: nav + footer injected so every page stays in sync
const LOGO = `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="6.4" y="3.8" width="2.6" height="7.6" rx="1.3"/><rect x="15.0" y="3.8" width="2.6" height="7.6" rx="1.3"/><path fill-rule="evenodd" d="M4.5 11.6a4.8 4.8 0 0 1 4.8-4.8h5.4a4.8 4.8 0 0 1 4.8 4.8v3a4.8 4.8 0 0 1-4.8 4.8h-5.4a4.8 4.8 0 0 1-4.8-4.8zM7.4 12a2.1 2.1 0 0 1 2.1-2.1h5a2.1 2.1 0 0 1 2.1 2.1v2.5a2.1 2.1 0 0 1-2.1 2.1h-5a2.1 2.1 0 0 1-2.1-2.1z"/><path d="M11.15 11.4 11.15 14.6 8 15.2 8 13.7Z"/><path d="M12.85 11.4 12.85 14.6 16 15.2 16 13.7Z"/></svg>`;
const INVITE = 'https://discord.gg/depend';
const NAV = [['Commands','/commands'],['Embeds','/embeds'],['Status','/status'],['Docs','/docs'],['Changelogs','/changelogs'],['Dashboard','/dashboard']];

function mountChrome(active){
  const links = NAV.map(([t,h])=>{
    const on = t.toLowerCase()===active;
    return `<a href="${h}"${on?' class="active"':''}>${t}</a>`;
  }).join('');
  document.body.insertAdjacentHTML('afterbegin',`
    <header class="nav"><div class="nav-inner">
      <a class="brand" href="/"><span class="logo">${LOGO}</span><span class="word">depend</span></a>
      <nav class="nav-pill" id="navlinks">${links}</nav>
      <a href="${INVITE}" class="nav-support">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4a18 18 0 0 0-4.5-1.4l-.2.5a16 16 0 0 1 3.4 1.1A15 15 0 0 0 5.3 4.2a16 16 0 0 1 3.4-1.1l-.2-.5A18 18 0 0 0 4 4C1.7 7.5 1 11 1.2 14.4A18 18 0 0 0 6.6 17l.6-.9c-.6-.2-1.1-.5-1.6-.8l.4-.3a12 12 0 0 0 10 0l.4.3c-.5.3-1 .6-1.6.8l.6.9a18 18 0 0 0 5.4-2.6C23 10.8 22 7 20 4ZM8.4 13.2c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Zm7.2 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8Z"/></svg>
        support</a>
      <button class="nav-toggle" id="navtoggle" aria-label="Menu">☰</button>
    </div></header>`);
  const tgl=document.getElementById('navtoggle');
  if(tgl) tgl.onclick=()=>document.getElementById('navlinks').classList.toggle('open');

  document.body.insertAdjacentHTML('beforeend',`
    <footer class="ft"><div class="wrap ft-inner">
      <div class="ft-left"><span class="logo">${LOGO}</span><span>© ${new Date().getFullYear()} depend</span></div>
      <div class="ft-links">
        <a href="/commands">Commands</a><a href="/docs">Docs</a><a href="/status">Status</a>
        <a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="${INVITE}">Support</a>
      </div>
    </div></footer>`);
}
function fmt(n){return (n??0).toLocaleString('en-US');}
