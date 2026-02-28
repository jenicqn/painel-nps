const { SUPABASE_URL, SUPABASE_ANON_KEY } = CONFIG;

document.addEventListener("DOMContentLoaded", function () {

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get("slug");

  if (!slug) {
    document.body.innerHTML = "<h2>Pesquisa não encontrada</h2>";
    return;
  }

  async function carregarPesquisa() {
    try {
      const pesquisaRes = await fetch(
        `${SUPABASE_URL}/rest/v1/pesquisas?slug=eq.${slug}&select=id,nome,status`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      const pesquisaData = await pesquisaRes.json();

      if (!pesquisaData.length || pesquisaData[0].status !== "Ativo") {
        document.body.innerHTML = "<h2>Pesquisa indisponível</h2>";
        return;
      }

      const pesquisaId = pesquisaData[0].id;
      window.pesquisaIdGlobal = pesquisaId;

      document.getElementById("tituloPesquisa").innerText =
        pesquisaData[0].nome;

      const perguntasRes = await fetch(
        `${SUPABASE_URL}/rest/v1/perguntas?pesquisa_id=eq.${pesquisaId}&order=ordem.asc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );

      const perguntas = await perguntasRes.json();
      renderizarPerguntas(perguntas);

    } catch (error) {
      console.error(error);
      document.body.innerHTML = "<h2>Erro ao carregar pesquisa</h2>";
    }
  }

  function renderizarPerguntas(perguntas) {
    const container = document.getElementById("containerPerguntas");
    container.innerHTML = "";

    perguntas.forEach(p => {
      let html = `<div class="linha">
                    <label>${p.texto}</label>`;

      if (p.tipo === "texto") {
        html += `<input type="text" name="${p.id}" ${p.obrigatoria ? "required" : ""}>`;
      }

      if (p.tipo === "textarea") {
        html += `<textarea name="${p.id}" ${p.obrigatoria ? "required" : ""}></textarea>`;
      }

      if (p.tipo === "escala_1_5") {
        html += `<div class="estrelas">`;
        for (let i = 1; i <= 5; i++) {
          html += `
            <input type="radio" name="${p.id}" value="${i}" ${p.obrigatoria && i === 1 ? "required" : ""}>
            <label>★</label>
          `;
        }
        html += `</div>`;
      }

      if (p.tipo === "escala_0_10") {
        html += `<div class="escala">`;
        for (let i = 0; i <= 10; i++) {
          html += `
            <input type="radio" name="${p.id}" value="${i}" ${p.obrigatoria && i === 0 ? "required" : ""}>
            <label>${i}</label>
          `;
        }
        html += `</div>`;
      }

      html += `</div>`;
      container.innerHTML += html;
    });
  }

  carregarPesquisa();

  const form = document.getElementById("formularioPesquisa");

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = new FormData(form);

      try {
        // 1️⃣ Criar feedback
        const feedbackRes = await fetch(
          `${SUPABASE_URL}/rest/v1/feedbacks`,
          {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation"
            },
            body: JSON.stringify({
              pesquisa_id: window.pesquisaIdGlobal,
              nome: formData.get("nome"),
              telefone: formData.get("telefone"),
              email: formData.get("email"),
              data_nascimento: formData.get("data_nascimento")
            })
          }
        );

        const feedbackData = await feedbackRes.json();
        const feedbackId = feedbackData[0].id;

        // 2️⃣ Inserir respostas
        const respostas = [];

        for (let [key, value] of formData.entries()) {
          if (
            key !== "nome" &&
            key !== "telefone" &&
            key !== "email" &&
            key !== "data_nascimento"
          ) {
            respostas.push({
              feedback_id: feedbackId,
              pergunta_id: key,
              resposta: value
            });
          }
        }

        await fetch(`${SUPABASE_URL}/rest/v1/respostas`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(respostas)
        });

        window.location.href = "obrigado.html";

      } catch (err) {
        alert("Erro ao enviar. Tente novamente.");
        console.error(err);
      }
    });
  }

});