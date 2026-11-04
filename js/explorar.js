// O painel livre do fim da página. O leitor escolhe os eixos, toca o tempo e acompanha países.
// As três visões (bolhas, matriz e linhas) andam juntas pelo mesmo ano e pelos mesmos países.

import { SEM_DADO, ESCURO, ANO_MIN, ANO_MAX, REGIOES4, RENDA, DESCRICAO, CINZA, TINTA, TINTA_2, DIVERGENTE, CURTO, pt, fmt, fmtPop,
         fmtR, marcasLog, rotuloLog, tip, reduzMovimento } from "./base.js";
import { criarBolhas, modoCor, legendaResiduo, legendaIndicador } from "./bolhas.js";
import { RAMPA } from "./base.js";
import { criarEscolhaPaises } from "./destaque.js";
import { iniciarTutorial } from "./tutorial.js";
import { iniciarFerramentas } from "./ferramentas.js";
import { criarTocador, pararTodos } from "./tocador.js";
import { meuPais, COR_MEU_PAIS } from "./meupais.js";

// Cinza das barras do ranking que não são de países acompanhados. Fica claro, para as barras
// coloridas dos países acompanhados se destacarem.
const CINZA_BARRA = ESCURO ? "#56615f" : "#c5ced3";

export function iniciarPainel(D) {
  const estado = {
    x: "pib_pc_ppp", y: "expectativa_vida", cor: "regiao", tamanho: "populacao", t: 1990,
    selecionados: new Set(["BRA", "CHN", "IND", "NGA"]), foco: null,
    rastro: true, curva: false, mostrarR: true,
  };
  const $ = id => document.getElementById(id);
  const anoInteiro = () => Math.min(ANO_MAX, Math.floor(estado.t + 1e-9));
  // Cada visão tem o seu próprio ano, mudado pelo controle de tempo que fica embaixo dela. A tabela
  // segue o ano das bolhas, porque é a versão em texto delas.
  const anos = { matriz: 2023, linhas: 2023, coord: 2023, mapa: 2023, ranking: 2023 };
  // A cor de um país acompanhado é a da sua região. Quando dois países da mesma região estão na
  // lista, o segundo fica num tom mais escuro, para as linhas não se confundirem.
  function corLinha(iso3) {
    if (iso3 === meuPais.obter()) return COR_MEU_PAIS;
    const regiao = D.info.get(iso3).regiao4;
    const anteriores = [...estado.selecionados].slice(0, [...estado.selecionados].indexOf(iso3))
      .filter(i => i !== meuPais.obter() && D.info.get(i).regiao4 === regiao).length;
    const base = REGIOES4[regiao]?.cor ?? TINTA_2;
    return anteriores ? d3.color(base).darker(anteriores * 0.9).formatHex() : base;
  }

  const bolhas = criarBolhas($("svgBolhas"), D, {
    aoClicar: alternar,
    aoArrastarAno: t => { tempoBolhas.parar(); tempoBolhas.irPara(t); },
    // Se o leitor escolhe para um eixo o indicador que já está no outro, os dois trocam de lugar.
    aoEscolherEixo: (qual, c) => {
      const outro = qual === "x" ? "y" : "x";
      if (estado[outro] === c) estado[outro] = estado[qual];
      estado[qual] = c;
      estado.foco = null;
      tudo(1000);
    },
  });

  iniciarTutorial(pararTodos);
  iniciarFerramentas();

  // ---------- Controles ----------
  for (const id of ["selX", "selY"]) {
    d3.select("#" + id).selectAll("option").data(D.eixos).join("option")
      .attr("value", d => d).text(d => D.META[d].nome);
  }
  d3.select("#corIndicadores").selectAll("option").data(D.eixos).join("option")
    .attr("value", d => "ind:" + d).text(d => D.META[d].nome);
  d3.select("#selTam").selectAll("option").data(["populacao", ...D.eixos]).join("option")
    .attr("value", d => d).text(d => D.META[d].nome);
  const escolha = criarEscolhaPaises(document.getElementById("escolhaPainel"), D, {
    obter: () => [...estado.selecionados],
    mudar: lista => { estado.selecionados = new Set(lista); tudo(); },
    rotulo: "Acompanhar países", cor: iso3 => corLinha(iso3), compacto: true,
  });

  $("selX").addEventListener("change", e => { estado.x = e.target.value; estado.foco = null; tudo(1000); });
  $("selY").addEventListener("change", e => { estado.y = e.target.value; tudo(1000); });
  $("trocar").addEventListener("click", () => { [estado.x, estado.y] = [estado.y, estado.x]; tudo(1000); });
  $("selCor").addEventListener("change", e => { estado.cor = e.target.value; estado.foco = null; tudo(); });
  $("selTam").addEventListener("change", e => { estado.tamanho = e.target.value; tudo(600); });
  $("chkRastro").addEventListener("change", e => { estado.rastro = e.target.checked; desenharBolhas(); });
  $("chkCurva").addEventListener("change", e => { estado.curva = e.target.checked; desenharBolhas(); });

  // ---------- Tempo de cada visão ----------
  let anoTabela = null;
  const tempoBolhas = criarTocador($("tocadorBolhas"), {
    inicial: estado.t, continuo: true, nome: "gráfico de bolhas",
    aoMudar: t => {
      estado.t = t;
      desenharBolhas();
      if (anoInteiro() !== anoTabela) { anoTabela = anoInteiro(); tabela(); }
    },
  });
  const tempoMatriz = criarTocador($("tocadorMatriz"), {
    inicial: anos.matriz, nome: "gráfico de correlação", aoMudar: a => { anos.matriz = a; matriz(); },
  });
  const tempoLinhas = criarTocador($("tocadorLinhas"), {
    inicial: anos.linhas, nome: "gráfico de linhas", aoMudar: a => { anos.linhas = a; marcadorLinhas(); },
  });
  criarTocador($("tocadorCoord"), {
    inicial: anos.coord, nome: "gráfico de coordenadas paralelas", aoMudar: a => { anos.coord = a; aplicarFiltro(); },
  });
  criarTocador($("tocadorMapa"), {
    inicial: anos.mapa, nome: "mapa", aoMudar: a => { anos.mapa = a; mapa(); },
  });
  criarTocador($("tocadorRanking"), {
    inicial: anos.ranking, nome: "ranking", aoMudar: a => { anos.ranking = a; ranking(); },
  });

  function alternar(iso3) {
    estado.selecionados.has(iso3) ? estado.selecionados.delete(iso3) : estado.selecionados.add(iso3);
    tudo();
  }
  const chips = () => escolha.atualizar();

  function desenharBolhas(dur = 0) {
    const r = bolhas.atualizar(estado, { dur });
    const nomes = r.ausentes.map(i => D.info.get(i).pais);
    // Sem nenhum país no ano, o leitor precisa saber que é falta de dado e o que fazer.
    $("contagem").textContent = r.visiveis === 0
      ? `Nenhum país tem os dois dados em ${r.ano}. Avance o tempo para ver as bolhas.`
      : `${r.visiveis} de ${D.info.size} países têm os dados ${estado.tamanho === "populacao" ? "dos dois eixos" : "dos eixos e do tamanho"} em ${r.ano}.`
        + (nomes.length ? ` Sem dado neste ano para ${nomes.join(", ")}.` : "");
    $("tituloBolhas").textContent = `${D.META[estado.y].nome} e ${D.META[estado.x].nome}`;
  }

  function legenda() {
    // Na cor pela distância até a curva e na cor por indicador, a legenda é uma escala contínua,
    // sem botões de grupo.
    const modo = modoCor(estado);
    const continua = modo === "residuo" ? legendaResiduo(D, estado.y)
      : modo === "indicador" ? legendaIndicador(D, estado.cor.slice(4)) : null;
    d3.select("#legendaContinua").property("hidden", !continua).html(continua ?? "");
    d3.select("#legenda").property("hidden", !!continua);
    if (continua) return;
    const itens = modoCor(estado) === "regiao"
      ? Object.entries(REGIOES4).map(([k, v]) => [k, v.nome, v.cor])
      : Object.entries(RENDA).map(([k, v]) => [k, v.nome, v.cor]);
    d3.select("#legenda").selectAll("button").data(itens).join("button").attr("type", "button")
      .style("--c", d => d[2]).text(d => d[1])
      .attr("aria-pressed", d => d[0] !== null && d[0] === estado.foco)
      .attr("disabled", d => d[0] === null ? "" : null)
      .on("click", (e, d) => { estado.foco = estado.foco === d[0] ? null : d[0]; legenda(); desenharBolhas(); });
  }

  // ---------- Matriz de correlação ----------
  const svgM = d3.select("#svgMatriz");
  // Clicar numa célula leva o par para as bolhas. Clicar de novo na célula escolhida devolve o par
  // que estava antes, para o leitor poder desfazer a escolha.
  let parAnterior = null;
  const aviso = $("avisoPar");
  let desfazer = null, celulaToque = null, temporizador = null;
  let restante = 8000, inicioAviso = 0, mouseNoAviso = false;
  function pausarAviso() {
    if (temporizador !== null) {
      clearTimeout(temporizador);
      temporizador = null;
      restante = Math.max(0, restante - (performance.now() - inicioAviso));
    }
  }
  function fecharAviso() {
    pausarAviso();
    if (aviso.contains(document.activeElement)) $("tituloBolhas").focus({ preventScroll: true });
    aviso.hidden = true;
    $("textoAvisoPar").textContent = "";
  }
  function retomarAviso() {
    pausarAviso();
    if (aviso.hidden || mouseNoAviso || aviso.contains(document.activeElement)) return;
    inicioAviso = performance.now();
    temporizador = setTimeout(fecharAviso, restante);
  }
  function mostrarAviso(anterior) {
    pausarAviso();
    desfazer = anterior;
    restante = 8000;
    aviso.hidden = false;
    $("textoAvisoPar").textContent = `O gráfico de bolhas agora compara ${CURTO[estado.y]} e ${CURTO[estado.x]}. As linhas, o mapa e o ranking também mudaram.`;
    retomarAviso();
  }
  aviso.addEventListener("mouseenter", () => { mouseNoAviso = true; pausarAviso(); });
  aviso.addEventListener("mouseleave", () => { mouseNoAviso = false; retomarAviso(); });
  aviso.addEventListener("focusin", pausarAviso);
  aviso.addEventListener("focusout", () => queueMicrotask(retomarAviso));
  aviso.addEventListener("keydown", ev => {
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); fecharAviso(); }
  });
  $("fecharAvisoPar").addEventListener("click", fecharAviso);
  $("verGrafico").addEventListener("click", () => {
    $("tituloBolhas").focus({ preventScroll: true });
    $("svgBolhas").closest(".visao").scrollIntoView({ behavior: reduzMovimento() ? "instant" : "smooth", block: "start" });
  });
  function realcarVisoes() {
    if (reduzMovimento()) return;
    for (const id of ["svgBolhas", "svgLinhas", "svgMapa", "svgRanking"]) {
      const no = $(id).closest(".visao");
      no.classList.remove("mudou-par");
      void no.offsetWidth;
      no.classList.add("mudou-par");
      no.addEventListener("animationend", () => no.classList.remove("mudou-par"), { once: true });
    }
  }
  $("desfazerPar").addEventListener("click", () => {
    if (!desfazer) return;
    [estado.x, estado.y] = desfazer;
    parAnterior = null;
    estado.foco = null;
    fecharAviso();
    tudo(reduzMovimento() ? 0 : 1000);
    realcarVisoes();
  });
  const parAtual = c => (c.a === estado.y && c.b === estado.x) || (c.a === estado.x && c.b === estado.y);
  function escolherPar(c) {
    const anterior = [estado.x, estado.y];
    if (parAtual(c) && parAnterior) {
      [estado.x, estado.y] = parAnterior;
      parAnterior = null;
    } else if (!parAtual(c)) {
      parAnterior = anterior;
      estado.y = c.a; estado.x = c.b;
    } else return;
    estado.foco = null;
    $("compararMatriz").hidden = true;
    celulaToque = null;
    tudo(reduzMovimento() ? 0 : 1000);
    realcarVisoes();
    mostrarAviso(anterior);
  }
  $("confirmarPar").addEventListener("click", () => {
    if (!celulaToque) return;
    const c = celulaToque;
    $("compararMatriz").hidden = true;
    celulaToque = null;
    escolherPar(c);
    svgM.selectAll("g.celula").filter(d => d.a === c.a && d.b === c.b).node()?.focus();
  });
  function matriz() {
    const ano = anos.matriz, E = D.eixos, n = E.length;
    const W = svgM.node().clientWidth;
    const esq = 158, base = 140;
    const lado = Math.max(14, Math.min(34, (W - esq) / (n - 1)));
    svgM.attr("height", lado * (n - 1) + base);
    const celulas = [];
    for (let i = 1; i < n; i++) for (let j = 0; j < i; j++) {
      celulas.push({ i, j, a: E[i], b: E[j], ...D.correlacao(E[i], E[j], ano) });
    }
    if (celulaToque) {
      celulaToque = celulas.find(c => c.a === celulaToque.a && c.b === celulaToque.b);
      $("parMatriz").textContent = `${CURTO[celulaToque.a]} e ${CURTO[celulaToque.b]}, r = ${fmtR(celulaToque.r)} (${ano}).`;
    }
    const par = parAtual;
    svgM.selectAll("g.celula").data(celulas, c => c.a + c.b).join(ent => {
      const g = ent.append("g").attr("class", "celula").attr("tabindex", 0).attr("role", "button");
      g.append("rect"); g.append("text").attr("text-anchor", "middle").attr("dy", "0.35em");
      return g;
    })
      .attr("transform", c => `translate(${esq + c.j * lado},${(c.i - 1) * lado})`)
      .attr("aria-pressed", c => String(par(c)))
      .attr("aria-label", c => `${D.META[c.a].nome} e ${D.META[c.b].nome}, r ${fmtR(c.r)}. ` +
        (par(c) ? "Par mostrado no gráfico de bolhas. " + (parAnterior ? "Clique para voltar ao par anterior." : "") : "Clique para ver no gráfico de bolhas."))
      .on("mousemove", (ev, c) => tip.mostrar(ev, `<b>${CURTO[c.a]} e ${CURTO[c.b]}</b>` +
        `<span class="tip-sub">r = ${fmtR(c.r)} em ${c.n} países (${ano})</span>` +
        `<i>${par(c) ? (parAnterior ? "Este par está no gráfico de bolhas. Clique para voltar ao par anterior" : "Este par está no gráfico de bolhas") : "Clique para ver no gráfico de bolhas"}</i>`))
      .on("mouseleave", () => tip.esconder())
      .on("click", (ev, c) => {
        tip.esconder();
        if (matchMedia("(pointer: coarse)").matches && ev.detail !== 0 && ev.pointerType !== "mouse") {
          celulaToque = c;
          $("parMatriz").textContent = `${CURTO[c.a]} e ${CURTO[c.b]}, r = ${fmtR(c.r)} (${ano}).`;
          $("compararMatriz").hidden = false;
        } else escolherPar(c);
      })
      .on("keydown", (ev, c) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); escolherPar(c); } })
      .call(g => g.select("rect").attr("width", lado - 3).attr("height", lado - 3).attr("rx", 6)
        .attr("fill", c => c.r == null ? SEM_DADO : DIVERGENTE((c.r + 1) / 2))
        .attr("stroke", null).attr("stroke-width", null))
      .call(g => g.select("text").attr("x", (lado - 2) / 2).attr("y", (lado - 2) / 2)
        .attr("class", "valor-celula").attr("fill", c => c.r != null && Math.abs(c.r) > 0.6 ? "#fff" : TINTA)
        .text(c => lado >= 28 && c.r != null ? pt.format(".1f")(c.r) : ""));
    const atual = celulas.find(par);
    // O espaço à direita da diagonal fica livre de células e dos nomes dos indicadores.
    const cabeRotulo = atual && W - (esq + atual.i * lado + 6) >= 70;
    svgM.selectAll("text.par-no-grafico").data(cabeRotulo ? [atual] : []).join("text")
      .attr("class", "par-no-grafico").attr("aria-hidden", "true")
      .attr("x", c => esq + c.i * lado + 6).attr("y", c => (c.i - 0.5) * lado)
      .attr("dy", "0.35em").text("no gráfico");
    const forte = d => d === estado.y || d === estado.x ? "700" : null;
    svgM.selectAll("text.lin").data(E.slice(1)).join("text").attr("class", "lin rotulo-matriz")
      .attr("x", esq - 6).attr("y", (d, i) => i * lado + lado / 2).attr("dy", "0.35em")
      .attr("text-anchor", "end").attr("font-weight", forte).text(d => CURTO[d]);
    svgM.selectAll("text.col").data(E.slice(0, -1)).join("text").attr("class", "col rotulo-matriz")
      .attr("transform", (d, j) => `translate(${esq + j * lado + lado / 2},${(n - 1) * lado + 6}) rotate(-50)`)
      .attr("text-anchor", "end").attr("dy", "0.35em").attr("font-weight", forte).text(d => CURTO[d]);
    $("anoMatriz").textContent = ano;
  }

  // ---------- Linhas ----------
  const svgL = d3.select("#svgLinhas");
  let geoL = null;
  // Na diferença para o mundo, cada país vira o seu valor menos o do mundo no mesmo ano, e o eixo
  // passa a ser linear, porque a diferença pode ser negativa.
  let modoLinhas = "valor";
  document.querySelectorAll("[name=modoLinhas]").forEach(r => r.addEventListener("change", e => {
    modoLinhas = e.target.value;
    linhas();
  }));
  function linhas() {
    const W = svgL.node().clientWidth, H = 280, m = { t: 12, r: W < 560 ? 96 : 170, b: 28, l: 52 };
    svgL.attr("height", H).selectAll("*").remove();
    const c = estado.y;
    const dif = modoLinhas === "diferenca";
    const mundo = new Map(D.agregadoDe.get("WLD").filter(d => d[c] != null).map(d => [d.ano, d[c]]));
    const serie = pts => pts.filter(d => D.valido(d, c) && (!dif || mundo.has(d.ano)))
      .map(d => ({ ano: d.ano, v: dif ? d[c] - mundo.get(d.ano) : d[c] }))
      .sort((a, b) => a.ano - b.ano);
    const series = [...estado.selecionados].map(iso3 => ({
      nome: D.info.get(iso3).pais, cor: corLinha(iso3), largura: 2.4, pts: serie([...D.linhaDe.get(iso3).values()]),
    }));
    const meu = meuPais.obter();
    if (meu && !estado.selecionados.has(meu)) {
      series.push({ nome: D.info.get(meu).pais, cor: COR_MEU_PAIS, largura: 3, pts: serie([...D.linhaDe.get(meu).values()]) });
    }
    series.push({ nome: "Mundo", cor: TINTA, largura: 1.6, traco: "6 4", pts: serie(D.agregadoDe.get("WLD")) });
    const todos = series.flatMap(s => s.pts.map(d => d.v));
    const log = D.ehLog(c) && !dif;
    const x = d3.scaleLinear().domain([ANO_MIN, ANO_MAX]).range([m.l, W - m.r]);
    const ext = d3.extent(todos.length ? todos : [1, 2]);
    const y = log ? d3.scaleLog().domain(ext).range([H - m.b, m.t])
                  : d3.scaleLinear().domain(ext).nice().range([H - m.b, m.t]);
    const eixoY = s => log ? s.tickValues(marcasLog(y.domain())).tickFormat(rotuloLog)
      : s.ticks(5).tickFormat(pt.format(dif ? "+," : ","));
    svgL.append("g").attr("class", "grade").attr("transform", `translate(${W - m.r},0)`)
      .call(eixoY(d3.axisLeft(y)).tickSize(W - m.l - m.r).tickFormat(""));
    svgL.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(W < 560 ? 4 : 8).tickSize(0).tickPadding(8))
      .select(".domain").remove();
    svgL.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`)
      .call(eixoY(d3.axisLeft(y)).tickSize(0).tickPadding(8)).select(".domain").remove();
    geoL = { x, marcador: svgL.append("line").attr("class", "marcador-ano").attr("y1", m.t).attr("y2", H - m.b) };
    const linha = d3.line().x(d => x(d.ano)).y(d => y(d.v));
    for (const s of series) {
      svgL.append("path").attr("d", linha(s.pts)).attr("fill", "none").attr("stroke", s.cor)
        .attr("stroke-width", s.largura).attr("stroke-dasharray", s.traco ?? null);
    }
    const pontas = series.filter(s => s.pts.length).map(s => ({ s, y: y(s.pts.at(-1).v) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < pontas.length; i++) pontas[i].y = Math.max(pontas[i].y, pontas[i - 1].y + 16);
    for (const p of pontas) {
      svgL.append("line").attr("x1", W - m.r + 6).attr("x2", W - m.r + 18).attr("y1", p.y).attr("y2", p.y)
        .attr("stroke", p.s.cor).attr("stroke-width", 2.4).attr("stroke-dasharray", p.s.traco ?? null);
      svgL.append("text").attr("class", "rotulo-serie").attr("x", W - m.r + 22).attr("y", p.y).attr("dy", "0.35em").text(p.s.nome);
    }
    const foco = svgL.append("line").attr("y1", m.t).attr("y2", H - m.b).attr("stroke", TINTA_2).attr("opacity", 0);
    svgL.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b)
      .attr("fill", "transparent").style("cursor", "pointer")
      .on("mousemove", ev => {
        const ano = Math.round(x.invert(d3.pointer(ev)[0]));
        foco.attr("x1", x(ano)).attr("x2", x(ano)).attr("opacity", 0.6);
        tip.mostrar(ev, `<b>${ano}</b><dl>` + series.map(s =>
          `<dt>${s.nome}</dt><dd>${dif && s.pts.find(p => p.ano === ano)?.v > 0 ? "+" : ""}${fmt(s.pts.find(p => p.ano === ano)?.v)}</dd>`).join("") +
          "</dl><i>Clique para marcar este ano</i>");
      })
      // Clicar na linha do tempo leva todas as visões para aquele ano.
      .on("click", ev => { tempoLinhas.parar(); tempoLinhas.irPara(Math.round(x.invert(d3.pointer(ev)[0]))); })
      .on("mouseleave", () => { foco.attr("opacity", 0); tip.esconder(); });
    $("tituloLinhas").textContent = dif
      ? `${D.META[c].nome}, diferença para o mundo (${D.META[c].unidade}), de 1990 a 2024`
      : `${D.META[c].nome} (${D.META[c].unidade}), de 1990 a 2024`;
    marcadorLinhas();
  }
  function marcadorLinhas() {
    if (geoL) geoL.marcador.attr("x1", geoL.x(anos.linhas)).attr("x2", geoL.x(anos.linhas));
  }

  // ---------- Coordenadas paralelas ----------
  // Um eixo por indicador escolhido e uma linha por país, no ano do painel. Arrastar sobre um eixo
  // cria uma faixa de filtro. Os países que passam em todas as faixas ficam em estado.filtro, que as
  // bolhas, o mapa e o ranking também usam.
  const svgC = d3.select("#svgCoord");
  let eixosC = ["pib_pc_ppp", "expectativa_vida", "mortalidade_infantil", "fecundidade", "uso_internet",
                "populacao_urbana", "populacao_65_mais", "fecundidade_adolescente"];
  const faixas = new Map();
  let geoC = null;
  function botoesEixos() {
    const motivo = eixosC.length >= 8
      ? "Limite de indicadores atingido. Remova um indicador para adicionar outro."
      : eixosC.length <= 2 ? "Mantenha pelo menos 2 indicadores. Adicione outro para remover um dos selecionados." : "Selecione de 2 a 8 indicadores. Clique num indicador para adicionar ou remover.";
    $("ajudaEixosCoord").textContent = motivo;
    d3.select("#eixosCoord").selectAll("button").data(D.eixos).join("button").attr("type", "button")
      .attr("class", "chip-eixo").html(c =>
        `<span class="visto-chip" aria-hidden="true"></span><span>${CURTO[c]}</span>`)
      .attr("aria-describedby", "ajudaEixosCoord")
      .attr("title", c => (!eixosC.includes(c) && eixosC.length >= 8) || (eixosC.includes(c) && eixosC.length <= 2) ? motivo : null)
      .attr("aria-pressed", c => String(eixosC.includes(c)))
      .attr("disabled", c => (!eixosC.includes(c) && eixosC.length >= 8) || (eixosC.includes(c) && eixosC.length <= 2) ? "" : null)
      .on("click", (ev, c) => {
        // A ordem dos eixos segue a lista de indicadores, para o mesmo par ficar sempre no mesmo lugar.
        eixosC = eixosC.includes(c) ? eixosC.filter(e => e !== c) : D.eixos.filter(e => e === c || eixosC.includes(e));
        faixas.delete(c);
        coordenadas();
        aplicarFiltro();
      });
  }
  function coordenadas() {
    botoesEixos();
    const W = Math.max(svgC.node().parentNode.clientWidth, eixosC.length * 170), H = 360;
    // As margens laterais deixam espaço para os números do primeiro eixo e para o nome do último.
    const m = { t: 34, r: 96, b: 16, l: 96 };
    svgC.attr("width", W).attr("height", H).style("width", W + "px").selectAll("*").remove();
    const x = d3.scalePoint().domain(eixosC).range([m.l, W - m.r]);
    const y = new Map(eixosC.map(c => {
      const ext = d3.extent(D.linhas, d => D.valido(d, c) ? d[c] : undefined);
      return [c, (D.ehLog(c) ? d3.scaleLog() : d3.scaleLinear()).domain(ext).range([H - m.b, m.t]).nice()];
    }));
    const gLinhas = svgC.append("g").attr("class", "linhas-coord");
    const gEixos = svgC.append("g");
    geoC = { x, y, gLinhas };
    for (const c of eixosC) {
      const g = gEixos.append("g").attr("class", "eixo eixo-coord").attr("transform", `translate(${x(c)},0)`);
      const s = y.get(c);
      g.call((D.ehLog(c) ? d3.axisLeft(s).tickValues(marcasLog(s.domain(), true)).tickFormat(rotuloLog)
                         : d3.axisLeft(s).ticks(5).tickFormat(pt.format(","))).tickSize(4));
      g.append("text").attr("class", "rotulo-eixo").attr("y", m.t - 16).attr("text-anchor", "middle").text(CURTO[c]);
      const brush = d3.brushY().extent([[-14, m.t], [14, H - m.b]])
        .on("brush end", ev => {
          if (ev.selection) faixas.set(c, ev.selection.map(s.invert).sort((a, b) => a - b));
          else faixas.delete(c);
          if (ev.sourceEvent) aplicarFiltro();
        });
      const gb = g.append("g").attr("class", "pincel").call(brush);
      // Ao redesenhar, a faixa que já existia volta para o eixo.
      if (faixas.has(c)) gb.call(brush.move, faixas.get(c).map(s).sort((a, b) => a - b));
    }
    linhasCoord();
  }
  function passaFiltro(d) {
    for (const [c, [a, b]] of faixas) if (!D.valido(d, c) || d[c] < a || d[c] > b) return false;
    return true;
  }
  function linhasCoord() {
    if (!geoC) return;
    const ano = anos.coord, meu = meuPais.obter();
    const { x, y, gLinhas } = geoC;
    const doAno = [...D.linhaDe.values()].map(mp => mp.get(ano)).filter(Boolean);
    const linha = d3.line().defined(p => p[1] != null).x(p => p[0]).y(p => p[1]);
    const pontos = d => eixosC.map(c => [x(c), D.valido(d, c) ? y.get(c)(d[c]) : null]);
    const destaque = d => d.iso3 === meu ? 2 : estado.selecionados.has(d.iso3) ? 1 : 0;
    const filtrando = faixas.size > 0;
    const ordem = doAno.slice().sort((a, b) => (passaFiltro(a) - passaFiltro(b)) || (destaque(a) - destaque(b)));
    gLinhas.selectAll("path").data(ordem, d => d.iso3).join("path")
      .attr("d", d => linha(pontos(d))).attr("fill", "none")
      .attr("stroke", d => d.iso3 === meu ? COR_MEU_PAIS : filtrando && !passaFiltro(d) ? CINZA
        : estado.selecionados.has(d.iso3) ? corLinha(d.iso3) : (REGIOES4[d.regiao4]?.cor ?? TINTA_2))
      .attr("stroke-width", d => destaque(d) ? 2.6 : 1)
      .attr("stroke-opacity", d => destaque(d) ? 1 : filtrando && !passaFiltro(d) ? 0.25 : 0.45)
      .on("mousemove", (ev, d) => tip.mostrar(ev, `<b>${d.pais}</b><span class="tip-sub">${ano}</span><dl>` +
        eixosC.map(c => `<dt>${CURTO[c]}</dt><dd>${fmt(d[c])}</dd>`).join("") + "</dl>" +
        `<i>Clique para ${estado.selecionados.has(d.iso3) ? "deixar de acompanhar" : "acompanhar"}</i>`))
      .on("mouseleave", () => tip.esconder())
      .on("click", (ev, d) => { tip.esconder(); alternar(d.iso3); })
      .order();
    const n = filtrando ? doAno.filter(passaFiltro).length : null;
    $("contagemCoord").textContent = filtrando
      ? `${n} de ${doAno.length} países passam no filtro em ${ano}.` : "Nenhum filtro ativo.";
    $("tituloCoord").textContent = `Vários indicadores ao mesmo tempo, em ${ano}`;
  }
  // Recalcula quem passa no filtro, no ano das coordenadas paralelas. O conjunto de países que passa
  // vale para as bolhas, o mapa e o ranking, mesmo que eles estejam em outro ano.
  function atualizarFiltro() {
    const ano = anos.coord;
    estado.filtro = faixas.size ? new Set([...D.linhaDe.values()].map(mp => mp.get(ano)).filter(d => d && passaFiltro(d)).map(d => d.iso3)) : null;
  }
  // Depois de mexer numa faixa, redesenha as visões que usam o filtro.
  function aplicarFiltro() {
    atualizarFiltro();
    linhasCoord();
    desenharBolhas();
    mapa();
    ranking();
  }

  // ---------- Mapa ----------
  // Mapa coroplético do indicador do eixo vertical, no ano do painel. A cor usa a rampa de um só
  // matiz, com a escala cobrindo todos os anos, para a cor de um país só mudar quando o valor muda.
  // O contorno vem de dados/mundo.json, feito por exploracao/gerar_mapa_site.py.
  const svgMapa = d3.select("#svgMapa");
  // Sem dado vira hachura, e não um cinza liso, para não se confundir com o tom mais claro da rampa.
  const hachura = svgMapa.append("defs").append("pattern").attr("id", "semDadoMapa")
    .attr("width", 5).attr("height", 5).attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
  hachura.append("rect").attr("width", 5).attr("height", 5).attr("class", "hachura-fundo");
  hachura.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 5).attr("class", "hachura-linha");
  let mundo = null;
  d3.json("dados/mundo.json").then(g => { mundo = g; mapa(); })
    .catch(() => { $("notaMapa").textContent = "O contorno dos países não carregou, então o mapa não pode ser desenhado."; });
  const escalasMapa = new Map();
  function escalaMapa(c) {
    if (!escalasMapa.has(c)) {
      const ext = d3.extent(D.linhas, d => D.valido(d, c) ? d[c] : undefined);
      escalasMapa.set(c, (D.ehLog(c) ? d3.scaleLog() : d3.scaleLinear()).domain(ext).range([0, 1]).clamp(true));
    }
    return escalasMapa.get(c);
  }
  function mapa() {
    const c = estado.y, ano = anos.mapa;
    $("tituloMapa").textContent = `${D.META[c].nome} em ${ano}, no mapa`;
    $("legendaMapa").innerHTML = legendaIndicador(D, c) +
      `<span class="item"><i class="bola sem-dado-mapa"></i>Sem dado</span>`;
    if (!mundo) return;
    const W = svgMapa.node().clientWidth, H = Math.round(W * 0.48);
    const projecao = d3.geoEqualEarth().fitSize([W, H], mundo);
    const caminho = d3.geoPath(projecao);
    svgMapa.attr("height", H);
    const meu = meuPais.obter();
    const valor = iso3 => { const d = iso3 && D.linhaDe.get(iso3)?.get(ano); return D.valido(d, c) ? d[c] : null; };
    const { posicao, vals } = ordenar(c, ano);
    // Países acompanhados ficam por cima, para o contorno grosso não ser coberto pelos vizinhos.
    const destaque = f => f.id === meu ? 2 : estado.selecionados.has(f.id) ? 1 : 0;
    const formas = mundo.features.slice().sort((a, b) => destaque(a) - destaque(b));
    svgMapa.selectAll("path.pais-mapa").data(formas, (f, i) => f.id ?? "sem-" + i).join("path")
      .attr("class", "pais-mapa").attr("d", caminho)
      .attr("fill", f => { const v = valor(f.id); return v == null ? "url(#semDadoMapa)" : RAMPA(escalaMapa(c)(v)); })
      .attr("stroke", f => f.id === meu ? COR_MEU_PAIS : estado.selecionados.has(f.id) ? TINTA : null)
      .classed("borda-mapa", f => !destaque(f))
      .attr("stroke-width", f => destaque(f) ? 2 : 0.5)
      .attr("fill-opacity", f => estado.filtro && f.id && !estado.filtro.has(f.id) ? 0.2 : 1)
      .style("cursor", f => f.id ? "pointer" : null)
      .on("mousemove", (ev, f) => {
        if (!f.id) return;
        const v = valor(f.id);
        tip.mostrar(ev, `<b>${D.info.get(f.id).pais}</b><span class="tip-sub">${D.META[c].nome}, ${ano}</span>` +
          `<dl><dt>Valor</dt><dd>${v == null ? "sem dado" : fmt(v) + " " + D.META[c].unidade}</dd>` +
          (v == null ? "" : `<dt>Posição</dt><dd>${posicao.get(f.id)}º de ${vals.length}</dd>`) + "</dl>" +
          `<i>Clique para ${estado.selecionados.has(f.id) ? "deixar de acompanhar" : "acompanhar"}</i>`);
      })
      .on("mouseleave", () => tip.esconder())
      .on("click", (ev, f) => { if (f.id) { tip.esconder(); alternar(f.id); } })
      .order();
    const fora = D.info.size - new Set(mundo.features.map(f => f.id).filter(Boolean)).size;
    $("notaMapa").textContent = "A cor é o valor do indicador do eixo vertical, e a hachura quer dizer sem dado. " +
      `Clique num país para acompanhá-lo. ${fora} países pequenos demais para o mapa aparecem só no ranking. ` +
      "O mapa usa a projeção Equal Earth, que mantém a proporção entre as áreas dos países.";
  }

  // ---------- Ranking ----------
  // Barras horizontais com a posição de cada país no indicador do eixo vertical, no ano do painel.
  // As barras partem do zero e usam escala linear mesmo para o PIB, porque o comprimento da barra
  // só pode ser comparado quando começa no zero.
  const svgR = d3.select("#svgRanking");
  let modoRanking = "resumo";
  document.querySelectorAll("[name=modoRanking]").forEach(r => r.addEventListener("change", e => {
    modoRanking = e.target.value;
    ranking();
  }));
  function ordenar(c, ano) {
    const vals = [...D.linhaDe.values()].map(mp => mp.get(ano)).filter(d => D.valido(d, c))
      .sort((a, b) => d3.descending(a[c], b[c]));
    return { vals, posicao: new Map(vals.map((d, i) => [d.iso3, i + 1])) };
  }
  function ranking() {
    const c = estado.y, ano = anos.ranking;
    const { vals } = ordenar(c, ano);
    const em1990 = ordenar(c, ANO_MIN).posicao;
    const meu = meuPais.obter();
    const marcados = new Set([...estado.selecionados, meu].filter(Boolean));
    const n = vals.length;
    let linhas = vals.map((d, i) => ({ d, i }));
    // Com o filtro das coordenadas paralelas, só entram os países que passam nele. A posição
    // continua sendo a entre todos os países.
    if (estado.filtro) linhas = linhas.filter(o => estado.filtro.has(o.d.iso3));
    const k = linhas.length;
    if (modoRanking === "resumo") linhas = linhas.filter((o, j) => j < 10 || j >= k - 10 || marcados.has(o.d.iso3));
    // Onde a lista pula posições, entra uma linha com reticências.
    const itens = [];
    linhas.forEach((o, k) => {
      if (k && o.i !== linhas[k - 1].i + 1) itens.push({ chave: "pulo-" + o.i });
      itens.push({ ...o, chave: o.d.iso3 });
    });

    svgR.node().parentNode.classList.toggle("todos", modoRanking === "todos");
    const W = svgR.node().clientWidth, estreito = W < 560;
    const alt = modoRanking === "resumo" ? 22 : 17;
    const m = { t: 6, r: estreito ? 64 : 150, b: 6, l: estreito ? 132 : 200 };
    svgR.attr("height", m.t + m.b + itens.length * alt);
    const ext = d3.extent(vals, d => d[c]);
    const x = d3.scaleLinear().domain([Math.min(0, ext[0] ?? 0), Math.max(0, ext[1] ?? 1)]).nice()
      .range([m.l, W - m.r]);
    const corBarra = iso3 => iso3 === meu ? COR_MEU_PAIS : estado.selecionados.has(iso3) ? corLinha(iso3) : CINZA_BARRA;
    const nomeCurto = nome => estreito && nome.length > 17 ? nome.slice(0, 16) + "." : nome;
    const dur = reduzMovimento() ? 0 : 350;

    const g = svgR.selectAll("g.linha-ranking").data(itens, o => o.chave).join(
      ent => {
        const s = ent.append("g").attr("class", "linha-ranking").attr("opacity", 0)
          .attr("transform", (o, k) => `translate(0,${m.t + k * alt})`);
        s.append("rect").attr("class", "alvo").attr("fill", "transparent");
        s.append("text").attr("class", "nome-ranking").attr("text-anchor", "end").attr("dy", "0.35em");
        s.append("rect").attr("class", "barra-ranking").attr("rx", 2);
        s.append("text").attr("class", "valor-ranking").attr("dy", "0.35em");
        return s;
      },
      upd => upd,
      sai => sai.remove(),
    );
    g.transition().duration(dur).attr("opacity", 1).attr("transform", (o, k) => `translate(0,${m.t + k * alt})`);
    const meio = alt / 2;
    g.select("rect.alvo").attr("x", 0).attr("width", W).attr("height", alt);
    g.select("text.nome-ranking").attr("x", m.l - 8).attr("y", meio)
      .classed("marcado", o => o.d && marcados.has(o.d.iso3))
      .text(o => o.d ? `${o.i + 1}º ${nomeCurto(o.d.pais)}` : "…");
    g.select("rect.barra-ranking").attr("y", 3).attr("height", alt - 6)
      .attr("fill", o => o.d ? corBarra(o.d.iso3) : "none")
      .transition().duration(dur)
      .attr("x", o => o.d ? x(Math.min(0, o.d[c])) : 0)
      .attr("width", o => o.d ? Math.abs(x(o.d[c]) - x(0)) : 0);
    g.select("text.valor-ranking").attr("x", W - m.r + 8).attr("y", meio).text(o => {
      if (!o.d) return "";
      if (estreito) return fmt(o.d[c]);
      const antes = em1990.get(o.d.iso3);
      return `${fmt(o.d[c])}   ${antes ? `${antes}º em 1990` : "sem dado em 1990"}`;
    });
    g.style("cursor", o => o.d ? "pointer" : null)
      .on("mousemove", (ev, o) => {
        if (!o.d) return;
        const antes = em1990.get(o.d.iso3);
        tip.mostrar(ev, `<b>${o.d.pais}</b><span class="tip-sub">${D.META[c].nome}, ${ano}</span>` +
          `<dl><dt>Valor</dt><dd>${fmt(o.d[c])} ${D.META[c].unidade}</dd>` +
          `<dt>Posição</dt><dd>${o.i + 1}º de ${n}</dd>` +
          `<dt>Em 1990</dt><dd>${antes ? antes + "º" : "sem dado"}</dd></dl>` +
          `<i>Clique para ${estado.selecionados.has(o.d.iso3) ? "deixar de acompanhar" : "acompanhar"}</i>`);
      })
      .on("mouseleave", () => tip.esconder())
      .on("click", (ev, o) => { if (o.d) { tip.esconder(); alternar(o.d.iso3); } });
    $("tituloRanking").textContent = `${D.META[c].nome} em ${ano}: posição dos ${n} países com dado`;
  }

  // ---------- Tabela, para quem não lê o gráfico ----------
  function tabela() {
    const ano = anoInteiro();
    const linhas = [...D.linhaDe.values()].map(m => m.get(ano)).filter(Boolean)
      .sort((a, b) => a.pais.localeCompare(b.pais, "pt-BR"));
    $("legendaTabela").textContent = `Valores de ${ano} para os eixos escolhidos e a população.`;
    d3.select("#tabelaDados thead").html(
      `<tr><th scope="col">País</th><th scope="col">${D.META[estado.x].nome}</th>` +
      `<th scope="col">${D.META[estado.y].nome}</th><th scope="col">População</th></tr>`);
    d3.select("#tabelaDados tbody").selectAll("tr").data(linhas, d => d.iso3).join("tr")
      .html(d => `<th scope="row">${d.pais}</th><td>${fmt(d[estado.x])}</td><td>${fmt(d[estado.y])}</td>` +
        `<td>${fmtPop(d.populacao)}</td>`);
  }

  // ---------- O que os indicadores medem ----------
  // Um cartão para cada eixo, com a definição, a unidade e quantos países têm o dado.
  function sobreIndicadores() {
    const cartao = (eixo, c) => {
      const meta = D.META[c];
      const cobertura = Math.round(meta.cobertura * 100);
      return `<article class="sobre"><p class="sobre-eixo">${eixo}</p><h3>${meta.nome}</h3>` +
        `<p>${DESCRICAO[c]}</p><p class="sobre-meta">Unidade: ${meta.unidade}` +
        `${D.ehLog(c) ? ", em escala log no gráfico" : ""}. Em 2023, ${meta.paises_2023} países têm o dado. ` +
        `De 1990 a 2024, há dado em ${cobertura}% das combinações de país e ano. Código no WDI: ${meta.codigo}.</p></article>`;
    };
    $("sobreIndicadores").innerHTML = cartao("Eixo vertical", estado.y) + cartao("Eixo horizontal", estado.x);
  }
  d3.select("#listaIndicadores").selectAll("div").data(D.eixos).join("div")
    .html(c => `<dt>${D.META[c].nome}</dt><dd>${DESCRICAO[c]} <span class="sobre-meta">(${D.META[c].unidade})</span></dd>`);

  function tudo(dur = 0) {
    sobreIndicadores();
    $("selX").value = estado.x;
    $("selY").value = estado.y;
    $("selCor").value = estado.cor;
    $("selTam").value = estado.tamanho;
    chips();
    legenda();
    desenharBolhas(dur);
    linhas();
    coordenadas();
    atualizarFiltro();
    linhasCoord();
    matriz();
    anoTabela = anoInteiro();
    tabela();
    ranking();
    mapa();
  }
  addEventListener("resize", () => { bolhas.redimensionar(); tudo(); });
  meuPais.aoMudar(() => tudo());
  tudo();
}
