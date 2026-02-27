function exportarCSV() {

  if (!dadosAtuais.length) {
    alert("Nenhum dado para exportar.");
    return;
  }

  const cabecalho = [
    "Data",
    "Nome",
    "Indicacao",
    "Morador",
    "Sugestao",
    "Qualidade",
    "Tempo",
    "Variedade",
    "CustoBeneficio"
  ];

  const linhas = dadosAtuais.map(r => [
    formatarData(r.created_at),
    r.nome || "",
    r.indicacao || "",
    r.morador || "",
    (r.sugestao || "").replace(/(\r\n|\n|\r)/gm, " "),
    r.qualidade || "",
    r.tempo || "",
    r.variedade || "",
    r.custobeneficio || ""
  ]);

  const csvConteudo =
    [cabecalho, ...linhas]
      .map(e => e.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

  const blob = new Blob([csvConteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "feedbacks.csv";
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
}
