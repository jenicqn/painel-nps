const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;

let cupons = [];
let utilizados = [];
let paginaCupons = 1;
let paginaUtilizados = 1;
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
  const fim = new Date(ano, mes, 0);
  return { inicio, fim };
}

function formatarData(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatarDataHora(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short"
  });
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

  let dados = await res.json();

  // Separa utilizados para a segunda tabela
  utilizados = dados.filter(c => c.utilizado === true);

  // Aplica filtro de status na tabela principal
  if (status === "utilizado") dados = dados.filter(c => c.utilizado === true);
  if (status === "disponivel") dados = dados.filter(c => !c.utilizado);

  cupons = dados;
  paginaCupons = 1;
  paginaUtilizados = 1;

  atualizarKPIs();
  renderizarTabelaCupons();
  renderizarTabelaUtilizados();
}

/* ================= KPIs ================= */

function atualizarKPIs() {
  const gerados = cupons.length;
  const totalUtilizados = utilizados.length;
  const taxaUso = gerados ? Math.round((totalUtilizados / gerados) * 100) : 0;

  document.getElementById("kpiGerados").textContent = gerados;
  document.getElementById("kpiUtilizados").textContent = totalUtilizados;
  document.getElementById("kpiTaxaUso").textContent = taxaUso + "%";
  document.getElementById("kpiConversao").textContent = taxaUso + "%";
}

/* ================= TABELA CUPONS ================= */

function renderizarTabelaCupons() {
  const tbody = document.getElementById("tabelaCupons");
  tbody.innerHTML = "";

  const inicio = (paginaCupons - 1) * limite;
  const pageDados = [...cupons]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(inicio, inicio + limite);

  if (!pageDados.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nenhum cupom encontrado.</td></tr>';
  } else {
    pageDados.forEach(cupom => {
      tbody.innerHTML += `
        <tr>
          <td>${cupom.codigo}</td>
          <td>${cupom.cliente_nome || "-"}<br><small class="text-muted">${cupom.cliente_telefone || ""}</small></td>
          <td>${cupom.brinde || "-"}</td>
          <td>${formatarData(cupom.valido_ate)}</td>
          <td>${cupom.utilizado
            ? '<span class="badge bg-success">Utilizado</span>'
            : '<span class="badge bg-warning text-dark">Disponível</span>'}</td>
          <td>${cupom.utilizado
            ? '<span class="text-muted">—</span>'
            : `<button class="btn btn-sm btn-danger" onclick="darBaixa('${cupom.codigo}')">Dar baixa</button>`}</td>
        </tr>`;
    });
  }

  renderizarPaginacao("paginacaoCupons", paginaCupons, cupons.length, "paginaCupons");
}

/* ================= TABELA UTILIZADOS ================= */

function renderizarTabelaUtilizados() {
  const tbody = document.getElementById("tabelaUtilizados");
  tbody.innerHTML = "";

  const inicio = (paginaUtilizados - 1) * limite;
  const pageDados = [...utilizados]
    .sort((a, b) => new Date(b.data_utilizado) - new Date(a.data_utilizado))
    .slice(inicio, inicio + limite);

  if (!pageDados.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum cupom utilizado neste mês.</td></tr>';
  } else {
    pageDados.forEach(cupom => {
      tbody.innerHTML += `
        <tr>
          <td>${cupom.codigo}</td>
          <td>${cupom.cliente_nome || "-"}</td>
          <td>${cupom.brinde || "-"}</td>
          <td>${formatarDataHora(cupom.data_utilizado)}</td>
          <td>${formatarData(cupom.valido_ate)}</td>
        </tr>`;
    });
  }

  renderizarPaginacao("paginacaoUtilizados", paginaUtilizados, utilizados.length, "paginaUtilizados");
}

/* ================= PAGINAÇÃO ================= */

function renderizarPaginacao(elementId, paginaAtual, total, variavel) {
  const totalPaginas = Math.ceil(total / limite) || 1;
  const el = document.getElementById(elementId);
  el.innerHTML = `
    <button class="btn btn-sm btn-secondary" ${paginaAtual === 1 ? "disabled" : ""}
      onclick="${variavel}--; ${variavel === 'paginaCupons' ? 'renderizarTabelaCupons()' : 'renderizarTabelaUtilizados()'}">
      Anterior
    </button>
    <span class="small text-muted">Página ${paginaAtual} de ${totalPaginas}</span>
    <button class="btn btn-sm btn-secondary" ${paginaAtual >= totalPaginas ? "disabled" : ""}
      onclick="${variavel}++; ${variavel === 'paginaCupons' ? 'renderizarTabelaCupons()' : 'renderizarTabelaUtilizados()'}">
      Próxima
    </button>`;
}

/* ================= AÇÃO ================= */

async function darBaixa(codigo) {
  if (!confirm("Confirmar baixa neste cupom?")) return;

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
  document.getElementById("btnFiltrar").addEventListener("click", carregarCupons);
});