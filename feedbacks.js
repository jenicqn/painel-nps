let paginaAtual = 0;
const limite = 20;

fetch("layout.html")
  .then(res => res.text())
  .then(html => {
    document.getElementById("menuLateral").innerHTML = html;
  });

async function carregarFeedbacks() {

  const busca = document.getElementById("buscaNome").value.trim();
  const tipo = document.getElementById("filtroTipo").value;
  const morador = document.getElementById("filtroMorador").value;

  let query = `
    ${SUPABASE_URL}/rest/v1/feedback_detalhado
    ?select=indicacao,nome,sugestao,morador,qualidade,tempo,variedade,custobeneficio,created_at
    &order=created_at.desc
    &limit=${limite}
    &offset=${paginaAtual * limite}
  `.replace(/\s+/g,'');

  if (busca) query += `&nome=ilike.*${busca}*`;

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

  const dados = await res.json();

  renderizarTabela(dados);
}

function renderizarTabela(dados) {

  const tbody = document.getElementById("listaFeedbacks");
  tbody.innerHTML = "";

  dados.forEach(r => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
      <td>${r.nome || '-'}</td>
      <td style="max-width:300px; white-space:normal;">${r.sugestao || '-'}</td>
      <td><span class="badge bg-dark">${r.indicacao}</span></td>
      <td>${r.morador}</td>
      <td>${r.qualidade}</td>
      <td>${r.tempo}</td>
      <td>${r.variedade}</td>
      <td>${r.custobeneficio}</td>
    `;

    tbody.appendChild(tr);
  });
}

function limparFiltros() {
  document.getElementById("buscaNome").value = "";
  document.getElementById("filtroTipo").value = "";
  document.getElementById("filtroMorador").value = "";
  carregarFeedbacks();
}

document.addEventListener("DOMContentLoaded", carregarFeedbacks);
