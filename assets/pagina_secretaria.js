/* =========================================================================
   Pagina Secretarias - Raio-X do Quadro de Pessoal da Prefeitura de Sorocaba

   Modos de operacao:
   - "municipio"   (padrao ao abrir): total do municipio, soma de todas as
                    secretarias. KPIs e graficos gerais.
   - "secretaria"  (apos selecao): recorte por secretaria especifica.
   ========================================================================= */

const estado = {
  resumo: [],
  folhaMes: [],
  efetivoMes: [],
  folhaMunicipalMes: [],
  categoriaSecMes: [],
  categoriaMunicipalMes: [],
  kpis: null,
  auditoria: null,
  secretariaAtual: null,
  metricaAtual: "folha_total",
  modo: "municipio",
  graficos: {},
};

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
async function inicializar() {
  try {
    const [
      resumo, folhaMes, efetivoMes, folhaMunicipalMes,
      categoriaSecMes, categoriaMunicipalMes,
      kpis, auditoria,
    ] = await Promise.all([
      carregarCSV("dados/resumo_secretaria.csv"),
      carregarCSV("dados/folha_por_secretaria_mes.csv"),
      carregarCSV("dados/efetivo_por_secretaria_mes.csv"),
      carregarCSV("dados/folha_mensal.csv"),
      carregarCSV("dados/composicao_categoria_secretaria_mes.csv"),
      carregarCSV("dados/composicao_categoria_mes.csv"),
      carregarJSON("dados/kpis.json"),
      carregarJSON("dados/auditoria.json"),
    ]);

    const camposNum = ["folha_total","folha_liquida","num_registros","num_matriculas",
                       "ticket_medio","efetivo","folha_media","percentual",
                       "percentual_na_secretaria"];

    [resumo, folhaMes, efetivoMes, folhaMunicipalMes, categoriaSecMes, categoriaMunicipalMes]
      .forEach((arr) => {
        arr.forEach((r) => {
          camposNum.forEach((c) => { if (c in r) r[c] = num(r[c]); });
        });
      });

    estado.resumo = resumo;
    estado.folhaMes = folhaMes;
    estado.efetivoMes = efetivoMes;
    estado.folhaMunicipalMes = folhaMunicipalMes;
    estado.categoriaSecMes = categoriaSecMes;
    estado.categoriaMunicipalMes = categoriaMunicipalMes;
    estado.kpis = kpis;
    estado.auditoria = auditoria;

    renderizarCabecalhoPeriodo(kpis);
    popularSeletorSecretarias(resumo);
    renderizarSelo(auditoria);
    registrarEventos();

    const params = new URLSearchParams(location.search);
    const secInicial = params.get("secretaria");
    if (secInicial && resumo.some((s) => s.secretaria === secInicial)) {
      const sel = document.getElementById("seletor-secretaria");
      if (sel) sel.value = secInicial;
      selecionarSecretaria(secInicial);
    } else {
      selecionarMunicipio();
    }
  } catch (e) {
    console.error(e);
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = `<div class="erro" role="alert">
        <strong>Não foi possível carregar os dados.</strong><br>
        <small>${e.message}</small>
      </div>`;
    }
  }
}

/* -------------------------------------------------------------------------
   Cabecalho
   ------------------------------------------------------------------------- */
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
   Seletor de secretarias
   ------------------------------------------------------------------------- */
function popularSeletorSecretarias(resumo) {
  const sel = document.getElementById("seletor-secretaria");
  if (!sel) return;

  const ordenado = [...resumo].sort((a, b) => b.folha_total - a.folha_total);

  sel.innerHTML = `<option value="">— Total do município (padrão) —</option>`;
  ordenado.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.secretaria;
    opt.textContent = `${s.secretaria} (${fmtBRLCompacto(s.folha_total)})`;
    sel.appendChild(opt);
  });
}

/* -------------------------------------------------------------------------
   Eventos
   ------------------------------------------------------------------------- */
function registrarEventos() {
  const sel = document.getElementById("seletor-secretaria");
  const selMetrica = document.getElementById("seletor-metrica");
  const botaoExportar = document.getElementById("botao-exportar");

  if (sel) {
    sel.addEventListener("change", (e) => {
      const nome = e.target.value;
      if (!nome) {
        const url = new URL(location.href);
        url.searchParams.delete("secretaria");
        history.replaceState(null, "", url.toString());
        selecionarMunicipio();
        return;
      }
      selecionarSecretaria(nome);
      const url = new URL(location.href);
      url.searchParams.set("secretaria", nome);
      history.replaceState(null, "", url.toString());
    });
  }

  if (selMetrica) {
    selMetrica.addEventListener("change", (e) => {
      estado.metricaAtual = e.target.value;
      if (estado.modo === "municipio") {
        renderizarKPIsMunicipio(estado.kpis);
      } else if (estado.secretariaAtual) {
        renderizarKPIs(estado.resumo.find((s) => s.secretaria === estado.secretariaAtual));
      }
    });
  }

  if (botaoExportar) {
    botaoExportar.addEventListener("click", exportarCSV);
  }
}

/* -------------------------------------------------------------------------
   Helpers de layout
   ------------------------------------------------------------------------- */
function expandirGradeCategoria() {
  // Em modo municipio, a rosca ocupa largura total
  const secao = document.querySelector('section:has(#grafico-categoria)');
  if (!secao) return;
  const grade = secao.querySelector(".grade-2");
  if (grade) grade.style.gridTemplateColumns = "1fr";
}

function restaurarGradeCategoria() {
  const secao = document.querySelector('section:has(#grafico-categoria)');
  if (!secao) return;
  const grade = secao.querySelector(".grade-2");
  if (grade) grade.style.gridTemplateColumns = "";
}

/* -------------------------------------------------------------------------
   Modo: Total do municipio
   ------------------------------------------------------------------------- */
function selecionarMunicipio() {
  estado.modo = "municipio";
  estado.secretariaAtual = null;

  const folha = [...estado.folhaMunicipalMes].sort(
    (a, b) => a.ano - b.ano || a.mes - b.mes
  );

  const efetivo = folha.map((f) => ({
    ano: f.ano,
    mes: f.mes,
    efetivo: f.num_matriculas,
  }));

  renderizarKPIsMunicipio(estado.kpis);
  renderizarTitulosCartoes("Total do município");
  renderizarGraficoFolha(folha, "municipio");
  renderizarGraficoEfetivo(efetivo, "municipio");
  renderizarGraficoCategoria(estado.categoriaMunicipalMes, "municipio");
  renderizarTabela(folha);

  // Esconde o card de comparadores em modo municipio
  const comparadores = document.getElementById("comparadores");
  if (comparadores) {
    const cartao = comparadores.closest(".cartao");
    if (cartao) cartao.style.display = "none";
  }

  // Expande a grade da composicao para largura total
  expandirGradeCategoria();
}

/* -------------------------------------------------------------------------
   KPIs do municipio
   ------------------------------------------------------------------------- */
function renderizarKPIsMunicipio(kpis) {
  const el = document.getElementById("kpis-secretaria");
  if (!el || !kpis) return;

  const tot = kpis.totais || {};
  const ult = kpis.ultimo_mes || {};
  const per = kpis.periodo || {};

  el.innerHTML = `
    <div class="kpi destaque">
      <div class="rotulo">Folha acumulada no período</div>
      <div class="valor">${fmtBRLCompacto(tot.folha_bruta_total || 0)}</div>
      <div class="detalhe">${per.meses_cobertos || 0} meses · total do município</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Folha do último mês</div>
      <div class="valor">${fmtBRLCompacto(ult.folha_bruta || 0)}</div>
      <div class="detalhe">${rotuloPeriodo(ult.ano, ult.mes)}</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Servidores (último mês)</div>
      <div class="valor">${fmtNum.format(ult.matriculas || 0)}</div>
      <div class="detalhe">Matrículas únicas no mês</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Custo médio por servidor</div>
      <div class="valor">${fmtBRL.format(ult.ticket_medio || 0)}</div>
      <div class="detalhe">Folha bruta ÷ matrículas (último mês)</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Secretarias</div>
      <div class="valor">${fmtNum.format(tot.secretarias_unicas || 0)}</div>
      <div class="detalhe">Órgãos canônicos na base</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Servidores únicos (período)</div>
      <div class="valor">${fmtNum.format(tot.matriculas_unicas || 0)}</div>
      <div class="detalhe">Distintos em todos os meses</div>
    </div>
  `;
}

/* -------------------------------------------------------------------------
   Modo: Secretaria especifica
   ------------------------------------------------------------------------- */
function selecionarSecretaria(nome) {
  estado.modo = "secretaria";
  estado.secretariaAtual = nome;

  // Reexibe o card de comparadores
  const comparadores = document.getElementById("comparadores");
  if (comparadores) {
    const cartao = comparadores.closest(".cartao");
    if (cartao) cartao.style.display = "";
  }

  // Restaura a grade de 2 colunas
  restaurarGradeCategoria();

  const resumo = estado.resumo.find((s) => s.secretaria === nome);
  if (!resumo) return;

  const folhaSec = estado.folhaMes
    .filter((f) => f.secretaria === nome)
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes);

  const efetivoSec = estado.efetivoMes
    .filter((e) => e.secretaria === nome)
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes);

  const categoriaSec = estado.categoriaSecMes
    .filter((c) => c.secretaria === nome)
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes);

  renderizarKPIs(resumo);
  renderizarTitulosCartoes(nome);
  renderizarGraficoFolha(folhaSec, "secretaria");
  renderizarGraficoEfetivo(efetivoSec, "secretaria");
  renderizarGraficoCategoria(categoriaSec, nome);
  renderizarComparadores(resumo);
  renderizarTabela(folhaSec);
}

/* -------------------------------------------------------------------------
   KPIs da secretaria
   ------------------------------------------------------------------------- */
function renderizarKPIs(resumo) {
  const el = document.getElementById("kpis-secretaria");
  if (!el || !resumo) return;

  const ultimoMesFolha = estado.folhaMes
    .filter((f) => f.secretaria === estado.secretariaAtual)
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes)
    .slice(-1)[0] || {};

  const efetivos = estado.efetivoMes.filter((e) => e.secretaria === estado.secretariaAtual);
  const efetivoMedio = efetivos.length
    ? Math.round(efetivos.reduce((s, e) => s + e.efetivo, 0) / efetivos.length)
    : 0;

  const totalMunicipal = estado.resumo.reduce((s, r) => s + r.folha_total, 0);
  const pctMunicipal = totalMunicipal > 0 ? (resumo.folha_total / totalMunicipal * 100) : 0;

  el.innerHTML = `
    <div class="kpi">
      <div class="rotulo">Folha acumulada</div>
      <div class="valor">${fmtBRLCompacto(resumo.folha_total)}</div>
      <div class="detalhe">${resumo.meses_presentes} meses na base</div>
    </div>

    <div class="kpi destaque">
      <div class="rotulo">Folha do último mês</div>
      <div class="valor">${fmtBRLCompacto(ultimoMesFolha.folha_total || 0)}</div>
      <div class="detalhe">${ultimoMesFolha.ano ? rotuloPeriodo(ultimoMesFolha.ano, ultimoMesFolha.mes) : "-"}</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Efetivo médio</div>
      <div class="valor">${fmtNum.format(efetivoMedio)}</div>
      <div class="detalhe">Matrículas únicas por mês</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Custo médio por servidor</div>
      <div class="valor">${fmtBRL.format(resumo.folha_media_mensal / (resumo.num_matriculas || 1))}</div>
      <div class="detalhe">Folha acumulada ÷ matrículas únicas</div>
    </div>

    <div class="kpi positivo">
      <div class="rotulo">% do total municipal</div>
      <div class="valor">${fmtPct(pctMunicipal)}</div>
      <div class="detalhe">Participação na folha total</div>
    </div>

    <div class="kpi">
      <div class="rotulo">Matrículas únicas</div>
      <div class="valor">${fmtNum.format(resumo.num_matriculas || 0)}</div>
      <div class="detalhe">Pessoas distintas ao longo do período</div>
    </div>
  `;
}

/* -------------------------------------------------------------------------
   Titulos dos cartoes de grafico
   ------------------------------------------------------------------------- */
function renderizarTitulosCartoes(contexto) {
  const titulos = document.querySelectorAll(".cartao-titulo");
  titulos.forEach((el) => {
    if (el.textContent.startsWith("Evolução mensal da folha")) {
      el.textContent = `Evolução mensal da folha — ${contexto}`;
    }
    if (el.textContent.startsWith("Evolução mensal do efetivo")) {
      el.textContent = `Evolução mensal do efetivo — ${contexto}`;
    }
  });
}

/* -------------------------------------------------------------------------
   Grafico de folha
   ------------------------------------------------------------------------- */
function renderizarGraficoFolha(dados, contexto) {
  const ctx = document.getElementById("grafico-folha");
  if (!ctx) return;

  const labels = dados.map((d) => rotuloPeriodo(d.ano, d.mes));
  const valores = dados.map((d) => d.folha_total / 1e6);

  if (estado.graficos.folha) estado.graficos.folha.destroy();

  estado.graficos.folha = graficoLinha(ctx, labels, valores, {
    label: "Folha (R$ mi)",
    cor: CORES.azulClaro,
    corFundo: "rgba(0,113,206,0.08)",
    formatador: (v) => "R$ " + v.toFixed(1).replace(".", ",") + " mi",
    eixoYFormatador: (v) => "R$ " + v.toFixed(0) + " mi",
    inicioZero: true,
  });
}

/* -------------------------------------------------------------------------
   Grafico de efetivo
   ------------------------------------------------------------------------- */
function renderizarGraficoEfetivo(dados, contexto) {
  const ctx = document.getElementById("grafico-efetivo");
  if (!ctx) return;

  const labels = dados.map((d) => rotuloPeriodo(d.ano, d.mes));
  const valores = dados.map((d) => d.efetivo);

  if (estado.graficos.efetivo) estado.graficos.efetivo.destroy();

  estado.graficos.efetivo = graficoLinha(ctx, labels, valores, {
    label: "Efetivo",
    cor: CORES.verdeClaro,
    corFundo: "rgba(122,182,72,0.10)",
    formatador: (v) => fmtNum.format(v) + " servidores",
    eixoYFormatador: (v) => fmtNumCompacto(v),
    inicioZero: false,
  });
}

/* -------------------------------------------------------------------------
   Composicao por categoria
   ------------------------------------------------------------------------- */
function renderizarGraficoCategoria(dados, contexto) {
  const ctx = document.getElementById("grafico-categoria");
  if (!ctx) return;

  if (estado.graficos.categoria) estado.graficos.categoria.destroy();

  if (!dados || !dados.length) {
    const container = ctx.parentElement;
    container.innerHTML = `<div class="aviso-metodologico">Sem dados de categoria.</div>`;
    return;
  }

  const ultima = dados.reduce((acc, d) => {
    const chave = d.ano * 100 + d.mes;
    if (!acc || chave > (acc.ano * 100 + acc.mes)) return d;
    return acc;
  }, null);

  const snapshot = dados
    .filter((d) => d.ano === ultima.ano && d.mes === ultima.mes)
    .sort((a, b) => b.folha_total - a.folha_total);

  const labels = snapshot.map((d) => ROTULOS_GRUPO[d.regime_subgrupo] || d.regime_subgrupo);
  const valores = snapshot.map((d) => d.folha_total);
  const cores = snapshot.map((d) => CORES_GRUPO[d.regime_subgrupo] || CORES.cinzaTexto);

  estado.graficos.categoria = graficoRosca(ctx, labels, valores, cores);

  // Titulo dinamico do cartao com mes de referencia e contexto
  const cartao = ctx.closest(".cartao");
  if (cartao) {
    const titulo = cartao.querySelector(".cartao-titulo");
    if (titulo) {
      const mesRef = rotuloPeriodo(ultima.ano, ultima.mes);
      titulo.textContent = `Composição por categoria — ${contexto} · ${mesRef}`;
    }
  }

  const container = ctx.parentElement;
  let aviso = container.querySelector(".aviso-metodologico");
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.className = "aviso-metodologico";
    aviso.style.marginTop = "1rem";
    container.appendChild(aviso);
  }
  const contextoLabel = contexto === "municipio" ? "Total do município" : contexto;
  aviso.innerHTML = `Composição da folha de <strong>${rotuloPeriodo(ultima.ano, ultima.mes)}</strong> — ${contextoLabel}.`;
}

/* -------------------------------------------------------------------------
   Comparadores com a mediana municipal (modo secretaria)
   ------------------------------------------------------------------------- */
function renderizarComparadores(resumo) {
  const el = document.getElementById("comparadores");
  if (!el || !resumo) return;

  const folhasOrdenadas = [...estado.resumo]
    .map((s) => s.folha_total)
    .sort((a, b) => a - b);
  const mediana = folhasOrdenadas[Math.floor(folhasOrdenadas.length / 2)];

  const tickets = [...estado.resumo]
    .map((s) => s.folha_media_mensal / (s.num_matriculas || 1))
    .filter((v) => isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  const medianaTicket = tickets[Math.floor(tickets.length / 2)];

  const ticketSec = resumo.folha_media_mensal / (resumo.num_matriculas || 1);

  const ranking = [...estado.resumo].sort((a, b) => b.folha_total - a.folha_total);
  const posicao = ranking.findIndex((s) => s.secretaria === resumo.secretaria) + 1;

  const comparar = (valor, referencia) => {
    const pct = referencia > 0 ? ((valor - referencia) / referencia) * 100 : 0;
    const acima = valor > referencia;
    const classe = acima ? "positivo" : "alerta";
    const sinal = acima ? "+" : "";
    return `<span class="badge ${classe}">${sinal}${pct.toFixed(1).replace(".", ",")}% vs mediana</span>`;
  };

  el.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div>
        <div style="font-size: 0.78rem; color: var(--cinza-texto); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600;">
          Ranking de folha acumulada
        </div>
        <div style="font-size: 1.6rem; font-weight: 700; color: var(--azul-escuro);">
          ${posicao}º de ${estado.resumo.length}
        </div>
      </div>

      <div>
        <div style="font-size: 0.78rem; color: var(--cinza-texto); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600;">
          Folha acumulada vs mediana municipal
        </div>
        <div style="font-size: 1.2rem; font-weight: 600;">
          ${fmtBRLCompacto(resumo.folha_total)} ${comparar(resumo.folha_total, mediana)}
        </div>
      </div>

      <div>
        <div style="font-size: 0.78rem; color: var(--cinza-texto); text-transform: uppercase; letter-spacing: 0.4px; font-weight: 600;">
          Custo médio vs mediana municipal
        </div>
        <div style="font-size: 1.2rem; font-weight: 600;">
          ${fmtBRL.format(ticketSec)} ${comparar(ticketSec, medianaTicket)}
        </div>
      </div>
    </div>
  `;
}

/* -------------------------------------------------------------------------
   Tabela mensal
   ------------------------------------------------------------------------- */
function renderizarTabela(dados) {
  const tbody = document.querySelector("#tabela-mensal tbody");
  if (!tbody) return;

  if (!dados.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="carregando">Sem dados.</td></tr>`;
    return;
  }

  const ordenado = [...dados].sort((a, b) => b.ano - a.ano || b.mes - a.mes);

  tbody.innerHTML = ordenado
    .map(
      (d) => `
    <tr>
      <td>${rotuloPeriodo(d.ano, d.mes)}</td>
      <td class="numerico">${fmtBRL.format(d.folha_total)}</td>
      <td class="numerico">${fmtBRL.format(d.folha_liquida || 0)}</td>
      <td class="numerico">${fmtNum.format(d.num_registros || 0)}</td>
      <td class="numerico">${fmtNum.format(d.num_matriculas || 0)}</td>
      <td class="numerico">${fmtBRL.format(d.ticket_medio || 0)}</td>
    </tr>`
    )
    .join("");
}

/* -------------------------------------------------------------------------
   Exportar CSV do recorte atual
   ------------------------------------------------------------------------- */
function exportarCSV() {
  let dados;
  let nomeArquivo;

  if (estado.modo === "municipio") {
    dados = [...estado.folhaMunicipalMes].sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    nomeArquivo = "total_municipio.csv";
  } else if (estado.secretariaAtual) {
    dados = estado.folhaMes
      .filter((f) => f.secretaria === estado.secretariaAtual)
      .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
    nomeArquivo = `secretaria_${estado.secretariaAtual.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
  } else {
    alert("Nada para exportar.");
    return;
  }

  if (!dados.length) {
    alert("Sem dados para exportar.");
    return;
  }

  const colunas = Object.keys(dados[0]);
  const linhas = [colunas.join(";")];
  dados.forEach((linha) => {
    linhas.push(
      colunas.map((c) => {
        const v = linha[c];
        if (v == null) return "";
        if (typeof v === "string" && v.includes(";")) return `"${v}"`;
        return v;
      }).join(";")
    );
  });

  const csv = linhas.join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", inicializar);