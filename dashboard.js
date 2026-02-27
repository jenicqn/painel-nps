let graficoComparativo = null;

async function carregarDashboard() {
  try {

    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioProximoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);

    const query = `
      ${SUPABASE_URL}/rest/v1/feedback_detalhado
      ?select=indicacao,morador
      &created_at=gte.${inicioDia.toISOString()}
      &created_at=lt.${inicioProximoDia.toISOString()}
    `.replace(/\s+/g,'');

    const res = await fetch(query, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!res.ok) throw new Error("Erro ao buscar dados");

    const dados = await res.json();

    atualizarKPIs(dados);

  } catch (err) {
    console.error(err);
  }
}

function calcularNPS(lista) {
  let promotores = 0;
  let detratores = 0;

  lista.forEach(d => {
    if (d.indicacao >= 9) promotores++;
    else if (d.indicacao <= 6) detratores++;
  });

  const total = lista.length;

  return total > 0
    ? Math.round(((promotores - detratores) / total) * 100)
    : 0;
}

function atualizarGrafico(npsMoradores, npsTuristas) {

  const ctx = document.getElementById('graficoMoradorTurista');

  if (!ctx) return;

  const context = ctx.getContext('2d');

  if (graficoComparativo) graficoComparativo.destroy();

  graficoComparativo = new Chart(context, {
    type: 'bar',
    data: {
      labels: ['Moradores', 'Turistas'],
      datasets: [{
        data: [npsMoradores, npsTuristas]
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { min: -100, max: 100 } }
    }
  });
}

function atualizarKPIs(dados) {

  const total = dados.length;

  const npsGeral = calcularNPS(dados);

  const moradores = dados.filter(d => d.morador === "Sim");
  const turistas = dados.filter(d => d.morador === "Não");

  const npsMoradores = calcularNPS(moradores);
  const npsTuristas = calcularNPS(turistas);

  const promotores = dados.filter(d => d.indicacao >= 9).length;
  const neutros = dados.filter(d => d.indicacao >= 7 && d.indicacao <= 8).length;
  const detratores = dados.filter(d => d.indicacao <= 6).length;

  document.getElementById('npsGeral').textContent = npsGeral;
  document.getElementById('npsPromotores').textContent = promotores;
  document.getElementById('npsNeutros').textContent = neutros;
  document.getElementById('npsDetratores').textContent = detratores;
  document.getElementById('totalRespostas').textContent = total;
  document.getElementById('npsMoradores').textContent = npsMoradores;
  document.getElementById('npsTuristas').textContent = npsTuristas;

  atualizarGrafico(npsMoradores, npsTuristas);
}

document.addEventListener("DOMContentLoaded", carregarDashboard);
