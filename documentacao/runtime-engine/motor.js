/* Moldura e peças comuns das cinco opções. Cada arquivo de opção traz só a própria lógica. */
var $=function(s,r){return (r||document).querySelector(s)};
var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
function esc(s){return String(s).replace(/[<>&"]/g,function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]})}

/* glifos das peças do motor */
var G={
  inicio:'<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  fim:'<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="3"/>',
  usuario:'<circle cx="8" cy="5.4" r="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.8 14c0-2.9 2.3-4.8 5.2-4.8s5.2 1.9 5.2 4.8" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  servico:'<circle cx="8" cy="8" r="2.3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 1.2v2.3M8 12.5v2.3M1.2 8h2.3M12.5 8h2.3M3.2 3.2l1.6 1.6M11.2 11.2l1.6 1.6M12.8 3.2l-1.6 1.6M4.8 11.2l-1.6 1.6" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  desvio:'<path d="M8 1.4 14.6 8 8 14.6 1.4 8Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="currentColor" stroke-width="1.5"/>',
  paralelo:'<path d="M8 1.4 14.6 8 8 14.6 1.4 8Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.4v7.2M4.4 8h7.2" stroke="currentColor" stroke-width="1.6"/>',
  timer:'<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.4V8l2.6 1.7" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  mensagem:'<rect x="1.4" y="3.6" width="13.2" height="9" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.2 4.6 8 9.1l5.8-4.5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
  erro:'<path d="M8 1.8 15 14.2H1Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 6.4v3.1" stroke="currentColor" stroke-width="1.7"/><circle cx="8" cy="11.7" r=".95" fill="currentColor"/>',
  topico:'<path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" stroke-width="1.7" fill="none"/>'
};
function gl(t){return '<span class="gl"><svg viewBox="0 0 16 16" aria-hidden="true">'+(G[t]||G.inicio)+'</svg></span>'}

/* situações de uma execução */
var SIT={
  andando:{c:'info',t:'andando'},
  pessoa:{c:'warn',t:'esperando uma pessoa'},
  fila:{c:'',t:'trabalho publicado'},
  rodando:{c:'info',t:'serviço executando'},
  tempo:{c:'warn',t:'esperando o prazo'},
  aviso:{c:'warn',t:'esperando um aviso'},
  erro:{c:'err',t:'falhou, vai tentar de novo'},
  incidente:{c:'err',t:'travada, precisa de gente'},
  fim:{c:'ok',t:'concluída'},
  none:{c:'mute',t:'ainda não existe'}
};

var OPCOES=[
  {n:1,f:'opcao-1.html',t:'Sala de controle'},
  {n:2,f:'opcao-2.html',t:'Bancada de peças'},
  {n:3,f:'opcao-3.html',t:'Uma execução que encontra tudo'},
  {n:4,f:'opcao-4.html',t:'Por que ela parou'},
  {n:5,f:'opcao-5.html',t:'A fila de trabalho'}
];

var LOGO='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 195 72" fill="currentColor" aria-hidden="true"><path d="M23.3761 61.4297H26.5561C27.0861 61.4297 29.1472 61.1549 30.266 59.0938L43.4176 35.7743C44.7721 33.301 43.1821 31.2006 41.7688 30.6903L38.2748 29.1199C36.3904 28.2759 34.133 29.1592 33.2693 31.1417L25.0054 47.7481H24.8876L16.6433 31.1417C15.7992 29.1788 13.5222 28.2759 11.6575 29.1199L8.16346 30.6903C6.75015 31.2006 5.16018 33.301 6.5146 35.7743L19.6858 59.0938C20.8047 61.1549 22.8462 61.4297 23.3761 61.4297Z"/><path d="M81.204 61.4297H84.3839C84.9139 61.4297 86.975 61.1549 88.0939 59.0938L101.265 35.7743C102.62 33.301 101.03 31.2006 99.6163 30.6903L96.1223 29.1199C94.2378 28.2759 91.9805 29.1592 91.1364 31.1417L82.8725 47.7481H82.7547L74.4908 31.1417C73.6467 29.1788 71.3697 28.2759 69.5049 29.1199L66.0109 30.6903C64.5976 31.2006 63.0077 33.301 64.3621 35.7743L77.5137 59.0938C78.6129 61.1549 80.674 61.4297 81.204 61.4297Z"/><path d="M119.815 28.904C110.746 28.904 103.385 36.265 103.385 45.3337C103.385 54.4024 110.746 61.7634 119.815 61.7634C128.884 61.7634 136.244 54.4024 136.244 45.3337C136.244 36.265 128.903 28.904 119.815 28.904ZM119.815 51.8114C116.242 51.8114 113.337 48.9062 113.337 45.3337C113.337 41.7612 116.242 38.8561 119.815 38.8561C123.387 38.8561 126.292 41.7612 126.292 45.3337C126.312 48.9062 123.407 51.8114 119.815 51.8114Z"/><path d="M60.3184 19.5603C60.3184 23.1132 57.4329 25.9987 53.88 25.9987C50.3271 25.9987 47.4416 23.1132 47.4416 19.5603C47.4416 16.0074 50.3271 13.1219 53.88 13.1219C57.4329 13.1219 60.3184 16.0074 60.3184 19.5603Z"/><path d="M48.2661 33.2226C48.2661 31.0241 50.0327 29.2574 52.2312 29.2574H55.5485C57.747 29.2574 59.5136 31.0241 59.5136 33.2226V57.4647C59.5136 59.6632 57.7274 61.4298 55.5485 61.4298H52.2312C50.0327 61.4298 48.2661 59.6632 48.2661 57.4647V33.2226Z"/><path d="M178.919 19.5409C178.919 21.5627 178.192 24.7427 175.974 26.9608C175.189 27.746 174.502 28.2171 173.952 28.5704C172.912 29.2574 172.146 29.7285 172.559 30.867C172.971 31.9859 174.266 31.6326 175.503 31.3577C175.896 31.2596 183.61 29.4144 183.708 29.4144C185.769 29.0219 187.771 30.337 188.262 32.3588C188.262 32.3588 188.871 34.9499 188.89 34.9695C189.381 36.9913 188.184 39.0721 186.162 39.6609C186.083 39.7002 177.662 41.722 177.643 41.722C176.053 42.1342 175.11 42.9194 175.11 44.4701C175.11 45.1571 175.503 45.903 175.994 46.5312C175.994 46.5312 185.141 57.8769 185.18 57.9554C186.417 59.6632 186.103 62.0187 184.493 63.3338C184.493 63.3338 182.432 65.0023 182.413 65.0219C180.803 66.3371 178.408 66.1604 177.014 64.5901C176.936 64.5312 171.263 57.5432 170.655 56.7973C170.046 56.0514 169.3 54.9325 168.24 54.9325C167.18 54.9325 166.434 56.0514 165.826 56.7973C165.217 57.5432 159.544 64.5116 159.466 64.5901C158.053 66.1604 155.677 66.3371 154.068 65.0219C154.048 65.0023 151.987 63.3338 151.987 63.3338C150.378 62.0187 150.044 59.6435 151.3 57.9554C151.339 57.8769 160.487 46.5312 160.487 46.5312C160.977 45.903 161.37 45.1571 161.37 44.4701C161.37 42.9194 160.428 42.1342 158.838 41.722C158.818 41.722 150.397 39.7002 150.319 39.6609C148.297 39.0721 147.119 36.9913 147.59 34.9695C147.59 34.9499 148.218 32.3785 148.218 32.3588C148.709 30.337 150.711 29.0219 152.772 29.4144C152.87 29.4144 160.565 31.2596 160.977 31.3577C162.214 31.6326 163.51 31.9859 163.922 30.867C164.354 29.7285 163.588 29.2574 162.528 28.5704C161.978 28.2171 161.311 27.746 160.526 26.9608C158.288 24.723 157.562 21.5627 157.562 19.5409C157.562 13.7307 162.41 9 168.24 9C174.07 9 178.919 13.711 178.919 19.5409Z"/></svg>';

/* monta cabeçalho, seletor de tema e navegação entre as opções */
(function(){
  var op=+(document.body.dataset.op||0);
  var atual=OPCOES.filter(function(o){return o.n===op})[0];
  var sub=atual?('Opção '+op+' · '+atual.t):'Onboarding · o motor por dentro';

  var mast=$('[data-masthead]');
  if(mast){
    mast.className='masthead';
    mast.innerHTML='<div class="lockup">'+LOGO+'<span class="rule"></span>'+
      '<span>ELASTIC JOURNEY<small>'+sub+'</small></span></div>'+
      '<div class="mast-actions"><div class="switch" role="group" aria-label="Tema">'+
        '<button type="button" data-tema="light">Claro</button>'+
        '<button type="button" data-tema="dark">Escuro</button>'+
        '<button type="button" data-tema="graphite">Grafite</button>'+
      '</div></div>';
    var marca=function(){
      var t=document.documentElement.getAttribute('data-theme');
      $$('[data-tema]').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.tema===t))});
    };
    $$('[data-tema]',mast).forEach(function(b){
      b.onclick=function(){
        document.documentElement.setAttribute('data-theme',b.dataset.tema);
        try{localStorage.setItem('motor-tema',b.dataset.tema)}catch(e){}
        marca();
      };
    });
    marca();
  }

  var nav=$('[data-nav]');
  if(nav){
    nav.className='nav';
    nav.innerHTML='<a class="voltar" href="opcoes.html">Todas as opções</a>'+
      '<div class="ops">'+OPCOES.map(function(o){
        return '<a href="'+o.f+'" aria-current="'+(o.n===op)+'"><i>'+o.n+'</i>'+o.t+'</a>';
      }).join('')+'</div>';
  }
})();
