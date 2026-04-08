const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_KEY = CONFIG.SUPABASE_ANON_KEY;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

const LIMITE = 20;

let anivDados = [];
let cuponsDados = [];

let paginaAniv = 1;
let paginaCupons = 1;

// ================= UTIL =================
function hoje() {
  return new Date();
}

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function formatarData(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function btnWhats(telefone, msg) {
  const num = telefone?.replace(/\D/g, '');
  if (!num) return '-';

  return `
    <a href="https://wa.me/55${num}?text=${encodeURIComponent(msg)}"
       target="_blank"
       class="btn btn-success btn-sm">
       <i class="bi bi-whatsapp"></i>
    </a>`;
}

// ================= INIT =================
function inicializar() {
  const h = hoje();

  document.getElementById('tituloRelatorio').innerText =
    `Relatórios — ${h.getFullYear()}`;

  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const selectMes = document.getElementById('anivMes');

  // cria meses se não existir
  if (selectMes.options.length === 0) {
    meses.forEach((m, i) => {
      const opt = document.createElement('option');
      opt.value = i + 1;
      opt.textContent = m;
      selectMes.appendChild(opt);
    });
  }

  // seta mês atual
  selectMes.value = h.getMonth() + 1;

  // evento automático ao trocar mês
  selectMes.addEventListener('change', carregarAniversariantes);

  // datas cupons
  const inicio = new Date(h.getFullYear(), h.getMonth(), 1);
  const fim = new Date(h.getFullYear(), h.getMonth() + 1, 0);

  document.getElementById('cuponsDataInicio').value = toISO(inicio);
  document.getElementById('cuponsDataFim').value = toISO(fim);

  carregarAniversariantes();
  carregarCupons();
}

// ================= ANIVERSARIANTES =================
async function carregarAniversariantes() {
  const mes = String(document.getElementById('anivMes').value).padStart(2, '0');

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/feedback_detalhado?select=nome,telefone,data_nascimento&data_nascimento=not.is.null`,
    { headers }
  );

  if (!res.ok) {
    console.error("Erro aniversariantes:", await res.text());
    return;
  }

  const dados = await res.json();

  console.log("MES:", mes);
  console.log("TOTAL REGISTROS:", dados.length);

  anivDados = dados.filter(d => {
    if (!d.data_nascimento) return false;
    return d.data_nascimento.slice(5, 7) === mes;
  });

  paginaAniv = 1;
  renderizarAniv();
}

function renderizarAniv() {
  const inicio = (paginaAniv - 1) * LIMITE;
  const fim = inicio + LIMITE;

  const pagina = anivDados.slice(inicio, fim);

  const tbody = document.getElementById('tbody-aniversariantes');
  tbody.innerHTML = '';

  if (!pagina.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">Nenhum encontrado</td></tr>`;
    return;
  }

  pagina.forEach(c => {
    const msg = `Feliz aniversário ${c.nome}! 🎂`;

    tbody.innerHTML += `
      <tr>
        <td>${c.nome}</td>
        <td>${c.telefone}</td>
        <td>${formatarData(c.data_nascimento)}</td>
        <td>${btnWhats(c.telefone, msg)}</td>
      </tr>`;
  });
}

// ================= CUPONS =================
async function carregarCupons() {
  const ini = document.getElementById('cuponsDataInicio').value;
  const fim = document.getElementById('cuponsDataFim').value;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cupons?select=*&valido_ate=gte.${ini}&valido_ate=lte.${fim}&utilizado=is.false&order=valido_ate.asc`,
    { headers }
  );

  if (!res.ok) {
    console.error("Erro cupons:", await res.text());
    return;
  }

  cuponsDados = await res.json();

  paginaCupons = 1;
  renderizarCupons();
}

function renderizarCupons() {
  const inicio = (paginaCupons - 1) * LIMITE;
  const fim = inicio + LIMITE;

  const pagina = cuponsDados.slice(inicio, fim);

  const tbody = document.getElementById('tbody-cupons');
  tbody.innerHTML = '';

  pagina.forEach(c => {
    const msg = `Seu cupom vence em breve: ${c.codigo}`;

    tbody.innerHTML += `
      <tr>
        <td>${c.cliente_nome}</td>
        <td>${c.cliente_telefone}</td>
        <td>${c.codigo}</td>
        <td>${formatarData(c.valido_ate)}</td>
        <td>${btnWhats(c.cliente_telefone, msg)}</td>
      </tr>`;
  });
}

// ================= PAGINAÇÃO =================
function proxAniv() {
  if ((paginaAniv * LIMITE) < anivDados.length) {
    paginaAniv++;
    renderizarAniv();
  }
}

function prevAniv() {
  if (paginaAniv > 1) {
    paginaAniv--;
    renderizarAniv();
  }
}

function proxCupons() {
  if ((paginaCupons * LIMITE) < cuponsDados.length) {
    paginaCupons++;
    renderizarCupons();
  }
}

function prevCupons() {
  if (paginaCupons > 1) {
    paginaCupons--;
    renderizarCupons();
  }
}

// ================= EXPORT =================
function exportarPDF() {
  html2pdf().from(document.querySelector('.conteudo')).save();
}

function exportarExcel() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.table_to_sheet(document.querySelector('#tbody-cupons').closest('table')),
    'Cupons'
  );
  XLSX.writeFile(wb, 'relatorio.xlsx');
}

document.addEventListener('DOMContentLoaded', inicializar);