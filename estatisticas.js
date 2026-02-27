let graficoEvolucao;
let graficoDistribuicao;
let graficoSegmento;

/* ================= UTIL ================= */

function formatarISO(data) {
  return data.toISOString().split("T")[0];
}

function mesAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  document.getElementById("dataInicio").value = formatarISO(inicio);
  document.getElementById("dataFim").value = formatarISO(hoje);
}

function ultimos30Dias() {
  const hoje = new Date();
  const inicio = new Date();
  inicio.setDate(hoje.getDate() - 30);
  document.getElementById("dataInicio").value = formatarISO(inicio);
  document.getElementById("dataFim").value = formatarISO(hoje);
}

/* ================= FETCH ================= */

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

/* ================= KPIs ================= */

function calcularNPS(lista) {
  let promotores = 0;
  let detratores = 0;

  lista.forEach(d => {
    if (d.indicacao >= 9) promotores++;
    else if (d.indicacao <= 6) detratores++;
  });

  const total = lista.length;
  return total ? Math.round(((promotores - detratores) / total) * 100) : 0;
}

function atualizarKPIs(dados) {

  const total = dados.length;
  const nps = calcularNPS(dados);

  const moradores = dados.filter(d =>
    String(d.morador).toLowerCase().includes("sim")
  ).length;

  const mediaQualidade = total
    ? (dados.reduce((s, d) => s + Number(d.qualidade || 0), 0) / total).toFixed(1)
    : 0;

  document.getElementById("kpiNPS").textContent = nps;
  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiMoradores").textContent =
    total ? Math.round((moradores / total) * 100) + "%" : "0%";
  document.getElementById("kpiQualidade").textContent = mediaQualidade;
}

/* ================= GRÁFICOS ================= */

function criarGraficoEvolucao(dados) {

  const grupos = {};
  dados.forEach(d => {
    const dia = d.created_at.split("T")[0];
    if (!grupos[dia]) grupos[dia] = [];
    grupos[dia].push(d);
  });

  const labels = Object.keys(grupos).sort();
  const valores = labels.map(dia => calcularNPS(grupos[dia]));

  if (graficoEvolucao) graficoEvolucao.destroy();

  graficoEvolucao = new Chart(
    document.getElementById("graficoEvolucao"),
    {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: valores,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.15)",
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        scales: { y: { min: 0, max: 100 } },
        plugins: { legend: { display: false } }
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
          data: contagem,
          backgroundColor: contagem.map((_, i) =>
            i >= 9 ? "#16a34a" : i >= 7 ? "#f59e0b" : "#dc2626"
          )
        }]
      },
      options: { plugins: { legend: { display: false } } }
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
          data: [moradores, turistas],
          backgroundColor: ["#2563eb", "#f97316"]
        }]
      }
    }
  );
}

/* ================= NUVEM ================= */

function gerarWordCloud(dados) {

  const container = document.getElementById("wordCloud");
  container.innerHTML = "";

  const stopwords = ["de","da","do","e","para","pra","com","que","mais","muito","uma","um"];

  const contador = {};

  dados.forEach(item => {
    if (!item.sugestao) return;

    const palavras = item.sugestao
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, "")
      .split(" ");

    palavras.forEach(p => {
      if (p.length < 4) return;
      if (stopwords.includes(p)) return;
      contador[p] = (contador[p] || 0) + 1;
    });
  });

  const lista = Object.entries(contador)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 50);

  if (!lista.length) {
    container.innerHTML = "<p class='text-muted'>Sem palavras no período.</p>";
    return;
  }

  WordCloud(container, {
    list: lista,
    gridSize: 6,
    weightFactor: 12,
    backgroundColor: "#ffffff"
  });
}

/* ================= INIT ================= */

async function atualizarGraficos() {
  const dados = await buscarDados();
  atualizarKPIs(dados);
  gerarWordCloud(dados);
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
