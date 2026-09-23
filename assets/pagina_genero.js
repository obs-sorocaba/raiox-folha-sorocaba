/* =========================================================================
   Pagina Genero - Raio-X do Quadro de Pessoal da Prefeitura de Sorocaba
   ========================================================================= */

const estadoGen = {
  geral: [],
  porCategoria: [],
  porSecretaria: [],
  porEscolaridade: [],
  faixaSalarial: [],
  lideranca: [],
  evolucao: [],
  gap: [],
  kpis: null,
  auditoria: null,
  graficos: {},
};

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

const ROTULOS_CATEGORIA = {
  efetivos: "Efetivos e empregados públicos",
  funcao_confianca: "Efetivos em função de confiança",
  comissionados: "Cargos em comissão",
  flexiveis: "Temporários, estagiários e eventuais",
  inativos: "Inativos e pensionistas",
};

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
async function inicializar() {
  try {
    const [
      geral, porCategoria, porSecretaria, porEscolaridade,
      faixaSalarial, lideranca, evolucao, gap, kpis, auditoria,
    ] = await Promise.all([
      carregarCSV("dados/genero_geral.csv"),
      carregarCSV("dados/genero_por_categoria.csv"),
      carregarCSV("dados/genero_por_secretaria.csv"),
      carregarCSV("dados/genero_por_escolaridade.csv"),
      carregarCSV("dados/genero_faixa_salarial.csv"),
      carregarCSV("dados/genero_lideranca.csv"),
      carregarCSV("dados/genero_evolucao_mensal.csv"),
      carregarCSV("dados/genero_gap_salarial.csv"),
      carregarJSON("dados/kpis.json"),
      carregarJSON("dados/auditoria.json"),
    ]);

    // Converte campos numericos
    geral.forEach((r) => {
      r.num_matriculas = num(r.num_matriculas);
      r.num_registros = num(r.num_registros);
      r.folha_total = num(r.folha_total);
      r.folha_media = num(r.folha_media);
      r.folha_mediana = num(r.folha_mediana);
      r.percentual_matriculas = num(r.percentual_matriculas);
      r.percentual_folha = num(r.percentual_folha);
    });

    porCategoria.forEach((r) => {
      r.num_matriculas = num(r.num_matriculas);
      r.num_registros = num(r.num_registros);
      r.folha_total = num(r.folha_total);
      r.folha_media = num(r.folha_media);
      r.total_matriculas = num(r.total_matriculas);
      r.pct_feminino = num(r.pct_feminino);
    });

    porSecretaria.forEach((r) => {
      r.num_matriculas = num(r.num_matriculas);
      r.folha_total = num(r.folha_total);
      r.folha_media = num(r.folha_media);
      r.total_matriculas = num(r.total_matriculas);
      r.pct_feminino = num(r.pct_feminino);
    });

    faixaSalarial.forEach((r) => {
      r.num_matriculas = num(r.num_matriculas);
      r.folha_media = num(r.folha_media);
    });

    lideranca.forEach((r) => {
      r.total = num(r.total);
      r.feminino = num(r.feminino);
      r.pct_feminino = num(r.pct_feminino);
    });

    evolucao.forEach((r) => {
      r.feminino = num(r.feminino);
      r.masculino = num(r.masculino);
      r.indefinido = num(r.indefinido);
      r.total = num(r.total);
      r.pct_feminino = num(r.pct_feminino);
    });

    gap.forEach((r) => {
      r.num_matriculas_feminino = num(r.num_matriculas_feminino);
      r.num_matriculas_masculino = num(r.num_matriculas_masculino);
      r.folha_media_feminino = num(r.folha_media_feminino);
      r.folha_media_masculino = num(r.folha_media_masculino);
      r.gap_absoluto = num(r.gap_absoluto);
      r.gap_percentual = num(r.gap_percentual);
    });

    estadoGen.geral = geral;
    estadoGen.porCategoria = porCategoria;
    estadoGen.porSecretaria = porSecretaria;
    estadoGen.porEscolaridade = porEscolaridade;
    estadoGen.faixaSalarial = faixaSalarial;
    estadoGen.lideranca = lideranca;
    estadoGen.evolucao = evolucao;
    estadoGen.gap = gap;
    estadoGen.kpis = kpis;
    estadoGen.auditoria = auditoria;

    renderizarCabecalho(kpis);
    renderizarInsights();
    renderizarGraficoGeral();
    renderizarGraficoEvolucao();
    renderizarTabelaGeral();
    renderizarLideranca();
    renderizarCategoria();
    renderizarSecretaria();
    renderizarGap();
    renderizarFaixaSalarial();
    renderizarSelo(auditoria);
  } catch (e) {
    console.error(e);
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = `<div class="erro">
        <strong>Não foi possível carregar os dados de gênero.</strong><br>
        <small>${e.message}</small>
      </div>`;
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
  el.innerHTML = `
    <strong>Período:</strong> ${p.inicio || "-"} a ${p.fim || "-"}
    &nbsp;·&nbsp;
    <strong>${p.meses_cobertos || 0} meses</strong>
  `;
}

/* -------------------------------------------------------------------------
   Cards de insight
   ------------------------------------------------------------------------- */
function renderizarInsights() {
  const el = document.getElementById("insights");
  if (!el) return;

  const f = estadoGen.geral.find((x) => x.genero_inferido === "feminino") || {};
  const pctFemGeral = num(f.percentual_matriculas);

  const lidGeral = estadoGen.lideranca.find((x) => x.categoria === "geral") || {};
  const lidLid = estadoGen.lideranca.find((x) => x.categoria === "lideranca") || {};
  const lidNao = estadoGen.lideranca.find((x) => x.categoria === "nao_lideranca") || {};
  const pctLid = num(lidLid.pct_feminino);
  const pctNaoLid = num(lidNao.pct_feminino);
  const gapLid = (pctNaoLid - pctLid).toFixed(1).replace(".", ",");

  const comissionados = estadoGen.porCategoria.find((x) => x.regime_subgrupo === "comissionados") || {};
  const flexiveis = estadoGen.porCategoria.find((x) => x.regime_subgrupo === "flexiveis") || {};
  const pctComFem = num(comissionados.pct_feminino);
  const pctFlexFem = num(flexiveis.pct_feminino);

  const gaps = estadoGen.gap.filter((x) => x.gap_percentual > 0);
  const gapMedio = gaps.length
    ? (gaps.reduce((s, x) => s + x.gap_percentual, 0) / gaps.length).toFixed(1).replace(".", ",")
    : "-";

  el.innerHTML = `
    <div class="kpi destaque">
      <div class="rotulo">Base do quadro</div>
      <div class="valor">${pctFemGeral.toFixed(1).replace(".", ",")}%</div>
      <div class="detalhe">das matrículas no último mês são de mulheres</div>
    </div>

    <div class="kpi alerta">
      <div class="rotulo">Liderança</div>
      <div class="valor">${pctLid.toFixed(1).replace(".", ",")}%</div>
      <div class="detalhe">das chefias são mulheres. Na base não-liderança são ${pctNaoLid.toFixed(1).replace(".", ",")}%</div>
    </div>

    <div class="kpi alerta">
      <div class="rotulo">Cargos em comissão</div>
      <div class="valor">${pctComFem.toFixed(1).replace(".", ",")}%</div>
      <div class="detalhe">das nomeações políticas são mulheres</div>
    </div>

    <div class="kpi alerta">
      <div class="rotulo">Vínculos precários</div>
      <div class="valor">${pctFlexFem.toFixed(1).replace(".", ",")}%</div>
      <div class="detalhe">dos temporários, estagiários e eventuais são mulheres</div>
    </div>

    <div class="kpi alerta">
      <div class="rotulo">Gap salarial médio</div>
      <div class="valor">${gapMedio}%</div>
      <div class="detalhe">diferença entre homens e mulheres no mesmo cargo</div>
    </div>
  `;

  const elLid = document.getElementById("insight-lideranca");
  if (elLid) {
    elLid.innerHTML = `
      As mulheres são <strong>${pctNaoLid.toFixed(1).replace(".", ",")}%</strong> dos servidores
      em funções não-liderança, mas ocupam apenas <strong>${pctLid.toFixed(1).replace(".", ",")}%</strong>
      dos cargos de liderança — uma diferença de
      <strong>${gapLid} pontos percentuais</strong>.
    `;
  }

  const elGap = document.getElementById("insight-gap");
  if (elGap) {
    elGap.innerHTML = `
      Análise restrita a <strong>${gaps.length}</strong> cargos com pelo menos
      10 servidores de cada gênero no último ano. A diferença salarial média é de
      <strong>${gapMedio}%</strong> a favor dos homens.
    `;
  }
}

/* -------------------------------------------------------------------------
   Grafico geral (rosca)
   ------------------------------------------------------------------------- */
function renderizarGraficoGeral() {
  const ctx = document.getElementById("grafico-geral");
  if (!ctx) return;

  const dados = estadoGen.geral.filter((x) => x.genero_inferido !== "indefinido");
  const labels = dados.map((x) =>
    x.genero_inferido === "feminino" ? "Feminino" : "Masculino"
  );
  const valores = dados.map((x) => x.num_matriculas);
  const cores = dados.map((x) =>
    x.genero_inferido === "feminino" ? CORES.funcao : CORES.azulClaro
  );

  estadoGen.graficos.geral = graficoRosca(ctx, labels, valores, cores);
}

/* -------------------------------------------------------------------------
   Evolucao mensal
   ------------------------------------------------------------------------- */
function renderizarGraficoEvolucao() {
  const ctx = document.getElementById("grafico-evolucao");
  if (!ctx) return;

  const dados = [...estadoGen.evolucao].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  const labels = dados.map((d) => rotuloPeriodo(d.ano, d.mes));
  const valores = dados.map((d) => d.pct_feminino);

  estadoGen.graficos.evolucao = graficoLinha(ctx, labels, valores, {
    label: "% feminino",
    cor: CORES.funcao,
    corFundo: "rgba(122,209,81,0.10)",
    formatador: (v) => v.toFixed(1).replace(".", ",") + "%",
    eixoYFormatador: (v) => v.toFixed(0) + "%",
    inicioZero: false,
  });
}

/* -------------------------------------------------------------------------
   Tabela geral
   ------------------------------------------------------------------------- */
function renderizarTabelaGeral() {
  const tbody = document.querySelector("#tabela-geral tbody");
  if (!tbody) return;

  const dados = [...estadoGen.geral].sort((a, b) => b.num_matriculas - a.num_matriculas);

  tbody.innerHTML = dados.map((d) => {
    const rotulo =
      d.genero_inferido === "feminino" ? "Feminino"
      : d.genero_inferido === "masculino" ? "Masculino"
      : "Indefinido";
    return `
      <tr>
        <td>${rotulo}</td>
        <td class="numerico">${fmtNum.format(d.num_matriculas)}</td>
        <td class="numerico">${fmtPct(d.percentual_matriculas)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_total)}</td>
        <td class="numerico">${fmtPct(d.percentual_folha)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_media)}</td>
      </tr>`;
  }).join("");
}

/* -------------------------------------------------------------------------
   Lideranca (barras comparativas)
   ------------------------------------------------------------------------- */
function renderizarLideranca() {
  const ctx = document.getElementById("grafico-lideranca");
  if (!ctx) return;

  const rotulos = {
    geral: "Base geral",
    nao_lideranca: "Não-liderança",
    lideranca: "Liderança",
  };

  const dados = estadoGen.lideranca
    .filter((x) => rotulos[x.categoria])
    .sort((a, b) => {
      // Ordem fixa: geral, nao_lideranca, lideranca
      const ord = { geral: 0, nao_lideranca: 1, lideranca: 2 };
      return ord[a.categoria] - ord[b.categoria];
    });

  const labels = dados.map((x) => rotulos[x.categoria]);
  const valores = dados.map((x) => x.pct_feminino);

  estadoGen.graficos.lideranca = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "% feminino",
        data: valores,
        backgroundColor: [CORES.azulClaro, CORES.funcao, CORES.amarelo],
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `${item.parsed.y.toFixed(1).replace(".", ",")}% feminino`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: CORES.cinzaBorda },
          ticks: { color: CORES.cinzaTexto, callback: (v) => v + "%" },
        },
        x: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
   Categoria (barras horizontais) - versao agrupada
   ------------------------------------------------------------------------- */
function renderizarCategoria() {
  const ctx = document.getElementById("grafico-categoria");
  if (!ctx) return;

  // Agrupa por categoria, pegando um registro por subgrupo
  const agrupado = {};
  estadoGen.porCategoria.forEach((r) => {
    const k = r.regime_subgrupo;
    if (!agrupado[k]) {
      agrupado[k] = {
        regime_subgrupo: k,
        total_matriculas: num(r.total_matriculas),
        pct_feminino: num(r.pct_feminino),
        folha_total: 0,
        folha_media_fem: 0,
        folha_media_masc: 0,
      };
    }
    agrupado[k].folha_total = Math.max(agrupado[k].folha_total, num(r.folha_total));
    if (r.genero_inferido === "feminino") {
      agrupado[k].folha_media_fem = num(r.folha_media);
    }
    if (r.genero_inferido === "masculino") {
      agrupado[k].folha_media_masc = num(r.folha_media);
    }
  });

  const dados = Object.values(agrupado)
    .filter((x) => ROTULOS_CATEGORIA[x.regime_subgrupo])
    .sort((a, b) => b.pct_feminino - a.pct_feminino);

  const labels = dados.map((x) => ROTULOS_CATEGORIA[x.regime_subgrupo]);
  const valores = dados.map((x) => x.pct_feminino);

  estadoGen.graficos.categoria = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "% feminino",
        data: valores,
        backgroundColor: dados.map((x) =>
          x.pct_feminino < 50 ? CORES.nc : CORES.azulClaro
        ),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `${item.parsed.x.toFixed(1).replace(".", ",")}% feminino`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: { color: CORES.cinzaBorda },
          ticks: { color: CORES.cinzaTexto, callback: (v) => v + "%" },
        },
        y: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto },
        },
      },
    },
  });

  // Tabela agrupada
  const tbody = document.querySelector("#tabela-categoria tbody");
  if (tbody) {
    tbody.innerHTML = dados.map((d) => `
      <tr>
        <td>${ROTULOS_CATEGORIA[d.regime_subgrupo]}</td>
        <td class="numerico">${fmtNum.format(d.total_matriculas)}</td>
        <td class="numerico">${fmtPct(d.pct_feminino)}</td>
        <td class="numerico">${fmtBRLCompacto(d.folha_total)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_media_fem)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_media_masc)}</td>
      </tr>`).join("");
  }
}

/* -------------------------------------------------------------------------
   Por secretaria (barras horizontais)
   ------------------------------------------------------------------------- */
function renderizarSecretaria() {
  const ctx = document.getElementById("grafico-secretaria");
  if (!ctx) return;

  const porSec = {};
  estadoGen.porSecretaria.forEach((r) => {
    if (!porSec[r.secretaria]) porSec[r.secretaria] = { total: 0, fem: 0 };
    const n = num(r.num_matriculas);
    if (r.genero_inferido === "feminino") porSec[r.secretaria].fem += n;
    porSec[r.secretaria].total += n;
  });

  const dados = Object.entries(porSec)
    .map(([sec, v]) => ({
      secretaria: sec,
      pct: v.total > 0 ? (v.fem / v.total * 100) : 0,
      total: v.total,
    }))
    .filter((x) => x.total >= 20)
    .sort((a, b) => b.pct - a.pct);

  const labels = dados.map((x) => x.secretaria);
  const valores = dados.map((x) => x.pct);

  estadoGen.graficos.secretaria = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "% feminino",
        data: valores,
        backgroundColor: dados.map((x) =>
          x.pct < 30 ? CORES.nc : x.pct < 60 ? CORES.amarelo : CORES.funcao
        ),
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const d = dados[item.dataIndex];
              return `${d.pct.toFixed(1).replace(".", ",")}% feminino (n=${fmtNum.format(d.total)})`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: { color: CORES.cinzaBorda },
          ticks: { color: CORES.cinzaTexto, callback: (v) => v + "%" },
        },
        y: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto, font: { size: 10 } },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
   Gap salarial (barras horizontais, top 25)
   ------------------------------------------------------------------------- */
function renderizarGap() {
  const ctx = document.getElementById("grafico-gap");
  if (!ctx) return;

  const dados = estadoGen.gap
    .filter((x) => x.gap_percentual > 0
      && x.num_matriculas_feminino >= 20
      && x.num_matriculas_masculino >= 20)
    .sort((a, b) => b.gap_percentual - a.gap_percentual)
    .slice(0, 25);

  const labels = dados.map((x) => x.cargo);
  const valores = dados.map((x) => x.gap_percentual);

  estadoGen.graficos.gap = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Gap %",
        data: valores,
        backgroundColor: valores.map((v) =>
          v >= 20 ? CORES.nc : v >= 10 ? CORES.amarelo : CORES.funcao
        ),
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const d = dados[item.dataIndex];
              return `Gap: ${d.gap_percentual.toFixed(1).replace(".", ",")}% (F: ${fmtBRL.format(d.folha_media_feminino)} | M: ${fmtBRL.format(d.folha_media_masculino)})`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: CORES.cinzaBorda },
          ticks: { color: CORES.cinzaTexto, callback: (v) => v + "%" },
        },
        y: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto, font: { size: 10 } },
        },
      },
    },
  });

  // Tabela completa
  const tbody = document.querySelector("#tabela-gap tbody");
  if (tbody) {
    const todos = [...estadoGen.gap]
      .filter((x) => x.gap_percentual > 0)
      .sort((a, b) => b.gap_percentual - a.gap_percentual);
    tbody.innerHTML = todos.map((d) => `
      <tr>
        <td>${d.cargo}</td>
        <td class="numerico">${fmtNum.format(d.num_matriculas_feminino)}</td>
        <td class="numerico">${fmtNum.format(d.num_matriculas_masculino)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_media_feminino)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_media_masculino)}</td>
        <td class="numerico"><strong>${fmtPct(d.gap_percentual)}</strong></td>
      </tr>`).join("");
  }
}

/* -------------------------------------------------------------------------
   Faixa salarial (barras empilhadas)
   ------------------------------------------------------------------------- */
function renderizarFaixaSalarial() {
  const ctx = document.getElementById("grafico-faixa");
  if (!ctx) return;

  const rotulos = {
    ate_2k: "Até R$ 2 mil",
    "2k_5k": "R$ 2-5 mil",
    "5k_10k": "R$ 5-10 mil",
    "10k_20k": "R$ 10-20 mil",
    acima_20k: "Acima de R$ 20 mil",
  };
  const ordem = ["ate_2k", "2k_5k", "5k_10k", "10k_20k", "acima_20k"];

  const fem = ordem.map((f) => {
    const r = estadoGen.faixaSalarial.find(
      (x) => x.faixa_salarial === f && x.genero_inferido === "feminino"
    );
    return r ? num(r.num_matriculas) : 0;
  });
  const masc = ordem.map((f) => {
    const r = estadoGen.faixaSalarial.find(
      (x) => x.faixa_salarial === f && x.genero_inferido === "masculino"
    );
    return r ? num(r.num_matriculas) : 0;
  });

  estadoGen.graficos.faixa = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ordem.map((f) => rotulos[f]),
      datasets: [
        {
          label: "Feminino",
          data: fem,
          backgroundColor: CORES.funcao,
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: "Masculino",
          data: masc,
          backgroundColor: CORES.azulClaro,
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { size: 11 }, boxWidth: 12 },
        },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${fmtNum.format(item.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto },
        },
        y: {
          beginAtZero: true,
          grid: { color: CORES.cinzaBorda },
          ticks: { color: CORES.cinzaTexto, callback: (v) => fmtNumCompacto(v) },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", inicializar);