// assets/js/sessao-inativa.js

const TEMPO_MAXIMO_INATIVIDADE = 15 * 60 * 1000; // 15 minutos
let tempoUltimaAtividade = Date.now();

// Atualiza o tempo sempre que houver alguma interação
function atualizarAtividade() {
  tempoUltimaAtividade = Date.now();
}

// Eventos que contam como atividade
['click', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evento => {
  window.addEventListener(evento, atualizarAtividade);
});

// Verifica a cada 30 segundos se a sessão deve expirar
setInterval(() => {
  if (Date.now() - tempoUltimaAtividade > TEMPO_MAXIMO_INATIVIDADE) {
    alert('Sessão expirada por inatividade.');
    if (typeof logout === 'function') logout(); // usa a função de logout já existente
  }
}, 30000);
