/* ============================================================
   pagina_sobre.js
   Carrega: selo de auditoria, fonte dos dados,
            mapas de regimes, secretarias e escolaridades.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Helpers ---------- */

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function $$(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

  function formatarNumero(n) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    return Number(n).toLocaleString("pt-BR");
  }

  function formatarData(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function textoCelula(v) {
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
  }

  async function carregarJSON(caminho) {
    const resp = await fetch(caminho, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} em ${caminho}`);
    return resp.json();
  }

  async function carregarCSV(caminho) {
    return new Promise((resolve, reject) => {
      Papa.parse(caminho, {
        download: true,
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (res) => resolve(res.data),
        error: (err) => reject(err),
      });
    });
  }

  /* ---------- 1. Selo de auditoria ---------- */

  async function renderizarSelo() {
    const alvo = $("#selo-conteudo");
    if (!alvo) return;

    try {
      const aud = await carregarJSON("dados/auditoria.json");
      const dados = aud.dados || aud;
      const itens = [
        ["Última extração", formatarData(dados.ultima_extracao || dados.gerado_em)],
        ["Meses cobertos", formatarNumero(dados.meses_cobertos || dados.total_meses)],
        ["Registros", formatarNumero(dados.total_registros)],
        ["Matrículas únicas", formatarNumero(dados.matriculas_unicas)],
        ["Status", dados.status || "OK"],
        ["Versão do pipeline", dados.versao || "—"],
      ];

      alvo.innerHTML = itens
        .map(
          ([rotulo, valor]) =>
            `<div><dt>${rotulo}</dt><dd>${textoCelula(valor)}</dd></div>`
        )
        .join("");
    } catch (e) {
      console.error("Erro ao carregar auditoria:", e);
      alvo.innerHTML = `<div class="carregando">Não foi possível carregar o selo de auditoria.</div>`;
    }
  }

  /* ---------- 2. Fonte dos dados ---------- */

  async function renderizarFonte() {
    const alvo = $("#fonte-dados");
    if (!alvo) return;

    try {
      const kpis = await carregarJSON("dados/kpis.json");
      const d = kpis.dados || kpis;
      const itens = [
        ["Período coberto", `${d.periodo_inicio || "—"} a ${d.periodo_fim || "—"}`],
        ["Última atualização", formatarData(d.ultima_atualizacao || d.gerado_em)],
        ["Total de meses", formatarNumero(d.total_meses)],
        ["Fonte", "Portal da Transparência de Sorocaba"],
      ];

      alvo.innerHTML = itens
        .map(
          ([rotulo, valor]) =>
            `<div><dt>${rotulo}</dt><dd>${textoCelula(valor)}</dd></div>`
        )
        .join("");
    } catch (e) {
      console.error("Erro ao carregar kpis:", e);
      alvo.innerHTML = `<div class="carregando">Não foi possível carregar os metadados da fonte.</div>`;
    }
  }

  /* ---------- 3. Mapa de regimes ---------- */

  let regimesDados = [];

  async function carregarRegimes() {
    const tbody = $("#tabela-regimes tbody");
    if (!tbody) return;

    try {
      regimesDados = await carregarCSV("dados/regime_map.csv");
      renderizarTabelaRegimes(regimesDados);
    } catch (e) {
      console.error("Erro ao carregar regimes:", e);
      tbody.innerHTML = `<tr><td colspan="5" class="carregando">Erro ao carregar.</td></tr>`;
    }
  }

  function renderizarTabelaRegimes(lista) {
    const tbody = $("#tabela-regimes tbody");
    if (!tbody) return;

    if (!lista || lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="carregando">Nenhum registro.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista
      .map((r) => {
        const cru = r.regime_cru || r.regime || r.codigo || "";
        const base = r.regime_base || r.base || "";
        const sub = r.subgrupo || "";
        const fund = r.fundamentacao || r.fundamento || "";
        const obs = r.observacao || r.obs || "";
        return `<tr>
          <td>${textoCelula(cru)}</td>
          <td>${textoCelula(base)}</td>
          <td>${textoCelula(sub)}</td>
          <td>${textoCelula(fund)}</td>
          <td>${textoCelula(obs)}</td>
        </tr>`;
      })
      .join("");
  }

  function configurarBuscaRegime() {
    const input = $("#busca-regime");
    if (!input) return;

    input.addEventListener("input", () => {
      const termo = input.value.trim().toLowerCase();
      if (!termo) {
        renderizarTabelaRegimes(regimesDados);
        return;
      }
      const filtrado = regimesDados.filter((r) => {
        const texto = Object.values(r).join(" ").toLowerCase();
        return texto.includes(termo);
      });
      renderizarTabelaRegimes(filtrado);
    });
  }

  /* ---------- 4. Mapa de secretarias ---------- */

  let secretariasDados = [];

  async function carregarSecretarias() {
    const tbody = $("#tabela-secretarias-mapa tbody");
    if (!tbody) return;

    try {
      secretariasDados = await carregarCSV("dados/secretaria_map.csv");
      renderizarTabelaSecretarias(secretariasDados);
    } catch (e) {
      console.error("Erro ao carregar secretarias:", e);
      tbody.innerHTML = `<tr><td colspan="3" class="carregando">Erro ao carregar.</td></tr>`;
    }
  }

  function renderizarTabelaSecretarias(lista) {
    const tbody = $("#tabela-secretarias-mapa tbody");
    if (!tbody) return;

    if (!lista || lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="carregando">Nenhum registro.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista
      .map((r) => {
        const cru = r.secretaria_cru || r.nome_cru || r.nome_original || "";
        const canon = r.secretaria_canonica || r.nome_canonico || r.canonico || "";
        const sigla = r.sigla || "";
        return `<tr>
          <td>${textoCelula(cru)}</td>
          <td>${textoCelula(canon)}</td>
          <td>${textoCelula(sigla)}</td>
        </tr>`;
      })
      .join("");
  }

  function configurarBuscaSecretaria() {
    const input = $("#busca-secretaria");
    if (!input) return;

    input.addEventListener("input", () => {
      const termo = input.value.trim().toLowerCase();
      if (!termo) {
        renderizarTabelaSecretarias(secretariasDados);
        return;
      }
      const filtrado = secretariasDados.filter((r) => {
        const texto = Object.values(r).join(" ").toLowerCase();
        return texto.includes(termo);
      });
      renderizarTabelaSecretarias(filtrado);
    });
  }

  /* ---------- 5. Mapa de escolaridades ---------- */

  async function carregarEscolaridades() {
    const tbody = $("#tabela-escolaridades tbody");
    if (!tbody) return;

    try {
      const dados = await carregarCSV("dados/escolaridade_map.csv");

      // Ordena pela coluna "ordem" se existir
      dados.sort((a, b) => {
        const oa = Number(a.ordem || a.order || 0);
        const ob = Number(b.ordem || b.order || 0);
        return oa - ob;
      });

      tbody.innerHTML = dados
        .map((r) => {
          const cru = r.escolaridade_crua || r.escolaridade_cru || r.nome_cru || "";
          const canon = r.escolaridade_canonica || r.escolaridade_canon || r.canonico || "";
          const ordem = r.ordem || r.order || "";
          return `<tr>
            <td>${textoCelula(cru)}</td>
            <td>${textoCelula(canon)}</td>
            <td class="numero">${textoCelula(ordem)}</td>
          </tr>`;
        })
        .join("");
    } catch (e) {
      console.error("Erro ao carregar escolaridades:", e);
      tbody.innerHTML = `<tr><td colspan="3" class="carregando">Erro ao carregar.</td></tr>`;
    }
  }

  /* ---------- 6. Rodapé: última atualização ---------- */

  async function atualizarRodape() {
    const alvo = $("#rodape-atualizacao");
    if (!alvo) return;

    try {
      const kpis = await carregarJSON("dados/kpis.json");
      const d = kpis.dados || kpis;
      alvo.textContent = formatarData(d.ultima_atualizacao || d.gerado_em);
    } catch {
      alvo.textContent = "—";
    }
  }

  /* ---------- 7. Inicialização ---------- */

  function init() {
    renderizarSelo();
    renderizarFonte();
    carregarRegimes().then(configurarBuscaRegime);
    carregarSecretarias().then(configurarBuscaSecretaria);
    carregarEscolaridades();
    atualizarRodape();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();