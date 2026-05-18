/**
 * Global styles for CapaCity
 * Export this as CSS string to inject into the app
 */

export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;600;700;800;900&family=Barlow:wght@300;400;500;600&family=IBM+Plex+Mono:wght@300;400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --bg:#070708;--bg2:#0f0f11;--bg3:#161618;--bg4:#1e1e21;
  --border:rgba(255,255,255,0.07);--border2:rgba(255,255,255,0.12);
  --amber:#E8A020;--amber2:#F5B942;--amber-dim:rgba(232,160,32,0.1);
  --amber-dim2:rgba(232,160,32,0.18);
  --green:#22C55E;--red:#EF4444;--blue:#3B82F6;--purple:#A855F7;--orange:#F97316;
  --white:#F2EDE4;--white2:#B9AEA0;--white3:#A89F93;
  --cond:'Barlow Condensed',sans-serif;
  --body:'Barlow',sans-serif;
  --mono:'IBM Plex Mono',monospace;
}

body{background:var(--bg);color:var(--white);font-family:var(--body);overflow-x:hidden}

::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:var(--bg2)}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:rgba(232,160,32,0.4)}

input,textarea,select{background:var(--bg3);border:1px solid var(--border);color:var(--white);font-family:var(--body);font-size:14px;padding:10px 14px;outline:none;transition:border-color .2s;width:100%;border-radius:0}
input:focus,textarea:focus,select:focus{border-color:rgba(232,160,32,0.5)}
input::placeholder,textarea::placeholder{color:var(--white3)}
select option{background:var(--bg3)}

button{cursor:pointer;font-family:var(--body)}

.grid-overlay{position:fixed;inset:0;background-image:linear-gradient(rgba(232,160,32,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(232,160,32,0.025) 1px,transparent 1px);background-size:50px 50px;pointer-events:none;z-index:0}

.ticker-wrap{background:var(--amber);overflow:hidden;padding:9px 0}
.ticker{display:flex;animation:ticker 50s linear infinite;white-space:nowrap}
.ticker-item{font-family:var(--mono);font-size:10px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--bg);padding:0 32px;display:flex;align-items:center;gap:12px}
.ticker-item::after{content:'◆'}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}

.fadeup{animation:fadeup .7s ease both}
@keyframes fadeup{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

.pulse{animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

@keyframes skeleton-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

/* Light theme */
[data-theme="light"]{
  --bg:#FAFAF7;--bg2:#FFFFFF;--bg3:#F1EFEA;--bg4:#E5E2DA;
  --border:rgba(0,0,0,0.07);--border2:rgba(0,0,0,0.14);
  --white:#1A1816;--white2:#5A5650;--white3:#6F675F;
}
[data-theme="light"] body{background:var(--bg);color:var(--white)}
[data-theme="light"] input,[data-theme="light"] textarea,[data-theme="light"] select{background:var(--bg2);color:var(--white)}

/* Accessibility — focus visible em todos os elementos interativos */
button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{
  outline:2px solid var(--amber);
  outline-offset:2px;
}

/* Reduce motion */
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
}

/* Skip link para acessibilidade */
.skip-link{position:absolute;top:-40px;left:0;background:var(--amber);color:var(--bg);padding:8px 16px;z-index:9999;text-decoration:none;font-family:var(--cond);text-transform:uppercase;letter-spacing:.08em}
.skip-link:focus{top:0}

/* Print stylesheet — contratos, recibos, NF */
@media print{
  /* Reset para fundo branco / tinta preta */
  *,*::before,*::after{
    background:white!important;
    color:black!important;
    box-shadow:none!important;
    text-shadow:none!important;
  }
  body{font-family:Georgia,'Times New Roman',serif;font-size:11pt;line-height:1.5}

  /* Esconder navegação, botões, sidebar */
  nav,header,aside,.sidebar,.header,.no-print,
  button:not(.print-keep),.btn:not(.print-keep){
    display:none!important;
  }

  /* Quebra de página */
  h1,h2,h3{page-break-after:avoid}
  table,pre,blockquote{page-break-inside:avoid}
  .page-break{page-break-before:always}

  /* Links — mostrar URL após o texto */
  a[href^="http"]::after{
    content:" (" attr(href) ")";
    font-size:9pt;
    color:#555!important;
  }
  a[href^="#"]::after,a[href^="mailto:"]::after{content:""}

  /* Margens generosas para furação/arquivo */
  @page{
    margin:2cm 1.8cm;
    size:A4 portrait;
  }

  /* Reforçar bordas em tabelas */
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #999!important;padding:6px 10px}
  th{background:#f0f0f0!important;font-weight:bold}

  /* Cabeçalho/rodapé com info da CapaCity */
  .print-header{
    position:fixed;top:0;left:0;right:0;
    border-bottom:2px solid black;
    padding:4mm 0;
    font-size:9pt;
  }
  .print-footer{
    position:fixed;bottom:0;left:0;right:0;
    border-top:1px solid #999;
    padding:3mm 0;
    font-size:8pt;
    text-align:center;
    color:#666!important;
  }
}

.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
.modal-box{background:var(--bg2);border:1px solid var(--border2);max-width:580px;width:90%;max-height:90vh;overflow-y:auto;position:relative}

.notif-panel{position:fixed;top:56px;right:0;width:380px;height:calc(100vh - 56px);background:var(--bg2);border-left:1px solid var(--border);z-index:150;display:flex;flex-direction:column;transform:translateX(100%);transition:transform .3s ease}
.notif-panel.open{transform:translateX(0)}

.score-bar{background:rgba(255,255,255,.06);height:6px;position:relative;border-radius:0}
.score-fill{position:absolute;left:0;top:0;bottom:0;transition:width 1.2s cubic-bezier(.4,0,.2,1)}

.risk-glow-low{box-shadow:0 0 0 1px rgba(34,197,94,.25)}
.risk-glow-med{box-shadow:0 0 0 1px rgba(249,115,22,.25)}
.risk-glow-high{box-shadow:0 0 0 1px rgba(239,68,68,.25)}
.risk-glow-crit{box-shadow:0 0 0 2px rgba(239,68,68,.5)}

.seg-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border)}
.seg-item{background:var(--bg);padding:24px 20px;cursor:pointer;transition:background .2s}
.seg-item:hover{background:var(--amber-dim2)}

.tab-bar{display:flex;border-bottom:1px solid var(--border);margin-bottom:20px}
.tab-btn{padding:10px 20px;background:transparent;border:none;border-bottom:2px solid transparent;cursor:pointer;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--white3);transition:all .2s}
.tab-btn.active{color:var(--amber);border-bottom-color:var(--amber)}
`;
