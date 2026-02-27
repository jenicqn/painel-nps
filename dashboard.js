function formatarDataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function nomeMesAtual() {
  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];
  const hoje = new Date();
  return meses[hoje.getMonth()];
}

async function carregarDashboard() {

  const hoje = new Date();

  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

  const dataInicio = formatarDataLocal(inicioMes);
  const dataFim = formatarDataLocal(inicioProximoMes);

  const query = `
    ${SUPABASE_URL}/rest/v1/feedback_detalhado
    ?select=indicacao,morador
    &created_at=gte.${dataInicio}
    &created_at=lt.${dataFim}
  `.replace(/\s+/g,'');

  const res = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const dados = await res.json();

  atualizarKPIs(dados);

  document.getElementById("mesAtual").textContent = nomeMesAtual();

  carregarRespostasHoje();
}

function calcularNPS(lista) {
  let promotores = 0;
  let detratores = 0;

  lista.forEach(d => {
    if (d.indicacao >= 9) promotores++;
    else if (d.indicacao <= 6) detratores++;
  });

  const total = lista.length;

  return total > 0
    ? Math.round(((promotores - detratores) / total) * 100)
    : 0;
}

function atualizarKPIs(dados) {

  const total = dados.length;

  const npsGeral = calcularNPS(dados);

  const moradores = dados.filter(d => d.morador === "Sim");
  const turistas = dados.filter(d => d.morador === "Não");

  const npsMoradores = calcularNPS(moradores);
  const npsTuristas = calcularNPS(turistas);

  const promotores = dados.filter(d => d.indicacao >= 9).length;
  const neutros = dados.filter(d => d.indicacao >= 7 && d.indicacao <= 8).length;
  const detratores = dados.filter(d => d.indicacao <= 6).length;

  document.getElementById('npsGeral').textContent = npsGeral;
  document.getElementById('npsPromotores').textContent = promotores;
  document.getElementById('npsNeutros').textContent = neutros;
  document.getElementById('npsDetratores').textContent = detratores;
  document.getElementById('totalRespostas').textContent = total;
  document.getElementById('npsMoradores').textContent = npsMoradores;
  document.getElementById('npsTuristas').textContent = npsTuristas;
}

async function carregarRespostasHoje() {

  const hoje = new Date();
  const inicioDia = formatarDataLocal(hoje);

  const proximoDia = new Date(hoje);
  proximoDia.setDate(proximoDia.getDate() + 1);

  const dataFim = formatarDataLocal(proximoDia);

  const query = `
    ${SUPABASE_URL}/rest/v1/feedback_detalhado
    ?select=nome,indicacao,created_at
    &created_at=gte.${inicioDia}
    &created_at=lt.${dataFim}
    &order=created_at.desc
    &limit=5
  `.replace(/\s+/g,'');

  const res = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const dados = await res.json();

  const tbody = document.getElementById("tabelaHoje");
  tbody.innerHTML = "";

  dados.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${r.nome || '-'}</td>
        <td>${r.indicacao}</td>
      </tr>
    `;
  });
}

document.addEventListener("DOMContentLoaded", carregarDashboard);
