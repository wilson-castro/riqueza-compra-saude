// A parte guiada do site. Um gráfico de bolhas fica parado na tela enquanto o texto rola, e cada
// passo do texto diz qual estado o gráfico deve mostrar. Depois vêm o gráfico da COVID-19 e o
// retrato do Brasil.

import { ANO_MIN, ANO_MAX, REGIOES, REGIOES4, RENDA, CINZA, TINTA, TINTA_2, CURTO, pt, fmt, tip,
         reduzMovimento } from "./base.js";
import { criarBolhas } from "./bolhas.js";
import { criarEscolhaPaises } from "./destaque.js";

// Estado do gráfico em cada passo. O índice segue a ordem dos elementos .passo no HTML.
const PASSOS = [
  { x: "pib_pc_ppp", y: "expectativa_vida", t: 1990, sel: [] },
  { x: "pib_pc_ppp", y: "expectativa_vida", t: 2024, de: 1990, sel: [] },
  { x: "pib_pc_ppp", y: "expectativa_vida", t: 2024, de: 1990, sel: ["CHN", "IND"] },
  { x: "pib_pc_ppp", y: "expectativa_vida", t: 2023, sel: ["NGA", "ETH"], curva: true, r: true },
  { x: "pib_pc_ppp", y: "fecundidade", t: 2024, de: 1990, sel: ["KOR", "NGA", "BGD"] },
  { x: "pib_pc_ppp", y: "populacao_65_mais", t: 2024, sel: ["JPN", "CHN"], foco: null },
  { x: "pib_pc_ppp", y: "diferenca_vida_genero", t: 2023, sel: ["UKR", "TGO", "BRA"], r: true },
  { x: "pib_pc_ppp", y: "fecundidade_adolescente", t: 2023, sel: ["BRA", "NER", "KOR"], curva: true, r: true },
];

export function iniciarHistoria(D) {
  const svgNo = document.getElementById("svgHistoria");
  const anoLegenda = document.getElementById("anoHistoria");
  const barra = document.getElementById("barraProgresso");
  const repetir = document.getElementById("repetir");
  const estado = { x: "pib_pc_ppp", y: "expectativa_vida", t: 1990, cor: "regiao",
                   selecionados: new Set(), foco: null, rastro: true, curva: false, mostrarR: false };
  // A altura livre desconta as legendas e as margens do cartão.
  const fixo = svgNo.closest(".grafico-fixo");
  const grafico = criarBolhas(svgNo, D, { alturaMax: 620, alturaLivre: () => fixo.clientHeight - 150 });
  let quadro = null, passoAtual = -1;

  let redesenho = null;
  function mostrar(dur = 0) {
    grafico.atualizar(estado, { dur });
    // Durante uma transição o gráfico não desenha os rastros. Ao fim dela, um novo desenho os traz de volta.
    clearTimeout(redesenho);
    if (dur) redesenho = setTimeout(() => grafico.atualizar(estado), dur + 30);
    anoLegenda.textContent = Math.min(ANO_MAX, Math.floor(estado.t));
    // Barra fina que mostra em que ponto do período de 1990 a 2024 o gráfico está.
    barra.style.width = `${(estado.t - ANO_MIN) / (ANO_MAX - ANO_MIN) * 100}%`;
  }

  // Leva o tempo de um ano a outro a 3 anos por segundo, cerca de 11 segundos de 1990 a 2024.
  // Quem pediu menos movimento no sistema vai direto ao ano final.
  function animar(de, ate) {
    cancelAnimationFrame(quadro);
    if (reduzMovimento()) { estado.t = ate; mostrar(); return; }
    estado.t = de;
    let antes = null;
    const passo = agora => {
      if (antes != null) estado.t = Math.min(ate, estado.t + (agora - antes) / 1000 * 3);
      antes = agora;
      mostrar();
      if (estado.t < ate) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
  }

  function irParaPasso(i) {
    if (i === passoAtual) return;
    passoAtual = i;
    const p = PASSOS[i];
    cancelAnimationFrame(quadro);
    const mudaEixo = p.x !== estado.x || p.y !== estado.y;
    Object.assign(estado, { x: p.x, y: p.y, selecionados: new Set(p.sel), foco: p.foco ?? null,
                            curva: !!p.curva, mostrarR: !!p.r });
    repetir.hidden = p.de == null;
    // Com os mesmos eixos, o tempo segue de onde está, sem voltar ao começo. Assim, passar de
    // uma parte para a seguinte não reinicia a animação que já estava em andamento.
    if (!mudaEixo) {
      if (p.de != null && estado.t < p.t) animar(estado.t, p.t);
      else { estado.t = p.de != null ? Math.max(estado.t, p.t) : p.t; mostrar(reduzMovimento() ? 0 : 600); }
    } else {
      estado.t = p.de ?? p.t;
      mostrar(reduzMovimento() ? 0 : 1400);
      if (p.de != null) setTimeout(() => passoAtual === i && animar(p.de, p.t), reduzMovimento() ? 0 : 1500);
    }
  }
  repetir.addEventListener("click", () => { const p = PASSOS[passoAtual]; if (p?.de != null) animar(p.de, p.t); });

  // O passo ativo é o que cruza a faixa do meio da tela.
  const passos = [...document.querySelectorAll("#historia .passo")];
  const obs = new IntersectionObserver(entradas => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      const n = +e.target.dataset.passo;
      passos.forEach(p => {
        p.classList.toggle("ativo", p === e.target);
        p.classList.toggle("passado", +p.dataset.passo < n);
      });
      irParaPasso(+e.target.dataset.passo);
    }
  }, {
    // No celular o gráfico ocupa o alto da tela, então o passo ativo é o que chega à parte de baixo.
    rootMargin: matchMedia("(max-width: 820px)").matches ? "-75% 0px -15% 0px" : "-45% 0px -45% 0px",
  });
  passos.forEach(p => obs.observe(p));

  // A parte colorida da linha do tempo vai até a altura do meio da tela.
  const trilho = document.querySelector(".trilho-historia");
  const cheio = document.getElementById("trilhoCheio");
  let agendado = false;
  function encherTrilho() {
    agendado = false;
    const r = trilho.getBoundingClientRect();
    const fracao = Math.max(0, Math.min(1, (innerHeight / 2 - r.top) / r.height));
    cheio.style.height = `${fracao * 100}%`;
  }
  addEventListener("scroll", () => { if (!agendado) { agendado = true; requestAnimationFrame(encherTrilho); } }, { passive: true });
  encherTrilho();
  mostrar();
  addEventListener("resize", () => grafico.redimensionar());

  covid(D);
  brasil(D);
}

// ---------- COVID-19, com a expectativa de vida de todos os países de 2010 a 2024 ----------
// Cada país é uma linha fina e apagada na cor da sua região. O Brasil e o mundo começam
// destacados. O leitor pode deixar só uma região em evidência e destacar outros países.
function covid(D) {
  const svg = d3.select("#svgCovid");
  const c = "expectativa_vida", A0 = 2010;
  let destacados = ["BRA"];
  let foco = null;
  const serieDe = iso3 => {
    const fonte = D.linhaDe.has(iso3) ? [...D.linhaDe.get(iso3).values()] : D.agregadoDe.get(iso3);
    return fonte.filter(d => d.ano >= A0 && d[c] != null).sort((a, b) => a.ano - b.ano);
  };
  const todas = [...D.linhaDe.keys()].map(iso3 => ({ iso3, regiao: D.info.get(iso3).regiao4, pts: serieDe(iso3) }));
  const escolha = criarEscolhaPaises(document.getElementById("escolhaCovid"), D, {
    obter: () => destacados, mudar: lista => { destacados = lista; desenhar(); },
  });
  const corDe = iso3 => escolha.cor(iso3);

  function controles() {
    const itens = [[null, "Todas as regiões", null], ...Object.entries(REGIOES4).map(([k, v]) => [k, v.nome, v.cor])];
    d3.select("#legendaCovid").selectAll("button").data(itens).join("button").attr("type", "button")
      .attr("class", d => d[0] ? null : "sem-bola")
      .style("--c", d => d[2]).text(d => d[1])
      .attr("aria-pressed", d => d[0] === foco)
      .on("click", (e, d) => { foco = d[0]; desenhar(); });
    escolha.atualizar();
  }

  function desenhar() {
    controles();
    const W = svg.node().clientWidth, H = Math.max(340, Math.min(520, W * 0.6));
    const m = { t: 16, r: W < 560 ? 76 : 110, b: 30, l: 40 };
    svg.attr("height", H).selectAll("*").remove();
    const x = d3.scaleLinear().domain([A0, ANO_MAX]).range([m.l, W - m.r]);
    // O eixo começa em 45 anos e as poucas quedas abaixo disso ficam cortadas. Se um país
    // destacado cai abaixo de 45, o eixo desce até ele, para a linha destacada aparecer inteira.
    const minDestaque = d3.min(destacados, iso3 => d3.min(serieDe(iso3), d => d[c])) ?? 45;
    const y = d3.scaleLinear().domain([Math.min(45, Math.floor(minDestaque / 5) * 5),
      d3.max(todas, s => d3.max(s.pts, d => d[c]))]).nice().range([H - m.b, m.t]);
    svg.append("defs").append("clipPath").attr("id", "corteCovid").append("rect")
      .attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b);
    svg.append("rect").attr("class", "faixa-covid").attr("x", x(2019.5)).attr("width", x(2021.5) - x(2019.5))
      .attr("y", m.t).attr("height", H - m.t - m.b);
    svg.append("text").attr("class", "nota-grafico").attr("x", x(2020.5)).attr("y", m.t + 14)
      .attr("text-anchor", "middle").text("2020 e 2021");
    svg.append("g").attr("class", "grade").attr("transform", `translate(${W - m.r},0)`)
      .call(d3.axisLeft(y).ticks(6).tickSize(W - m.l - m.r).tickFormat(""));
    svg.append("g").attr("class", "eixo").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).ticks(W < 560 ? 4 : 8).tickFormat(d3.format("d")).tickSize(0).tickPadding(8))
      .select(".domain").remove();
    svg.append("g").attr("class", "eixo").attr("transform", `translate(${m.l},0)`)
      .call(d3.axisLeft(y).ticks(6).tickSize(0).tickPadding(8)).select(".domain").remove();
    const linha = d3.line().x(d => x(d.ano)).y(d => y(d[c]));
    const visivel = s => !foco || s.regiao === foco;
    // As linhas da região em foco ficam por cima e mais fortes. As outras quase somem.
    svg.append("g").attr("clip-path", "url(#corteCovid)").selectAll("path")
      .data(todas.slice().sort((a, b) => d3.ascending(visivel(a), visivel(b)))).join("path")
      .attr("class", "linha-pais").attr("d", d => linha(d.pts))
      .attr("stroke", d => REGIOES4[d.regiao]?.cor ?? TINTA_2)
      .attr("stroke-opacity", d => !visivel(d) ? 0.05 : foco ? 0.6 : 0.2)
      .attr("stroke-width", d => foco && visivel(d) ? 1.4 : 1);

    const series = destacados.map(iso3 => ({ iso3, nome: D.info.get(iso3).pais, cor: corDe(iso3), largura: 2.6 }));
    series.push({ iso3: "WLD", nome: "Mundo", cor: TINTA, largura: 2, traco: "6 4" });
    // Tudo o que é linha fica dentro do recorte da área do gráfico, inclusive o destaque do mouse.
    const frente = svg.append("g").attr("clip-path", "url(#corteCovid)");
    const rotulos = svg.append("g");
    for (const sr of series) {
      // Um contorno branco por baixo separa a linha destacada das linhas finas.
      frente.append("path").attr("d", linha(serieDe(sr.iso3))).attr("fill", "none").attr("stroke", "#fff")
        .attr("stroke-width", sr.largura + 3).attr("stroke-linejoin", "round");
      frente.append("path").attr("d", linha(serieDe(sr.iso3))).attr("fill", "none").attr("stroke", sr.cor)
        .attr("stroke-width", sr.largura).attr("stroke-dasharray", sr.traco ?? null).attr("stroke-linejoin", "round");
    }
    // Rótulos na ponta direita, em tinta neutra, com um traço da cor da série ao lado.
    const pontas = series.map(sr => ({ sr, p: serieDe(sr.iso3).at(-1) })).filter(o => o.p)
      .map(o => ({ s: o.sr, y: y(o.p[c]) })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < pontas.length; k++) pontas[k].y = Math.max(pontas[k].y, pontas[k - 1].y + 16);
    for (const p of pontas) {
      rotulos.append("line").attr("x1", W - m.r + 6).attr("x2", W - m.r + 18).attr("y1", p.y).attr("y2", p.y)
        .attr("stroke", p.s.cor).attr("stroke-width", 2.4).attr("stroke-dasharray", p.s.traco ?? null);
      // Nomes longos, como República Centro-Africana, são encurtados para caber na margem.
      const curto = p.s.nome.length > 14 ? p.s.nome.slice(0, 13) + "." : p.s.nome;
      rotulos.append("text").attr("class", "rotulo-serie").attr("x", W - m.r + 22).attr("y", p.y).attr("dy", "0.35em")
        .text(curto).append("title").text(p.s.nome);
    }
    const sobre = svg.append("path").attr("fill", "none").attr("stroke", TINTA).attr("stroke-width", 2)
      .attr("clip-path", "url(#corteCovid)");
    const rotSobre = svg.append("text").attr("class", "rotulo-pais");
    const guia = svg.append("line").attr("y1", m.t).attr("y2", H - m.b).attr("stroke", TINTA_2).attr("opacity", 0);
    // Passar o mouse destaca a linha do país mais próximo e mostra os valores daquele ano.
    // Clicar nela coloca o país na lista de destaques.
    let melhor = null;
    svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b)
      .attr("fill", "transparent").style("cursor", "pointer")
      .on("mousemove", ev => {
        const [px, py] = d3.pointer(ev);
        const ano = Math.round(x.invert(px));
        let dist = Infinity;
        melhor = null;
        for (const sr of todas) {
          if (!visivel(sr)) continue;
          const d = sr.pts.find(p => p.ano === ano);
          if (d && Math.abs(y(d[c]) - py) < dist) { dist = Math.abs(y(d[c]) - py); melhor = { s: sr, d }; }
        }
        guia.attr("x1", x(ano)).attr("x2", x(ano)).attr("opacity", 0.5);
        if (!melhor) return;
        sobre.attr("d", linha(melhor.s.pts));
        const nome = D.info.get(melhor.s.iso3).pais;
        // O nome fica dentro da área do gráfico, mesmo quando o ponto está cortado embaixo.
        const yRot = Math.max(m.t + 12, Math.min(H - m.b - 6, y(melhor.d[c]) - 8));
        rotSobre.attr("x", Math.min(x(ano) + 6, W - m.r - 150)).attr("y", yRot).text(nome);
        const v = iso3 => serieDe(iso3).find(p => p.ano === ano)?.[c];
        tip.mostrar(ev, `<b>${ano}</b><dl><dt>${nome}</dt><dd>${fmt(melhor.d[c])} anos</dd>` +
          series.map(sr => `<dt>${sr.nome}</dt><dd>${fmt(v(sr.iso3))} anos</dd>`).join("") +
          "</dl><i>Clique para destacar este país</i>");
      })
      .on("click", () => {
        if (melhor && !destacados.includes(melhor.s.iso3)) destacados = [...destacados, melhor.s.iso3];
        tip.esconder();
        desenhar();
      })
      .on("mouseleave", () => { sobre.attr("d", null); rotSobre.text(""); guia.attr("opacity", 0); tip.esconder(); });
  }
  desenhar();
  addEventListener("resize", desenhar);
}

// ---------- Brasil, com a posição em cada indicador entre todos os países e os parecidos ----------
// O Brasil começa destacado, e o leitor pode juntar outros países para comparar.
function brasil(D) {
  const svg = d3.select("#svgBrasil");
  const ANO = 2023;
  const GRUPOS = {
    renda: { nome: RENDA.UMC.nome.toLowerCase(), filtro: d => d.renda === "UMC" },
    regiao: { nome: REGIOES.LCN.nome, filtro: d => d.regiao === "LCN" },
  };
  let grupo = "renda";
  let destacados = ["BRA"];
  document.querySelectorAll("[name=paresBrasil]").forEach(r => r.addEventListener("change", e => {
    grupo = e.target.value; desenhar();
  }));
  const escolha = criarEscolhaPaises(document.getElementById("escolhaBrasil"), D, {
    obter: () => destacados, mudar: lista => { destacados = lista; desenhar(); }, maximo: 5,
    rotulo: "Comparar outros países",
  });
  const dica = (ev, d, c) => tip.mostrar(ev, `<b>${d.pais}</b><span class="tip-sub">${CURTO[c]}, ${ANO}</span>` +
    `<dl><dt>Valor</dt><dd>${fmt(d[c])} ${D.META[c].unidade}</dd></dl>`);

  function desenhar() {
    escolha.atualizar();
    const W = svg.node().clientWidth;
    const estreito = W < 620;
    // A coluna da direita tem um valor por país destacado, então cresce com a lista.
    const larguraValor = destacados.length > 1 ? 104 : 150;
    const comCabecalho = destacados.length > 1 && !estreito;
    const linhaH = 46, m = { t: comCabecalho ? 30 : 8, r: estreito ? 12 : 14 + destacados.length * larguraValor, b: 8, l: estreito ? 12 : 190 };
    const cols = D.eixos;
    const extra = estreito ? 16 : 0;
    const H = m.t + m.b + cols.length * (linhaH + extra);
    svg.attr("height", H).selectAll("*").remove();
    const doAno = [...D.linhaDe.values()].map(mp => mp.get(ANO)).filter(Boolean);
    const filtro = GRUPOS[grupo].filtro;
    const escolhidos = new Set(destacados);
    // Com mais de um país, cada coluna de valores ganha o nome do país no alto.
    if (comCabecalho) {
      destacados.forEach((iso3, k) => {
        const nome = D.info.get(iso3).pais;
        svg.append("text").attr("class", "cabecalho-destaque").attr("x", W - m.r + 14 + k * larguraValor).attr("y", 14)
          .text(nome.length > 13 ? nome.slice(0, 12) + "." : nome)
          .append("title").text(nome);
      });
    }

    cols.forEach((c, i) => {
      const y0 = m.t + i * (linhaH + extra) + extra;
      const vals = doAno.filter(d => D.valido(d, c));
      const x = (D.ehLog(c) ? d3.scaleLog() : d3.scaleLinear()).domain(d3.extent(vals, d => d[c])).range([m.l, W - m.r]);
      const g = svg.append("g");
      const meio = y0 + linhaH / 2;
      g.append("line").attr("class", "trilho").attr("x1", m.l).attr("x2", W - m.r).attr("y1", meio).attr("y2", meio);
      g.append("text").attr("class", "rotulo-indicador")
        .attr("x", estreito ? m.l : m.l - 14).attr("y", estreito ? y0 - 4 : meio).attr("dy", estreito ? 0 : "0.35em")
        .attr("text-anchor", estreito ? "start" : "end").text(CURTO[c]);
      // Pequeno deslocamento vertical fixo por país, para os pontos não se esconderem uns atrás dos outros.
      const desloc = d => ((d.iso3.charCodeAt(0) * 7 + d.iso3.charCodeAt(1) * 3 + d.iso3.charCodeAt(2)) % 17 - 8) * 1.1;
      const ordem = vals.filter(d => !escolhidos.has(d.iso3)).sort((a, b) => d3.ascending(filtro(a), filtro(b)));
      g.selectAll("circle.ponto").data(ordem).join("circle")
        .attr("class", d => "ponto" + (filtro(d) ? " par" : ""))
        .attr("cx", d => x(d[c])).attr("cy", d => meio + desloc(d)).attr("r", d => filtro(d) ? 3.6 : 3)
        .on("mousemove", (ev, d) => dica(ev, d, c))
        .on("mouseleave", () => tip.esconder());
      const mediana = d3.median(vals.filter(filtro), d => d[c]);
      if (mediana != null) {
        g.append("line").attr("class", "mediana").attr("x1", x(mediana)).attr("x2", x(mediana))
          .attr("y1", meio - 14).attr("y2", meio + 14);
      }
      destacados.forEach((iso3, k) => {
        const d = D.linhaDe.get(iso3).get(ANO);
        const cor = escolha.cor(iso3);
        const xv = estreito ? W - m.r - (destacados.length - 1 - k) * 74 : W - m.r + 14 + k * larguraValor;
        if (!D.valido(d, c)) {
          g.append("text").attr("class", "valor-destaque sem-dado").attr("x", xv).attr("y", estreito ? y0 - 4 : meio)
            .attr("dy", estreito ? 0 : "0.35em").attr("text-anchor", estreito ? "end" : "start").text("sem dado");
          return;
        }
        g.append("circle").attr("class", "destacado").attr("fill", cor).attr("cx", x(d[c])).attr("cy", meio).attr("r", 7)
          .on("mousemove", ev => dica(ev, d, c)).on("mouseleave", () => tip.esconder());
        const posicao = vals.filter(v => v[c] > d[c]).length + 1;
        const texto = destacados.length > 1 || estreito ? `${fmt(d[c])} (${posicao}º)` : `${fmt(d[c])}  (${posicao}º de ${vals.length})`;
        const gv = g.append("g").attr("transform", `translate(${xv},${estreito ? y0 - 4 : meio})`);
        if (destacados.length > 1 && !estreito) gv.append("circle").attr("r", 4).attr("cx", 4).attr("fill", cor);
        gv.append("text").attr("class", "valor-destaque").attr("x", destacados.length > 1 && !estreito ? 12 : 0)
          .attr("dy", estreito ? 0 : "0.35em").attr("text-anchor", estreito ? "end" : "start").text(texto);
      });
    });
    d3.select("#legendaBrasil").html(
      `<span class="item"><i class="bola par"></i>Países de ${GRUPOS[grupo].nome}</span>` +
      `<span class="item"><i class="traco-mediana"></i>Mediana desse grupo</span>` +
      `<span class="item"><i class="bola outro"></i>Demais países</span>`);
  }
  desenhar();
  addEventListener("resize", desenhar);
}
