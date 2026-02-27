let cupons = [];
let graficoCupons;

/* ================= UTIL ================= */

function mesAtualPadrao() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  document.getElementById("filtroMes").value = `${ano}-${mes}`;
}

function calcularInicioFimMes(mesSelecionado) {
  const [ano, mes] = mesSelecionado.split("-");
  const inicio = `${ano}-${mes}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${ano}-${mes}-${ultimoDia}`;
  return { inicio, fim };
}

/* ================= FETCH ================= */

async function carregarCupons() {

  const mesSelecionado = document.getElementById("filtroMes").value;
  const status = document.getElementById("filtroStatus").value;

  let query = `${SUPABASE_URL}/rest/v1/cupons?select=*`;

  if (mesSelecionado) {
    const { inicio, fim } = calcularInicioFimMes(mesSelecionado);
    query += `&created_at=gte.${inicio}&created_at=lte.${fim}`;
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

  const conversao = taxaUso; // mesma lógica no mês filtrado

  document.getElementById("kpiGerados").textContent = gerados;
  document.getElementById("kpiUtilizados").textContent = utilizados;
  document.getElementById("kpiTaxaUso").textContent = taxaUso + "%";
  document.getElementById("kpiConversao").textContent = conversao + "%";
}

/* ================= TABELA ================= */

function renderizarTabela() {

  const tbody = document.getElementById("tabelaCupons");
  tbody.innerHTML = "";

  cupons
    .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
    .forEach(cupom => {

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
}

/* ================= GRÁFICO ================= */

function criarGrafico() {

  const geradosPorDia = {};
  const usadosPorDia = {};

  cupons.forEach(c => {
    const dia = c.created_at.split("T")[0];

    geradosPorDia[dia] = (geradosPorDia[dia] || 0) + 1;

    if (c.utilizado) {
      const diaUso = c.data_utilizado
        ? c.data_utilizado.split("T")[0]
        : dia;

      usadosPorDia[diaUso] = (usadosPorDia[diaUso] || 0) + 1;
    }
  });

  const labels = Object.keys(geradosPorDia).sort();

  const gerados = labels.map(d => geradosPorDia[d] || 0);
  const usados = labels.map(d => usadosPorDia[d] || 0);

  if (graficoCupons) graficoCupons.destroy();

  graficoCupons = new Chart(
    document.getElementById("graficoCupons"),
    {
      type: "line",
      data: {
        labels,
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
