const SUPABASE_URL = CONFIG.SUPABASE_URL;
const SUPABASE_ANON_KEY = CONFIG.SUPABASE_ANON_KEY;

let pesquisaPerguntasAtual = null;

/* ================= PESQUISAS ================= */

async function carregarPesquisas() {

  const res = await fetch(`${SUPABASE_URL}/rest/v1/pesquisas?select=*`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  const dados = await res.json();
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
        <button class="btn btn-sm btn-dark"
          onclick="gerenciarPerguntas('${p.id}')">⚙</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* ================= PERGUNTAS ================= */

async function gerenciarPerguntas(id) {
  pesquisaPerguntasAtual = id;
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
          onclick="editarPergunta('${p.id}', '${p.texto}', '${p.tipo}', ${p.obrigatoria})">✏</button>
        <button class="btn btn-sm btn-outline-danger"
          onclick="excluirPergunta('${p.id}')">🗑</button>
      </div>
    `;

    container.appendChild(div);
  });

  ativarDragDrop();
  renderPreview(perguntas);
}

function ativarDragDrop() {

  const container = document.getElementById("listaPerguntas");

  new Sortable(container, {
    animation: 150,
    handle: ".drag-handle",
    onEnd: async function () {

      const cards = container.querySelectorAll(".builder-item");

      for (let i = 0; i < cards.length; i++) {

        const id = cards[i].getAttribute("data-id");

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

/* ================= CRUD PERGUNTAS ================= */

function abrirModalPergunta() {
  document.getElementById("perguntaId").value = "";
  document.getElementById("perguntaTexto").value = "";
  document.getElementById("perguntaTipo").value = "texto";
  document.getElementById("perguntaObrigatoria").checked = false;
  new bootstrap.Modal(document.getElementById("modalPerguntaForm")).show();
}

function editarPergunta(id, texto, tipo, obrigatoria) {
  document.getElementById("perguntaId").value = id;
  document.getElementById("perguntaTexto").value = texto;
  document.getElementById("perguntaTipo").value = tipo;
  document.getElementById("perguntaObrigatoria").checked = obrigatoria;
  new bootstrap.Modal(document.getElementById("modalPerguntaForm")).show();
}

async function salvarPergunta() {

  const id = document.getElementById("perguntaId").value;
  const texto = document.getElementById("perguntaTexto").value;
  const tipo = document.getElementById("perguntaTipo").value;
  const obrigatoria = document.getElementById("perguntaObrigatoria").checked;

  const payload = {
    texto,
    tipo,
    obrigatoria,
    pesquisa_id: pesquisaPerguntasAtual
  };

  const method = id ? "PATCH" : "POST";
  const url = id
    ? `${SUPABASE_URL}/rest/v1/perguntas?id=eq.${id}`
    : `${SUPABASE_URL}/rest/v1/perguntas`;

  await fetch(url, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  bootstrap.Modal.getInstance(document.getElementById("modalPerguntaForm")).hide();
  carregarPerguntas();
}

async function excluirPergunta(id) {

  if (!confirm("Deseja excluir esta pergunta?")) return;

  await fetch(`${SUPABASE_URL}/rest/v1/perguntas?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  carregarPerguntas();
}

/* ================= PREVIEW ================= */

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

document.addEventListener("DOMContentLoaded", carregarPesquisas);