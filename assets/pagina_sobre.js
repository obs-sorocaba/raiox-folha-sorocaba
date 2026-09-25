/* ============================================================
pagina_sobre.js — versão robusta (P0 + auditoria)
Carrega: selo, fonte, mapas de metodologia e cobertura de gênero.
Nunca deixa estado "Carregando…" pendurado.
============================================================ */
(function () {
  "use strict";

  /* ---------- Constantes ---------- */
  const TIMEOUT_MS = 8000;
  const TENTATIVAS = 2;

  /* ---------- Helpers DOM ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);

  function $$(sel, ctx) {
    return Array.from((ctx || document).querySelectorAll(sel));
  }

  /* ---------- Formatadores ---------- */
  function formatarNumero(n) {
    if (n === null || n === undefined || n === "" || isNaN(n)) return "—";
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
    } catch (e) {
      return iso;
    }
  }

  function textoCelula(v) {
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
  }

  function escaparHTML(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------- Fetch com timeout e retry ---------- */
  function fetchComTimeout(url, opts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    return fetch(url, Object.assign({}, opts || {}, { signal: controller.signal }))
      .finally(() => clearTimeout(timer));
  }

  async function fetchComRetry(url, opts) {
    let ultimoErro;
    for (let i = 1; i <= TENTATIVAS; i++) {
      try {
        const resp = await fetchComTimeout(url, opts);
        if (!resp.ok) throw new Error("HTTP " + resp.status + " em " + url);
        return resp;
      } catch (e) {
        ultimoErro = e;
        if (i < TENTATIVAS) {
          await new Promise((r) => setTimeout(r, 500 * i));
        }
      }
    }
    throw ultimoErro;
  }

  async function carregarJSON(caminho) {
    const resp = await fetchComRetry(caminho, { cache: "no-store" });
    return resp.json();
  }

  async function carregarCSV(caminho) {
    const resp = await fetchComRetry(caminho, { cache: "no-store" });
    let texto = await resp.text();

    if (texto.charCodeAt(0) === 0xfeff) {
      texto = texto.slice(1);
    }

    return new Promise((resolve, reject) => {
      Papa.parse(texto, {
        header: true,
        delimiter: "",
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (h) => String(h).replace(/^﻿/, "").trim(),
        complete: (res) => {
          if (res.errors && res.errors.length) {
            if (!res.data || res.data.length === 0) {
              return reject(new Error(
                "Falha ao interpretar " + caminho + ": " + res.errors[0].message
              ));
            }
          }

          const dados = (res.data || []).filter((linha) =>
            Object.values(linha).some((v) => v !== null && v !== "" && v !== undefined)
          );

          resolve(dados);
        },
        error: (err) => reject(err),
      });
    });
  }

  /* ---------- Estado visual de cada tabela ---------- */
  function colspanDe(tbody) {
    const tabela = tbody.closest("table");
    if (!tabela) return 1;
    const ths = $$("thead th", tabela);
    return ths.length || 1;
  }

  function mostrarCarregando(tbody) {
    if (!tbody) return;
    tbody.innerHTML =
      '<tr class="linha-carregando"><td colspan="' + colspanDe(tbody) +
      '" class="carregando">Carregando…</td></tr>';
  }

  function mostrarErro(tbody, mensagem, arquivo) {
    if (!tbody) return;
    const link = arquivo
      ? ' Você pode baixar o arquivo diretamente: <a href="' +
        escaparHTML(arquivo) + '" download>' + escaparHTML(arquivo) + "</a>."
      : "";
    tbody.innerHTML =
      '<tr><td colspan="' + colspanDe(tbody) + '" class="aviso-erro">⚠️ ' +
      escaparHTML(mensagem) + link + "</td></tr>";
  }

  function mostrarVazio(tbody, arquivo) {
    if (!tbody) return;
    const link = arquivo
      ? ' Baixe o arquivo para conferir: <a href="' +
        escaparHTML(arquivo) + '" download>' + escaparHTML(arquivo) + "</a>."
      : "";
    tbody.innerHTML =
      '<tr><td colspan="' + colspanDe(tbody) + '" class="aviso-vazio">' +
      "Nenhum registro encontrado. " + link + "</td></tr>";
  }

  /* ============================================================
  1. Selo de auditoria
  ============================================================ */
  async function renderizarSelo() {
    const alvo = $("#selo-conteudo");
    if (!alvo) return;

    try {
      const aud = await carregarJSON("dados/auditoria.json");
      const d = aud.dados || aud;

      const per = d.periodo_coberto || {};
      const q = d.qualidade || {};
      const al = d.alertas || {};

      const regNc = Array.isArray(al.codigos_regime_nao_mapeados) ? al.codigos_regime_nao_mapeados : [];
      const secNc = Array.isArray(al.secretarias_nao_mapeadas) ? al.secretarias_nao_mapeadas : [];
      const escNc = Array.isArray(al.escolaridades_nao_mapeadas) ? al.escolaridades_nao_mapeadas : [];

      const totalPendencias = regNc.length + secNc.length + escNc.length;
      const status = totalPendencias === 0 ? "Auditoria em dia" : "Pendências de classificação";

      const itens = [
        ["Última extração", formatarData(d.gerado_em)],
        ["Período coberto", (per.inicio || "—") + " a " + (per.fim || "—")],
        ["Meses cobertos", formatarNumero(per.total_meses)],
        ["Registros brutos", formatarNumero(q.registros_brutos)],
        ["Múltiplos vínculos", formatarNumero(q.registros_multivinculo)],
        ["Registros únicos", formatarNumero(q.registros_liquidos)],
        ["Matrículas únicas", formatarNumero(q.matriculas_unicas)],
        ["Secretarias canônicas", formatarNumero(q.secretarias)],
        ["Status", status],
      ];

      if (totalPendencias > 0) {
        const detalhes = [];
        if (regNc.length) detalhes.push(regNc.length + " código(s) de regime");
        if (secNc.length) detalhes.push(secNc.length + " secretaria(s)");
        if (escNc.length) detalhes.push(escNc.length + " escolaridade(s)");
        itens.push(["Pendências", detalhes.join(", ")]);
      }

      alvo.innerHTML = itens.map(function (par) {
        return "<dt>" + escaparHTML(par[0]) + "</dt><dd>" +
          escaparHTML(textoCelula(par[1])) + "</dd>";
      }).join("");
    } catch (e) {
      console.error("[sobre] Erro ao carregar auditoria:", e);
      alvo.innerHTML =
        '<div class="carregando">Não foi possível carregar o selo de auditoria. ' +
        '<a href="dados/auditoria.json" download>Baixar JSON</a>.</div>';
    }
  }

  /* ============================================================
  2. Fonte dos dados
  ============================================================ */
  async function renderizarFonte() {
    const alvo = $("#fonte-dados");
    if (!alvo) return;

    try {
      const kpis = await carregarJSON("dados/kpis.json");
      const d = kpis.dados || kpis;

      const per = d.periodo || {};
      const tot = d.totais || {};

      const periodoTexto = (per.inicio || "—") + " a " + (per.fim || "—");
      const mesesTexto =
        per.meses_cobertos != null
          ? formatarNumero(per.meses_cobertos) + " meses"
          : "—";

      const itens = [
        ["Período coberto", periodoTexto],
        ["Última atualização", formatarData(d.gerado_em)],
        ["Total de meses", mesesTexto],
        ["Registros totais", formatarNumero(tot.registros_totais)],
        ["Matrículas únicas", formatarNumero(tot.matriculas_unicas)],
        ["Fonte", "Portal da Transparência de Sorocaba"],
      ];

      alvo.innerHTML = itens.map(function (par) {
        return "<dt>" + escaparHTML(par[0]) + "</dt><dd>" +
          escaparHTML(textoCelula(par[1])) + "</dd>";
      }).join("");
    } catch (e) {
      console.error("[sobre] Erro ao carregar kpis:", e);
      alvo.innerHTML =
        '<div class="carregando">Não foi possível carregar os metadados. ' +
        '<a href="dados/kpis.json" download>Baixar JSON</a>.</div>';
    }
  }

  /* ============================================================
  3. Cobertura da análise de gênero (P0)
  ============================================================ */
  async function renderizarCoberturaGenero() {
    const alvo = $("#cobertura-genero");
    if (!alvo) return;

    try {
      const geral = await carregarCSV("dados/genero_geral.csv");

      let total = 0;
      let definidos = 0;
      let indefinidos = 0;
      let fem = 0;
      let masc = 0;

      geral.forEach((r) => {
        const g = (r.genero_inferido || "").trim().toLowerCase();
        const n = Number(r.num_matriculas) || 0;
        total += n;

        if (g === "feminino") {
          fem += n;
          definidos += n;
        } else if (g === "masculino") {
          masc += n;
          definidos += n;
        } else if (g === "indefinido") {
          indefinidos += n;
        }
      });

      const cobertura = total > 0 ? ((definidos / total) * 100) : 0;
      const pctIndef = total > 0 ? ((indefinidos / total) * 100) : 0;

      const itens = [
        ["Matrículas totais no último mês", formatarNumero(total)],
        ["Classificadas como F/M", formatarNumero(definidos)],
        ["Indefinidas (excluídas)", formatarNumero(indefinidos)],
        ["Cobertura da análise", cobertura.toFixed(1).replace(".", ",") + "%"],
        ["Feminino", formatarNumero(fem)],
        ["Masculino", formatarNumero(masc)],
      ];

      alvo.innerHTML = itens.map(function (par) {
        return "<dt>" + escaparHTML(par[0]) + "</dt><dd>" +
          escaparHTML(textoCelula(par[1])) + "</dd>";
      }).join("");

      const pai = alvo.parentElement;
      if (pai) {
        const existente = pai.querySelector(".aviso-metodologico.cobertura-nota");
        if (existente) existente.remove();

        const nota = document.createElement("div");
        nota.className = "aviso-metodologico cobertura-nota";
        nota.style.marginTop = "1rem";
        nota.innerHTML =
          "<strong>Nota:</strong> " + pctIndef.toFixed(1).replace(".", ",") +
          "% das matrículas ficaram como indefinidas (nomes ambíguos ou não reconhecidos). " +
          "Essas matrículas <strong>não entram</strong> nos cruzamentos por cargo, " +
          "secretaria, escolaridade e faixa salarial. A análise cobre, portanto, " +
          cobertura.toFixed(1).replace(".", ",") + "% do total.";

        pai.appendChild(nota);
      }
    } catch (e) {
      console.error("[sobre] Erro ao carregar cobertura de gênero:", e);
      alvo.innerHTML =
        '<div class="carregando">Não foi possível carregar a cobertura de gênero. ' +
        '<a href="dados/genero_geral.csv" download>Baixar CSV</a>.</div>';
    }
  }

  /* ============================================================
  4. Mapa de regimes
  ============================================================ */
  let regimesDados = [];

  async function carregarRegimes() {
    const tbody = $("#tabela-regimes tbody");
    if (!tbody) return;

    mostrarCarregando(tbody);

    try {
      const dados = await carregarCSV("dados/regime_map.csv");
      if (!dados.length) return mostrarVazio(tbody, "dados/regime_map.csv");

      regimesDados = dados;
      renderizarTabelaRegimes(dados);
    } catch (e) {
      console.error("[sobre] Erro regimes:", e);
      mostrarErro(tbody, "Não foi possível carregar o mapa de regimes.", "dados/regime_map.csv");
    }
  }

  function renderizarTabelaRegimes(lista) {
    const tbody = $("#tabela-regimes tbody");
    if (!tbody) return;

    if (!lista || lista.length === 0) {
      return mostrarVazio(tbody, "dados/regime_map.csv");
    }

    tbody.innerHTML = lista.map(function (r) {
      const cru = r.regime_cru || r.regime || r.codigo || "";
      const base = r.regime_base || r.base || "";
      const sub = r.regime_subgrupo || r.subgrupo || "";
      const fund = r.fundamentacao || r.fundamento || "";
      const obs = r.observacao || r.obs || "";

      return "<tr>" +
        "<td>" + escaparHTML(textoCelula(cru)) + "</td>" +
        "<td>" + escaparHTML(textoCelula(base)) + "</td>" +
        "<td>" + escaparHTML(textoCelula(sub)) + "</td>" +
        "<td>" + escaparHTML(textoCelula(fund)) + "</td>" +
        "<td>" + escaparHTML(textoCelula(obs)) + "</td>" +
        "</tr>";
    }).join("");
  }

  function configurarBuscaRegime() {
    const input = $("#busca-regime");
    if (!input) return;

    input.addEventListener("input", function () {
      const termo = input.value.trim().toLowerCase();
      if (!termo) return renderizarTabelaRegimes(regimesDados);

      const filtrado = regimesDados.filter(function (r) {
        return Object.values(r).join(" ").toLowerCase().indexOf(termo) !== -1;
      });

      renderizarTabelaRegimes(filtrado);
    });
  }

  /* ============================================================
  5. Mapa de secretarias
  ============================================================ */
  let secretariasDados = [];

  async function carregarSecretarias() {
    const tbody = $("#tabela-secretarias-mapa tbody");
    if (!tbody) return;

    mostrarCarregando(tbody);

    try {
      const dados = await carregarCSV("dados/secretaria_map.csv");
      if (!dados.length) return mostrarVazio(tbody, "dados/secretaria_map.csv");

      secretariasDados = dados;
      renderizarTabelaSecretarias(dados);
    } catch (e) {
      console.error("[sobre] Erro secretarias:", e);
      mostrarErro(tbody, "Não foi possível carregar o mapa de secretarias.", "dados/secretaria_map.csv");
    }
  }

  function renderizarTabelaSecretarias(lista) {
    const tbody = $("#tabela-secretarias-mapa tbody");
    if (!tbody) return;

    if (!lista || lista.length === 0) {
      return mostrarVazio(tbody, "dados/secretaria_map.csv");
    }

    tbody.innerHTML = lista.map(function (r) {
      const cru = r.secretaria_crua || r.secretaria_cru || r.nome_cru || r.nome_original || "";
      const canon = r.secretaria_canonica || r.secretaria_canon || r.nome_canonico || r.canonico || "";
      const sigla = r.sigla || "";

      return "<tr>" +
        "<td>" + escaparHTML(textoCelula(cru)) + "</td>" +
        "<td>" + escaparHTML(textoCelula(canon)) + "</td>" +
        "<td>" + escaparHTML(textoCelula(sigla)) + "</td>" +
        "</tr>";
    }).join("");
  }

  function configurarBuscaSecretaria() {
    const input = $("#busca-secretaria");
    if (!input) return;

    input.addEventListener("input", function () {
      const termo = input.value.trim().toLowerCase();
      if (!termo) return renderizarTabelaSecretarias(secretariasDados);

      const filtrado = secretariasDados.filter(function (r) {
        return Object.values(r).join(" ").toLowerCase().indexOf(termo) !== -1;
      });

      renderizarTabelaSecretarias(filtrado);
    });
  }

  /* ============================================================
  6. Mapa de escolaridades
  ============================================================ */
  async function carregarEscolaridades() {
    const tbody = $("#tabela-escolaridades tbody");
    if (!tbody) return;

    mostrarCarregando(tbody);

    try {
      const dados = await carregarCSV("dados/escolaridade_map.csv");
      if (!dados.length) return mostrarVazio(tbody, "dados/escolaridade_map.csv");

      dados.sort(function (a, b) {
        const oa = Number(a.ordem || a.order || 0);
        const ob = Number(b.ordem || b.order || 0);
        return oa - ob;
      });

      tbody.innerHTML = dados.map(function (r) {
        const cru = r.escolaridade_crua || r.escolaridade_cru || r.nome_cru || "";
        const canon = r.escolaridade_canonica || r.escolaridade_canon || r.canonico || "";
        const ordem = r.ordem || r.order || "";

        return "<tr>" +
          "<td>" + escaparHTML(textoCelula(cru)) + "</td>" +
          "<td>" + escaparHTML(textoCelula(canon)) + "</td>" +
          '<td class="numero">' + escaparHTML(textoCelula(ordem)) + "</td>" +
          "</tr>";
      }).join("");
    } catch (e) {
      console.error("[sobre] Erro escolaridades:", e);
      mostrarErro(tbody, "Não foi possível carregar o mapa de escolaridades.", "dados/escolaridade_map.csv");
    }
  }

  /* ============================================================
  7. Rodapé (opcional)
  ============================================================ */
  async function atualizarRodape() {
    const alvo = document.querySelector("#rodape-atualizacao");
    if (!alvo) return;

    try {
      const kpis = await carregarJSON("dados/kpis.json");
      const d = kpis.dados || kpis;
      alvo.textContent = formatarData(d.gerado_em);
    } catch (e) {
      alvo.textContent = "—";
    }
  }

  /* ============================================================
  8. Inicialização
  ============================================================ */
  function init() {
    renderizarSelo();
    renderizarFonte();
    renderizarCoberturaGenero();
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