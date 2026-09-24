/* =========================================================================
   Pagina Perfil das Unidades — Raio-X do Quadro de Pessoal
   Blocos: escolaridade (contagem), tempo de casa (contagem),
           escolaridade x categoria, genero x escolaridade,
           e unidades municipais (Fase 1a).
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

const ROTULOS_TIPO_UNIDADE = {
  unidade_fisica: "Unidades físicas",
  setor_operacional: "Setores operacionais",
  categoria_administrativa: "Categorias administrativas",
  outros: "Outros",
};

const CORES_TIPO_UNIDADE = {
  unidade_fisica: "#1c4e80",
  setor_operacional: "#4a90d9",
  categoria_administrativa: "#f9a825",
  outros: "#a0aec0",
};

const estadoQuadro = {
  escolaridade: [],
  escolaridadeAno: [],
  escolaridadeCategoria: [],
  escolaridadeSecretaria: [],
  tempoServico: [],
  tempoServicoAno: [],
  generoEscolaridade: [],
  resumoSecretaria: [],
  unidadeTipo: [],
  unidadeTop20: [],
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
      generoEscolaridade,
      resumoSecretaria,
      unidadeTipo,
      unidadeTop20,
      kpis,
      auditoria,
    ] = await Promise.all([
      carregarCSV("dados/quadro_escolaridade.csv"),
      carregarCSV("dados/quadro_escolaridade_por_ano.csv"),
      carregarCSV("dados/quadro_escolaridade_categoria.csv"),
      carregarCSV("dados/quadro_escolaridade_secretaria.csv"),
      carregarCSV("dados/quadro_tempo_servico.csv"),
      carregarCSV("dados/quadro_tempo_servico_por_ano.csv"),
      carregarCSV("dados/genero_por_escolaridade.csv"),
      carregarCSV("dados/resumo_secretaria.csv"),
      carregarCSV("dados/unidade_tipo.csv"),
      carregarCSV("dados/unidade_top20.csv"),
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

    generoEscolaridade.forEach((r) => {
      r.num_matriculas = num(r.num_matriculas);
      r.folha_media = num(r.folha_media);
    });

    resumoSecretaria.forEach((r) => {
      r.folha_total = num(r.folha_total);
    });

    unidadeTipo.forEach((r) => {
      r.num_unidades = num(r.num_unidades);
      r.efetivo = num(r.efetivo);
      r.folha_total = num(r.folha_total);
      r.ticket_medio = num(r.ticket_medio);
    });

    unidadeTop20.forEach((r) => {
      r.efetivo = num(r.efetivo);
      r.folha_total = num(r.folha_total);
      r.ticket_medio = num(r.ticket_medio);
    });

    estadoQuadro.escolaridade = escolaridade;
    estadoQuadro.escolaridadeAno = escolaridadeAno;
    estadoQuadro.escolaridadeCategoria = escolaridadeCategoria;
    estadoQuadro.escolaridadeSecretaria = escolaridadeSecretaria;
    estadoQuadro.tempoServico = tempoServico;
    estadoQuadro.tempoServicoAno = tempoServicoAno;
    estadoQuadro.generoEscolaridade = generoEscolaridade;
    estadoQuadro.resumoSecretaria = resumoSecretaria;
    estadoQuadro.unidadeTipo = unidadeTipo;
    estadoQuadro.unidadeTop20 = unidadeTop20;
    estadoQuadro.kpis = kpis;

    renderizarCabecalhoPeriodo(kpis);
    popularFiltros(escolaridadeAno, tempoServicoAno, resumoSecretaria);
    renderizarTudo("todos", "todas");
    renderizarUnidades(unidadeTipo, unidadeTop20);
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
   Bloco 1: Escolaridade (contagem apenas)
   ------------------------------------------------------------------------- */
function renderizarBlocoEscolaridade(dados) {
  if (!dados.length) return;

  const ordenado = [...dados].sort(
    (a, b) =>
      ORDEM_ESCOLARIDADE.indexOf(a.escolaridade_canonica) -
      ORDEM_ESCOLARIDADE.indexOf(b.escolaridade_canonica)
  );

  const total = ordenado.reduce((s, d) => s + d.num_matriculas, 0);

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

  // Tabela: agora só nível, servidores e % do total
  const tbody = document.querySelector("#tabela-escolaridade tbody");
  if (tbody) {
    tbody.innerHTML = ordenado.map((d) => {
      const pct = total > 0 ? ((d.num_matriculas / total) * 100) : 0;
      return `
        <tr>
          <td>${d.escolaridade_canonica}</td>
          <td class="numerico">${fmtNum.format(d.num_matriculas)}</td>
          <td class="numerico">${fmtPct(pct)}</td>
        </tr>`;
    }).join("");
  }

  const elNarr = document.getElementById("narrativa-escolaridade");
  if (elNarr) {
    const top = [...ordenado].sort((a, b) => b.num_matriculas - a.num_matriculas)[0];
    if (top && total > 0) {
      const pct = ((top.num_matriculas / total) * 100).toFixed(1).replace(".", ",");
      elNarr.innerHTML = `O nível <strong>${top.escolaridade_canonica}</strong> concentra <strong>${pct}%</strong> dos servidores.`;
    }
  }
}

/* -------------------------------------------------------------------------
   Bloco 2: Tempo de casa (contagem apenas)
   ------------------------------------------------------------------------- */
function renderizarBlocoTempo(dados) {
  if (!dados.length) return;

  const labelsTempo = dados.map((d) => ROTULOS_TEMPO[d.faixa_tempo] || `${d.faixa_tempo} anos`);
  const total = dados.reduce((s, d) => s + d.num_matriculas, 0);

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

  // Tabela: agora só faixa, servidores e % do total
  const tbody = document.querySelector("#tabela-tempo tbody");
  if (tbody) {
    tbody.innerHTML = dados.map((d) => {
      const pct = total > 0 ? ((d.num_matriculas / total) * 100) : 0;
      return `
        <tr>
          <td>${ROTULOS_TEMPO[d.faixa_tempo] || `${d.faixa_tempo} anos`}</td>
          <td class="numerico">${fmtNum.format(d.num_matriculas)}</td>
          <td class="numerico">${fmtPct(pct)}</td>
        </tr>`;
    }).join("");
  }

  const elNarr = document.getElementById("narrativa-tempo");
  if (elNarr) {
    const top = [...dados].sort((a, b) => b.num_matriculas - a.num_matriculas)[0];
    if (top && total > 0) {
      const pct = ((top.num_matriculas / total) * 100).toFixed(1).replace(".", ",");
      const rotuloTop = ROTULOS_TEMPO[top.faixa_tempo] || `${top.faixa_tempo} anos`;
      elNarr.innerHTML = `A faixa <strong>${rotuloTop}</strong> concentra <strong>${pct}%</strong> dos servidores.`;
    }
  }
}

/* -------------------------------------------------------------------------
   Bloco 3: Escolaridade x categoria (barras empilhadas)
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
      label: window.ROTULOS_GRUPO[sg] || sg,
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
   Bloco 4: Genero x escolaridade (barras agrupadas)
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

/* =========================================================================
   Unidades — Fase 1a
   Consome: dados/unidade_tipo.csv + dados/unidade_top20.csv
   ========================================================================= */

function renderizarUnidades(unidadeTipo, unidadeTop20) {
  if (unidadeTipo && unidadeTipo.length) {
    renderizarKPIsUnidades(unidadeTipo);
    renderizarGraficosUnidades(unidadeTipo);
    renderizarTabelaUnidadeTipo(unidadeTipo);
  }
  if (unidadeTop20 && unidadeTop20.length) {
    renderizarTabelaUnidadeTop20(unidadeTop20);
  }
}

function renderizarKPIsUnidades(dados) {
  const get = (tipo) => dados.find((d) => d.tipo_unidade === tipo) || {};
  const fisica = get("unidade_fisica");
  const setor = get("setor_operacional");
  const categoria = get("categoria_administrativa");
  const total = dados.reduce((s, d) => s + d.efetivo, 0);

  const el1 = document.getElementById("kpi-unidades-fisicas");
  if (el1) el1.textContent = (fisica.num_unidades || 0).toLocaleString("pt-BR");

  const el2 = document.getElementById("kpi-setores");
  if (el2) el2.textContent = (setor.num_unidades || 0).toLocaleString("pt-BR");

  const el3 = document.getElementById("kpi-categorias");
  if (el3) el3.textContent = (categoria.num_unidades || 0).toLocaleString("pt-BR");

  const el4 = document.getElementById("kpi-efetivo-total");
  if (el4) el4.textContent = total.toLocaleString("pt-BR");
}

function renderizarGraficosUnidades(dados) {
  const ordem = ["unidade_fisica", "setor_operacional", "categoria_administrativa", "outros"];
  const filtrado = ordem
    .map((t) => dados.find((d) => d.tipo_unidade === t))
    .filter((d) => d && d.efetivo > 0);

  const labels = filtrado.map((d) => ROTULOS_TIPO_UNIDADE[d.tipo_unidade]);
  const efetivo = filtrado.map((d) => d.efetivo);
  const folha = filtrado.map((d) => d.folha_total);
  const cores = filtrado.map((d) => CORES_TIPO_UNIDADE[d.tipo_unidade]);

  const ctx1 = document.getElementById("grafico-unidade-tipo");
  if (ctx1) {
    if (estadoQuadro.graficos.unidEfetivo) estadoQuadro.graficos.unidEfetivo.destroy();
    estadoQuadro.graficos.unidEfetivo = new Chart(ctx1, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Efetivo",
          data: efetivo,
          backgroundColor: cores,
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
              label: (item) => item.parsed.x.toLocaleString("pt-BR") + " matrículas",
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: CORES.cinzaBorda },
            ticks: { color: CORES.cinzaTexto },
          },
          y: {
            grid: { display: false },
            ticks: { color: CORES.cinzaTexto },
          },
        },
      },
    });
  }

  const ctx2 = document.getElementById("grafico-unidade-folha");
  if (ctx2) {
    if (estadoQuadro.graficos.unidFolha) estadoQuadro.graficos.unidFolha.destroy();
    estadoQuadro.graficos.unidFolha = new Chart(ctx2, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Folha total",
          data: folha,
          backgroundColor: cores,
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
              label: (item) => fmtBRL.format(item.parsed.x),
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: CORES.cinzaBorda },
            ticks: {
              color: CORES.cinzaTexto,
              callback: (v) => {
                if (v >= 1_000_000_000) return "R$ " + (v / 1_000_000_000).toFixed(1) + " bi";
                if (v >= 1_000_000) return "R$ " + (v / 1_000_000).toFixed(0) + " mi";
                if (v >= 1_000) return "R$ " + (v / 1_000).toFixed(0) + " mil";
                return "R$ " + v;
              },
            },
          },
          y: {
            grid: { display: false },
            ticks: { color: CORES.cinzaTexto },
          },
        },
      },
    });
  }
}

function renderizarTabelaUnidadeTipo(dados) {
  const tbody = document.querySelector("#tabela-unidade-tipo tbody");
  if (!tbody) return;

  const ordem = ["unidade_fisica", "setor_operacional", "categoria_administrativa", "outros"];
  const ordenado = ordem
    .map((t) => dados.find((d) => d.tipo_unidade === t))
    .filter((d) => d);

  if (ordenado.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="carregando">Nenhum registro.</td></tr>';
    return;
  }

  tbody.innerHTML = ordenado.map((d) => {
    const rotulo = ROTULOS_TIPO_UNIDADE[d.tipo_unidade] || d.tipo_unidade;
    return '<tr>' +
      '<td>' + rotulo + '</td>' +
      '<td class="numerico">' + (d.num_unidades || 0).toLocaleString("pt-BR") + '</td>' +
      '<td class="numerico">' + (d.efetivo || 0).toLocaleString("pt-BR") + '</td>' +
      '<td class="numerico">' + fmtBRL.format(d.folha_total || 0) + '</td>' +
      '<td class="numerico">' + fmtBRL.format(d.ticket_medio || 0) + '</td>' +
      '</tr>';
  }).join("");
}

function renderizarTabelaUnidadeTop20(dados) {
  const tbody = document.querySelector("#tabela-unidade-top20 tbody");
  if (!tbody) return;

  if (!dados || dados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="carregando">Nenhuma unidade encontrada.</td></tr>';
    return;
  }

  tbody.innerHTML = dados.map((d) => '<tr>' +
    '<td>' + (d.local_trabalho || "") + '</td>' +
    '<td>' + (d.tipo || "") + '</td>' +
    '<td class="numerico">' + (d.efetivo || 0).toLocaleString("pt-BR") + '</td>' +
    '<td class="numerico">' + fmtBRL.format(d.folha_total || 0) + '</td>' +
    '<td class="numerico">' + fmtBRL.format(d.ticket_medio || 0) + '</td>' +
    '</tr>').join("");
}

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", inicializar);