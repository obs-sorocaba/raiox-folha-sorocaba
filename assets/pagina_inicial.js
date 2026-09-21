/* =========================================================================
   Pagina inicial - Raio-X do Quadro de Pessoal da Prefeitura de Sorocaba
   Le os agregados e renderiza KPIs, graficos e selo de auditoria.
   Toggle: Total x Recorrente no grafico mensal.
   NOVO: Grafico de folha nominal x real (corrigida pelo IPCA).
   ========================================================================= */

const estadoInicial = {
  folhaMensalTotal: [],
  folhaMensalRecorrente: [],
  folhaMensalIPCA: [],       // NOVO
  visaoAtual: "total",       // "total" | "recorrente"
  graficoMensal: null,
  graficoMensalIPCA: null,   // NOVO
};

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

/* -------------------------------------------------------------------------
   KPIs
   ------------------------------------------------------------------------- */
function renderizarKPIs(kpis) {
  const el = document.getElementById("kpis-container");
  if (!el) return;

  const ultimo = kpis.ultimo_mes || {};
  const totais = kpis.totais || {};
  const periodo = kpis.periodo || {};

  el.innerHTML = `
    <div class="kpi">
      <div class="rotulo">Folha bruta (último mês)</div>
      <div class="valor">${fmtBRLCompacto(ultimo.folha_bruta)}</div>
      <div class="detalhe">${rotuloPeriodo(ultimo.ano, ultimo.mes)}</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Servidores (último mês)</div>
      <div class="valor">${fmtNum.format(ultimo.matriculas || 0)}</div>
      <div class="detalhe">Matrículas únicas no mês</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Custo médio por servidor</div>
      <div class="valor">${fmtBRL.format(ultimo.ticket_medio || 0)}</div>
      <div class="detalhe">Folha bruta do mês ÷ matrículas únicas</div>
    </div>

    <div class="kpi destaque">
      <div class="rotulo">Folha acumulada no período</div>
      <div class="valor">${fmtBRLCompacto(totais.folha_bruta_total)}</div>
      <div class="detalhe">${periodo.meses_cobertos || 0} meses cobertos</div>
    </div>

    <div class="kpi positivo">
      <div class="rotulo">Variação no período</div>
      <div class="valor">${fmtPct(kpis.variacao_periodo_percentual || 0)}</div>
      <div class="detalhe">Nominal; em valores corrigidos pelo IPCA, ~+40%</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Secretarias</div>
      <div class="valor">${fmtNum.format(totais.secretarias_unicas || 0)}</div>
      <div class="detalhe">Órgãos distintos na base</div>
    </div>
  `;

  const ch = document.getElementById("cabecalho-periodo");
  if (ch) {
    ch.innerHTML = `
      <strong>Período:</strong> ${periodo.inicio || "-"} a ${periodo.fim || "-"}
      &nbsp;·&nbsp;
      <strong>${periodo.meses_cobertos || 0} meses</strong>
    `;
  }
}

/* -------------------------------------------------------------------------
   Grafico mensal (com toggle Total x Recorrente)
   ------------------------------------------------------------------------- */
function renderizarGraficoMensal() {
  const ctx = document.getElementById("grafico-mensal");
  if (!ctx) return;

  const dados = estadoInicial.visaoAtual === "total"
    ? estadoInicial.folhaMensalTotal
    : estadoInicial.folhaMensalRecorrente;

  if (!dados.length) return;

  const labels = dados.map((d) => rotuloPeriodo(d.ano, d.mes));
  const valores = dados.map((d) => d.folha_total / 1e6);

  if (estadoInicial.graficoMensal) estadoInicial.graficoMensal.destroy();

  const rotulo = estadoInicial.visaoAtual === "total"
    ? "Folha total (R$ mi)"
    : "Folha recorrente (R$ mi)";

  estadoInicial.graficoMensal = graficoLinha(ctx, labels, valores, {
    label: rotulo,
    cor: estadoInicial.visaoAtual === "total" ? CORES.azulClaro : CORES.funcao,
    corFundo: estadoInicial.visaoAtual === "total"
      ? "rgba(0,113,206,0.08)"
      : "rgba(92,156,42,0.10)",
    formatador: (v) => "R$ " + v.toFixed(1).replace(".", ",") + " mi",
    eixoYFormatador: (v) => "R$ " + v.toFixed(0) + " mi",
    inicioZero: false,
  });
}

function inicializarToggle() {
  const botoes = document.querySelectorAll("[data-visao]");
  botoes.forEach((btn) => {
    btn.addEventListener("click", () => {
      const visao = btn.getAttribute("data-visao");
      if (visao === estadoInicial.visaoAtual) return;
      estadoInicial.visaoAtual = visao;

      // Marca o ativo
      botoes.forEach((b) => b.classList.remove("ativo"));
      btn.classList.add("ativo");

      renderizarGraficoMensal();
    });
  });

  // Marca "Total" como ativo na abertura
  const btnTotal = document.querySelector('[data-visao="total"]');
  if (btnTotal) btnTotal.classList.add("ativo");
}

/* -------------------------------------------------------------------------
   Grafico mensal nominal x real (IPCA) — NOVO
   ------------------------------------------------------------------------- */
function renderizarGraficoMensalIPCA() {
  const ctx = document.getElementById("grafico-mensal-ipca");
  if (!ctx) return;

  const dados = estadoInicial.folhaMensalIPCA;
  if (!dados || !dados.length) return;

  const labels = dados.map((d) => rotuloPeriodo(d.ano, d.mes));
  const nominal = dados.map((d) => d.folha_nominal / 1e6);
  const real = dados.map((d) => d.folha_real / 1e6);

  if (estadoInicial.graficoMensalIPCA) estadoInicial.graficoMensalIPCA.destroy();

  estadoInicial.graficoMensalIPCA = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Folha nominal (R$ mi)",
          data: nominal,
          borderColor: CORES.azulClaro,
          backgroundColor: "rgba(0,113,206,0.08)",
          borderWidth: 2,
          fill: false,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
        },
        {
          label: "Folha real — corrigida pelo IPCA (R$ mi)",
          data: real,
          borderColor: CORES.nc,
          backgroundColor: "rgba(204,0,0,0.08)",
          borderWidth: 2,
          fill: false,
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
        legend: {
          position: "bottom",
          labels: { color: CORES.pretoSuave, font: { size: 11 }, boxWidth: 12, padding: 10 },
        },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: R$ ${item.parsed.y.toFixed(1).replace(".", ",")} mi`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto, maxRotation: 45, autoSkip: true, maxTicksLimit: 14 },
        },
        y: {
          beginAtZero: false,
          grid: { color: CORES.cinzaBorda },
          ticks: {
            color: CORES.cinzaTexto,
            callback: (v) => "R$ " + v.toFixed(0) + " mi",
          },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
   Composicao por categoria
   ------------------------------------------------------------------------- */
function renderizarComposicaoCategoria(dados) {
  if (!dados || !dados.length) return;

  const ultimoAno = Math.max(...dados.map((d) => d.ano));
  const mesesUltimoAno = dados.filter((d) => d.ano === ultimoAno).map((d) => d.mes);
  const ultimoMes = Math.max(...mesesUltimoAno);

  const ultimoSnapshot = dados.filter((d) => d.ano === ultimoAno && d.mes === ultimoMes);
  ultimoSnapshot.sort((a, b) => b.folha_total - a.folha_total);

  const labelsRosca = ultimoSnapshot.map((d) => ROTULOS_GRUPO[d.regime_subgrupo] || d.regime_subgrupo);
  const valoresRosca = ultimoSnapshot.map((d) => d.folha_total);
  const coresRosca = ultimoSnapshot.map((d) => CORES_GRUPO[d.regime_subgrupo] || CORES.cinzaTexto);

  const ctxRosca = document.getElementById("grafico-categoria-rosca");
  if (ctxRosca) {
    graficoRosca(ctxRosca, labelsRosca, valoresRosca, coresRosca);
  }

  const ctxLinha = document.getElementById("grafico-categoria-linha");
  if (!ctxLinha) return;

  const subgrupos = [...new Set(dados.map((d) => d.regime_subgrupo))];
  const periodosSet = new Set(dados.map((d) => `${d.ano}-${String(d.mes).padStart(2, "0")}`));
  const periodos = [...periodosSet].sort();

  const datasets = subgrupos.map((sg) => {
    const valores = periodos.map((p) => {
      const [ano, mes] = p.split("-").map(Number);
      const linha = dados.find((d) => d.ano === ano && d.mes === mes && d.regime_subgrupo === sg);
      return linha ? linha.folha_total / 1e6 : 0;
    });
    return {
      label: ROTULOS_GRUPO[sg] || sg,
      data: valores,
      borderColor: CORES_GRUPO[sg] || CORES.cinzaTexto,
      backgroundColor: (CORES_GRUPO[sg] || CORES.cinzaTexto) + "22",
      borderWidth: 2,
      fill: false,
      tension: 0.25,
      pointRadius: 0,
      pointHoverRadius: 5,
    };
  });

  const labelsLinha = periodos.map((p) => {
    const [ano, mes] = p.split("-").map(Number);
    return rotuloPeriodo(ano, mes);
  });

  new Chart(ctxLinha, {
    type: "line",
    data: { labels: labelsLinha, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: CORES.pretoSuave, font: { size: 11 }, boxWidth: 12, padding: 8 },
        },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: R$ ${item.parsed.y.toFixed(1).replace(".", ",")} mi`,
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
            callback: (v) => "R$ " + v.toFixed(0) + " mi",
          },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
   Top secretarias
   ------------------------------------------------------------------------- */
function renderizarTopSecretarias(topSec, top = 15) {
  if (!topSec || !topSec.length) return;

  const recorte = topSec.slice(0, top);
  const ordenado = [...recorte].sort((a, b) => a.folha_total - b.folha_total);

  const ctx = document.getElementById("grafico-secretarias");
  if (ctx) {
    graficoBarras(ctx, ordenado.map((s) => s.secretaria), ordenado.map((s) => s.folha_total / 1e6), {
      label: "Folha (R$ mi)",
      horizontal: true,
      cor: CORES.viridis[3],
      formatador: (v) => "R$ " + v.toFixed(1).replace(".", ",") + " mi",
      eixoFormatador: (v) => v.toFixed(0) + " mi",
    });
  }

  const tbody = document.querySelector("#tabela-secretarias tbody");
  if (tbody) {
    tbody.innerHTML = recorte
      .map(
        (s) => `
      <tr>
        <td>${s.secretaria}</td>
        <td class="numerico">${fmtBRL.format(s.folha_total)}</td>
        <td class="numerico">${fmtBRL.format(s.folha_media_mensal)}</td>
        <td class="numerico">${fmtPct(s.percentual_folha)}</td>
        <td class="numerico">${fmtNum.format(s.num_matriculas)}</td>
      </tr>`
      )
      .join("");
  }
}

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
async function inicializar() {
  try {
    const [kpis, auditoria, mensalTotal, mensalRecorrente, mensalIPCA, categoria, topSec] = await Promise.all([
      carregarJSON("dados/kpis.json"),
      carregarJSON("dados/auditoria.json"),
      carregarCSV("dados/folha_mensal.csv"),
      carregarCSV("dados/folha_mensal_recorrente.csv"),
      carregarCSV("dados/folha_mensal_ipca.csv"),   // NOVO
      carregarCSV("dados/composicao_categoria_mes.csv"),
      carregarCSV("dados/top_secretarias.csv"),
    ]);

    // Converte campos numericos
    const camposNum = ["folha_total", "folha_liquida", "num_registros",
                       "num_matriculas", "ticket_medio", "percentual"];
    [mensalTotal, mensalRecorrente].forEach((arr) => {
      arr.forEach((r) => {
        camposNum.forEach((c) => { if (c in r) r[c] = num(r[c]); });
      });
    });

    // NOVO: campos especificos do IPCA
    mensalIPCA.forEach((r) => {
      r.folha_nominal = num(r.folha_nominal);
      r.indice_ipca = num(r.indice_ipca);
      r.fator_correcao = num(r.fator_correcao);
      r.folha_real = num(r.folha_real);
    });

    estadoInicial.folhaMensalTotal = mensalTotal;
    estadoInicial.folhaMensalRecorrente = mensalRecorrente;
    estadoInicial.folhaMensalIPCA = mensalIPCA;   // NOVO

    renderizarKPIs(kpis);
    renderizarGraficoMensal();
    renderizarGraficoMensalIPCA();   // NOVO
    inicializarToggle();
    renderizarComposicaoCategoria(categoria);
    renderizarTopSecretarias(topSec);
    renderizarSelo(auditoria);
  } catch (e) {
    console.error(e);
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = `<div class="erro" role="alert">
        <strong>Não foi possível carregar os dados.</strong><br>
        Verifique se a pasta <code>dados/</code> existe e contém os arquivos do pipeline.<br>
        <small>${e.message}</small>
      </div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", inicializar);