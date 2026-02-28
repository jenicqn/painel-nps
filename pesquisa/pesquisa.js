document.addEventListener('DOMContentLoaded', () => {

  // ===============================
  // BOTÕES NPS
  // ===============================
  const cont = document.getElementById('indicacaoBotoes');
  const inp  = document.getElementById('inputIndicacao');

  for (let i = 0; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = i;
    btn.classList.add(i <= 4 ? 'vermelho' : i <= 7 ? 'amarelo' : 'verde');

    btn.addEventListener('click', () => {
      cont.querySelectorAll('button').forEach(b => b.classList.remove('selecionado'));
      btn.classList.add('selecionado');
      inp.value = i;
    });

    cont.appendChild(btn);
  }

  // ===============================
  // ESTRELAS
  // ===============================
  document.querySelectorAll('.estrelas').forEach(rating => {
    const inputs = Array.from(rating.querySelectorAll('input'));
    const labels = Array.from(rating.querySelectorAll('label'));

    function paint(idx) {
      labels.forEach((lbl, i) => {
        lbl.classList.toggle('filled', i <= idx);
      });
    }

    labels.forEach((lbl, idx) => {
      lbl.addEventListener('click', () => {
        inputs[idx].checked = true;
        paint(idx);
      });

      lbl.addEventListener('mouseover', () => paint(idx));
    });

    rating.addEventListener('mouseleave', () => {
      const checkedIdx = inputs.findIndex(i => i.checked);
      paint(checkedIdx);
    });
  });

  // ===============================
  // ENVIO PARA SUPABASE
  // ===============================
  const form = document.getElementById("formularioPesquisa");

  form.addEventListener("submit", async (e) => {

    e.preventDefault(); // 🔴 impede refresh

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.textContent = "Enviando...";

    const data = Object.fromEntries(new FormData(form));

    if (!data.indicacao) {
      alert("Selecione uma nota de 0 a 10.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar";
      return;
    }

    // Converte data nascimento
    if (data.data_nascimento) {
      const [d, m, y] = data.data_nascimento.split("/");
      data.data_nascimento = `${y}-${m}-${d}`;
    } else {
      data.data_nascimento = null;
    }

    const payload = {
      ...data,
      atendimento: +data.atendimento,
      qualidade: +data.qualidade,
      tempo: +data.tempo,
      variedade: +data.variedade,
      custobeneficio: +data.custobeneficio,
      indicacao: +data.indicacao
    };

    const URL = "https://leezpmpmqkiocvvpcwqa.supabase.co/rest/v1/feedback_detalhado";
    const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlZXpwbXBtcWtpb2N2dnBjd3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI2NTUsImV4cCI6MjA4NzUyODY1NX0.M-TpjLCmwA6jyUFXG33o-L8O_1o84Ap4GM9vtxAa4KQ";

    try {

      const resp = await fetch(URL, {
        method: "POST",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {

  if (resp.status === 409) {
    alert("Você já respondeu nossa pesquisa hoje 💛\nVolte amanhã para participar novamente!");
    submitBtn.disabled = false;
    submitBtn.textContent = "Enviar";
    return;
  }

  let errorMessage = "Erro inesperado.";

  try {
    const err = await resp.json();
    errorMessage = err.message || JSON.stringify(err);
  } catch {
    errorMessage = await resp.text();
  }

  throw new Error(errorMessage);
}

      // Salva dados para gerar cupom
      localStorage.setItem("cliente_nome", data.nome);
      localStorage.setItem("cliente_email", data.email);
      localStorage.setItem("cliente_telefone", data.telefone);

      // Redireciona
      window.location.href = "obrigado.html";

    } catch (error) {

      alert("Erro ao enviar: " + error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Enviar";

    }

  });

});
