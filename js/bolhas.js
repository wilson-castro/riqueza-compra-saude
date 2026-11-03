// Gráfico de bolhas com o tempo contínuo, no modelo do Gapminder e do exemplo "The Wealth & Health
// of Nations", de Mike Bostock. A história e o painel livre usam o mesmo gráfico, cada um com o seu
// estado. A área da bolha é proporcional à população.

import { ANO_MIN, ANO_MAX, REGIOES, REGIOES4, RENDA, RESIDUO, RESIDUO_CORES, RAMPA, RAMPA_CORES, CINZA, CONTORNO_BOLHA, TINTA, TINTA_2, CURTO, pt,
         fmt, fmtPop, fmtR, marcasLog, rotuloLog, tip } from "./base.js";
import { meuPais, COR_MEU_PAIS } from "./meupais.js";

// A cor pela distância até a curva só faz sentido quando o eixo horizontal é a renda, porque a
// pergunta do site é se o país vive mais ou menos do que a renda dele prevê. Com outro eixo
// horizontal, a cor volta a ser a da região.
// A cor por indicador vem no formato "ind:<coluna>", como "ind:fecundidade".
export const modoCor = estado =>
  estado.cor === "residuo" && estado.x !== "pib_pc_ppp" ? "regiao"
  : estado.cor?.startsWith("ind:") ? "indicador" : estado.cor;
const colunaCor = estado => estado.cor.slice(4);
const colunaTamanho = estado => estado.tamanho ?? "populacao";

// Legenda da cor por indicador, em HTML, com o menor e o maior valor de 1990 a 2024.
export function legendaIndicador(D, c) {
  const ext = d3.extent(D.linhas, d => D.valido(d, c) ? d[c] : undefined);
  return `<span class="escala-residuo"><span>${D.META[c].nome}: ${fmt(ext[0])}</span>` +
    `<i style="background: linear-gradient(90deg, ${RAMPA_CORES.join(", ")})"></i>` +
    `<span>${fmt(ext[1])} ${D.META[c].unidade}${D.ehLog(c) ? ", escala log" : ""}</span></span>`;
}

// Legenda da cor pela distância até a curva, em HTML. Com a expectativa de vida no eixo vertical,
// o texto fala em viver mais ou menos. Com outros indicadores, fala em ficar acima ou abaixo.
export function legendaResiduo(D, y) {
  const vida = y === "expectativa_vida";
  const abaixo = vida ? "Vive menos do que a renda prevê" : "Abaixo do que a renda prevê";
  const acima = vida ? "Vive mais do que a renda prevê" : "Acima do que a renda prevê";
  return `<span class="escala-residuo"><span>${abaixo}</span>` +
    `<i style="background: linear-gradient(90deg, ${RESIDUO_CORES.join(", ")})"></i>` +
    `<span>${acima}</span></span>`;
}

export function criarBolhas(svgNo, D, { aoClicar = () => {}, aoArrastarAno = null, alturaMax = 560,
                                        alturaLivre = () => Infinity, aoEscolherEixo = null } = {}) {
  const svg = d3.select(svgNo);
  const g = svg.append("g");
  const gGradeX = g.append("g").attr("class", "grade");
  const gGradeY = g.append("g").attr("class", "grade");
  const gEixoX = g.append("g").attr("class", "eixo");
  const gEixoY = g.append("g").attr("class", "eixo");
  const anoFundo = g.append("text").attr("class", "ano-fundo").attr("text-anchor", "middle");
  // A linha de tendência é cortada na área do gráfico, para não passar por cima dos eixos.
  const idCorte = "corte-" + Math.random().toString(36).slice(2);
  const corte = svg.append("defs").append("clipPath").attr("id", idCorte).append("rect");
  const curva = g.append("path").attr("class", "curva").attr("fill", "none").attr("clip-path", `url(#${idCorte})`);
  // Eixo próprio do modo fila, em que as bolhas ficam ordenadas pela distância até a curva.
  const gFila = g.append("g").attr("class", "fila").attr("opacity", 0).attr("pointer-events", "none");
  const gFilaEixo = gFila.append("g").attr("class", "eixo");
  const filaZero = gFila.append("line").attr("class", "curva");
  const filaEsq = gFila.append("text").attr("class", "rotulo-eixo");
  const filaDir = gFila.append("text").attr("class", "rotulo-eixo").attr("text-anchor", "end");
  const filaTitulo = gFila.append("text").attr("class", "rotulo-eixo").attr("text-anchor", "middle");
  const gBolhas = g.append("g");
  const gRastros = g.append("g").attr("pointer-events", "none");
  const gRotulos = g.append("g").attr("pointer-events", "none");
  const gNotas = g.append("g").attr("class", "notas").attr("pointer-events", "none");
  const rotX = g.append("text").attr("class", "rotulo-eixo").attr("text-anchor", "end");
  const rotY = g.append("text").attr("class", "rotulo-eixo");
  const textoR = g.append("text").attr("class", "texto-r").attr("text-anchor", "end");

  // Com aoEscolherEixo, o título de cada eixo vira um botão que abre a lista de indicadores, como
  // no Gapminder. A história não passa essa função, e lá o título fica só como texto.
  const seta = aoEscolherEixo ? " \u25BE" : "";
  if (aoEscolherEixo) {
    for (const [qual, rot] of [["x", rotX], ["y", rotY]]) {
      rot.classed("rotulo-clicavel", true).attr("tabindex", 0).attr("role", "button")
        .attr("aria-haspopup", "listbox").attr("aria-expanded", "false")
        .on("click", () => abrirMenu(qual, rot))
        .on("keydown", ev => {
          if (ev.key === "Enter" || ev.key === " " || ev.key === "ArrowDown") { ev.preventDefault(); abrirMenu(qual, rot); }
        });
    }
  }
  let menu = null;
  const idMenu = "menu-" + Math.random().toString(36).slice(2);
  function fecharMenu() {
    if (!menu) return;
    menu.remove();
    menu = null;
    rotX.attr("aria-expanded", aoEscolherEixo ? "false" : null);
    rotY.attr("aria-expanded", aoEscolherEixo ? "false" : null);
  }
  // A lista abre perto do título. A do eixo horizontal abre para cima, porque o título fica embaixo.
  function abrirMenu(qual, rot) {
    fecharMenu();
    const caixa = svgNo.parentNode;
    const rc = rot.node().getBoundingClientRect(), rp = caixa.getBoundingClientRect();
    const atual = estado[qual];
    let ativo = Math.max(0, D.eixos.indexOf(atual));
    menu = d3.select(caixa).append("ul").attr("class", "menu-eixo").attr("id", idMenu)
      .attr("role", "listbox").attr("tabindex", -1)
      .attr("aria-label", qual === "x" ? "Indicador do eixo horizontal" : "Indicador do eixo vertical");
    if (qual === "x") menu.style("right", `${rp.right - rc.right}px`).style("bottom", `${rp.bottom - rc.top + 4}px`);
    else menu.style("left", `${rc.left - rp.left}px`).style("top", `${rc.bottom - rp.top + 4}px`);
    const itens = menu.selectAll("li").data(D.eixos).join("li").attr("role", "option")
      .attr("id", (c, i) => `${idMenu}-${i}`).attr("aria-selected", c => String(c === atual))
      .text(c => D.META[c].nome)
      .on("mousedown", (ev, c) => { ev.preventDefault(); escolher(c); });
    const marcar = () => {
      itens.classed("ativa", (c, i) => i === ativo);
      menu.attr("aria-activedescendant", `${idMenu}-${ativo}`);
      itens.nodes()[ativo].scrollIntoView({ block: "nearest" });
    };
    function escolher(c) {
      fecharMenu();
      rot.node().focus();
      if (c !== atual) aoEscolherEixo(qual, c);
    }
    menu.on("keydown", ev => {
      const n = D.eixos.length;
      if (ev.key === "ArrowDown") ativo = (ativo + 1) % n;
      else if (ev.key === "ArrowUp") ativo = (ativo - 1 + n) % n;
      else if (ev.key === "Home") ativo = 0;
      else if (ev.key === "End") ativo = n - 1;
      else if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); return escolher(D.eixos[ativo]); }
      else if (ev.key === "Escape") { ev.preventDefault(); fecharMenu(); return rot.node().focus(); }
      else if (ev.key === "Tab") return fecharMenu();
      else return;
      ev.preventDefault();
      ev.stopPropagation();
      marcar();
    });
    // As setas não podem chegar ao painel, que as usa para andar no tempo.
    menu.on("keydown.parar", ev => ev.stopPropagation());
    menu.on("focusout", () => setTimeout(() => {
      if (menu && !menu.node().contains(document.activeElement)) fecharMenu();
    }));
    rot.attr("aria-expanded", "true").attr("aria-controls", idMenu);
    marcar();
    menu.node().focus();
  }
  document.addEventListener("pointerdown", ev => {
    if (menu && !menu.node().contains(ev.target) && ev.target !== rotX.node() && ev.target !== rotY.node()) fecharMenu();
  });

  let estado = null, geo = null, eixosDesenhados = "", ultimos = new Map();
  const chaveEixos = W => [estado.x, estado.y, colunaTamanho(estado), W].join("|");
  let sobre = null;
  const anoInteiro = () => Math.min(ANO_MAX, Math.floor(estado.t + 1e-9));
  const corLinha = iso3 => modoCor(estado) === "residuo" ? TINTA_2 : (REGIOES4[D.info.get(iso3).regiao4]?.cor ?? TINTA_2);
  const grupo = d => modoCor(estado) === "renda" ? d.renda : d.regiao4;
  let coefAtual = null;
  // A escala de cor por indicador cobre todos os anos, para a cor não piscar quando o tempo anda.
  const escalasCor = new Map();
  function escalaCor(c) {
    if (!escalasCor.has(c)) {
      const ext = d3.extent(D.linhas, d => D.valido(d, c) ? d[c] : undefined);
      escalasCor.set(c, (D.ehLog(c) ? d3.scaleLog() : d3.scaleLinear()).domain(ext).range([0, 1]).clamp(true));
    }
    return escalasCor.get(c);
  }
  function cor(d) {
    const modo = modoCor(estado);
    if (modo === "indicador") {
      const c = colunaCor(estado), v = D.valorEm(d.iso3, c, estado.t);
      return D.valido({ [c]: v }, c) ? RAMPA(escalaCor(c)(v)) : CINZA;
    }
    if (modo === "residuo") {
      const r = residuo(coefAtual, d.vx, d.vy);
      return r == null ? CINZA : RESIDUO(Math.max(0, Math.min(1, (r / limiteResiduo() + 1) / 2)));
    }
    return modo === "regiao" ? (REGIOES4[d.regiao4]?.cor ?? CINZA) : (RENDA[d.renda]?.cor ?? CINZA);
  }

  function escala(c, faixa) {
    // O domínio cobre todos os anos, para o eixo ficar parado enquanto o tempo anda.
    const ext = d3.extent(D.linhas, d => D.valido(d, c) ? d[c] : undefined);
    return D.ehLog(c) ? d3.scaleLog().domain(ext).range(faixa)
                      : d3.scaleLinear().domain(ext).nice().range(faixa);
  }
  function eixo(gerador, s, c, n) {
    const estreito = Math.abs(s.range()[1] - s.range()[0]) < 420;
    return D.ehLog(c) ? gerador(s).tickValues(marcasLog(s.domain(), estreito)).tickFormat(rotuloLog)
                      : gerador(s).ticks(n).tickFormat(pt.format(","));
  }

  function montar(dur) {
    const W = svgNo.clientWidth || 600;
    // Em tela estreita o gráfico fica mais alto que largo, para as bolhas não se amontoarem.
    const proporcao = W < 600 ? 1.05 : 0.66;
    const H = Math.max(260, Math.min(alturaMax, W * proporcao, alturaLivre()));
    const m = { t: 14, r: 14, b: 50, l: 50 };
    svg.attr("height", H).attr("viewBox", `0 0 ${W} ${H}`);
    const x = escala(estado.x, [m.l, W - m.r]), y = escala(estado.y, [H - m.b, m.t]);
    // A área da bolha é proporcional ao indicador do tamanho. Valores negativos, como na diferença
    // de vida entre mulheres e homens, ficam com o raio mínimo.
    const maxTam = d3.max(D.linhas, d => d[colunaTamanho(estado)]);
    const r = d3.scaleSqrt().domain([0, maxTam > 0 ? maxTam : 1]).range([0, Math.min(46, W / 16)]);
    geo = { W, H, m, x, y, raio: p => Math.max(3, r(Math.max(0, p))) };
    const tr = s => dur ? s.transition().duration(dur) : s;
    const nx = Math.max(3, Math.round(W / 110)), ny = Math.max(3, Math.round(H / 70));
    tr(gGradeX.attr("transform", `translate(0,${m.t})`))
      .call(eixo(d3.axisBottom, x, estado.x, nx).tickSize(H - m.t - m.b).tickFormat(""));
    tr(gGradeY.attr("transform", `translate(${W - m.r},0)`))
      .call(eixo(d3.axisLeft, y, estado.y, ny).tickSize(W - m.l - m.r).tickFormat(""));
    tr(gEixoX.attr("transform", `translate(0,${H - m.b})`)).call(eixo(d3.axisBottom, x, estado.x, nx).tickSizeOuter(0).tickSize(0).tickPadding(8));
    tr(gEixoY.attr("transform", `translate(${m.l},0)`)).call(eixo(d3.axisLeft, y, estado.y, ny).tickSizeOuter(0).tickSize(0).tickPadding(8));
    gEixoX.select(".domain").remove();
    gEixoY.select(".domain").remove();
    rotX.attr("x", W - m.r).attr("y", H - 6)
      .text((W < 600 ? `${CURTO[estado.x]}${D.ehLog(estado.x) ? " (escala log)" : ""}` : D.rotuloEixo(estado.x)) + seta);
    corte.attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b);
    // Em tela estreita o nome longo do eixo vertical não cabe, então entra o nome curto.
    rotY.attr("x", m.l + 8).attr("y", m.t + 12)
      .text((W < 600 ? `${CURTO[estado.y]} (${D.META[estado.y].unidade})` : D.rotuloEixo(estado.y)) + seta);
    if (aoEscolherEixo) {
      rotX.attr("aria-label", `Eixo horizontal: ${D.META[estado.x].nome}. Trocar o indicador`);
      rotY.attr("aria-label", `Eixo vertical: ${D.META[estado.y].nome}. Trocar o indicador`);
    }
    if (W < 600) textoR.attr("x", m.l + 8).attr("y", m.t + 28).attr("text-anchor", "start");
    else textoR.attr("x", W - m.r).attr("y", m.t + 12).attr("text-anchor", "end");
    anoFundo.attr("x", (m.l + W - m.r) / 2).attr("y", (m.t + H - m.b) / 2 + W * 0.065)
      .attr("font-size", Math.min(W * 0.2, H * 0.42));
    if (aoArrastarAno) {
      // Arrastar sobre o ano do fundo move o tempo, como no exemplo de Bostock.
      const anoEscala = d3.scaleLinear().domain([m.l, W - m.r]).range([ANO_MIN, ANO_MAX]).clamp(true);
      anoFundo.style("cursor", "ew-resize").call(d3.drag().on("drag", ev => aoArrastarAno(anoEscala(ev.x))));
    }
    eixosDesenhados = chaveEixos(W);
  }

  // Reta de mínimos quadrados de y sobre x (em log quando o eixo é log), só com o ano inteiro.
  const lx = v => D.ehLog(estado.x) ? Math.log10(v) : v;
  function coeficientes(ano) {
    const pts = [];
    for (const m of D.linhaDe.values()) {
      const d = m.get(ano);
      if (D.valido(d, estado.x) && D.valido(d, estado.y)) pts.push([lx(d[estado.x]), d[estado.y]]);
    }
    if (pts.length < 3) return null;
    const mx = d3.mean(pts, p => p[0]), my = d3.mean(pts, p => p[1]);
    const b = d3.sum(pts, p => (p[0] - mx) * (p[1] - my)) / d3.sum(pts, p => (p[0] - mx) ** 2);
    return { mx, my, b, ext: d3.extent(pts, p => p[0]) };
  }
  // Distância vertical entre o país e a curva, na unidade do eixo vertical. Positiva quando o país
  // fica acima da curva.
  function residuo(c, vx, vy) {
    if (!c || vx == null || vy == null || (D.ehLog(estado.x) && vx <= 0)) return null;
    return vy - (c.my + c.b * (lx(vx) - c.mx));
  }
  function ajustar(c) {
    if (!c) return null;
    const [x0, x1] = c.ext;
    const volta = v => D.ehLog(estado.x) ? 10 ** v : v;
    return d3.range(0, 41).map(i => {
      const v = x0 + (x1 - x0) * i / 40;
      return [geo.x(volta(v)), geo.y(c.my + c.b * (v - c.mx))];
    });
  }
  // O limite da escala de cor vale para todos os anos do par de eixos. Assim a cor de um país não
  // pisca quando o tempo anda. O percentil 95 evita que poucos casos extremos apaguem o resto.
  const limites = new Map();
  function limiteResiduo() {
    const chave = estado.x + "|" + estado.y;
    if (!limites.has(chave)) {
      const res = [];
      for (let a = ANO_MIN; a <= ANO_MAX; a++) {
        const c = coeficientes(a);
        for (const m of D.linhaDe.values()) {
          const d = m.get(a);
          const r = D.valido(d, estado.x) && D.valido(d, estado.y) ? residuo(c, d[estado.x], d[estado.y]) : null;
          if (r != null) res.push(Math.abs(r));
        }
      }
      limites.set(chave, d3.quantile(res.sort(d3.ascending), 0.95) || 1);
    }
    return limites.get(chave);
  }

  // Posições do modo fila. Cada país vai para o x da sua distância até a curva, e uma simulação de
  // colisão empilha os países com valores parecidos. A conta é guardada, porque o desenho se
  // repete a cada movimento do mouse.
  let cacheFila = { chave: null };
  const raioFila = vp => Math.max(2.5, geo.raio(vp) * 0.6);
  function posicoesFila(pts, ano) {
    const { W, H, m } = geo;
    const chave = [estado.x, estado.y, ano, W, H].join("|");
    if (cacheFila.chave === chave) return cacheFila;
    const nos = pts.map(d => ({ iso3: d.iso3, r: residuo(coefAtual, d.vx, d.vy), raio: raioFila(d.vp) }))
      .filter(n => n.r != null);
    const L = d3.max(nos, n => Math.abs(n.r)) || 1;
    const sx = d3.scaleLinear().domain([-L, L]).nice().range([m.l + 10, W - m.r - 10]);
    const meio = (m.t + H - m.b) / 2;
    for (const n of nos) { n.x = sx(n.r); n.y = meio; }
    const sim = d3.forceSimulation(nos)
      .force("x", d3.forceX(n => sx(n.r)).strength(1))
      .force("y", d3.forceY(meio).strength(0.05))
      .force("colisao", d3.forceCollide(n => n.raio + 0.8))
      .stop();
    for (let i = 0; i < 160; i++) sim.tick();
    const lim = (v, r, a, b) => Math.max(a + r, Math.min(b - r, v));
    cacheFila = { chave, sx, meio,
      mapa: new Map(nos.map(n => [n.iso3, [lim(n.x, n.raio, m.l, W - m.r), lim(n.y, n.raio, m.t, H - m.b)]])) };
    return cacheFila;
  }
  function eixoFila(f, dur) {
    const { W, H, m } = geo;
    const vida = estado.y === "expectativa_vida";
    gFilaEixo.attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(f.sx).ticks(Math.max(3, Math.round(W / 110))).tickFormat(pt.format("+,.0f")).tickSize(0).tickPadding(8))
      .select(".domain").remove();
    filaZero.attr("x1", f.sx(0)).attr("x2", f.sx(0)).attr("y1", m.t).attr("y2", H - m.b);
    // Em tela estreita os rótulos longos se encontram no meio, então entram os curtos.
    const curto = W < 600;
    filaEsq.attr("x", m.l + 4).attr("y", m.t + 12)
      .text(vida ? (curto ? "Vive menos" : "Vive menos do que a renda prevê") : "Abaixo da curva");
    filaDir.attr("x", W - m.r - 4).attr("y", m.t + 12)
      .text(vida ? (curto ? "Vive mais" : "Vive mais do que a renda prevê") : "Acima da curva");
    filaTitulo.attr("x", (m.l + W - m.r) / 2).attr("y", H - 6)
      .text(`Distância até a curva (${D.META[estado.y].unidade})`);
  }
  // Troca entre o gráfico de dispersão e a fila, apagando os eixos de um e mostrando os do outro.
  let filaVisivel = false;
  function alternarEixos(fila, dur) {
    if (fila === filaVisivel) return;
    filaVisivel = fila;
    const tr = s => dur ? s.transition().duration(dur) : s;
    for (const s of [gGradeX, gGradeY, gEixoX, gEixoY, rotX, rotY, textoR, anoFundo]) tr(s).attr("opacity", fila ? 0 : 1);
    tr(gFila).attr("opacity", fila ? 1 : 0);
  }

  function desenhar(dur = 0) {
    const { x, y, raio } = geo, t = estado.t, ano = anoInteiro();
    const pts = [];
    for (const iso3 of D.linhaDe.keys()) {
      const vx = D.valorEm(iso3, estado.x, t), vy = D.valorEm(iso3, estado.y, t);
      const vp = D.valorEm(iso3, colunaTamanho(estado), t);
      if (vx != null && vy != null && vp != null) pts.push({ ...D.info.get(iso3), vx, vy, vp });
    }
    const sel = estado.selecionados;
    const meu = meuPais.obter();
    const realce = d => sel.has(d.iso3) || d.iso3 === sobre || d.iso3 === meu;
    // Com países em destaque ou um grupo em foco, o resto fica apagado, como no Gapminder.
    const opacidade = d => {
      // Países fora do filtro das coordenadas paralelas quase somem.
      if (estado.filtro && !estado.filtro.has(d.iso3)) return 0.06;
      if (estado.foco && grupo(d) !== estado.foco) return 0.1;
      // Na cor pela distância até a curva, a cor é a mensagem, então o resto apaga menos.
      if (sel.size && !realce(d) && !estado.foco) return modoCor(estado) === "residuo" ? 0.6 : 0.22;
      return 0.86;
    };
    pts.sort((a, b) => d3.ascending(realce(a), realce(b)) || d3.descending(a.vp, b.vp));
    anoFundo.text(ano);
    const comResiduo = modoCor(estado) === "residuo";
    coefAtual = estado.curva || comResiduo || estado.layout === "fila" ? coeficientes(ano) : null;
    const fila = estado.layout === "fila" && coefAtual ? posicoesFila(pts, ano) : null;
    const pos = fila ? d => fila.mapa.get(d.iso3) ?? [x(d.vx), y(d.vy)] : d => [x(d.vx), y(d.vy)];
    const raioDe = fila ? d => raioFila(d.vp) : d => raio(d.vp);
    if (fila) eixoFila(fila, dur);
    alternarEixos(!!fila, dur);

    const circ = gBolhas.selectAll("circle").data(pts, d => d.iso3).join(
      ent => ent.append("circle").attr("class", "bolha")
        .attr("cx", d => x(d.vx)).attr("cy", d => y(d.vy)).attr("r", 0),
      upd => upd,
      sai => dur ? sai.transition().duration(dur / 2).attr("r", 0).remove() : sai.remove(),
    )
      .attr("stroke", d => d.iso3 === meu ? COR_MEU_PAIS : sel.has(d.iso3) ? TINTA : CONTORNO_BOLHA)
      .attr("stroke-width", d => d.iso3 === meu ? 3 : sel.has(d.iso3) ? 1.8 : 0.6)
      .on("mouseenter", (ev, d) => { sobre = d.iso3; desenhar(); })
      .on("mousemove", (ev, d) => {
        const real = D.linhaDe.get(d.iso3).get(anoInteiro());
        tip.mostrar(ev, `<b>${d.pais}</b><span class="tip-sub">${REGIOES[d.regiao]?.nome ?? ""}, ${anoInteiro()}</span>` +
          `<dl><dt>${D.META[estado.x].nome}</dt><dd>${fmt(real?.[estado.x])}</dd>` +
          `<dt>${D.META[estado.y].nome}</dt><dd>${fmt(real?.[estado.y])}</dd>` +
          `<dt>População</dt><dd>${fmtPop(real?.populacao)}</dd>` + linhasExtras(real) + linhaResiduo(real) + `</dl>`);
      })
      .on("mouseleave", () => { sobre = null; tip.esconder(); desenhar(); })
      .on("click", (ev, d) => aoClicar(d.iso3))
      .order();
    (dur ? circ.transition().duration(dur).ease(d3.easeCubicInOut) : circ)
      .attr("cx", d => pos(d)[0]).attr("cy", d => pos(d)[1]).attr("r", raioDe)
      .attr("fill", cor).attr("fill-opacity", opacidade);

    // O rastro tem um ponto por ano já passado, ligados por uma linha até a posição atual.
    // O país sob o mouse também ganha rastro, com o ano escrito a cada cinco anos.
    const comRastro = estado.rastro && !fila ? [...new Set([...sel, meu, sobre].filter(Boolean))] : [];
    const rastros = dur ? [] : comRastro.map(iso3 => {
      const m = D.linhaDe.get(iso3);
      const passos = d3.range(ANO_MIN, ano + 1)
        .filter(a => D.valido(m.get(a), estado.x) && D.valido(m.get(a), estado.y))
        .map(a => ({ a, px: x(m.get(a)[estado.x]), py: y(m.get(a)[estado.y]) }));
      const atual = pts.find(p => p.iso3 === iso3);
      return { iso3, passos, atual: atual ? [x(atual.vx), y(atual.vy)] : null };
    });
    const gr = gRastros.selectAll("g").data(rastros, d => d.iso3).join(ent => {
      const s = ent.append("g");
      s.append("path").attr("fill", "none").attr("stroke-width", 1.5).attr("stroke-opacity", 0.75);
      return s;
    });
    gr.select("path").attr("stroke", d => d.iso3 === meu ? COR_MEU_PAIS : corLinha(d.iso3))
      .attr("d", d => d3.line()([...d.passos.map(p => [p.px, p.py]), ...(d.atual ? [d.atual] : [])]));
    gr.selectAll("circle").data(d => d.passos.map(p => ({ ...p, iso3: d.iso3 }))).join("circle")
      .attr("cx", p => p.px).attr("cy", p => p.py).attr("r", 2.4)
      .attr("fill", p => p.iso3 === meu ? COR_MEU_PAIS : corLinha(p.iso3)).attr("fill-opacity", 0.6);
    gr.selectAll("text").data(d => d.iso3 === sobre ? d.passos.filter(p => p.a % 5 === 0 && p.a !== ano) : [])
      .join("text").attr("class", "ano-rastro").attr("x", p => p.px + 5).attr("y", p => p.py - 5).text(p => p.a);

    const nomes = pts.filter(realce);
    const rot = gRotulos.selectAll("text").data(nomes, d => d.iso3).join("text").attr("class", "rotulo-pais")
      .classed("rotulo-meu-pais", d => d.iso3 === meu).text(d => d.pais);
    (dur ? rot.transition().duration(dur).ease(d3.easeCubicInOut) : rot)
      .attr("x", d => pos(d)[0] + raioDe(d) + 4).attr("y", d => pos(d)[1] + 4);

    // Notas curtas perto do país que explicam, com um traço fino até a bolha. A nota vai para o
    // lado do centro do gráfico, para não sair da área em tela estreita.
    const { W, H, m } = geo;
    const notas = (estado.notas ?? []).map((n, k) => {
      const d = pts.find(p => p.iso3 === n.iso3);
      if (!d) return null;
      const [px, py] = pos(d), rr = raioDe(d);
      const paraDireita = px < (m.l + W - m.r) / 2, paraBaixo = py < (m.t + H - m.b) / 2;
      const largura = n.texto.length * 6.4;
      // Na fila, as notas ficam logo acima ou logo abaixo do país, alternando, para duas notas não
      // se encontrarem no meio da faixa, onde as bolhas se juntam.
      if (fila) {
        const acima = k % 2 === 0;
        const tx = paraDireita ? Math.min(px - rr, W - m.r - largura) : Math.max(px + rr, m.l + largura);
        const ty = acima ? Math.max(m.t + 30, py - rr - 22) : Math.min(H - m.b - 16, py + rr + 22);
        return { chave: n.iso3 + n.texto, texto: n.texto, px, py: acima ? py - rr : py + rr, tx, ty,
                 ancora: paraDireita ? "start" : "end" };
      }
      let tx = px + (paraDireita ? rr + 28 : -rr - 28);
      tx = paraDireita ? Math.min(tx, W - m.r - largura) : Math.max(tx, m.l + largura);
      const ty = Math.max(m.t + 14, Math.min(H - m.b - 6, py + (paraBaixo ? rr + 30 : -rr - 24)));
      return { chave: n.iso3 + n.texto, texto: n.texto, px, py: py + (paraBaixo ? rr : -rr), tx, ty, ancora: paraDireita ? "start" : "end" };
    }).filter(Boolean);
    const gn = gNotas.selectAll("g.nota").data(notas, n => n.chave).join(
      ent => {
        const s = ent.append("g").attr("class", "nota").attr("opacity", 0);
        s.append("line");
        s.append("text").attr("class", "nota-bolha");
        return s;
      },
      upd => upd,
      sai => dur ? sai.transition().duration(dur / 3).attr("opacity", 0).remove() : sai.remove(),
    );
    const trN = s => dur ? s.transition().duration(dur).ease(d3.easeCubicInOut) : s;
    trN(gn).attr("opacity", 1);
    trN(gn.select("line")).attr("x1", n => n.px).attr("y1", n => n.py).attr("x2", n => n.tx).attr("y2", n => n.ty > n.py ? n.ty - 2 : n.ty + 2);
    trN(gn.select("text")).attr("x", n => n.tx).attr("y", n => n.ty + (n.ty > n.py ? 10 : -4))
      .attr("text-anchor", n => n.ancora);
    gn.select("text").text(n => n.texto);

    ultimos = new Map(pts.map(d => [d.iso3, d]));
    const linha = coefAtual ? ajustar(coefAtual) : null;
    curva.attr("d", linha && !fila ? d3.line()(linha) : null);
    if (estado.mostrarR) {
      const { r, n } = D.correlacao(estado.x, estado.y, ano);
      textoR.text(r == null ? "" : `r = ${fmtR(r)} em ${n} países`);
    } else textoR.text("");

    return { ano, visiveis: pts.length, ausentes: [...sel].filter(i => !pts.some(p => p.iso3 === i)) };
  }

  // Linhas do tooltip para os indicadores do tamanho e da cor, quando não são a população.
  function linhasExtras(real) {
    const cols = [colunaTamanho(estado), modoCor(estado) === "indicador" ? colunaCor(estado) : null]
      .filter(c => c && c !== "populacao" && c !== estado.x && c !== estado.y);
    return [...new Set(cols)].map(c => `<dt>${D.META[c].nome}</dt><dd>${fmt(real?.[c])}</dd>`).join("");
  }
  // Linha do tooltip que diz quanto o país fica acima ou abaixo da curva no ano inteiro.
  function linhaResiduo(real) {
    if (!coefAtual || !real) return "";
    const r = residuo(coefAtual, real[estado.x], real[estado.y]);
    if (r == null) return "";
    const unidade = D.META[estado.y].unidade;
    const vida = estado.y === "expectativa_vida";
    const texto = Math.abs(r) < 0.05 ? "Em cima da curva"
      : `${fmt(Math.abs(r))} ${unidade} ${r > 0 ? "acima" : "abaixo"}`;
    return `<dt>${vida ? "Comparado ao que a renda prevê" : "Distância até a curva"}</dt><dd>${texto}</dd>`;
  }

  return {
    // Recebe o estado inteiro. Se os eixos mudaram, refaz as escalas com uma transição.
    atualizar(novo, { dur = 0 } = {}) {
      estado = novo;
      const W = svgNo.clientWidth || 600;
      if (!geo || eixosDesenhados !== chaveEixos(W)) montar(geo ? dur : 0);
      return desenhar(dur);
    },
    redimensionar() { if (estado) { montar(0); desenhar(0); } },
    // Cor atual da bolha de um país, para o texto usar a mesma cor.
    corDe(iso3) { const d = ultimos.get(iso3); return d ? cor(d) : null; },
    // Raio em pixels de um valor do indicador do tamanho, para a legenda de tamanho usar a mesma escala.
    raio(v) { return geo ? geo.raio(v) : 0; },
    // Destaca um país como se o mouse estivesse sobre ele. Serve para as palavras do texto.
    destacar(iso3) { sobre = iso3; if (estado) desenhar(); },
  };
}
