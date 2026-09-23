/* =========================================================================
   Pagina Quadro - Raio-X do Quadro de Pessoal da Prefeitura de Sorocaba
   Blocos: escolaridade, tempo de casa, categoria, escolaridade x categoria,
   e genero x escolaridade.
   Correcao: rotulos das faixas de tempo de casa no grafico.
   ========================================================================= */

const ORDEM_ESCOLARIDADE = [
  "Sem escolaridade formal registrada",
  "Fundamental incompleto",
  "Fundamental completo",
  "Medio incompleto",
  "Medio completo",
  "Superior incompleto",
  "Superior completo",
  "Pos-graduacao",
  "Mestrado",
  "Doutorado",
];

const ROTULOS_TEMPO = {
  0: "0-5 anos",
  1: "6-10 anos",
  2: "11-15 anos",
  3: "16-20 anos",
  4: "21-25 anos",
  5: "26-30 anos",
  6: "30+ anos",
};

const estadoQuadro = {
  escolaridade: [],
  escolaridadeAno: [],
  escolaridadeCategoria: [],
  escolaridadeSecretaria: [],
  tempoServico: [],
  tempoServicoAno: [],
  categoriaMes: [],
  generoEscolaridade: [],
  resumoSecretaria: [],
  kpis: null,
  graficos: {},
};

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
async function inicializar() {
  try {
    const [
      escolaridade,
      escolaridadeAno,
      escolaridadeCategoria,
      escolaridadeSecretaria,
      tempoServico,
      tempoServicoAno,
      categoriaMes,
      generoEscolaridade,
      resumoSecretaria,
      kpis,
      auditoria,
    ] = await Promise.all([
      carregarCSV("dados/quadro_escolaridade.csv"),
      carregarCSV("dados/quadro_escolaridade_por_ano.csv"),
      carregarCSV("dados/quadro_escolaridade_categoria.csv"),
      carregarCSV("dados/quadro_escolaridade_secretaria.csv"),
      carregarCSV("dados/quadro_tempo_servico.csv"),
      carregarCSV("dados/quadro_tempo_servico_por_ano.csv"),
      carregarCSV("dados/composicao_categoria_mes.csv"),
      carregarCSV("dados/genero_por_escolaridade.csv"),
      carregarCSV("dados/resumo_secretaria.csv"),
      carregarJSON("dados/kpis.json"),
      carregarJSON("dados/auditoria.json"),
    ]);

    // Converte campos numericos
    const camposNumEsc = ["num_registros", "num_matriculas", "folha_total", "folha_media", "folha_mediana"];
    const camposNumTempo = ["num_registros", "num_matriculas", "folha_total", "folha_media"];

    [escolaridade, escolaridadeAno, escolaridadeCategoria, escolaridadeSecretaria].forEach((arr) => {
      arr.forEach((r) => camposNumEsc.forEach((c) => { if (c in r) r[c] = num(r[c]); }));
    });

    [tempoServico, tempoServicoAno].forEach((arr) => {
      arr.forEach((r) => camposNumTempo.forEach((c) => { if (c in r) r[c] = num(r[c]); }));
    });

    categoriaMes.forEach((r) => {
      r.folha_total = num(r.folha_total);
      r.num_registros = num(r.num_registros);
      r.num_matriculas = num(r.num_matriculas);
      r.percentual = num(r.percentual);
    });

    generoEscolaridade.forEach((r) => {
      r.num_matriculas = num(r.num_matriculas);
      r.folha_media = num(r.folha_media);
    });

    resumoSecretaria.forEach((r) => {
      r.folha_total = num(r.folha_total);
    });

    estadoQuadro.escolaridade = escolaridade;
    estadoQuadro.escolaridadeAno = escolaridadeAno;
    estadoQuadro.escolaridadeCategoria = escolaridadeCategoria;
    estadoQuadro.escolaridadeSecretaria = escolaridadeSecretaria;
    estadoQuadro.tempoServico = tempoServico;
    estadoQuadro.tempoServicoAno = tempoServicoAno;
    estadoQuadro.categoriaMes = categoriaMes;
    estadoQuadro.generoEscolaridade = generoEscolaridade;
    estadoQuadro.resumoSecretaria = resumoSecretaria;
    estadoQuadro.kpis = kpis;

    renderizarCabecalhoPeriodo(kpis);
    popularFiltros(escolaridadeAno, tempoServicoAno, resumoSecretaria);
    renderizarTudo("todos");
    renderizarSelo(auditoria);
    registrarEventos();
  } catch (e) {
    console.error(e);
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = `<div class="erro">
        <strong>Não foi possível carregar os dados do quadro.</strong><br>
        <small>${e.message}</small>
      </div>`;
    }
  }
}

function renderizarCabecalhoPeriodo(kpis) {
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
   Filtros
   ------------------------------------------------------------------------- */
function popularFiltros(escolaridadeAno, tempoServicoAno, resumoSecretaria) {
  const anos = new Set([
    ...escolaridadeAno.map((r) => r.ano),
    ...tempoServicoAno.map((r) => r.ano),
  ]);
  const anosOrdenados = [...anos].filter((a) => a).sort();

  const selAno = document.getElementById("seletor-ano");
  if (selAno) {
    selAno.innerHTML = `<option value="todos">Todos os anos (acumulado)</option>`;
    anosOrdenados.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = a;
      opt.textContent = a;
      selAno.appendChild(opt);
    });
  }

  const selSec = document.getElementById("seletor-secretaria-quadro");
  if (selSec && resumoSecretaria) {
    selSec.innerHTML = `<option value="todas">Todas as secretarias</option>`;
    resumoSecretaria.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.secretaria;
      opt.textContent = s.secretaria;
      selSec.appendChild(opt);
    });
  }
}

function registrarEventos() {
  const selAno = document.getElementById("seletor-ano");
  const selSec = document.getElementById("seletor-secretaria-quadro");

  if (selAno) {
    selAno.addEventListener("change", () => {
      if (selSec) selSec.value = "todas";
      renderizarTudo(selAno.value, "todas");
    });
  }
  if (selSec) {
    selSec.addEventListener("change", () => {
      if (selAno) selAno.value = "todos";
      renderizarTudo("todos", selSec.value);
    });
  }
}

/* -------------------------------------------------------------------------
   Renderizacao geral
   ------------------------------------------------------------------------- */
function renderizarTudo(ano, secretaria) {
  const esc = filtrarEscolaridade(ano, secretaria);
  const tempo = filtrarTempo(ano, secretaria);

  renderizarBlocoEscolaridade(esc);
  renderizarBlocoTempo(tempo);
  renderizarBlocoCategoria();
  renderizarBlocoEscolaridadeCategoria();
  renderizarBlocoGeneroEscolaridade();
}

function filtrarEscolaridade(ano, secretaria) {
  if (secretaria && secretaria !== "todas") {
    return estadoQuadro.escolaridadeSecretaria.filter((r) => r.secretaria === secretaria);
  }
  if (ano && ano !== "todos") {
    return estadoQuadro.escolaridadeAno.filter((r) => String(r.ano) === String(ano));
  }
  return estadoQuadro.escolaridade;
}

function filtrarTempo(ano, secretaria) {
  if (secretaria && secretaria !== "todas") {
    return estadoQuadro.tempoServico;
  }
  if (ano && ano !== "todos") {
    return estadoQuadro.tempoServicoAno.filter((r) => String(r.ano) === String(ano));
  }
  return estadoQuadro.tempoServico;
}

/* -------------------------------------------------------------------------
   Bloco 1: Escolaridade
   ------------------------------------------------------------------------- */
function renderizarBlocoEscolaridade(dados) {
  if (!dados.length) return;

  const ordenado = [...dados].sort(
    (a, b) =>
      ORDEM_ESCOLARIDADE.indexOf(a.escolaridade_canonica) -
      ORDEM_ESCOLARIDADE.indexOf(b.escolaridade_canonica)
  );

  const ctxCont = document.getElementById("grafico-escolaridade-contagem");
  if (ctxCont) {
    if (estadoQuadro.graficos.escContagem) estadoQuadro.graficos.escContagem.destroy();
    estadoQuadro.graficos.escContagem = graficoBarras(
      ctxCont,
      ordenado.map((d) => d.escolaridade_canonica),
      ordenado.map((d) => d.num_matriculas),
      {
        label: "Servidores",
        horizontal: true,
        cor: CORES.azulClaro,
        formatador: (v) => fmtNum.format(v) + " servidores",
        eixoFormatador: (v) => fmtNumCompacto(v),
      }
    );
  }

  const ctxFolha = document.getElementById("grafico-escolaridade-folha");
  if (ctxFolha) {
    if (estadoQuadro.graficos.escFolha) estadoQuadro.graficos.escFolha.destroy();
    estadoQuadro.graficos.escFolha = graficoBarras(
      ctxFolha,
      ordenado.map((d) => d.escolaridade_canonica),
      ordenado.map((d) => d.folha_media),
      {
        label: "Folha media",
        horizontal: true,
        cor: CORES.verdeClaro,
        formatador: (v) => fmtBRL.format(v),
        eixoFormatador: (v) => fmtBRLCompacto(v),
      }
    );
  }

  const tbody = document.querySelector("#tabela-escolaridade tbody");
  if (tbody) {
    tbody.innerHTML = ordenado.map((d) => `
      <tr>
        <td>${d.escolaridade_canonica}</td>
        <td class="numerico">${fmtNum.format(d.num_matriculas)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_total)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_media)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_mediana)}</td>
      </tr>`).join("");
  }

  const elNarr = document.getElementById("narrativa-escolaridade");
  if (elNarr) {
    const total = ordenado.reduce((s, d) => s + d.num_matriculas, 0);
    const top = [...ordenado].sort((a, b) => b.num_matriculas - a.num_matriculas)[0];
    if (top && total > 0) {
      const pct = ((top.num_matriculas / total) * 100).toFixed(1).replace(".", ",");
      elNarr.innerHTML = `O nível <strong>${top.escolaridade_canonica}</strong> concentra <strong>${pct}%</strong> dos servidores. A remuneração média cresce com o nível de instrução.`;
    }
  }
}

/* -------------------------------------------------------------------------
   Bloco 2: Tempo de servico (CORRIGIDO)
   ------------------------------------------------------------------------- */
function renderizarBlocoTempo(dados) {
  if (!dados.length) return;

  // Mapeia os rótulos das faixas (o CSV armazena o índice numérico)
  const labelsTempo = dados.map((d) => ROTULOS_TEMPO[d.faixa_tempo] || `${d.faixa_tempo} anos`);

  const ctxCont = document.getElementById("grafico-tempo-contagem");
  if (ctxCont) {
    if (estadoQuadro.graficos.tempoContagem) estadoQuadro.graficos.tempoContagem.destroy();
    estadoQuadro.graficos.tempoContagem = graficoBarras(
      ctxCont,
      labelsTempo,
      dados.map((d) => d.num_matriculas),
      {
        label: "Servidores",
        cor: CORES.azulClaro,
        formatador: (v) => fmtNum.format(v) + " servidores",
        eixoFormatador: (v) => fmtNumCompacto(v),
      }
    );
  }

  const ctxFolha = document.getElementById("grafico-tempo-folha");
  if (ctxFolha) {
    if (estadoQuadro.graficos.tempoFolha) estadoQuadro.graficos.tempoFolha.destroy();
    estadoQuadro.graficos.tempoFolha = graficoBarras(
      ctxFolha,
      labelsTempo,
      dados.map((d) => d.folha_media),
      {
        label: "Folha média",
        cor: CORES.verdeClaro,
        formatador: (v) => fmtBRL.format(v),
        eixoFormatador: (v) => fmtBRLCompacto(v),
      }
    );
  }

  const tbody = document.querySelector("#tabela-tempo tbody");
  if (tbody) {
    tbody.innerHTML = dados.map((d) => `
      <tr>
        <td>${ROTULOS_TEMPO[d.faixa_tempo] || `${d.faixa_tempo} anos`}</td>
        <td class="numerico">${fmtNum.format(d.num_matriculas)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_total)}</td>
        <td class="numerico">${fmtBRL.format(d.folha_media)}</td>
      </tr>`).join("");
  }

  const elNarr = document.getElementById("narrativa-tempo");
  if (elNarr) {
    const total = dados.reduce((s, d) => s + d.num_matriculas, 0);
    const top = [...dados].sort((a, b) => b.num_matriculas - a.num_matriculas)[0];
    if (top && total > 0) {
      const pct = ((top.num_matriculas / total) * 100).toFixed(1).replace(".", ",");
      const rotuloTop = ROTULOS_TEMPO[top.faixa_tempo] || `${top.faixa_tempo} anos`;
      elNarr.innerHTML = `A faixa <strong>${rotuloTop}</strong> concentra <strong>${pct}%</strong> dos servidores. A remuneração média tende a crescer com o tempo de casa.`;
    }
  }
}

/* -------------------------------------------------------------------------
   Bloco 3: Composicao por categoria
   ------------------------------------------------------------------------- */
function renderizarBlocoCategoria() {
  const dados = estadoQuadro.categoriaMes;
  if (!dados || !dados.length) return;

  const ultima = dados.reduce((acc, d) => {
    const chave = d.ano * 100 + d.mes;
    if (!acc || chave > (acc.ano * 100 + acc.mes)) return d;
    return acc;
  }, null);

  const snapshot = dados
    .filter((d) => d.ano === ultima.ano && d.mes === ultima.mes)
    .sort((a, b) => b.folha_total - a.folha_total);

  const ctxRosca = document.getElementById("grafico-categoria-rosca");
  if (ctxRosca) {
    if (estadoQuadro.graficos.catRosca) estadoQuadro.graficos.catRosca.destroy();
    estadoQuadro.graficos.catRosca = graficoRosca(
      ctxRosca,
      snapshot.map((d) => ROTULOS_GRUPO[d.regime_subgrupo] || d.regime_subgrupo),
      snapshot.map((d) => d.folha_total),
      snapshot.map((d) => CORES_GRUPO[d.regime_subgrupo] || CORES.cinzaTexto)
    );
  }

  const ctxLinha = document.getElementById("grafico-categoria-linha");
  if (ctxLinha) {
    if (estadoQuadro.graficos.catLinha) estadoQuadro.graficos.catLinha.destroy();

    const subgrupos = [...new Set(dados.map((d) => d.regime_subgrupo))];
    const periodosSet = new Set(dados.map((d) => `${d.ano}-${String(d.mes).padStart(2, "0")}`));
    const periodos = [...periodosSet].sort();

    const datasets = subgrupos.map((sg) => {
      const valores = periodos.map((p) => {
        const [ano, mes] = p.split("-").map(Number);
        const linha = dados.find(
          (d) => d.ano === ano && d.mes === mes && d.regime_subgrupo === sg
        );
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

    estadoQuadro.graficos.catLinha = new Chart(ctxLinha, {
      type: "line",
      data: {
        labels: periodos.map((p) => {
          const [ano, mes] = p.split("-").map(Number);
          return rotuloPeriodo(ano, mes);
        }),
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
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
            ticks: { color: CORES.cinzaTexto, callback: (v) => "R$ " + v.toFixed(0) + " mi" },
          },
        },
      },
    });
  }
}

/* -------------------------------------------------------------------------
   Bloco 4: Escolaridade x categoria (barras empilhadas)
   ------------------------------------------------------------------------- */
function renderizarBlocoEscolaridadeCategoria() {
  const dados = estadoQuadro.escolaridadeCategoria;
  const ctx = document.getElementById("grafico-escolaridade-categoria");
  if (!ctx || !dados || !dados.length) return;

  if (estadoQuadro.graficos.escCategoria) estadoQuadro.graficos.escCategoria.destroy();

  const escolaridades = [...new Set(dados.map((d) => d.escolaridade_canonica))]
    .sort((a, b) => ORDEM_ESCOLARIDADE.indexOf(a) - ORDEM_ESCOLARIDADE.indexOf(b));

  const subgrupos = [...new Set(dados.map((d) => d.regime_subgrupo))];

  const datasets = subgrupos.map((sg) => {
    const valores = escolaridades.map((esc) => {
      const linha = dados.find(
        (d) => d.escolaridade_canonica === esc && d.regime_subgrupo === sg
      );
      return linha ? linha.num_matriculas : 0;
    });
    return {
      label: ROTULOS_GRUPO[sg] || sg,
      data: valores,
      backgroundColor: CORES_GRUPO[sg] || CORES.cinzaTexto,
      borderRadius: 4,
      borderSkipped: false,
    };
  });

  estadoQuadro.graficos.escCategoria = new Chart(ctx, {
    type: "bar",
    data: { labels: escolaridades, datasets },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12, padding: 8 } },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${fmtNum.format(item.parsed.x)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          grid: { color: CORES.cinzaBorda },
          ticks: { color: CORES.cinzaTexto, callback: (v) => fmtNumCompacto(v) },
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto, font: { size: 10 } },
        },
      },
    },
  });
}

/* -------------------------------------------------------------------------
   Bloco 5: Genero x escolaridade (barras agrupadas)
   ------------------------------------------------------------------------- */
function renderizarBlocoGeneroEscolaridade() {
  const dados = estadoQuadro.generoEscolaridade;
  const ctx = document.getElementById("grafico-genero-escolaridade");
  if (!ctx || !dados || !dados.length) return;

  const escolaridades = [...new Set(dados.map((d) => d.escolaridade_canonica))]
    .sort((a, b) => ORDEM_ESCOLARIDADE.indexOf(a) - ORDEM_ESCOLARIDADE.indexOf(b));

  const fem = escolaridades.map((esc) => {
    const r = dados.find(
      (d) => d.escolaridade_canonica === esc && d.genero_inferido === "feminino"
    );
    return r ? r.num_matriculas : 0;
  });
  const masc = escolaridades.map((esc) => {
    const r = dados.find(
      (d) => d.escolaridade_canonica === esc && d.genero_inferido === "masculino"
    );
    return r ? r.num_matriculas : 0;
  });

  if (estadoQuadro.graficos.genEsc) estadoQuadro.graficos.genEsc.destroy();

  estadoQuadro.graficos.genEsc = new Chart(ctx, {
    type: "bar",
    data: {
      labels: escolaridades,
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
        legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${fmtNum.format(item.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: CORES.cinzaTexto, maxRotation: 45, autoSkip: false },
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