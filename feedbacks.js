let pagina = 1;
const limite = 10;
let dadosAtuais = [];

function formatarData(data) {
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataISO(data) {
  return data.toISOString().split("T")[0];
}

function mesAtualPadrao() {
  const hoje = new Date();

  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

  document.getElementById("dataInicio").value = formatarDataISO(inicio);
  document.getElementById("dataFim").value = formatarDataISO(fim);
}

async function aplicarFiltro() {

  const nomeInput = document.getElementById("buscarNome");
  const moradorInput = document.getElementById("filtroMorador");
  const dataInicioInput = document.getElementById("dataInicio");
  const dataFimInput = document.getElementById("dataFim");

  if (!nomeInput || !moradorInput || !dataInicioInput || !dataFimInput) {
    console.error("Elementos de filtro não encontrados.");
    return;
  }

  const nome = nomeInput.value.trim().toLowerCase();
  const morador = moradorInput.value;
  const dataInicio = dataInicioInput.value;
  const dataFim = dataFimInput.value;

  let query = `
    ${SUPABASE_URL}/rest/v1/feedback_detalhado
    ?select=*
    &order=created_at.desc
  `.replace(/\s+/g,'');

  if (dataInicio) query += `&created_at=gte.${dataInicio}`;
  if (dataFim) query += `&created_at=lt.${dataFim}`;

  const res = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  let dados = await res.json();

  if (nome)
    dados = dados.filter(d => d.nome?.toLowerCase().includes(nome));

  if (morador)
    dados = dados.filter(d =>
      String(d.morador).toLowerCase().includes(morador)
    );

  dadosAtuais = dados;
  pagina = 1;

  atualizarResumo(dados);
  renderizarTabela();
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

function atualizarResumo(dados) {

  const total = dados.length;

  const moradores = dados.filter(d =>
    String(d.morador).toLowerCase().includes("morador")
  );

  const mediaNPS = total
    ? (dados.reduce((s, d) => s + Number(d.indicacao || 0), 0) / total).toFixed(1)
    : 0;

  const mediaQualidade = total
    ? (dados.reduce((s, d) => s + Number(d.qualidade || 0), 0) / total).toFixed(1)
    : 0;

  const nps = calcularNPS(dados);

  document.getElementById("totalFiltrado").textContent = total;
  document.getElementById("percentMoradores").textContent =
    total ? Math.round((moradores.length / total) * 100) + "%" : "0%";

  document.getElementById("mediaNPS").textContent = mediaNPS;
  document.getElementById("mediaQualidade").textContent = mediaQualidade;
  document.getElementById("npsResumo").textContent = nps;
}

function renderizarTabela() {

  const tbody = document.getElementById("tabelaFeedbacks");
  if (!tbody) return;

  const inicio = (pagina - 1) * limite;
  const fim = inicio + limite;

  const dadosPagina = dadosAtuais.slice(inicio, fim);

  tbody.innerHTML = "";

  dadosPagina.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${formatarData(r.created_at)}</td>
        <td>${r.nome || "-"}</td>
        <td>${r.indicacao}</td>
        <td>${r.morador}</td>
        <td>${r.sugestao || "-"}</td>
        <td>${r.qualidade}</td>
        <td>${r.tempo}</td>
        <td>${r.variedade}</td>
        <td>${r.custobeneficio}</td>
      </tr>
    `;
  });

  document.getElementById("paginaAtual").textContent = pagina;
}

function proximaPagina() {
  if (pagina * limite < dadosAtuais.length) {
    pagina++;
    renderizarTabela();
  }
}

function paginaAnterior() {
  if (pagina > 1) {
    pagina--;
    renderizarTabela();
  }
}

function exportarCSV() {

  const linhas = [
    ["Data","Nome","NPS","Morador","Sugestão"]
  ];

  dadosAtuais.forEach(r => {
    linhas.push([
      formatarData(r.created_at),
      r.nome,
      r.indicacao,
      r.morador,
      r.sugestao
    ]);
  });

  const csv = linhas.map(l => l.join(";")).join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "feedbacks.csv";
  link.click();
}

function limparFiltro() {
  document.getElementById("buscarNome").value = "";
  document.getElementById("filtroMorador").value = "";
  mesAtualPadrao();
  aplicarFiltro();
}

document.addEventListener("DOMContentLoaded", () => {
  mesAtualPadrao();
  aplicarFiltro();
});
