async function carregarSidebar() {
  const response = await fetch("sidebar.html");
  const html = await response.text();
  document.getElementById("sidebar-container").innerHTML = html;

  const nivel = localStorage.getItem("nivel");

  document.querySelectorAll("[data-only='adm']").forEach(el => {
    if (nivel !== "adm") {
      el.style.display = "none";
    }
  });

  destacarPaginaAtual();
}

function destacarPaginaAtual() {
  const links = document.querySelectorAll(".menu a");
  const atual = window.location.pathname.split("/").pop();

  links.forEach(link => {
    if (link.getAttribute("href") === atual) {
      link.classList.add("active");
    }
  });
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", carregarSidebar);
