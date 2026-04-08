const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_KEY = CONFIG.SUPABASE_ANON_KEY;

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

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

function btnWhatsApp(telefone, msg) {
  const num = telefone?.replace(/\D/g, '');
  if (!num) return '-';
  return `<a href="https://wa.me/55${num}?text=${encodeURIComponent(msg)}" target="_blank" class="btn btn-success btn-sm">Whats</a>`;
}

function inicializar() {
  const h = hoje();

  document.getElementById('tituloRelatorio').innerText =
    `Relatórios — ${h.getFullYear()}`;

  // meses
  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  const selectMes = document.getElementById('anivMes');

  meses.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = m;
    selectMes.appendChild(opt);
  });

  selectMes.value = h.getMonth() + 1;

  const selectAno = document.getElementById('anivAno');

  for (let a = h.getFullYear(); a >= h.getFullYear() - 2; a--) {
    const opt = document.createElement('option');
    opt.value = a;
    opt.textContent = a;
    selectAno.appendChild(opt);
  }

  selectAno.value = h.getFullYear();

  document.getElementById('cuponsDataInicio').value =
    toISO(new Date(h.getFullYear(), h.getMonth(), 1));

  document.getElementById('cuponsDataFim').value =
    toISO(new Date(h.getFullYear(), h.getMonth() + 1, 0));

  carregarAniversariantes();
  carregarCupons();
}

async function carregarAniversariantes() {
  const mes = String(document.getElementById('anivMes').value).padStart(2, '0');

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/feedback_detalhado?select=nome,telefone,data_nascimento&data_nascimento=not.is.null`,
    { headers }
  );

  if (!res.ok) {
    console.error(await res.text());
    return;
  }

  const dados = await res.json();

  const filtrados = dados.filter(d =>
    d.data_nascimento?.slice(5, 7) === mes
  );

  const tbody = document.getElementById('tbody-aniversariantes');
  tbody.innerHTML = '';

  filtrados.forEach(c => {
    const msg = `Feliz aniversário ${c.nome}! 🎂`;

    tbody.innerHTML += `
      <tr>
        <td>${c.nome}</td>
        <td>${c.telefone}</td>
        <td>${formatarData(c.data_nascimento)}</td>
        <td>${btnWhatsApp(c.telefone, msg)}</td>
      </tr>
    `;
  });
}

async function carregarCupons() {
  const ini = document.getElementById('cuponsDataInicio').value;
  const fim = document.getElementById('cuponsDataFim').value;

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/cupons?select=*&valido_ate=gte.${ini}&valido_ate=lte.${fim}&utilizado=is.false`,
    { headers }
  );

  if (!res.ok) {
    console.error(await res.text());
    return;
  }

  const dados = await res.json();

  const tbody = document.getElementById('tbody-cupons');
  tbody.innerHTML = '';

  dados.forEach(c => {
    const msg = `Seu cupom vence em breve: ${c.codigo}`;

    tbody.innerHTML += `
      <tr>
        <td>${c.cliente_nome}</td>
        <td>${c.cliente_telefone}</td>
        <td>${c.codigo}</td>
        <td>${formatarData(c.valido_ate)}</td>
        <td>${btnWhatsApp(c.cliente_telefone, msg)}</td>
      </tr>
    `;
  });
}

function exportarPDF() {
  html2pdf().from(document.querySelector('.conteudo')).save();
}

function exportarExcel() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,
    XLSX.utils.table_to_sheet(document.querySelector('#tbody-cupons').closest('table')),
    'Cupons'
  );
  XLSX.writeFile(wb, 'relatorio.xlsx');
}

document.addEventListener('DOMContentLoaded', inicializar);