/* =======================================================
   CONFIG
======================================================= */

const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;

let pesquisaPerguntasAtual = null;

/* =======================================================
   API BASE - PADRÃO SAAS
======================================================= */

async function apiRequest(endpoint, method = "GET", body = null) {

  try {

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
      method,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: body ? JSON.stringify(body) : null
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return await response.json();

  } catch (error) {
    console.error("API Error:", error);
    alert("Ocorreu um erro na comunicação com o servidor.");
    throw error;
  }
}

/* =======================================================
   PESQUISAS
======================================================= */

async function carregarPesquisas() {

  const dados = await apiRequest("pesquisas?select=*&order=created_at.desc");

  const tbody = document.getElementById("tabelaPesquisas");
  tbody.innerHTML = "";

  dados.forEach(p => {

    const tr = document.createElement("tr");

    const statusBtnClass =
      p.status === "Ativo" ? "btn-outline-warning" : "btn-outline-success";

    const statusIcon =
      p.status === "Ativo" ? "⏸" : "▶";

    tr.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.slug}</td>
      <td>
        <span class="badge ${p.status === 'Ativo' ? 'bg-success' : 'bg-secondary'}">
          ${p.status}
        </span>
      </td>
      <td class="d-flex gap-2">

        <button class="btn btn-sm btn-dark"
          data-id="${p.id}"
          onclick="gerenciarPerguntas(this.dataset.id)">
          ⚙
        </button>

        <button class="btn btn-sm ${statusBtnClass}"
          data-id="${p.id}"
          data-status="${p.status}"
          onclick="toggleStatusPesquisa(this.dataset.id, this.dataset.status)">
          ${statusIcon}
        </button>

        <button class="btn btn-sm btn-outline-danger"
          data-id="${p.id}"
          onclick="softDeletePesquisa(this.dataset.id)">
          🗑
        </button>

      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function toggleStatusPesquisa(id, statusAtual) {

  const novoStatus = statusAtual === "Ativo" ? "Inativo" : "Ativo";

  await apiRequest(
    `pesquisas?id=eq.${id}`,
    "PATCH",
    { status: novoStatus }
  );

  carregarPesquisas();
}

/* =======================================================
   SOFT DELETE (PADRÃO SAAS)
======================================================= */

async function softDeletePesquisa(id) {

  if (!confirm("Deseja realmente excluir esta pesquisa?")) return;

  await apiRequest(
    `pesquisas?id=eq.${id}`,
    "PATCH",
    { deleted_at: new Date().toISOString(), status: "Inativo" }
  );

  carregarPesquisas();
}

/* =======================================================
   PERGUNTAS
======================================================= */

async function gerenciarPerguntas(id) {
  pesquisaPerguntasAtual = id;
  await carregarPerguntas();
  new bootstrap.Modal(document.getElementById("modalPerguntas")).show();
}

async function carregarPerguntas() {

  const perguntas = await apiRequest(
    `perguntas?pesquisa_id=eq.${pesquisaPerguntasAtual}&order=ordem.asc`
  );

  const container = document.getElementById("listaPerguntas");
  container.innerHTML = "";

  perguntas.forEach(p => {

    const div = document.createElement("div");
    div.className = "builder-item";
    div.setAttribute("data-id", p.id);

    div.innerHTML = `
      <div class="builder-left">
        <div class="drag-handle">⠿</div>
        <div>
          <div class="question-title">${p.texto}</div>
          <div>
            <span class="badge bg-light text-dark">${p.tipo}</span>
            ${p.obrigatoria ? '<span class="badge bg-success">Obrigatória</span>' : ''}
          </div>
        </div>
      </div>

      <div>
        <button class="btn btn-sm btn-outline-warning"
          data-id="${p.id}"
          data-texto="${p.texto}"
          data-tipo="${p.tipo}"
          data-obrigatoria="${p.obrigatoria}"
          onclick="editarPergunta(this)">
          ✏
        </button>

        <button class="btn btn-sm btn-outline-danger"
          data-id="${p.id}"
          onclick="excluirPergunta(this.dataset.id)">
          🗑
        </button>
      </div>
    `;

    container.appendChild(div);
  });

  ativarDragDrop();
  renderPreview(perguntas);
}

/* =======================================================
   DRAG OTIMIZADO
======================================================= */

function ativarDragDrop() {

  const container = document.getElementById("listaPerguntas");

  new Sortable(container, {
    animation: 150,
    handle: ".drag-handle",
    onEnd: async function () {

      const cards = container.querySelectorAll(".builder-item");

      const updates = [];

      cards.forEach((card, index) => {

        const id = card.getAttribute("data-id");

        updates.push(
          apiRequest(
            `perguntas?id=eq.${id}`,
            "PATCH",
            { ordem: index + 1 }
          )
        );
      });

      await Promise.all(updates);
      carregarPerguntas();
    }
  });
}

/* =======================================================
   CRUD PERGUNTAS
======================================================= */

function abrirModalPergunta() {

  document.getElementById("perguntaId").value = "";
  document.getElementById("perguntaTexto").value = "";
  document.getElementById("perguntaTipo").value = "texto";
  document.getElementById("perguntaObrigatoria").checked = false;

  new bootstrap.Modal(document.getElementById("modalPerguntaForm")).show();
}

function editarPergunta(button) {

  document.getElementById("perguntaId").value = button.dataset.id;
  document.getElementById("perguntaTexto").value = button.dataset.texto;
  document.getElementById("perguntaTipo").value = button.dataset.tipo;
  document.getElementById("perguntaObrigatoria").checked =
    button.dataset.obrigatoria === "true";

  new bootstrap.Modal(document.getElementById("modalPerguntaForm")).show();
}

async function salvarPergunta() {

  const id = document.getElementById("perguntaId").value;

  const payload = {
    texto: document.getElementById("perguntaTexto").value,
    tipo: document.getElementById("perguntaTipo").value,
    obrigatoria: document.getElementById("perguntaObrigatoria").checked,
    pesquisa_id: pesquisaPerguntasAtual
  };

  const endpoint = id
    ? `perguntas?id=eq.${id}`
    : `perguntas`;

  const method = id ? "PATCH" : "POST";

  await apiRequest(endpoint, method, payload);

  bootstrap.Modal.getInstance(
    document.getElementById("modalPerguntaForm")
  ).hide();

  carregarPerguntas();
}

async function excluirPergunta(id) {

  if (!confirm("Deseja excluir esta pergunta?")) return;

  await apiRequest(
    `perguntas?id=eq.${id}`,
    "DELETE"
  );

  carregarPerguntas();
}

/* =======================================================
   PREVIEW
======================================================= */

function renderPreview(perguntas) {

  const preview = document.getElementById("previewPerguntas");
  preview.innerHTML = "";

  perguntas.forEach(p => {

    let html = `<div class="mb-4">
                  <label class="form-label fw-bold">${p.texto}</label>`;

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

/* =======================================================
   INIT
======================================================= */

document.addEventListener("DOMContentLoaded", carregarPesquisas);