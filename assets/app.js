/* =========================================================================
   Raio-X do Quadro de Pessoal da Prefeitura de Sorocaba
   Helpers compartilhados por todas as paginas
   ========================================================================= */

/* -------------------------------------------------------------------------
   Formatadores
   ------------------------------------------------------------------------- */
const fmtBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const fmtBRLCompacto = (v) => {
  if (v == null || isNaN(v)) return "-";
  if (Math.abs(v) >= 1e9) return "R$ " + (v / 1e9).toFixed(2).replace(".", ",") + " bi";
  if (Math.abs(v) >= 1e6) return "R$ " + (v / 1e6).toFixed(1).replace(".", ",") + " mi";
  if (Math.abs(v) >= 1e3) return "R$ " + (v / 1e3).toFixed(0).replace(".", ",") + " mil";
  return fmtBRL.format(v);
};

const fmtNum = new Intl.NumberFormat("pt-BR");
const fmtPct = (v) => (v == null || isNaN(v) ? "-" : v.toFixed(2).replace(".", ",") + "%");
const fmtNumCompacto = (v) => {
  if (v == null || isNaN(v)) return "-";
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace(".", ",") + " mi";
  if (v >= 1e3) return (v / 1e3).toFixed(1).replace(".", ",") + " mil";
  return fmtNum.format(v);
};

const nomeMes = ["jan", "fev", "mar", "abr", "mai", "jun",
                 "jul", "ago", "set", "out", "nov", "dez"];
const rotuloPeriodo = (ano, mes) => `${nomeMes[mes - 1]}/${ano}`;

/* -------------------------------------------------------------------------
   Cores institucionais (identidade OSB + viridis)
   ------------------------------------------------------------------------- */
const CORES = {
  azulEscuro:   "#003a70",
  azulClaro:    "#0071ce",
  verdeEscuro:  "#00612f",
  verdeClaro:   "#7ab648",
  amarelo:      "#ffd200",
  branco:       "#ffffff",
  cinzaFundo:   "#f5f7fa",
  cinzaBorda:   "#e0e4ea",
  cinzaTexto:   "#555c66",
  pretoSuave:   "#1a1a1a",
  // Cores dos 5 grupos auditaveis
  efetivos:      "#2a788e",
  funcao:        "#7ad151",
  comissionados: "#fde725",
  flexiveis:     "#414487",
  inativos:      "#999999",
  nc:            "#cc0000",
  // Paleta viridis completa
  viridis: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"],
};

const CORES_GRUPO = {
  efetivos:        CORES.efetivos,
  funcao_confianca:CORES.funcao,
  comissionados:   CORES.comissionados,
  flexiveis:       CORES.flexiveis,
  inativos:        CORES.inativos,
  nao_classificado:CORES.nc,
};

const ROTULOS_GRUPO = {
  efetivos:         "Efetivos e empregados públicos",
  funcao_confianca: "Efetivos em função de confiança",
  comissionados:    "Comissionados e agentes políticos",
  flexiveis:        "Temporários, estagiários e eventuais",
  inativos:         "Inativos e pensionistas",
  nao_classificado: "Não classificado",
};

/* -------------------------------------------------------------------------
   Carregamento de dados
   ------------------------------------------------------------------------- */
async function carregarJSON(caminho) {
  const r = await fetch(caminho, { cache: "no-store" });
  if (!r.ok) throw new Error(`Falha ao carregar ${caminho} (HTTP ${r.status})`);
  return r.json();
}

async function carregarCSV(caminho) {
  return new Promise((resolve, reject) => {
    Papa.parse(caminho, {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (r) => resolve(r.data),
      error: (e) => reject(e),
    });
  });
}

/* -------------------------------------------------------------------------
   Menu de navegacao
   ------------------------------------------------------------------------- */
function inicializarMenu() {
  // Marca o link ativo baseado na URL atual
  const paginaAtual = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".menu a, .drawer-nav a").forEach((a) => {
    const destino = a.getAttribute("href");
    if (destino === paginaAtual || (paginaAtual === "" && destino === "index.html")) {
      a.classList.add("ativo");
    }
  });

  // Menu hamburguer (mobile)
  const botaoHamburguer = document.querySelector(".menu-hamburguer");
  if (botaoHamburguer) {
    botaoHamburguer.addEventListener("click", () => {
      document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("visivel"));
    });
  }

  // Drawer lateral
  const botaoLateral = document.querySelector(".botao-lateral");
  const drawer = document.querySelector(".drawer");
  const backdrop = document.querySelector(".backdrop");
  const fechar = document.querySelector(".drawer-fechar");

  function abrirDrawer() {
    if (drawer) drawer.classList.add("aberto");
    if (backdrop) backdrop.classList.add("aberto");
  }
  function fecharDrawer() {
    if (drawer) drawer.classList.remove("aberto");
    if (backdrop) backdrop.classList.remove("aberto");
  }

  if (botaoLateral) botaoLateral.addEventListener("click", abrirDrawer);
  if (fechar) fechar.addEventListener("click", fecharDrawer);
  if (backdrop) backdrop.addEventListener("click", fecharDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharDrawer();
  });
}

/* -------------------------------------------------------------------------
   Renderizacao de estados
   ------------------------------------------------------------------------- */
function mostrarErro(container, mensagem) {
  if (!container) return;
  container.innerHTML = `<div class="erro"><strong>Erro ao carregar dados.</strong><br>${mensagem}</div>`;
}

function mostrarCarregando(container) {
  if (!container) return;
  container.innerHTML = `<div class="carregando">Carregando dados</div>`;
}

/* -------------------------------------------------------------------------
   Graficos padrao (Chart.js)
   ------------------------------------------------------------------------- */
function graficoLinha(ctx, labels, dados, opcoes = {}) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: opcoes.label || "Valor",
        data: dados,
        borderColor: opcoes.cor || CORES.azulClaro,
        backgroundColor: opcoes.corFundo || "rgba(0,113,206,0.08)",
        borderWidth: 2,
        fill: true,
        tension: 0.25,
        pointRadius: 2,
        pointHoverRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const v = item.parsed.y;
              return opcoes.formatador ? opcoes.formatador(v) : fmtBRL.format(v);
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto, maxRotation: 45, minRotation: 0, autoSkip: true, maxTicksLimit: 14 },
        },
        y: {
          beginAtZero: opcoes.inicioZero !== false,
          grid: { color: CORES.cinzaBorda },
          ticks: {
            color: CORES.cinzaTexto,
            callback: (v) => (opcoes.eixoYFormatador ? opcoes.eixoYFormatador(v) : fmtNumCompacto(v)),
          },
        },
      },
    },
  });
}

function graficoBarras(ctx, labels, dados, opcoes = {}) {
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: opcoes.label || "Valor",
        data: dados,
        backgroundColor: opcoes.cor || CORES.azulClaro,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: opcoes.horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const v = item.parsed[opcoes.horizontal ? "x" : "y"];
              return opcoes.formatador ? opcoes.formatador(v) : fmtBRL.format(v);
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: CORES.cinzaBorda },
          ticks: {
            color: CORES.cinzaTexto,
            callback: (v) => (opcoes.eixoFormatador ? opcoes.eixoFormatador(v) : fmtNumCompacto(v)),
          },
        },
        y: {
          beginAtZero: true,
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto },
        },
      },
    },
  });
}

function graficoRosca(ctx, labels, dados, cores) {
  return new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: dados,
        backgroundColor: cores,
        borderColor: CORES.branco,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { color: CORES.pretoSuave, font: { size: 12 }, padding: 10, boxWidth: 12 },
        },
        tooltip: {
          callbacks: {
            label: (item) => {
              const total = item.dataset.data.reduce((a, b) => a + b, 0);
              const pct = (item.parsed / total * 100).toFixed(1).replace(".", ",");
              return `${item.label}: ${fmtBRL.format(item.parsed)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
   Renderizacao do selo de auditoria
   ------------------------------------------------------------------------- */
function renderizarSelo(selo, seletor = "#selo-conteudo") {
  const el = document.querySelector(seletor);
  if (!el || !selo) return;

  const semAlerta = !selo.alertas || selo.alertas.total_registros_nc === 0;
  const blocoAlertas = semAlerta
    ? `<div class="ok"><strong>Auditoria:</strong> nenhum código de regime fora do mapa. Base consistente.</div>`
    : `<div class="alerta"><strong>Atenção:</strong> ${selo.alertas.total_registros_nc} registros com regime não classificado. Verifique o mapa.</div>`;

  el.innerHTML = `
    <dt>Fonte</dt>
    <dd>${selo.fonte || "-"}</dd>
    <dt>Período coberto</dt>
    <dd>${selo.periodo_coberto?.inicio || "-"} a ${selo.periodo_coberto?.fim || "-"} (${selo.periodo_coberto?.total_meses || 0} meses)</dd>
    <dt>Registros totais</dt>
    <dd>${fmtNum.format(selo.qualidade?.registros_totais || 0)}</dd>
    <dt>Matrículas únicas</dt>
    <dd>${fmtNum.format(selo.qualidade?.matriculas_unicas || 0)}</dd>
    <dt>Secretarias</dt>
    <dd>${selo.qualidade?.secretarias || 0}</dd>
    <dt>Última atualização</dt>
    <dd>${selo.gerado_em ? new Date(selo.gerado_em).toLocaleString("pt-BR") : "-"}</dd>
    ${blocoAlertas}
  `;
}

/* -------------------------------------------------------------------------
   Inicializacao comum
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  inicializarMenu();
});