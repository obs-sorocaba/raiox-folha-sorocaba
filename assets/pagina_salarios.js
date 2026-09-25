/* =========================================================================
Pagina Salarios - Raio-X do Quadro de Pessoal da Prefeitura de Sorocaba
Le distribuicao_salarial.csv, gini_mensal.csv, histograma_salarial.csv
e salarios_por_perfil.csv, e renderiza KPIs, graficos e tabelas.
========================================================================= */
const estadoSal = {
  distribuicao: [],
  gini: [],
  histograma: [],
  salariosPerfil: [],
  kpis: null,
  auditoria: null,
  graficos: {},
};

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

function escaparHTMLSalarios(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* -------------------------------------------------------------------------
Inicializacao
------------------------------------------------------------------------- */
async function inicializar() {
  try {
    const [distribuicao, gini, histograma, salariosPerfil, kpis, auditoria] = await Promise.all([
      carregarCSV("dados/distribuicao_salarial.csv"),
      carregarCSV("dados/gini_mensal.csv"),
      carregarCSV("dados/histograma_salarial.csv"),
      carregarCSV("dados/salarios_por_perfil.csv"),
      carregarJSON("dados/kpis.json"),
      carregarJSON("dados/auditoria.json"),
    ]);

    // Converte campos numericos
    distribuicao.forEach((r) => {
      ["ano", "mes", "n", "media", "p10", "p25", "p50", "p75", "p90", "p95", "p99"]
        .forEach((c) => { if (c in r) r[c] = num(r[c]); });
    });

    gini.forEach((r) => {
      ["ano", "mes", "n", "gini"].forEach((c) => { if (c in r) r[c] = num(r[c]); });
    });

    histograma.forEach((r) => {
      ["n", "folha", "ano", "mes"].forEach((c) => { if (c in r) r[c] = num(r[c]); });
    });

    salariosPerfil.forEach((r) => {
      ["n", "folha_media", "folha_mediana"].forEach((c) => { if (c in r) r[c] = num(r[c]); });
    });

    estadoSal.distribuicao = distribuicao.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    estadoSal.gini = gini.sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    estadoSal.histograma = histograma;
    estadoSal.salariosPerfil = salariosPerfil;
    estadoSal.kpis = kpis;
    estadoSal.auditoria = auditoria;

    renderizarCabecalho(kpis);
    renderizarPanorama();
    renderizarGraficoPercentis();
    renderizarGraficoGini();
    renderizarHistograma();
    renderizarSalariosPerfil();
    renderizarTabelaPercentis();
    renderizarSelo(auditoria);
  } catch (e) {
    console.error(e);
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML =
        '<div class="erro" role="alert">' +
        "<strong>Não foi possível carregar os dados de salários.</strong><br>" +
        "<small>" + escaparHTMLSalarios(e.message) + "</small>" +
        "</div>";
    }
  }
}

/* -------------------------------------------------------------------------
Cabecalho
------------------------------------------------------------------------- */
function renderizarCabecalho(kpis) {
  const el = document.getElementById("cabecalho-periodo");
  if (!el || !kpis) return;

  const p = kpis.periodo || {};
  el.innerHTML =
    "<strong>Período:</strong> " + (p.inicio || "-") + " a " + (p.fim || "-") +
    " &nbsp;·&nbsp; <strong>" + (p.meses_cobertos || 0) + " meses</strong>";
}

/* -------------------------------------------------------------------------
Panorama (cards de KPI do ultimo mes)
------------------------------------------------------------------------- */
function renderizarPanorama() {
  const el = document.getElementById("kpis-salarios");
  if (!el) return;

  const dist = estadoSal.distribuicao;
  const gin = estadoSal.gini;

  if (!dist.length || !gin.length) return;

  const ultDist = dist[dist.length - 1];
  const ultGini = gin[gin.length - 1];
  const mesRef = rotuloPeriodo(ultDist.ano, ultDist.mes);
  const giniValor = Number(ultGini.gini || 0);

  el.innerHTML = `
    <div class="kpi">
      <div class="rotulo">Matrículas c/ Pagamento Mensal</div>
      <div class="valor">${fmtNum.format(ultDist.n)}</div>
      <div class="detalhe">${mesRef}</div>
    </div>
    <div class="kpi">
      <div class="rotulo">p10 (base 10%)</div>
      <div class="valor">${fmtBRL.format(ultDist.p10)}</div>
      <div class="detalhe">10% ganham abaixo deste valor</div>
    </div>
    <div class="kpi destaque">
      <div class="rotulo">Mediana (p50)</div>
      <div class="valor">${fmtBRL.format(ultDist.p50)}</div>
      <div class="detalhe">Metade ganha até aqui</div>
    </div>
    <div class="kpi">
      <div class="rotulo">Média</div>
      <div class="valor">${fmtBRL.format(ultDist.media)}</div>
      <div class="detalhe">Soma dividida pelo número de matrículas</div>
    </div>
    <div class="kpi">
      <div class="rotulo">p90 (topo 10%)</div>
      <div class="valor">${fmtBRL.format(ultDist.p90)}</div>
      <div class="detalhe">10% ganham acima deste valor</div>
    </div>
    <div class="kpi positivo">
      <div class="rotulo">Gini do mês</div>
      <div class="valor">${giniValor.toFixed(3).replace(".", ",")}</div>
      <div class="detalhe">0 = igual; 1 = concentrado</div>
    </div>
  `;
}

/* -------------------------------------------------------------------------
Grafico de percentis (p10, p50, p90)
------------------------------------------------------------------------- */
function renderizarGraficoPercentis() {
  const ctx = document.getElementById("grafico-percentis");
  if (!ctx) return;

  const dist = estadoSal.distribuicao;
  if (!dist.length) return;

  const labels = dist.map((d) => rotuloPeriodo(d.ano, d.mes));

  if (estadoSal.graficos.percentis) estadoSal.graficos.percentis.destroy();

  estadoSal.graficos.percentis = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "p90 (topo 10%)",
          data: dist.map((d) => d.p90),
          borderColor: CORES.azulClaro,
          backgroundColor: "rgba(0,113,206,0.08)",
          borderWidth: 2,
          fill: false,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: "Mediana (p50)",
          data: dist.map((d) => d.p50),
          borderColor: CORES.verdeClaro,
          backgroundColor: "rgba(122,182,72,0.10)",
          borderWidth: 2,
          fill: false,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
        {
          label: "p10 (base 10%)",
          data: dist.map((d) => d.p10),
          borderColor: CORES.azulEscuro,
          backgroundColor: "rgba(0,58,112,0.08)",
          borderWidth: 2,
          fill: false,
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: CORES.pretoSuave, font: { size: 11 }, boxWidth: 12, padding: 10 },
        },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${fmtBRL.format(item.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto, maxRotation: 45, autoSkip: true, maxTicksLimit: 14 },
        },
        y: {
          beginAtZero: true,
          grid: { color: CORES.cinzaBorda },
          ticks: {
            color: CORES.cinzaTexto,
            callback: (v) => fmtBRLCompacto(v),
          },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
Grafico de Gini
------------------------------------------------------------------------- */
function renderizarGraficoGini() {
  const ctx = document.getElementById("grafico-gini");
  if (!ctx) return;

  const gin = estadoSal.gini;
  if (!gin.length) return;

  const labels = gin.map((d) => rotuloPeriodo(d.ano, d.mes));

  if (estadoSal.graficos.gini) estadoSal.graficos.gini.destroy();

  estadoSal.graficos.gini = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Gini",
          data: gin.map((d) => d.gini),
          borderColor: CORES.azulClaro,
          backgroundColor: "rgba(0,113,206,0.08)",
          borderWidth: 2,
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `Gini: ${item.parsed.y.toFixed(3).replace(".", ",")}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto, maxRotation: 45, autoSkip: true, maxTicksLimit: 14 },
        },
        y: {
          beginAtZero: true,
          max: 1,
          grid: { color: CORES.cinzaBorda },
          ticks: {
            color: CORES.cinzaTexto,
            callback: (v) => v.toFixed(2).replace(".", ","),
          },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
Histograma por faixa
------------------------------------------------------------------------- */
function renderizarHistograma() {
  const ctx = document.getElementById("grafico-histograma");
  if (!ctx) return;

  const dados = estadoSal.histograma;
  if (!dados || !dados.length) return;

  const ultimo = dados.reduce((acc, d) => {
    const chave = num(d.ano) * 100 + num(d.mes);
    const accChave = acc ? num(acc.ano) * 100 + num(acc.mes) : -1;
    return chave > accChave ? d : acc;
  }, null) || dados[0];

  const anoRef = num(ultimo.ano);
  const mesRef = num(ultimo.mes);

  const dadosMes = dados.filter((d) => num(d.ano) === anoRef && num(d.mes) === mesRef);
  if (!dadosMes.length) return;

  const titulo = document.getElementById("titulo-histograma");
  if (titulo) {
    titulo.textContent = `Servidores por faixa de remuneração mensal — ${rotuloPeriodo(anoRef, mesRef)}`;
  }

  const rotulos = {
    ate_2k: "Até R$ 2 mil",
    "2k_4k": "R$ 2-4 mil",
    "4k_6k": "R$ 4-6 mil",
    "6k_8k": "R$ 6-8 mil",
    "8k_10k": "R$ 8-10 mil",
    "10k_15k": "R$ 10-15 mil",
    "15k_20k": "R$ 15-20 mil",
    "20k_30k": "R$ 20-30 mil",
    acima_30k: "Acima de R$ 30 mil",
  };

  const labels = dadosMes.map((d) => rotulos[d.faixa] || d.faixa);
  const valores = dadosMes.map((d) => d.n);
  const totalFaixa = dadosMes.reduce((s, x) => s + num(x.n), 0);

  if (estadoSal.graficos.histograma) estadoSal.graficos.histograma.destroy();

  estadoSal.graficos.histograma = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Servidores",
          data: valores,
          backgroundColor: [
            "#2a788e", "#2a788e", "#2a788e",
            "#5c9c2a", "#5c9c2a",
            "#414487", "#414487",
            "#d4a900", "#cc0000",
          ],
          borderColor: "rgba(26,26,26,0.35)",
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const d = dadosMes[item.dataIndex];
              const pct = totalFaixa > 0 ? ((num(d.n) / totalFaixa) * 100).toFixed(1).replace(".", ",") : "0,0";
              return `${fmtNum.format(d.n)} servidores (${pct}%) — ${fmtBRLCompacto(d.folha)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto, maxRotation: 45, autoSkip: false, font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid: { color: CORES.cinzaBorda },
          ticks: {
            color: CORES.cinzaTexto,
            callback: (v) => fmtNumCompacto(v),
          },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
Remuneracao por perfil (Fase 1b)
------------------------------------------------------------------------- */
function renderizarSalariosPerfil() {
  const dados = estadoSal.salariosPerfil || [];
  if (!dados.length) return;

  renderizarGraficoSalarioEscolaridade(dados);
  renderizarGraficoSalarioTempo(dados);
  renderizarTabelaSalarioPerfil(dados);
}

function renderizarGraficoSalarioEscolaridade(dados) {
  const ctx = document.getElementById("grafico-salario-escolaridade");
  if (!ctx) return;

  const escolaridade = dados.filter((d) => d.dimensao === "escolaridade");
  if (!escolaridade.length) return;

  if (estadoSal.graficos.salEsc) estadoSal.graficos.salEsc.destroy();

  estadoSal.graficos.salEsc = graficoBarras(
    ctx,
    escolaridade.map((d) => d.categoria),
    escolaridade.map((d) => d.folha_media),
    {
      label: "Folha média",
      horizontal: true,
      cor: CORES.azulClaro,
      formatador: (v) => fmtBRL.format(v),
      eixoFormatador: (v) => fmtBRLCompacto(v),
    }
  );
}

function renderizarGraficoSalarioTempo(dados) {
  const ctx = document.getElementById("grafico-salario-tempo");
  if (!ctx) return;

  const tempo = dados.filter((d) => d.dimensao === "tempo_casa");
  if (!tempo.length) return;

  if (estadoSal.graficos.salTempo) estadoSal.graficos.salTempo.destroy();

  // Barras verticais: eixo X = categorias (0-5 anos, 6-10 anos, ...),
  // eixo Y = valores em R$. Não passar eixoFormatador, senão ele
  // sobrescreve os rótulos das categorias no eixo X.
  estadoSal.graficos.salTempo = graficoBarras(
    ctx,
    tempo.map((d) => d.categoria),
    tempo.map((d) => d.folha_media),
    {
      label: "Folha média",
      cor: CORES.verdeClaro,
      formatador: (v) => fmtBRL.format(v),
    }
  );
}

function renderizarTabelaSalarioPerfil(dados) {
  const tbody = document.querySelector("#tabela-salario-perfil tbody");
  if (!tbody) return;

  const rotuloDim = {
    escolaridade: "Escolaridade",
    tempo_casa: "Tempo de casa",
  };

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="carregando">Sem dados de remuneração por perfil.</td></tr>';
    return;
  }

  tbody.innerHTML = dados.map((d) => `
    <tr>
      <td>${escaparHTMLSalarios(rotuloDim[d.dimensao] || d.dimensao)}</td>
      <td>${escaparHTMLSalarios(d.categoria)}</td>
      <td class="numerico">${fmtNum.format(d.n)}</td>
      <td class="numerico">${fmtBRL.format(d.folha_media)}</td>
      <td class="numerico">${fmtBRL.format(d.folha_mediana)}</td>
    </tr>
  `).join("");
}

/* -------------------------------------------------------------------------
Tabela de percentis
------------------------------------------------------------------------- */
function renderizarTabelaPercentis() {
  const tbody = document.querySelector("#tabela-percentis tbody");
  if (!tbody) return;

  const dados = [...estadoSal.distribuicao].sort(
    (a, b) => b.ano - a.ano || b.mes - a.mes
  );

  if (!dados.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="carregando">Sem dados de percentis.</td></tr>';
    return;
  }

  tbody.innerHTML = dados
    .map((d) => `
      <tr>
        <td>${rotuloPeriodo(d.ano, d.mes)}</td>
        <td class="numerico">${fmtNum.format(d.n)}</td>
        <td class="numerico">${fmtBRL.format(d.media)}</td>
        <td class="numerico">${fmtBRL.format(d.p10)}</td>
        <td class="numerico">${fmtBRL.format(d.p25)}</td>
        <td class="numerico"><strong>${fmtBRL.format(d.p50)}</strong></td>
        <td class="numerico">${fmtBRL.format(d.p75)}</td>
        <td class="numerico">${fmtBRL.format(d.p90)}</td>
        <td class="numerico">${fmtBRL.format(d.p99)}</td>
      </tr>
    `)
    .join("");
}

/* -------------------------------------------------------------------------
Inicializacao
------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", inicializar);