let cupons = [];
let graficoCupons;
let pagina = 1;
const limite = 10;

/* ================= UTIL ================= */

function mesAtualPadrao() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  document.getElementById("filtroMes").value = `${ano}-${mes}`;
}

function calcularInicioFimMes(mesSelecionado) {
  const [ano, mes] = mesSelecionado.split("-");
  const inicio = new Date(`${ano}-${mes}-01`);
  const ultimoDia = new Date(ano, mes, 0);
  return { inicio, fim: ultimoDia };
}

/* ================= FETCH ================= */

async function carregarCupons() {

  const mesSelecionado = document.getElementById("filtroMes").value;
  const status = document.getElementById("filtroStatus").value;

  let query = `${SUPABASE_URL}/rest/v1/cupons?select=*`;

  if (mesSelecionado) {
    const { inicio, fim } = calcularInicioFimMes(mesSelecionado);
    query += `&created_at=gte.${inicio.toISOString()}&created_at=lte.${fim.toISOString()}`;
  }

  const res = await fetch(query, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  cupons = await res.json();

  if (status === "utilizado")
    cupons = cupons.filter(c => c.utilizado === true);

  if (status === "disponivel")
    cupons = cupons.filter(c => !c.utilizado);

  pagina = 1;

  atualizarKPIs();
  renderizarTabela();
  criarGrafico();
}

/* ================= KPIs ================= */

function atualizarKPIs() {

  const gerados = cupons.length;
  const utilizados = cupons.filter(c => c.utilizado).length;

  const taxaUso = gerados
    ? Math.round((utilizados / gerados) * 100)
    : 0;

  document.getElementById("kpiGerados").textContent = gerados;
  document.getElementById("kpiUtilizados").textContent = utilizados;
  document.getElementById("kpiTaxaUso").textContent = taxaUso + "%";
  document.getElementById("kpiConversao").textContent = taxaUso + "%";
}

/* ================= PAGINAÇÃO ================= */

function renderizarTabela() {

  const tbody = document.getElementById("tabelaCupons");
  tbody.innerHTML = "";

  const inicio = (pagina - 1) * limite;
  const fim = inicio + limite;

  const dadosPagina = cupons
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(inicio, fim);

  dadosPagina.forEach(cupom => {

    const validade = cupom.valido_ate
      ? new Date(cupom.valido_ate).toLocaleDateString("pt-BR")
      : "-";

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${cupom.codigo}</td>
      <td>${cupom.cliente_nome || "-"}<br><small>${cupom.cliente_telefone || ""}</small></td>
      <td>${cupom.brinde || "-"}</td>
      <td>${validade}</td>
      <td>
        ${cupom.utilizado
          ? '<span class="badge bg-success">Utilizado</span>'
          : '<span class="badge bg-warning text-dark">Disponível</span>'}
      </td>
      <td>
        ${cupom.utilizado
          ? '<span class="text-muted">—</span>'
          : `<button class="btn btn-sm btn-danger" onclick="darBaixa('${cupom.codigo}')">Dar baixa</button>`}
      </td>
    `;

    tbody.appendChild(tr);
  });

  atualizarControlesPaginacao();
}

function atualizarControlesPaginacao() {

  const totalPaginas = Math.ceil(cupons.length / limite);

  let controles = document.getElementById("paginacao");

  if (!controles) {
    controles = document.createElement("div");
    controles.id = "paginacao";
    controles.className = "d-flex justify-content-between mt-3";
    document.querySelector(".table").parentNode.appendChild(controles);
  }

  controles.innerHTML = `
    <button class="btn btn-secondary" ${pagina === 1 ? "disabled" : ""} onclick="paginaAnterior()">Anterior</button>
    <span>Página ${pagina} de ${totalPaginas || 1}</span>
    <button class="btn btn-secondary" ${pagina === totalPaginas ? "disabled" : ""} onclick="proximaPagina()">Próxima</button>
  `;
}

function proximaPagina() {
  if (pagina * limite < cupons.length) {
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

/* ================= GRÁFICO CORRIGIDO ================= */

function criarGrafico() {

  const mesSelecionado = document.getElementById("filtroMes").value;
  if (!mesSelecionado) return;

  const { inicio, fim } = calcularInicioFimMes(mesSelecionado);

  const dias = [];
  const gerados = [];
  const usados = [];

  let dataAtual = new Date(inicio);

  while (dataAtual <= fim) {
    const diaStr = dataAtual.toISOString().split("T")[0];
    dias.push(diaStr);

    const geradosDia = cupons.filter(c =>
      c.created_at?.startsWith(diaStr)
    ).length;

    const usadosDia = cupons.filter(c =>
      c.data_utilizado?.startsWith(diaStr)
    ).length;

    gerados.push(geradosDia);
    usados.push(usadosDia);

    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  if (graficoCupons) graficoCupons.destroy();

  graficoCupons = new Chart(
    document.getElementById("graficoCupons"),
    {
      type: "line",
      data: {
        labels: dias,
        datasets: [
          {
            label: "Gerados",
            data: gerados,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,0.15)",
            fill: true,
            tension: 0.3
          },
          {
            label: "Utilizados",
            data: usados,
            borderColor: "#16a34a",
            backgroundColor: "rgba(22,163,74,0.15)",
            fill: true,
            tension: 0.3
          }
        ]
      }
    }
  );
}

/* ================= AÇÃO ================= */

async function darBaixa(codigo) {

  await fetch(`${SUPABASE_URL}/rest/v1/cupons?codigo=eq.${codigo}`, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      utilizado: true,
      data_utilizado: new Date().toISOString()
    })
  });

  carregarCupons();
}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
  mesAtualPadrao();
  carregarCupons();
  document.getElementById("btnFiltrar")
    .addEventListener("click", carregarCupons);
});
