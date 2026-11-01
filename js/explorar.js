// O painel livre do fim da página. O leitor escolhe os eixos, toca o tempo e acompanha países.
// As três visões (bolhas, matriz e linhas) andam juntas pelo mesmo ano e pelos mesmos países.

import { ANO_MIN, ANO_MAX, REGIOES4, RENDA, DESCRICAO, CINZA, TINTA, TINTA_2, DIVERGENTE, CURTO, pt, fmt, fmtPop,
         fmtR, marcasLog, rotuloLog, tip } from "./base.js";
import { criarBolhas } from "./bolhas.js";
import { criarEscolhaPaises } from "./destaque.js";

export function iniciarPainel(D) {
  const estado = {
    x: "pib_pc_ppp", y: "expectativa_vida", cor: "regiao", t: 1990,
    selecionados: new Set(["BRA", "CHN", "IND", "NGA"]), foco: null,
    rastro: true, curva: false, mostrarR: true, velocidade: 2,
  };
  let quadro = null, anoDesenhado = null;
  const $ = id => document.getElementById(id);
  const anoInteiro = () => Math.min(ANO_MAX, Math.floor(estado.t + 1e-9));
  // A cor de um país acompanhado é a da sua região. Quando dois países da mesma região estão na
  // lista, o segundo fica num tom mais escuro, para as linhas não se confundirem.
  function corLinha(iso3) {
    const regiao = D.info.get(iso3).regiao4;
    const anteriores = [...estado.selecionados].slice(0, [...estado.selecionados].indexOf(iso3))
      .filter(i => D.info.get(i).regiao4 === regiao).length;
    const base = REGIOES4[regiao]?.cor ?? TINTA_2;
    return anteriores ? d3.color(base).darker(anteriores * 0.9).formatHex() : base;
  }

  const bolhas = criarBolhas($("svgBolhas"), D, {
    aoClicar: alternar,
    aoArrastarAno: t => { parar(); irPara(t); },
  });

  // ---------- Controles ----------
  for (const id of ["selX", "selY"]) {
    d3.select("#" + id).selectAll("option").data(D.eixos).join("option")
      .attr("value", d => d).text(d => D.META[d].nome);
  }
  const escolha = criarEscolhaPaises(document.getElementById("escolhaPainel"), D, {
    obter: () => [...estado.selecionados],
    mudar: lista => { estado.selecionados = new Set(lista); tudo(); },
    rotulo: "Acompanhar países", cor: iso3 => corLinha(iso3),
  });

  $("selX").addEventListener("change", e => { estado.x = e.target.value; tudo(1000); });
  $("selY").addEventListener("change", e => { estado.y = e.target.value; tudo(1000); });
  $("trocar").addEventListener("click", () => { [estado.x, estado.y] = [estado.y, estado.x]; tudo(1000); });
  $("selCor").addEventListener("change", e => { estado.cor = e.target.value; estado.foco = null; tudo(); });
  $("selVel").addEventListener("change", e => { estado.velocidade = +e.target.value; });
  $("chkRastro").addEventListener("change", e => { estado.rastro = e.target.checked; desenharBolhas(); });
  $("chkCurva").addEventListener("change", e => { estado.curva = e.target.checked; desenharBolhas(); });
  $("tempo").addEventListener("input", e => { parar(); irPara(+e.target.value); });
  $("play").addEventListener("click", () => quadro ? parar() : tocar());
  $("voltar").addEventListener("click", () => { parar(); irPara(Math.ceil(estado.t) - 1); });
  $("avancar").addEventListener("click", () => { parar(); irPara(Math.floor(estado.t) + 1); });
  // As setas e a barra de espaço controlam o tempo quando o foco está dentro do painel.
  $("painel").addEventListener("keydown", e => {
    const alvo = e.target;
    if (alvo.tagName === "SELECT" || (alvo.tagName === "INPUT" && alvo.type !== "range") || alvo.tagName === "BUTTON" && e.key === " ") return;
    if (e.key === "ArrowLeft") { e.preventDefault(); parar(); irPara(Math.ceil(estado.t) - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); parar(); irPara(Math.floor(estado.t) + 1); }
    if (e.key === " ") { e.preventDefault(); quadro ? parar() : tocar(); }
  });

  // ---------- Tempo ----------
  function irPara(t) {
    estado.t = Math.max(ANO_MIN, Math.min(ANO_MAX, t));
    $("tempo").value = estado.t;
    $("tempo").setAttribute("aria-valuetext", String(anoInteiro()));
    $("anoTxt").textContent = anoInteiro();
    desenharBolhas();
    marcadorLinhas();
    // A matriz e a tabela usam só anos inteiros, então mudam só quando o ano muda.
    if (anoInteiro() !== anoDesenhado) { anoDesenhado = anoInteiro(); matriz(); tabela(); }
  }
  function tocar() {
    if (estado.t >= ANO_MAX) estado.t = ANO_MIN;
    $("play").textContent = "Pausar";
    $("play").setAttribute("aria-pressed", "true");
    let antes = null;
    const passo = agora => {
      if (antes != null) estado.t = Math.min(ANO_MAX, estado.t + (agora - antes) / 1000 * estado.velocidade);
      antes = agora;
      irPara(estado.t);
      if (estado.t >= ANO_MAX) return parar();
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
  }
  function parar() {
    cancelAnimationFrame(quadro);
    quadro = null;
    $("play").textContent = "Tocar";
    $("play").setAttribute("aria-pressed", "false");
  }

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
      : `${r.visiveis} de ${D.info.size} países têm os dois dados em ${r.ano}.`
        + (nomes.length ? ` Sem dado neste ano para ${nomes.join(", ")}.` : "");
    $("tituloBolhas").textContent = `${D.META[estado.y].nome} e ${D.META[estado.x].nome}`;
  }

  function legenda() {
    const itens = estado.cor === "regiao"
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
  function matriz() {
    const ano = anoInteiro(), E = D.eixos, n = E.length;
    const W = svgM.node().clientWidth;
    const esq = 140, base = 112;
    const lado = Math.max(14, Math.min(34, (W - esq) / (n - 1)));
    svgM.attr("height", lado * (n - 1) + base);
    const celulas = [];
    for (let i = 1; i < n; i++) for (let j = 0; j < i; j++) {
      celulas.push({ i, j, a: E[i], b: E[j], ...D.correlacao(E[i], E[j], ano) });
    }
    const par = c => (c.a === estado.y && c.b === estado.x) || (c.a === estado.x && c.b === estado.y);
    svgM.selectAll("g.celula").data(celulas, c => c.a + c.b).join(ent => {
      const g = ent.append("g").attr("class", "celula").attr("tabindex", 0).attr("role", "button");
      g.append("rect"); g.append("text").attr("text-anchor", "middle").attr("dy", "0.35em");
      return g;
    })
      .attr("transform", c => `translate(${esq + c.j * lado},${(c.i - 1) * lado})`)
      .attr("aria-label", c => `${D.META[c.a].nome} e ${D.META[c.b].nome}, r ${fmtR(c.r)}. Levar o par para as bolhas.`)
      .on("mousemove", (ev, c) => tip.mostrar(ev, `<b>${CURTO[c.a]} e ${CURTO[c.b]}</b>` +
        `<span class="tip-sub">r = ${fmtR(c.r)} em ${c.n} países (${ano})</span><i>Clique para ver nas bolhas</i>`))
      .on("mouseleave", () => tip.esconder())
      .on("click", (ev, c) => { estado.y = c.a; estado.x = c.b; tudo(1000); })
      .on("keydown", (ev, c) => { if (ev.key === "Enter") { estado.y = c.a; estado.x = c.b; tudo(1000); } })
      .call(g => g.select("rect").attr("width", lado - 3).attr("height", lado - 3).attr("rx", 6)
        .attr("fill", c => c.r == null ? "#f2f2f2" : DIVERGENTE((c.r + 1) / 2))
        .attr("stroke", c => par(c) ? TINTA : null).attr("stroke-width", c => par(c) ? 2 : null))
      .call(g => g.select("text").attr("x", (lado - 2) / 2).attr("y", (lado - 2) / 2)
        .attr("class", "valor-celula").attr("fill", c => c.r != null && Math.abs(c.r) > 0.6 ? "#fff" : TINTA)
        .text(c => lado >= 28 && c.r != null ? pt.format(".1f")(c.r) : ""));
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
  function linhas() {
    const W = svgL.node().clientWidth, H = 280, m = { t: 12, r: W < 560 ? 96 : 170, b: 28, l: 52 };
    svgL.attr("height", H).selectAll("*").remove();
    const c = estado.y;
    const serie = pts => pts.filter(d => D.valido(d, c)).sort((a, b) => a.ano - b.ano);
    const series = [...estado.selecionados].map(iso3 => ({
      nome: D.info.get(iso3).pais, cor: corLinha(iso3), largura: 2.4, pts: serie([...D.linhaDe.get(iso3).values()]),
    }));
    series.push({ nome: "Mundo", cor: TINTA, largura: 1.6, traco: "6 4", pts: serie(D.agregadoDe.get("WLD")) });
    const todos = series.flatMap(s => s.pts.map(d => d[c]));
    const x = d3.scaleLinear().domain([ANO_MIN, ANO_MAX]).range([m.l, W - m.r]);
    const ext = d3.extent(todos.length ? todos : [1, 2]);
    const y = D.ehLog(c) ? d3.scaleLog().domain(ext).range([H - m.b, m.t])
                         : d3.scaleLinear().domain(ext).nice().range([H - m.b, m.t]);
    const eixoY = s => D.ehLog(c) ? s.tickValues(marcasLog(y.domain())).tickFormat(rotuloLog) : s.ticks(5).tickFormat(pt.format(","));
    svgL.append("g").attr("class", "grade").attr("transform", `translate(${W - m.r},0)`)
      .call(eixoY(d3.axisLeft(y)).tickSize(W - m.l - m.r).tickFormat(""));
    svgL.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(W < 560 ? 4 : 8).tickSize(0).tickPadding(8))
      .select(".domain").remove();
    svgL.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`)
      .call(eixoY(d3.axisLeft(y)).tickSize(0).tickPadding(8)).select(".domain").remove();
    geoL = { x, marcador: svgL.append("line").attr("class", "marcador-ano").attr("y1", m.t).attr("y2", H - m.b) };
    const linha = d3.line().x(d => x(d.ano)).y(d => y(d[c]));
    for (const s of series) {
      svgL.append("path").attr("d", linha(s.pts)).attr("fill", "none").attr("stroke", s.cor)
        .attr("stroke-width", s.largura).attr("stroke-dasharray", s.traco ?? null);
    }
    const pontas = series.filter(s => s.pts.length).map(s => ({ s, y: y(s.pts.at(-1)[c]) })).sort((a, b) => a.y - b.y);
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
          `<dt>${s.nome}</dt><dd>${fmt(s.pts.find(p => p.ano === ano)?.[c])}</dd>`).join("") +
          "</dl><i>Clique para ir a este ano</i>");
      })
      // Clicar na linha do tempo leva todas as visões para aquele ano.
      .on("click", ev => { parar(); irPara(Math.round(x.invert(d3.pointer(ev)[0]))); })
      .on("mouseleave", () => { foco.attr("opacity", 0); tip.esconder(); });
    $("tituloLinhas").textContent = `${D.META[c].nome} (${D.META[c].unidade}), de 1990 a 2024`;
    marcadorLinhas();
  }
  function marcadorLinhas() {
    if (geoL) geoL.marcador.attr("x1", geoL.x(estado.t)).attr("x2", geoL.x(estado.t));
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
    chips();
    legenda();
    desenharBolhas(dur);
    linhas();
    anoDesenhado = null;
    if (!dur) irPara(estado.t);
    else { matriz(); tabela(); anoDesenhado = anoInteiro(); }
  }
  addEventListener("resize", () => { bolhas.redimensionar(); tudo(); });
  tudo();
}
