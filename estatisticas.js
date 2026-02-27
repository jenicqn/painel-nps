let graficoEvolucao;
let graficoDistribuicao;
let graficoSegmento;

/* ========================
   UTIL
======================== */

function formatarISO(data) {
  return data.toISOString().split("T")[0];
}

function mesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date();

  document.getElementById("dataInicio").value = formatarISO(inicio);
  document.getElementById("dataFim").value = formatarISO(fim);
}

function ultimos30Dias() {
  const hoje = new Date();
  const inicio = new Date();
  inicio.setDate(hoje.getDate() - 30);

  document.getElementById("dataInicio").value = formatarISO(inicio);
  document.getElementById("dataFim").value = formatarISO(hoje);
}

/* ========================
   FETCH DADOS
======================== */

async function buscarDados() {

  const dataInicio = document.getElementById("dataInicio").value;
  const dataFim = document.getElementById("dataFim").value;

  let query = `${SUPABASE_URL}/rest/v1/feedback_detalhado?select=*`;

  if (dataInicio) query += `&created_at=gte.${dataInicio}`;
  if (dataFim) query += `&created_at=lte.${dataFim}`;

  const res = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  return await res.json();
}

/* ========================
   PROCESSAMENTO
======================== */

function calcularNPS(lista) {

  let promotores = 0;
  let detratores = 0;

  lista.forEach(d => {
    if (d.indicacao >= 9) promotores++;
    else if (d.indicacao <= 6) detratores++;
  });

  const total = lista.length;

  return total > 0
    ? ((promotores - detratores) / total) * 100
    : 0;
}

function agruparPorDia(lista) {

  const grupos = {};

  lista.forEach(d => {
    const dia = d.created_at.split("T")[0];

    if (!grupos[dia]) grupos[dia] = [];
    grupos[dia].push(d);
  });

  return grupos;
}

/* ========================
   GRÁFICOS
======================== */

function criarGraficoEvolucao(dados) {

  const grupos = agruparPorDia(dados);

  const labels = Object.keys(grupos).sort();
  const valores = labels.map(dia =>
    calcularNPS(grupos[dia])
  );

  if (graficoEvolucao) graficoEvolucao.destroy();

  graficoEvolucao = new Chart(
    document.getElementById("graficoEvolucao"),
    {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "NPS",
          data: valores,
          borderWidth: 2,
          tension: 0.3
        }]
      }
    }
  );
}

function criarDistribuicao(dados) {

  const contagem = Array(11).fill(0);

  dados.forEach(d => {
    const nota = Number(d.indicacao);
    if (!isNaN(nota)) contagem[nota]++;
  });

  if (graficoDistribuicao) graficoDistribuicao.destroy();

  graficoDistribuicao = new Chart(
    document.getElementById("graficoDistribuicao"),
    {
      type: "bar",
      data: {
        labels: ["0","1","2","3","4","5","6","7","8","9","10"],
        datasets: [{
          label: "Quantidade",
          data: contagem
        }]
      }
    }
  );
}

function criarSegmento(dados) {

  let moradores = 0;
  let turistas = 0;

  dados.forEach(d => {
    const valor = String(d.morador || "").toLowerCase();

    if (valor.includes("sim")) moradores++;
    else turistas++;
  });

  if (graficoSegmento) graficoSegmento.destroy();

  graficoSegmento = new Chart(
    document.getElementById("graficoSegmento"),
    {
      type: "pie",
      data: {
        labels: ["Moradores", "Turistas"],
        datasets: [{
          data: [moradores, turistas]
        }]
      }
    }
  );
}

/* ========================
   INICIALIZAÇÃO
======================== */

async function atualizarGraficos() {
  const dados = await buscarDados();
  criarGraficoEvolucao(dados);
  criarDistribuicao(dados);
  criarSegmento(dados);
}

document.addEventListener("DOMContentLoaded", () => {

  mesAtual();
  atualizarGraficos();

  document.getElementById("btnAplicar")
    .addEventListener("click", atualizarGraficos);

  document.getElementById("btnMesAtual")
    .addEventListener("click", () => {
      mesAtual();
      atualizarGraficos();
    });

  document.getElementById("btn30Dias")
    .addEventListener("click", () => {
      ultimos30Dias();
      atualizarGraficos();
    });

});
