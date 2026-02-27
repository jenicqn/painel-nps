let pagina = 1;
const limite = 10;
let dadosAtuais = [];
let colunaOrdenacao = "created_at";
let direcaoOrdenacao = "desc";

/* =========================
   UTILITÁRIOS
========================= */

function formatarData(data) {
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataISO(data) {
  return data.toISOString().split("T")[0];
}

function mesAtualPadrao() {

  const hoje = new Date();

  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

  document.getElementById("dataInicio").value = formatarDataISO(inicio);
  document.getElementById("dataFim").value = formatarDataISO(fim);
}

/* =========================
   FILTRO
========================= */

async function aplicarFiltro() {

  const nome = document.getElementById("buscarNome").value.trim().toLowerCase();
  const morador = document.getElementById("filtroMorador").value;
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

  let dados = await res.json();

  if (nome)
    dados = dados.filter(d => d.nome?.toLowerCase().includes(nome));

  if (morador)
    dados = dados.filter(d => String(d.morador).toLowerCase() === morador);

  dadosAtuais = dados;

  ordenarDados();
  pagina = 1;

  atualizarResumo(dados);
  renderizarTabela();
}

/* =========================
   ORDENAÇÃO
========================= */

function ordenar(coluna) {

  if (colunaOrdenacao === coluna) {
    direcaoOrdenacao = direcaoOrdenacao === "asc" ? "desc" : "asc";
  } else {
    colunaOrdenacao = coluna;
    direcaoOrdenacao = "desc";
  }

  ordenarDados();
  renderizarTabela();
}

function ordenarDados() {

  dadosAtuais.sort((a, b) => {

    let valorA = a[colunaOrdenacao];
    let valorB = b[colunaOrdenacao];

    if (colunaOrdenacao === "created_at") {
      valorA = new Date(valorA);
      valorB = new Date(valorB);
    }

    if (typeof valorA === "string") valorA = valorA.toLowerCase();
    if (typeof valorB === "string") valorB = valorB.toLowerCase();

    if (valorA > valorB) return direcaoOrdenacao === "asc" ? 1 : -1;
    if (valorA < valorB) return direcaoOrdenacao === "asc" ? -1 : 1;
    return 0;
  });
}

/* =========================
   RESUMO
========================= */

function badgeNPS(valor) {
  if (valor >= 9) return `<span class="badge bg-success">${valor}</span>`;
  if (valor >= 7) return `<span class="badge bg-warning text-dark">${valor}</span>`;
  return `<span class="badge bg-danger">${valor}</span>`;
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
    String(d.morador).toLowerCase() === "sim"
  );

  const mediaNPS = total
    ? (dados.reduce((s, d) => s + Number(d.indicacao || 0), 0) / total).toFixed(1)
    : 0;

  const mediaQualidade = total
    ? (dados.reduce((s, d) => s + Number(d.qualidade || 0), 0) / total).toFixed(1)
    : 0;

  const nps = calcularNPS(dados);

  document.getElementById("resumoLinha").innerHTML =
    `Total: <strong>${total}</strong> |
     Moradores: <strong>${Math.round((moradores.length / total) * 100 || 0)}%</strong> |
     NPS: <strong>${nps}</strong> |
     Média NPS: <strong>${mediaNPS}</strong> |
     Média Qualidade: <strong>${mediaQualidade}</strong>`;
}

/* =========================
   TABELA
========================= */

function renderizarTabela() {

  const tbody = document.getElementById("tabelaFeedbacks");

  const inicio = (pagina - 1) * limite;
  const fim = inicio + limite;

  const dadosPagina = dadosAtuais.slice(inicio, fim);

  tbody.innerHTML = "";

  dadosPagina.forEach(r => {
    tbody.innerHTML += `
      <tr>
        <td>${formatarData(r.created_at)}</td>
        <td>${r.nome || "-"}</td>
        <td>${badgeNPS(r.indicacao)}</td>
        <td>${r.morador}</td>
        <td>${r.sugestao || "-"}</td>
        <td>${r.qualidade}</td>
        <td>${r.tempo}</td>
        <td>${r.variedade}</td>
        <td>${r.custobeneficio}</td>
      </tr>
    `;
  });

  const totalPaginas = Math.ceil(dadosAtuais.length / limite);

  document.getElementById("paginaAtual").textContent =
    `Página ${pagina} de ${totalPaginas || 1}`;

  document.querySelector(".btnAnterior").disabled = pagina === 1;
  document.querySelector(".btnProxima").disabled = pagina === totalPaginas || totalPaginas === 0;
}

/* =========================
   PAGINAÇÃO
========================= */

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

/* =========================
   EXPORTAR CSV
========================= */

function exportarCSV() {

  if (!dadosAtuais.length) {
    alert("Nenhum dado para exportar.");
    return;
  }

  const cabecalho = [
    "Data","Nome","Indicacao","Morador","Sugestao",
    "Qualidade","Tempo","Variedade","CustoBeneficio"
  ];

  const linhas = dadosAtuais.map(r => [
    formatarData(r.created_at),
    r.nome || "",
    r.indicacao || "",
    r.morador || "",
    (r.sugestao || "").replace(/(\r\n|\n|\r)/gm, " "),
    r.qualidade || "",
    r.tempo || "",
    r.variedade || "",
    r.custobeneficio || ""
  ]);

  const csvConteudo =
    [cabecalho, ...linhas]
      .map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

  const blob = new Blob([csvConteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "feedbacks.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* =========================
   INICIALIZAÇÃO
========================= */

document.addEventListener("DOMContentLoaded", () => {

  mesAtualPadrao();
  aplicarFiltro();

  document.getElementById("btnFiltrar")
    .addEventListener("click", aplicarFiltro);

  document.getElementById("btnExportar")
    .addEventListener("click", exportarCSV);

  document.querySelector(".btnAnterior")
    .addEventListener("click", paginaAnterior);

  document.querySelector(".btnProxima")
    .addEventListener("click", proximaPagina);

});
