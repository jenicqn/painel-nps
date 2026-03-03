const API = 'https://user-api-kohl.vercel.app/api';

// Proteção de acesso
const nivelUsuario = localStorage.getItem('nivel');
if (nivelUsuario !== 'adm') {
  alert('Acesso restrito.');
  window.location.href = 'dashboard.html';
}

// =====================
// CARREGAR USUÁRIOS
// =====================
async function carregarUsuarios() {
  const tbody = document.getElementById('corpoTabela');
  tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>';

  try {
    const res = await fetch(`${API}/listar-usuarios`);
    const usuarios = await res.json();

    tbody.innerHTML = '';

    if (!Array.isArray(usuarios) || !usuarios.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum usuário encontrado.</td></tr>';
      return;
    }

    usuarios.forEach(u => {
      const statusBadge = u.ativo
        ? '<span class="badge bg-success">Ativo</span>'
        : '<span class="badge bg-secondary">Inativo</span>';

      const nivelBadge = u.nivel === 'adm'
        ? '<span class="badge bg-danger">Administrador</span>'
        : '<span class="badge bg-primary">User</span>';

      const nomeSeguro = (u.nome || '').replace(/'/g, "\\'");
      const emailSeguro = (u.email || '').replace(/'/g, "\\'");

      tbody.innerHTML += `
        <tr>
          <td>${u.nome || '-'}</td>
          <td>${u.email || '-'}</td>
          <td>${nivelBadge}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-sm btn-primary me-1" onclick="abrirModalEditar('${u.id}', '${nomeSeguro}', '${emailSeguro}', '${u.nivel}')" title="Editar">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-warning me-1" onclick="abrirModalSenha('${u.id}')" title="Trocar senha">
              <i class="bi bi-key"></i>
            </button>
            <button class="btn btn-sm ${u.ativo ? 'btn-secondary' : 'btn-success'} me-1" onclick="alternarStatus('${u.id}', ${u.ativo})" title="${u.ativo ? 'Desativar' : 'Ativar'}">
              <i class="bi bi-${u.ativo ? 'pause' : 'play'}"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="excluirUsuario('${u.id}')" title="Excluir">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
    });

  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar. Verifique o console.</td></tr>';
  }
}

// =====================
// NOVO USUÁRIO
// =====================
function abrirModalNovo() {
  document.getElementById('formNovo').reset();
  document.getElementById('alertNovo').classList.add('d-none');
  new bootstrap.Modal(document.getElementById('modalNovo')).show();
}

document.getElementById('formNovo').addEventListener('submit', async e => {
  e.preventDefault();
  const alerta = document.getElementById('alertNovo');
  alerta.classList.add('d-none');

  try {
    const res = await fetch(`${API}/criar-usuario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: document.getElementById('novoNome').value,
        email: document.getElementById('novoEmail').value,
        senha: document.getElementById('novaSenha').value,
        nivel: document.getElementById('novoNivel').value
      })
    });

    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('modalNovo')).hide();
      carregarUsuarios();
    } else {
      const err = await res.json();
      alerta.textContent = err.error || 'Erro ao criar usuário.';
      alerta.className = 'alert alert-danger mt-2';
    }
  } catch (err) {
    alerta.textContent = 'Erro de conexão com a API.';
    alerta.className = 'alert alert-danger mt-2';
  }
});

// =====================
// EDITAR
// =====================
function abrirModalEditar(id, nome, email, nivel) {
  document.getElementById('editarId').value = id;
  document.getElementById('editarNome').value = nome;
  document.getElementById('editarEmail').value = email;
  document.getElementById('editarNivel').value = nivel;
  document.getElementById('alertEditar').classList.add('d-none');
  new bootstrap.Modal(document.getElementById('modalEditar')).show();
}

document.getElementById('formEditar').addEventListener('submit', async e => {
  e.preventDefault();
  const alerta = document.getElementById('alertEditar');
  alerta.classList.add('d-none');

  try {
    const res = await fetch(`${API}/atualizar-usuario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: document.getElementById('editarId').value,
        nome: document.getElementById('editarNome').value,
        email: document.getElementById('editarEmail').value,
        nivel: document.getElementById('editarNivel').value
      })
    });

    if (res.ok) {
      bootstrap.Modal.getInstance(document.getElementById('modalEditar')).hide();
      carregarUsuarios();
    } else {
      const err = await res.json();
      alerta.textContent = err.error || 'Erro ao salvar.';
      alerta.className = 'alert alert-danger mt-2';
    }
  } catch (err) {
    alerta.textContent = 'Erro de conexão com a API.';
    alerta.className = 'alert alert-danger mt-2';
  }
});

// =====================
// TROCAR SENHA
// =====================
function abrirModalSenha(id) {
  document.getElementById('senhaId').value = id;
  document.getElementById('novaSenhaModal').value = '';
  document.getElementById('confirmarSenha').value = '';
  document.getElementById('alertSenha').classList.add('d-none');
  new bootstrap.Modal(document.getElementById('modalSenha')).show();
}

document.getElementById('formSenha').addEventListener('submit', async e => {
  e.preventDefault();
  const alerta = document.getElementById('alertSenha');
  const senha = document.getElementById('novaSenhaModal').value;
  const confirmar = document.getElementById('confirmarSenha').value;

  if (senha !== confirmar) {
    alerta.textContent = 'As senhas não coincidem.';
    alerta.className = 'alert alert-danger mt-2';
    return;
  }

  try {
    const res = await fetch(`${API}/atualizar-senha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: document.getElementById('senhaId').value,
        senha
      })
    });

    if (res.ok) {
      alerta.textContent = 'Senha atualizada com sucesso!';
      alerta.className = 'alert alert-success mt-2';
      setTimeout(() => bootstrap.Modal.getInstance(document.getElementById('modalSenha')).hide(), 1500);
    } else {
      const err = await res.json();
      alerta.textContent = err.error || 'Erro ao atualizar senha.';
      alerta.className = 'alert alert-danger mt-2';
    }
  } catch (err) {
    alerta.textContent = 'Erro de conexão com a API.';
    alerta.className = 'alert alert-danger mt-2';
  }
});

// =====================
// ALTERNAR STATUS
// =====================
async function alternarStatus(id, ativo) {
  await fetch(`${API}/atualizar-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ativo: !ativo })
  });
  carregarUsuarios();
}

// =====================
// EXCLUIR
// =====================
async function excluirUsuario(id) {
  if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
  await fetch(`${API}/excluir-usuario?id=${id}`, { method: 'DELETE' });
  carregarUsuarios();
}

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnNovoUsuario').addEventListener('click', abrirModalNovo);
  carregarUsuarios();
});