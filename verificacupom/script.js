// ====== Config Supabase ======
const SUPABASE_URL = 'https://leezpmpmqkiocvvpcwqa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZXpwbXBtcWtpb2N2dnBjd3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI2NTUsImV4cCI6MjA4NzUyODY1NX0.M-TpjLCmwA6jyUFXG33o-L8O_1o84Ap4GM9vtxAa4KQ';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

// ====== DOM ======
const form = document.getElementById('formCupom');
const inputCodigo = document.getElementById('codigo');
const spinner = document.getElementById('spinner');
const btnText = document.getElementById('btnText');
const resultado = document.getElementById('resultado');
const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusCupom');
const linhaUso = document.getElementById('linhaUso');
const dataUso = document.getElementById('dataUso');
const elNome = document.getElementById('nomeCliente');
const elTel = document.getElementById('telefoneCliente'); // pode não existir no HTML
const elBrinde = document.getElementById('brindeCupom');
const elValidade = document.getElementById('validadeCupom');
const btnBaixar = document.getElementById('btnBaixar');

// ====== Helpers ======
function setLoading(state){
  if(state){ spinner?.classList.remove('hidden'); btnText.textContent = 'Verificando...'; }
  else{ spinner?.classList.add('hidden'); btnText.textContent = 'Verificar'; }
}
function resetResultado(){
  resultado?.classList.remove('hidden');
  if (statusPill) statusPill.className = 'status-pill status-neutral';
  if (statusText) statusText.textContent = '—';
  linhaUso?.classList.add('hidden');
  if (dataUso) dataUso.textContent = '—';
  if (elNome) elNome.textContent = '—';
  if (elTel) elTel.textContent = '—';
  if (elBrinde) elBrinde.textContent = '—';
  if (elValidade) elValidade.textContent = '—';
  btnBaixar?.classList.add('hidden');
}
function fmtDate(d){
  if(!d) return '—';

  return new Date(d).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short'
  });
}
function fmtOnlyDate(d){
  if(!d) return '—';

  return new Date(d).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo'
  });
}
function sanitizeCode(v){
  return String(v || '')
    .toUpperCase()
    .replace(/\s+/g,'')
    .replace(/[^\w-]/g, '')
    .trim();
}
function setStatus(type, text){
  if (statusPill) {
    statusPill.className = 'status-pill ' + (
      type === 'ok' ? 'status-ok' :
      type === 'warn' ? 'status-warn' :
      type === 'bad' ? 'status-bad' : 'status-neutral'
    );
    statusPill.classList.remove('pulse'); void statusPill.offsetWidth; statusPill.classList.add('pulse');
  }
  if (statusText) statusText.textContent = text;
  if(type === 'ok') playSuccess();
  else if(type === 'bad') playError();
  else if(type === 'warn') playWarn();
}
let audioCtx;
function ensureAudio(){ if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
function beep(freq=440, dur=120, vol=0.2){
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  o.type = 'sine'; o.frequency.value = freq; g.gain.value = vol;
  o.start(); setTimeout(()=>{ o.stop(); }, dur);
}
function playSuccess(){ beep(660, 90, 0.18); setTimeout(()=>beep(880, 120, 0.2), 100); }
function playError(){ beep(300, 140, 0.22); setTimeout(()=>beep(200, 160, 0.22), 120); }
function playWarn(){ beep(520, 120, 0.18); }

// Mostra só o primeiro nome, capitalizado
function primeiroNome(nomeCompleto){
  if(!nomeCompleto) return '—';
  const primeiro = String(nomeCompleto).trim().split(/\s+/)[0] || '—';
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
}

// ====== Lógica Principal ======

// Verificação reutilizável
async function verificarCodigo(codigo) {
  const cod = sanitizeCode(codigo);
  if(!cod){
    inputCodigo?.classList.add('shake');
    setTimeout(()=>inputCodigo?.classList.remove('shake'), 350);
    return;
  }

  setLoading(true);
  resetResultado();

  try{
    const url = `${SUPABASE_URL}/rest/v1/cupons?select=*&codigo=eq.${encodeURIComponent(cod)}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Falha ao consultar (${res.status})`);
    const data = await res.json();

    if(!Array.isArray(data) || data.length === 0){
      setStatus('bad', 'Cupom não encontrado');
      return;
    }

    const cupom = data[0];
    preencherDados(cupom);
  }catch(err){
    console.error(err);
    setStatus('bad', 'Erro ao consultar. Tente novamente.');
  }finally{
    setLoading(false);
  }
}

// Evento SUBMIT
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  verificarCodigo(inputCodigo?.value);
});

// Força maiúsculas e remove espaços
inputCodigo?.addEventListener('input', () => {
  inputCodigo.value = sanitizeCode(inputCodigo.value);
});

// Verificação automática via ?codigo=SMASH-AB12
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const codigoDaUrl = urlParams.get('codigo');
  if (codigoDaUrl) {
    const codigoLimpo = sanitizeCode(codigoDaUrl);
    if (inputCodigo) inputCodigo.value = codigoLimpo;
    verificarCodigo(codigoLimpo);
  }
});

function preencherDados(cupom){
  if (elNome) elNome.textContent = primeiroNome(cupom.cliente_nome);
  if (elTel)  elTel.textContent  = cupom.cliente_telefone || '—';
  if (elBrinde) elBrinde.textContent = cupom.brinde || '—';
  if (elValidade) elValidade.textContent = fmtOnlyDate(cupom.valido_ate);

  // Zera horas para comparar validade por dia
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const validade = cupom.valido_ate ? new Date(cupom.valido_ate) : null;

  if (cupom.utilizado){
    const quando = cupom.data_utilizado ? fmtDate(cupom.data_utilizado) : '(sem registro)';
    linhaUso?.classList.remove('hidden');
    if (dataUso) dataUso.textContent = quando;
    setStatus('warn', `Já utilizado em ${quando}`);
    btnBaixar?.classList.add('hidden');
    return;
  }

  if (validade && validade < hoje){
    setStatus('bad', 'Expirado');
    btnBaixar?.classList.add('hidden');
    return;
  }

  // Válido
  setStatus('ok', 'Válido');
  btnBaixar?.classList.remove('hidden');
  if (btnBaixar) btnBaixar.onclick = () => darBaixa(cupom.codigo);
}

async function darBaixa(codigo){
  if(!confirm('Confirmar baixa neste cupom?')) return;
  const cod = encodeURIComponent(sanitizeCode(codigo));
  setLoading(true);
  try{
    // PATCH condicional: só baixa se ainda NÃO estiver utilizado
    const url = `${SUPABASE_URL}/rest/v1/cupons?codigo=eq.${cod}&usado=is.false&select=codigo,utilizado,data_utilizado`;
    const res = await fetch(url, {
      method:'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ utilizado: true, data_utilizado: new Date().toISOString() })
    });

    if(!res.ok) throw new Error(`Falha ao dar baixa (${res.status})`);

    const retorno = await res.json();
    if (!Array.isArray(retorno) || retorno.length === 0){
      // Nada atualizado: provavelmente já usado em condição de corrida
      setStatus('warn', 'Cupom já estava utilizado.');
      btnBaixar?.classList.add('hidden');
      return;
    }

    setStatus('ok', 'Cupom validado e baixado com sucesso!');
    btnBaixar?.classList.add('hidden');

    // Rebusca para refletir data de utilização
    const r2 = await fetch(`${SUPABASE_URL}/rest/v1/cupons?select=*&codigo=eq.${cod}`, { headers });
    const d2 = await r2.json();
    if(Array.isArray(d2) && d2[0]){
      linhaUso?.classList.remove('hidden');
      if (dataUso) dataUso.textContent = fmtDate(d2[0].data_utilizado);
    }
  }catch(e){
    console.error(e);
    setStatus('bad', 'Erro ao dar baixa. Tente novamente.');
  }finally{
    setLoading(false);
    // Foco para próxima leitura/scanner
    inputCodigo?.focus();
    inputCodigo?.select();
  }
}
