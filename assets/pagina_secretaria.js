/* =========================================================================
   Pagina Secretarias - Raio-X do Quadro de Pessoal da Prefeitura de Sorocaba
   ========================================================================= */

/* -------------------------------------------------------------------------
   Estado global
   ------------------------------------------------------------------------- */
const estado = {
  resumo: [],
  folhaMes: [],
  efetivoMes: [],
  categoriaSecMes: [],   // NOVO: composicao_categoria_secretaria_mes.csv
  auditoria: null,
  secretariaAtual: null,
  metricaAtual: "folha_total",
  graficoFolha: null,
  graficoEfetivo: null,
  graficoCategoria: null,
};

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
async function inicializar() {
  try {
    const [resumo, folhaMes, efetivoMes, categoriaSecMes, auditoria, kpis] = await Promise.all([
      carregarCSV("dados/resumo_secretaria.csv"),
      carregarCSV("dados/folha_por_secretaria_mes.csv"),
      carregarCSV("dados/efetivo_por_secretaria_mes.csv"),
      carregarCSV("dados/composicao_categoria_secretaria_mes.csv"),
      carregarJSON("dados/auditoria.json"),
      carregarJSON("dados/kpis.json"),
    ]);

    estado.resumo = resumo;
    estado.folhaMes = folhaMes;
    estado.efetivoMes = efetivoMes;
    estado.categoriaSecMes = categoriaSecMes;
    estado.auditoria = auditoria;

    renderizarCabecalhoPeriodo(kpis);
    popularSeletorSecretarias(resumo);
    renderizarSelo(auditoria);
    registrarEventos();
  } catch (e) {
    console.error(e);
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = `<div class="erro">
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

  sel.innerHTML = `<option value="">— Selecione uma secretaria —</option>`;
  ordenado.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.secretaria;
    opt.textContent = `${s.secretaria} (${fmtBRLCompacto(s.folha_total)})`;
    sel.appendChild(opt);
  });

  const params = new URLSearchParams(location.search);
  const secInicial = params.get("secretaria");
  if (secInicial && ordenado.some((s) => s.secretaria === secInicial)) {
    sel.value = secInicial;
    selecionarSecretaria(secInicial);
  }
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
      if (!nome) return;
      selecionarSecretaria(nome);
      const url = new URL(location.href);
      url.searchParams.set("secretaria", nome);
      history.replaceState(null, "", url.toString());
    });
  }

  if (selMetrica) {
    selMetrica.addEventListener("change", (e) => {
      estado.metricaAtual = e.target.value;
      if (estado.secretariaAtual) {
        renderizarKPIs(estado.resumo.find((s) => s.secretaria === estado.secretariaAtual));
      }
    });
  }

  if (botaoExportar) {
    botaoExportar.addEventListener("click", exportarCSV);
  }
}

/* -------------------------------------------------------------------------
   Selecao de uma secretaria
   ------------------------------------------------------------------------- */
function selecionarSecretaria(nome) {
  estado.secretariaAtual = nome;

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
  renderizarGraficoFolha(folhaSec);
  renderizarGraficoEfetivo(efetivoSec);
  renderizarGraficoCategoria(categoriaSec);
  renderizarComparadores(resumo);
  renderizarTabela(folhaSec);
}

/* -------------------------------------------------------------------------
   KPIs
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
      <div class="rotulo">Ticket médio</div>
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
   Grafico de folha
   ------------------------------------------------------------------------- */
function renderizarGraficoFolha(dados) {
  const ctx = document.getElementById("grafico-folha");
  if (!ctx) return;

  const labels = dados.map((d) => rotuloPeriodo(d.ano, d.mes));
  const valores = dados.map((d) => d.folha_total / 1e6);

  if (estado.graficoFolha) estado.graficoFolha.destroy();

  estado.graficoFolha = graficoLinha(ctx, labels, valores, {
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
function renderizarGraficoEfetivo(dados) {
  const ctx = document.getElementById("grafico-efetivo");
  if (!ctx) return;

  const labels = dados.map((d) => rotuloPeriodo(d.ano, d.mes));
  const valores = dados.map((d) => d.efetivo);

  if (estado.graficoEfetivo) estado.graficoEfetivo.destroy();

  estado.graficoEfetivo = graficoLinha(ctx, labels, valores, {
    label: "Efetivo",
    cor: CORES.verdeClaro,
    corFundo: "rgba(122,182,72,0.10)",
    formatador: (v) => fmtNum.format(v) + " servidores",
    eixoYFormatador: (v) => fmtNumCompacto(v),
    inicioZero: false,
  });
}

/* -------------------------------------------------------------------------
   Composicao por categoria - REAL (usando composicao_categoria_secretaria_mes)
   ------------------------------------------------------------------------- */
function renderizarGraficoCategoria(dados) {
  const ctx = document.getElementById("grafico-categoria");
  if (!ctx) return;

  if (estado.graficoCategoria) estado.graficoCategoria.destroy();

  if (!dados || !dados.length) {
    const container = ctx.parentElement;
    container.innerHTML = `<div class="aviso-metodologico">Sem dados de categoria para esta secretaria.</div>`;
    return;
  }

  // Ultimo mes disponivel para esta secretaria
  const ultima = dados.reduce((acc, d) => {
    const chave = d.ano * 100 + d.mes;
    if (!acc || chave > (acc.ano * 100 + acc.mes)) return d;
    return acc;
  }, null);

  const snapshot = dados.filter((d) => d.ano === ultima.ano && d.mes === ultima.mes);
  snapshot.sort((a, b) => b.folha_total - a.folha_total);

  const labels = snapshot.map((d) => ROTULOS_GRUPO[d.regime_subgrupo] || d.regime_subgrupo);
  const valores = snapshot.map((d) => d.folha_total);
  const cores = snapshot.map((d) => CORES_GRUPO[d.regime_subgrupo] || CORES.cinzaTexto);

  estado.graficoCategoria = graficoRosca(ctx, labels, valores, cores);

  // Adiciona legenda do mes
  const container = ctx.parentElement;
  const avisoExistente = container.querySelector(".aviso-metodologico");
  if (!avisoExistente) {
    const aviso = document.createElement("div");
    aviso.className = "aviso-metodologico";
    aviso.style.marginTop = "1rem";
    aviso.innerHTML = `Composição da folha de <strong>${rotuloPeriodo(ultima.ano, ultima.mes)}</strong>.`;
    container.appendChild(aviso);
  }
}

/* -------------------------------------------------------------------------
   Comparadores com a mediana municipal
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
          Ticket médio vs mediana municipal
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
    tbody.innerHTML = `<tr><td colspan="6" class="carregando">Sem dados para esta secretaria.</td></tr>`;
    return;
  }

  const ordenado = [...dados].sort((a, b) => b.ano - a.ano || b.mes - a.mes);

  tbody.innerHTML = ordenado
    .map(
      (d) => `
    <tr>
      <td>${rotuloPeriodo(d.ano, d.mes)}</td>
      <td class="numerico">${fmtBRL.format(d.folha_total)}</td>
      <td class="numerico">${fmtBRL.format(d.folha_liquida)}</td>
      <td class="numerico">${fmtNum.format(d.num_registros)}</td>
      <td class="numerico">${fmtNum.format(d.num_matriculas)}</td>
      <td class="numerico">${fmtBRL.format(d.ticket_medio)}</td>
    </tr>`
    )
    .join("");
}

/* -------------------------------------------------------------------------
   Exportar CSV do recorte atual
   ------------------------------------------------------------------------- */
function exportarCSV() {
  if (!estado.secretariaAtual) {
    alert("Escolha uma secretaria antes de exportar.");
    return;
  }

  const dados = estado.folhaMes
    .filter((f) => f.secretaria === estado.secretariaAtual)
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes);

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
  const nomeArquivo = `secretaria_${estado.secretariaAtual.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;

  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------
   Inicializacao no carregamento da pagina
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", inicializar);