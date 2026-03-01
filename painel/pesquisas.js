/* ===================================================== */
/* CONFIG                                                */
/* ===================================================== */

const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;


/* ===================================================== */
/* CRUD PESQUISAS                                       */
/* ===================================================== */

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
      <td>
        <span class="badge ${p.status === 'Ativo' ? 'bg-success' : 'bg-secondary'}">
          ${p.status}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-primary"
          onclick="visualizarPesquisa('${p.id}')">👁</button>

        <button class="btn btn-sm btn-dark"
          onclick="gerenciarPerguntas('${p.id}')">⚙</button>

        <button class="btn btn-sm btn-warning"
          onclick="editarPesquisa('${p.id}', '${p.nome}', '${p.slug}', '${p.status}')">✏</button>

        <button class="btn btn-sm btn-danger"
          onclick="excluirPesquisa('${p.id}')">🗑</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function visualizarPesquisa(id) {

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/perguntas?pesquisa_id=eq.${id}&order=ordem.asc`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  const perguntas = await res.json();

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

  const method = id ? "PATCH" : "POST";
  const url = id
    ? `${SUPABASE_URL}/rest/v1/pesquisas?id=eq.${id}`
    : `${SUPABASE_URL}/rest/v1/pesquisas`;

  await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

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


/* ===================================================== */
/* GERENCIAMENTO DE PERGUNTAS                            */
/* ===================================================== */

let pesquisaPerguntasAtual = null;

async function gerenciarPerguntas(pesquisaId) {

  pesquisaPerguntasAtual = pesquisaId;
  document.getElementById("pesquisaPerguntasId").value = pesquisaId;

  await carregarPerguntas();

  new bootstrap.Modal(document.getElementById("modalPerguntas")).show();
}

async function carregarPerguntas() {

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/perguntas?pesquisa_id=eq.${pesquisaPerguntasAtual}&order=ordem.asc`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );

  const perguntas = await res.json();

  const tbody = document.getElementById("tabelaPerguntas");
  tbody.innerHTML = "";

  perguntas.forEach(p => {

    const tr = document.createElement("tr");
    tr.setAttribute("data-id", p.id);

    tr.innerHTML = `
      <td>${p.texto}</td>
      <td>${p.tipo}</td>
      <td>${p.obrigatoria ? "Sim" : "Não"}</td>
      <td>${p.ordem}</td>
      <td>
        <button class="btn btn-sm btn-warning"
          onclick="editarPergunta('${p.id}', '${p.texto}', '${p.tipo}', ${p.obrigatoria}, ${p.ordem})">
          ✏
        </button>
        <button class="btn btn-sm btn-danger"
          onclick="excluirPergunta('${p.id}')">
          🗑
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  ativarDragDrop();
  renderPreview(perguntas);
}


/* ===================================================== */
/* DRAG AND DROP                                         */
/* ===================================================== */

function ativarDragDrop() {

  const tbody = document.getElementById("tabelaPerguntas");

  new Sortable(tbody, {
    animation: 150,
    onEnd: async function () {

      const linhas = tbody.querySelectorAll("tr");

      for (let i = 0; i < linhas.length; i++) {

        const id = linhas[i].getAttribute("data-id");

        await fetch(`${SUPABASE_URL}/rest/v1/perguntas?id=eq.${id}`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ ordem: i + 1 })
        });
      }

      carregarPerguntas();
    }
  });
}


/* ===================================================== */
/* PREVIEW DINÂMICO                                      */
/* ===================================================== */

function renderPreview(perguntas) {

  const preview = document.getElementById("previewPerguntas");
  preview.innerHTML = "";

  perguntas.forEach(p => {

    let html = `<div class="mb-3">
                  <label class="form-label">${p.texto}</label>`;

    if (p.tipo === "texto") {
      html += `<input class="form-control" disabled>`;
    }

    if (p.tipo === "textarea") {
      html += `<textarea class="form-control" disabled></textarea>`;
    }

    if (p.tipo === "escala_0_10") {
      html += `<div>`;
      for (let i = 0; i <= 10; i++) {
        html += `<span class="badge bg-secondary me-1">${i}</span>`;
      }
      html += `</div>`;
    }

    if (p.tipo === "escala_1_5") {
      html += `<div>`;
      for (let i = 1; i <= 5; i++) {
        html += `<span class="text-warning fs-5">★</span>`;
      }
      html += `</div>`;
    }

    html += `</div>`;

    preview.innerHTML += html;
  });
}


/* ===================================================== */
/* INICIALIZAÇÃO                                         */
/* ===================================================== */

document.addEventListener("DOMContentLoaded", carregarPesquisas);