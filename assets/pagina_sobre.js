/* =========================================================================
   Pagina Sobre - Raio-X do Quadro de Pessoal da Prefeitura de Sorocaba
   Le auditoria.json e os 3 mapas publicos (regime, secretaria, escolaridade)
   e renderiza tabelas interativas com filtros.
   ========================================================================= */

const estadoSobre = {
  auditoria: null,
  regimes: [],
  secretarias: [],
  escolaridades: [],
  kpis: null,
};

const num = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
async function inicializar() {
  try {
    const [auditoria, kpis, regimes, secretarias, escolaridades] = await Promise.all([
      carregarJSON("dados/auditoria.json"),
      carregarJSON("dados/kpis.json"),
      carregarCSV("dados/regime_map.csv"),
      carregarCSV("dados/secretaria_map.csv"),
      carregarCSV("dados/escolaridade_map.csv"),
    ]);

    estadoSobre.auditoria = auditoria;
    estadoSobre.kpis = kpis;
    estadoSobre.regimes = regimes;
    estadoSobre.secretarias = secretarias;
    estadoSobre.escolaridades = escolaridades;

    renderizarCabecalho(kpis);
    renderizarFonte(auditoria);
    renderizarSelo(auditoria);
    renderizarMapaRegimes(regimes);
    renderizarMapaSecretarias(secretarias);
    renderizarMapaEscolaridades(escolaridades);
    registrarEventos();
  } catch (e) {
    console.error(e);
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = `<div class="erro" role="alert">
        <strong>Não foi possível carregar os dados da página Sobre.</strong><br>
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
   Fonte dos dados (leitura robusta: aceita nomes novos e antigos)
   ------------------------------------------------------------------------- */
function renderizarFonte(auditoria) {
  const el = document.getElementById("fonte-dados");
  if (!el || !auditoria) return;

  const q = auditoria.qualidade || {};
  const per = auditoria.periodo_coberto || {};

  // Leitura robusta com fallback para nomes antigos
  const registrosBrutos = q.registros_brutos ?? q.registros_totais ?? 0;
  const registrosMultivinculo = q.registros_multivinculo ?? q.registros_duplicados ?? 0;
  const percentualMultivinculo = q.percentual_multivinculo ?? q.percentual_duplicatas ?? 0;
  const registrosLiquidos = q.registros_liquidos ?? 0;
  const matriculasUnicas = q.matriculas_unicas ?? 0;
  const secretarias = q.secretarias ?? 0;

  const dataFormatada = auditoria.gerado_em
    ? new Date(auditoria.gerado_em).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      })
    : "-";

  el.innerHTML = `
    <dt>Fonte</dt>
    <dd>${auditoria.fonte || "-"}</dd>

    <dt>URL da fonte</dt>
    <dd><a href="${auditoria.url_fonte || '#'}" target="_blank" rel="noopener">${auditoria.url_fonte || '-'}</a></dd>

    <dt>Período coberto</dt>
    <dd>${per.inicio || "-"} a ${per.fim || "-"} (${per.total_meses || 0} meses)</dd>

    <dt>Registros brutos</dt>
    <dd>${fmtNum.format(registrosBrutos)}</dd>

    <dt>Múltiplos vínculos por mês</dt>
    <dd>${fmtNum.format(registrosMultivinculo)} (${fmtPct(percentualMultivinculo)})</dd>

    <dt>Registros únicos por mês</dt>
    <dd>${fmtNum.format(registrosLiquidos)}</dd>

    <dt>Matrículas únicas</dt>
    <dd>${fmtNum.format(matriculasUnicas)}</dd>

    <dt>Secretarias (canônicas)</dt>
    <dd>${secretarias}</dd>

    <dt>Última atualização</dt>
    <dd>${dataFormatada}</dd>
  `;
}

/* -------------------------------------------------------------------------
   Mapa de regimes
   ------------------------------------------------------------------------- */
function renderizarMapaRegimes(dados) {
  const tbody = document.querySelector("#tabela-regimes tbody");
  if (!tbody) return;
  desenharTabelaRegimes(dados, tbody);
}

function desenharTabelaRegimes(dados, tbody, filtro = "") {
  const f = filtro.trim().toUpperCase();
  const linhas = dados.filter((d) => {
    if (!f) return true;
    const alvo = `${d.regime_cru || ""} ${d.regime_base || ""} ${d.regime_grupo || ""} ${d.regime_subgrupo || ""}`.toUpperCase();
    return alvo.includes(f);
  });

  if (!linhas.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--cinza-texto);">Nenhum resultado</td></tr>`;
    return;
  }

  tbody.innerHTML = linhas.map((d) => `
    <tr>
      <td><code>${d.regime_cru || ""}</code></td>
      <td><code>${d.regime_base || ""}</code></td>
      <td>${d.regime_grupo || ""}</td>
      <td><span class="badge ${badgeClasse(d.regime_subgrupo)}">${d.regime_subgrupo || ""}</span></td>
    </tr>`).join("");
}

function badgeClasse(subgrupo) {
  const mapa = {
    efetivos: "efetivos",
    funcao_confianca: "funcao",
    comissionados: "comissionados",
    flexiveis: "flexiveis",
    inativos: "inativos",
  };
  return mapa[subgrupo] || "";
}

/* -------------------------------------------------------------------------
   Mapa de secretarias
   ------------------------------------------------------------------------- */
function renderizarMapaSecretarias(dados) {
  const tbody = document.querySelector("#tabela-secretarias-mapa tbody");
  if (!tbody) return;
  desenharTabelaSecretarias(dados, tbody);
}

function desenharTabelaSecretarias(dados, tbody, filtro = "") {
  const f = filtro.trim().toUpperCase();
  const linhas = dados.filter((d) => {
    if (!f) return true;
    const alvo = `${d.secretaria_crua || ""} ${d.secretaria_canonica || ""} ${d.sigla || ""}`.toUpperCase();
    return alvo.includes(f);
  });

  if (!linhas.length) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--cinza-texto);">Nenhum resultado</td></tr>`;
    return;
  }

  tbody.innerHTML = linhas.map((d) => `
    <tr>
      <td>${d.secretaria_crua || ""}</td>
      <td><strong>${d.secretaria_canonica || ""}</strong></td>
      <td>${d.sigla || "—"}</td>
    </tr>`).join("");
}

/* -------------------------------------------------------------------------
   Mapa de escolaridades
   ------------------------------------------------------------------------- */
function renderizarMapaEscolaridades(dados) {
  const tbody = document.querySelector("#tabela-escolaridades tbody");
  if (!tbody) return;

  const ordenado = [...dados].sort((a, b) => num(a.ordem) - num(b.ordem));

  tbody.innerHTML = ordenado.map((d) => `
    <tr>
      <td><code>${d.escolaridade_crua || ""}</code></td>
      <td><strong>${d.escolaridade_canonica || ""}</strong></td>
      <td class="numerico">${d.ordem || ""}</td>
    </tr>`).join("");
}

/* -------------------------------------------------------------------------
   Eventos
   ------------------------------------------------------------------------- */
function registrarEventos() {
  const buscaRegime = document.getElementById("busca-regime");
  if (buscaRegime) {
    buscaRegime.addEventListener("input", (e) => {
      const tbody = document.querySelector("#tabela-regimes tbody");
      if (tbody) desenharTabelaRegimes(estadoSobre.regimes, tbody, e.target.value);
    });
  }

  const buscaSec = document.getElementById("busca-secretaria");
  if (buscaSec) {
    buscaSec.addEventListener("input", (e) => {
      const tbody = document.querySelector("#tabela-secretarias-mapa tbody");
      if (tbody) desenharTabelaSecretarias(estadoSobre.secretarias, tbody, e.target.value);
    });
  }
}

/* -------------------------------------------------------------------------
   Inicializacao
   ------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", inicializar);