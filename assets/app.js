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
   Cores institucionais
   ------------------------------------------------------------------------- */
const CORES = {
  azulEscuro:   "#003a70",
  azulClaro:    "#0071ce",
  verdeEscuro:  "#00612f",
  verdeClaro:   "#7ab648",
  amarelo:      "#ffd200",
  amareloGrafico: "#d4a900",
  branco:       "#ffffff",
  cinzaFundo:   "#f5f7fa",
  cinzaBorda:   "#e0e4ea",
  cinzaTexto:   "#555c66",
  pretoSuave:   "#1a1a1a",
  efetivos:      "#2a788e",
  funcao:        "#5c9c2a",
  comissionados: "#d4a900",
  flexiveis:     "#414487",
  inativos:      "#6b6b6b",
  nc:            "#cc0000",
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

/**
 * Carrega um arquivo JSON.
 */
async function carregarJSON(caminho) {
  const r = await fetch(caminho, { cache: "no-store" });
  if (!r.ok) throw new Error(`Falha ao carregar ${caminho} (HTTP ${r.status})`);
  return r.json();
}

/**
 * Carrega um CSV de forma robusta:
 *  - Baixa via fetch (nao usa o download interno do PapaParse)
 *  - Remove BOM (\ufeff) do inicio da resposta
 *  - Auto-detecta o delimitador (; ou ,)
 *  - Normaliza os nomes das colunas (trim + remove BOM)
 *  - Converte campos numericos automaticamente
 */
async function carregarCSV(caminho) {
  const r = await fetch(caminho, { cache: "no-store" });
  if (!r.ok) throw new Error(`Falha ao carregar ${caminho} (HTTP ${r.status})`);

  // Remove BOM do inicio do texto, se houver
  let texto = await r.text();
  if (texto.charCodeAt(0) === 0xFEFF) {
    texto = texto.slice(1);
  }

  return new Promise((resolve, reject) => {
    Papa.parse(texto, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimiter: "", // auto-detecta ; ou ,
      transformHeader: (h) => h.replace(/^\ufeff/, "").trim(),
      complete: (res) => {
        // Remove linhas onde todas as colunas sao vazias
        const limpos = res.data.filter((linha) =>
          Object.values(linha).some((v) => v !== null && v !== "" && v !== undefined)
        );
        resolve(limpos);
      },
      error: (e) => reject(e),
    });
  });
}

/* -------------------------------------------------------------------------
   Badge "atualizado em"
   ------------------------------------------------------------------------- */
async function atualizarBadgeAtualizacao() {
  const el = document.getElementById("badge-atualizacao");
  if (!el) return;

  try {
    const auditoria = await carregarJSON("dados/auditoria.json");
    const data = auditoria.gerado_em ? new Date(auditoria.gerado_em) : null;

    if (!data || isNaN(data.getTime())) {
      el.textContent = "Atualização pendente";
      el.classList.add("indisponivel");
      return;
    }

    const dataFormatada = data.toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });

    el.textContent = `Atualizado em ${dataFormatada}`;
    el.title = `Última extração do pipeline: ${data.toLocaleString("pt-BR")}`;
  } catch (e) {
    console.warn("Não foi possível carregar o badge de atualização:", e);
    el.textContent = "Atualização pendente";
    el.classList.add("indisponivel");
  }
}

/* -------------------------------------------------------------------------
   Menu de navegacao
   ------------------------------------------------------------------------- */
function inicializarMenu() {
  const paginaAtual = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".menu a, .drawer-nav a").forEach((a) => {
    const destino = a.getAttribute("href");
    if (destino === paginaAtual || (paginaAtual === "" && destino === "index.html")) {
      a.classList.add("ativo");
    }
  });

  const botaoHamburguer = document.querySelector(".menu-hamburguer");
  if (botaoHamburguer) {
    botaoHamburguer.addEventListener("click", () => {
      const aberto = botaoHamburguer.getAttribute("aria-expanded") === "true";
      botaoHamburguer.setAttribute("aria-expanded", String(!aberto));
      document.querySelectorAll(".menu a").forEach((a) => a.classList.toggle("visivel"));
    });
  }

  const botaoLateral = document.querySelector(".botao-lateral");
  const drawer = document.querySelector(".drawer");
  const backdrop = document.querySelector(".backdrop");
  const fechar = document.querySelector(".drawer-fechar");

  function abrirDrawer() {
    if (drawer) drawer.classList.add("aberto");
    if (backdrop) backdrop.classList.add("aberto");
    if (drawer) drawer.setAttribute("aria-hidden", "false");
  }
  function fecharDrawer() {
    if (drawer) drawer.classList.remove("aberto");
    if (backdrop) backdrop.classList.remove("aberto");
    if (drawer) drawer.setAttribute("aria-hidden", "true");
  }

  if (botaoLateral) botaoLateral.addEventListener("click", abrirDrawer);
  if (fechar) fechar.addEventListener("click", fecharDrawer);
  if (backdrop) backdrop.addEventListener("click", fecharDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharDrawer();
  });
}

/* -------------------------------------------------------------------------
   Breadcrumb
   ------------------------------------------------------------------------- */
function inicializarBreadcrumb() {
  const el = document.getElementById("breadcrumb");
  if (!el) return;

  const PAGINAS = {
    "index.html":       { nome: "Início", pai: null },
    "secretarias.html": { nome: "Secretarias", pai: "index.html" },
    "quadro.html":      { nome: "Quadro", pai: "index.html" },
    "genero.html":      { nome: "Gênero", pai: "index.html" },
    "salarios.html":    { nome: "Salários", pai: "index.html" },
    "sobre.html":       { nome: "Sobre", pai: "index.html" },
  };

  const paginaAtual = (location.pathname.split("/").pop() || "index.html");
  const info = PAGINAS[paginaAtual];

  if (!info || paginaAtual === "index.html") {
    el.style.display = "none";
    return;
  }

  const params = new URLSearchParams(location.search);
  const secretariaSelecionada = params.get("secretaria");

  let html = `<a href="index.html">Início</a>`;
  if (info.pai) {
    html += ` <span class="separador">›</span> <a href="${paginaAtual}">${info.nome}</a>`;
  }
  if (secretariaSelecionada) {
    html += ` <span class="separador">›</span> <span class="atual">${secretariaSelecionada}</span>`;
  } else {
    html = `<a href="index.html">Início</a> <span class="separador">›</span> <span class="atual">${info.nome}</span>`;
    if (secretariaSelecionada) {
      html += ` <span class="separador">›</span> <span class="atual">${secretariaSelecionada}</span>`;
    }
  }

  el.innerHTML = html;
  el.style.display = "";
}

/* -------------------------------------------------------------------------
   Renderizacao de estados
   ------------------------------------------------------------------------- */
function mostrarErro(container, mensagem) {
  if (!container) return;
  container.innerHTML = `<div class="erro" role="alert"><strong>Erro ao carregar dados.</strong><br>${mensagem}</div>`;
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
  const corBase = opcoes.cor || CORES.azulClaro;
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: opcoes.label || "Valor",
        data: dados,
        backgroundColor: corBase,
        borderColor: "rgba(26,26,26,0.35)",
        borderWidth: 1,
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
        borderColor: "rgba(26,26,26,0.4)",
        borderWidth: 1.5,
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

  const fonte = selo.fonte || "-";
  const per = selo.periodo_coberto || {};
  const q = selo.qualidade || {};
  const al = selo.alertas || {};

  const registrosBrutos = q.registros_brutos ?? q.registros_totais ?? 0;
  const registrosMultivinculo = q.registros_multivinculo ?? q.registros_duplicados ?? 0;
  const registrosLiquidos = q.registros_liquidos ?? 0;
  const percentualMultivinculo = q.percentual_multivinculo ?? q.percentual_duplicatas ?? 0;
  const valorMultivinculo = q.valor_multivinculo ?? 0;
  const percentualValorMultivinculo = q.percentual_valor_multivinculo ?? 0;
  const matriculasUnicas = q.matriculas_unicas ?? 0;
  const secretarias = q.secretarias ?? 0;

  const regNc = Array.isArray(al.codigos_regime_nao_mapeados) ? al.codigos_regime_nao_mapeados : [];
  const secNc = Array.isArray(al.secretarias_nao_mapeadas) ? al.secretarias_nao_mapeadas : [];
  const escNc = Array.isArray(al.escolaridades_nao_mapeadas) ? al.escolaridades_nao_mapeadas : [];

  const totalPendencias = regNc.length + secNc.length + escNc.length;
  const semAlerta = totalPendencias === 0;

  const dataFormatada = selo.gerado_em
    ? new Date(selo.gerado_em).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      })
    : "-";

  let blocoAlertas;
  if (semAlerta) {
    blocoAlertas = `
      <div class="ok">
        <strong>Auditoria em dia.</strong>
        Todos os códigos de regime, secretarias e escolaridades do portal
        foram mapeados. Nenhuma pendência de classificação.
      </div>`;
  } else {
    const detalhes = [];
    if (regNc.length) detalhes.push(`${regNc.length} código(s) de regime`);
    if (secNc.length) detalhes.push(`${secNc.length} secretaria(s)`);
    if (escNc.length) detalhes.push(`${escNc.length} escolaridade(s)`);
    blocoAlertas = `
      <div class="alerta">
        <strong>Atenção:</strong>
        foram detectadas pendências de classificação em ${detalhes.join(", ")}.
        Consulte os mapas públicos na página Sobre para detalhes.
      </div>`;
  }

  el.innerHTML = `
    <dt>Fonte</dt>
    <dd>${fonte}</dd>

    <dt>Período coberto</dt>
    <dd>${per.inicio || "-"} a ${per.fim || "-"} · ${per.total_meses || 0} meses</dd>

    <dt>Registros brutos</dt>
    <dd>${fmtNum.format(registrosBrutos)}</dd>

    <dt>Múltiplos vínculos por mês</dt>
    <dd>${fmtNum.format(registrosMultivinculo)} (${fmtPct(percentualMultivinculo)}) ·
        ${fmtBRLCompacto(valorMultivinculo)} (${fmtPct(percentualValorMultivinculo)})</dd>

    <dt>Registros únicos por mês</dt>
    <dd>${fmtNum.format(registrosLiquidos)}</dd>

    <dt>Servidores únicos</dt>
    <dd>${fmtNum.format(matriculasUnicas)}</dd>

    <dt>Secretarias</dt>
    <dd>${secretarias}</dd>

    <dt>Última atualização</dt>
    <dd>${dataFormatada}</dd>

    ${blocoAlertas}
  `;
}

/* -------------------------------------------------------------------------
   Inicializacao comum
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  inicializarMenu();
  inicializarBreadcrumb();
  atualizarBadgeAtualizacao();
});