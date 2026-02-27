let filtroTipoAtual = null;
let filtroMoradorAtual = null;
let graficoComparativo = null;

fetch("layout.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("menuLateral").innerHTML = html;
  });

async function carregarPainel(dataInicio = null, dataFim = null, tipo = null, morador = null) {
  try {

    let query = `
      ${SUPABASE_URL}/rest/v1/feedback_detalhado
      ?select=indicacao,nome,sugestao,morador,qualidade,tempo,variedade,custobeneficio,created_at
      &order=created_at.desc
    `.replace(/\s+/g,'');

    if (dataInicio) query += `&created_at=gte.${dataInicio}T00:00:00`;
    if (dataFim) query += `&created_at=lte.${dataFim}T23:59:59`;

    if (tipo === "promotores") query += `&indicacao=gte.9`;
    if (tipo === "neutros") query += `&indicacao=gte.7&indicacao=lte.8`;
    if (tipo === "detratores") query += `&indicacao=lte.6`;

    if (morador) query += `&morador=eq.${morador}`;

    const res = await fetch(query, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!res.ok) throw new Error("Erro ao buscar dados");

    const dados = await res.json();

    atualizarKPIs(dados);
    preencherTabela(dados);

  } catch (err) {
    console.error(err);
  }
}

function calcularNPS(lista) {
  let promotores = 0;
  let neutros = 0;
  let detratores = 0;

  lista.forEach(d => {
    if (d.indicacao >= 9) promotores++;
    else if (d.indicacao >= 7) neutros++;
    else detratores++;
  });

  const total = lista.length;

  return total > 0
    ? Math.round(((promotores - detratores) / total) * 100)
    : 0;
}

function atualizarGrafico(npsMoradores, npsTuristas) {

  const ctx = document.getElementById('graficoMoradorTurista').getContext('2d');

  if (graficoComparativo) {
    graficoComparativo.destroy();
  }

  graficoComparativo = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Moradores', 'Turistas'],
      datasets: [{
        label: 'NPS',
        data: [npsMoradores, npsTuristas]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          min: -100,
          max: 100
        }
      }
    }
  });
}

function atualizarKPIs(dados) {

  const total = dados.length;

  const npsGeral = calcularNPS(dados);

  const moradores = dados.filter(d => d.morador === "Sim");
  const turistas = dados.filter(d => d.morador === "Não");

  const npsMoradores = calcularNPS(moradores);
  const npsTuristas = calcularNPS(turistas);

  let promotores = dados.filter(d => d.indicacao >= 9).length;
  let neutros = dados.filter(d => d.indicacao >= 7 && d.indicacao <= 8).length;
  let detratores = dados.filter(d => d.indicacao <= 6).length;

  document.getElementById('npsGeral').textContent = npsGeral;
  document.getElementById('npsPromotores').textContent = promotores;
  document.getElementById('npsNeutros').textContent = neutros;
  document.getElementById('npsDetratores').textContent = detratores;
  document.getElementById('totalRespostas').textContent = total;

  document.getElementById('npsMoradores').textContent = npsMoradores;
  document.getElementById('npsTuristas').textContent = npsTuristas;

  atualizarGrafico(npsMoradores, npsTuristas);
}

function preencherTabela(dados) {
  const tbody = document.getElementById('ultimasRespostas');
  tbody.innerHTML = "";

  const badgeNota = (valor) => {
    if (valor === null || valor === undefined) return "-";
    const numero = Number(valor);
    if (numero >= 9) return `<span class="badge badge-5">${numero}</span>`;
    if (numero >= 7) return `<span class="badge badge-4">${numero}</span>`;
    return `<span class="badge badge-3">${numero}</span>`;
  };

  const badgeInterno = (valor) => {
    if (valor === null || valor === undefined) return "-";
    const numero = Number(valor);
    if (numero >= 5) return `<span class="badge badge-5">${numero}</span>`;
    if (numero === 4) return `<span class="badge badge-4">${numero}</span>`;
    return `<span class="badge badge-3">${numero}</span>`;
  };

  dados.slice(0, 20).forEach(r => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
      <td>${r.nome || '-'}</td>
      <td>${r.sugestao || '-'}</td>
      <td>${badgeNota(r.indicacao)}</td>
      <td>${r.morador || '-'}</td>
      <td>${badgeInterno(r.qualidade)}</td>
      <td>${badgeInterno(r.tempo)}</td>
      <td>${badgeInterno(r.variedade)}</td>
      <td>${badgeInterno(r.custobeneficio)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function filtrarTipo(tipo, botao) {
  filtroTipoAtual = tipo;

  document.querySelectorAll("#filtrosTipo button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (botao) botao.classList.add("active");

  aplicarFiltro();
}

function filtrarMorador(valor, botao) {
  filtroMoradorAtual = valor;

  document.querySelectorAll("#filtrosMorador button").forEach(btn => {
    btn.classList.remove("active");
  });

  if (botao) botao.classList.add("active");

  aplicarFiltro();
}

function aplicarFiltro() {
  carregarPainel(
    document.getElementById('dataInicio').value || null,
    document.getElementById('dataFim').value || null,
    filtroTipoAtual,
    filtroMoradorAtual
  );
}

function limparFiltro() {
  document.getElementById('dataInicio').value = "";
  document.getElementById('dataFim').value = "";
  filtroTipoAtual = null;
  filtroMoradorAtual = null;
  filtroMesAtual();
}

function filtroMesAtual() {
  const hoje = new Date();
  const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  const formatar = (data) => data.toISOString().split("T")[0];

  const inicio = formatar(primeiro);
  const fim = formatar(ultimo);

  document.getElementById("dataInicio").value = inicio;
  document.getElementById("dataFim").value = fim;

  carregarPainel(inicio, fim, filtroTipoAtual, filtroMoradorAtual);
}

document.addEventListener("DOMContentLoaded", () => {
  filtroMesAtual();
});
