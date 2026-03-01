const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;

async function carregarPesquisas() {

  const res = await fetch(`${SUPABASE_URL}/rest/v1/pesquisas?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const dados = await res.json();

  if (!Array.isArray(dados)) {
    console.error("Erro:", dados);
    return;
  }

  const tbody = document.getElementById("tabelaPesquisas");
  tbody.innerHTML = "";

  dados.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.slug}</td>
      <td><span class="badge ${p.status === 'Ativo' ? 'bg-success' : 'bg-secondary'}">${p.status}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="visualizarPesquisa('${p.id}')">👁</button>
        <button class="btn btn-sm btn-warning" onclick="editarPesquisa('${p.id}', '${p.nome}', '${p.slug}', '${p.status}')">✏</button>
        <button class="btn btn-sm btn-danger" onclick="excluirPesquisa('${p.id}')">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function visualizarPesquisa(id) {

  const perguntasRes = await fetch(
    `${SUPABASE_URL}/rest/v1/perguntas?pesquisa_id=eq.${id}&order=ordem.asc`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  const perguntas = await perguntasRes.json();

  let html = "";

  perguntas.forEach(p => {
    html += `
      <div class="mb-3">
        <strong>${p.texto}</strong><br>
        <small>Tipo: ${p.tipo} | Obrigatória: ${p.obrigatoria ? "Sim" : "Não"}</small>
      </div>
    `;
  });

  document.getElementById("previewContent").innerHTML = html;
  new bootstrap.Modal(document.getElementById("modalPreview")).show();
}

function abrirModalNova() {
  document.getElementById("pesquisaId").value = "";
  document.getElementById("nomePesquisa").value = "";
  document.getElementById("slugPesquisa").value = "";
  document.getElementById("statusPesquisa").value = "Ativo";
  new bootstrap.Modal(document.getElementById("modalPesquisa")).show();
}

function editarPesquisa(id, nome, slug, status) {
  document.getElementById("pesquisaId").value = id;
  document.getElementById("nomePesquisa").value = nome;
  document.getElementById("slugPesquisa").value = slug;
  document.getElementById("statusPesquisa").value = status;
  new bootstrap.Modal(document.getElementById("modalPesquisa")).show();
}

async function salvarPesquisa() {

  const id = document.getElementById("pesquisaId").value;
  const nome = document.getElementById("nomePesquisa").value;
  const slug = document.getElementById("slugPesquisa").value;
  const status = document.getElementById("statusPesquisa").value;

  const payload = { nome, slug, status };

  if (id) {
    await fetch(`${SUPABASE_URL}/rest/v1/pesquisas?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch(`${SUPABASE_URL}/rest/v1/pesquisas`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  bootstrap.Modal.getInstance(document.getElementById("modalPesquisa")).hide();
  carregarPesquisas();
}

async function excluirPesquisa(id) {

  if (!confirm("Deseja realmente excluir esta pesquisa?")) return;

  await fetch(`${SUPABASE_URL}/rest/v1/pesquisas?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  carregarPesquisas();
}

document.addEventListener("DOMContentLoaded", carregarPesquisas);