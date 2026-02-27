let cupons = [];

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
}

/* ================= KPIs ================= */

function atualizarKPIs() {

  const total = cupons.length;
  const utilizados = cupons.filter(c => c.utilizado).length;
  const disponiveis = total - utilizados;

  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiUtilizados").textContent = utilizados;
  document.getElementById("kpiDisponiveis").textContent = disponiveis;
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
