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

let pesquisaPerguntasAtual = null;

async function gerenciarPerguntas(pesquisaId) {

  pesquisaPerguntasAtual = pesquisaId;
  document.getElementById("pesquisaPerguntasId").value = pesquisaId;

  await carregarPerguntas(pesquisaId);

  new bootstrap.Modal(document.getElementById("modalPerguntas")).show();
}

async function carregarPerguntas(pesquisaId) {

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/perguntas?pesquisa_id=eq.${pesquisaId}&order=ordem.asc`,
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
    tr.innerHTML = `
      <td>${p.texto}</td>
      <td>${p.tipo}</td>
      <td>${p.obrigatoria ? "Sim" : "Não"}</td>
      <td>${p.ordem}</td>
      <td>
        <button class="btn btn-sm btn-warning" onclick="editarPergunta('${p.id}', '${p.texto}', '${p.tipo}', ${p.obrigatoria}, ${p.ordem})">✏</button>
        <button class="btn btn-sm btn-danger" onclick="excluirPergunta('${p.id}')">🗑</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function abrirNovaPergunta() {
  const texto = prompt("Texto da pergunta:");
  const tipo = prompt("Tipo (texto, textarea, escala_1_5):");
  const obrigatoria = confirm("Obrigatória?");
  const ordem = parseInt(prompt("Ordem (número):"));

  salvarPergunta(null, texto, tipo, obrigatoria, ordem);
}

async function editarPergunta(id, textoAtual, tipoAtual, obrigAtual, ordemAtual) {

  const texto = prompt("Texto:", textoAtual);
  const tipo = prompt("Tipo:", tipoAtual);
  const obrigatoria = confirm("Obrigatória?");
  const ordem = parseInt(prompt("Ordem:", ordemAtual));

  salvarPergunta(id, texto, tipo, obrigatoria, ordem);
}

async function salvarPergunta(id, texto, tipo, obrigatoria, ordem) {

  const payload = {
    pesquisa_id: pesquisaPerguntasAtual,
    texto,
    tipo,
    obrigatoria,
    ordem
  };

  if (id) {
    await fetch(`${SUPABASE_URL}/rest/v1/perguntas?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch(`${SUPABASE_URL}/rest/v1/perguntas`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  carregarPerguntas(pesquisaPerguntasAtual);
}

async function excluirPergunta(id) {

  if (!confirm("Excluir pergunta?")) return;

  await fetch(`${SUPABASE_URL}/rest/v1/perguntas?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  carregarPerguntas(pesquisaPerguntasAtual);
}

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
}

function abrirModalPergunta() {

  document.getElementById("perguntaId").value = "";
  document.getElementById("perguntaTexto").value = "";
  document.getElementById("perguntaTipo").value = "texto";
  document.getElementById("perguntaOrdem").value = 1;
  document.getElementById("perguntaObrigatoria").checked = false;

  new bootstrap.Modal(document.getElementById("modalPerguntaForm")).show();
}

function editarPergunta(id, texto, tipo, obrigatoria, ordem) {

  document.getElementById("perguntaId").value = id;
  document.getElementById("perguntaTexto").value = texto;
  document.getElementById("perguntaTipo").value = tipo;
  document.getElementById("perguntaOrdem").value = ordem;
  document.getElementById("perguntaObrigatoria").checked = obrigatoria;

  new bootstrap.Modal(document.getElementById("modalPerguntaForm")).show();
}

async function salvarPergunta() {

  const id = document.getElementById("perguntaId").value;
  const texto = document.getElementById("perguntaTexto").value;
  const tipo = document.getElementById("perguntaTipo").value;
  const ordem = parseInt(document.getElementById("perguntaOrdem").value);
  const obrigatoria = document.getElementById("perguntaObrigatoria").checked;

  const payload = {
    pesquisa_id: pesquisaPerguntasAtual,
    texto,
    tipo,
    ordem,
    obrigatoria
  };

  if (id) {

    await fetch(`${SUPABASE_URL}/rest/v1/perguntas?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

  } else {

    await fetch(`${SUPABASE_URL}/rest/v1/perguntas`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  }

  bootstrap.Modal.getInstance(document.getElementById("modalPerguntaForm")).hide();
  carregarPerguntas();
}

async function excluirPergunta(id) {

  if (!confirm("Excluir pergunta?")) return;

  await fetch(`${SUPABASE_URL}/rest/v1/perguntas?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  carregarPerguntas();
}