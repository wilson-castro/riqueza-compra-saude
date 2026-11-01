// Gráfico de bolhas com o tempo contínuo, no modelo do Gapminder e do exemplo "The Wealth & Health
// of Nations", de Mike Bostock. A história e o painel livre usam o mesmo gráfico, cada um com o seu
// estado. A área da bolha é proporcional à população.

import { ANO_MIN, ANO_MAX, REGIOES, REGIOES4, RENDA, CINZA, TINTA, TINTA_2, CURTO, pt, fmt, fmtPop, fmtR,
         marcasLog, rotuloLog, tip } from "./base.js";

export function criarBolhas(svgNo, D, { aoClicar = () => {}, aoArrastarAno = null, alturaMax = 560,
                                        alturaLivre = () => Infinity } = {}) {
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
  const gBolhas = g.append("g");
  const gRastros = g.append("g").attr("pointer-events", "none");
  const gRotulos = g.append("g").attr("pointer-events", "none");
  const rotX = g.append("text").attr("class", "rotulo-eixo").attr("text-anchor", "end");
  const rotY = g.append("text").attr("class", "rotulo-eixo");
  const textoR = g.append("text").attr("class", "texto-r").attr("text-anchor", "end");

  let estado = null, geo = null, eixosDesenhados = "";
  let sobre = null;
  const anoInteiro = () => Math.min(ANO_MAX, Math.floor(estado.t + 1e-9));
  const corLinha = iso3 => REGIOES4[D.info.get(iso3).regiao4]?.cor ?? TINTA_2;
  const grupo = d => estado.cor === "regiao" ? d.regiao4 : d.renda;
  const cor = d => estado.cor === "regiao" ? (REGIOES4[d.regiao4]?.cor ?? CINZA) : (RENDA[d.renda]?.cor ?? CINZA);

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
    const maxPop = d3.max(D.linhas, d => d.populacao);
    const r = d3.scaleSqrt().domain([0, maxPop]).range([0, Math.min(46, W / 16)]);
    geo = { W, H, m, x, y, raio: p => Math.max(3, r(p)) };
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
      .text(W < 600 ? `${CURTO[estado.x]}${D.ehLog(estado.x) ? " (escala log)" : ""}` : D.rotuloEixo(estado.x));
    corte.attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b);
    // Em tela estreita o nome longo do eixo vertical não cabe, então entra o nome curto.
    rotY.attr("x", m.l + 8).attr("y", m.t + 12)
      .text(W < 600 ? `${CURTO[estado.y]} (${D.META[estado.y].unidade})` : D.rotuloEixo(estado.y));
    if (W < 600) textoR.attr("x", m.l + 8).attr("y", m.t + 28).attr("text-anchor", "start");
    else textoR.attr("x", W - m.r).attr("y", m.t + 12).attr("text-anchor", "end");
    anoFundo.attr("x", (m.l + W - m.r) / 2).attr("y", (m.t + H - m.b) / 2 + W * 0.065)
      .attr("font-size", Math.min(W * 0.2, H * 0.42));
    if (aoArrastarAno) {
      // Arrastar sobre o ano do fundo move o tempo, como no exemplo de Bostock.
      const anoEscala = d3.scaleLinear().domain([m.l, W - m.r]).range([ANO_MIN, ANO_MAX]).clamp(true);
      anoFundo.style("cursor", "ew-resize").call(d3.drag().on("drag", ev => aoArrastarAno(anoEscala(ev.x))));
    }
    eixosDesenhados = estado.x + "|" + estado.y + "|" + W;
  }

  // Reta de mínimos quadrados de y sobre x (em log quando o eixo é log), só com o ano inteiro.
  function ajustar(ano) {
    const lx = v => D.ehLog(estado.x) ? Math.log10(v) : v;
    const pts = [];
    for (const m of D.linhaDe.values()) {
      const d = m.get(ano);
      if (D.valido(d, estado.x) && D.valido(d, estado.y)) pts.push([lx(d[estado.x]), d[estado.y]]);
    }
    if (pts.length < 3) return null;
    const mx = d3.mean(pts, p => p[0]), my = d3.mean(pts, p => p[1]);
    const b = d3.sum(pts, p => (p[0] - mx) * (p[1] - my)) / d3.sum(pts, p => (p[0] - mx) ** 2);
    const [x0, x1] = d3.extent(pts, p => p[0]);
    const volta = v => D.ehLog(estado.x) ? 10 ** v : v;
    return d3.range(0, 41).map(i => {
      const v = x0 + (x1 - x0) * i / 40;
      return [geo.x(volta(v)), geo.y(my + b * (v - mx))];
    });
  }

  function desenhar(dur = 0) {
    const { x, y, raio } = geo, t = estado.t, ano = anoInteiro();
    const pts = [];
    for (const iso3 of D.linhaDe.keys()) {
      const vx = D.valorEm(iso3, estado.x, t), vy = D.valorEm(iso3, estado.y, t);
      const vp = D.valorEm(iso3, "populacao", t);
      if (vx != null && vy != null && vp != null) pts.push({ ...D.info.get(iso3), vx, vy, vp });
    }
    const sel = estado.selecionados;
    const realce = d => sel.has(d.iso3) || d.iso3 === sobre;
    // Com países em destaque ou um grupo em foco, o resto fica apagado, como no Gapminder.
    const opacidade = d => {
      if (estado.foco && grupo(d) !== estado.foco) return 0.1;
      if (sel.size && !realce(d) && !estado.foco) return 0.22;
      return 0.86;
    };
    pts.sort((a, b) => d3.ascending(realce(a), realce(b)) || d3.descending(a.vp, b.vp));
    anoFundo.text(ano);

    const circ = gBolhas.selectAll("circle").data(pts, d => d.iso3).join(
      ent => ent.append("circle").attr("class", "bolha")
        .attr("cx", d => x(d.vx)).attr("cy", d => y(d.vy)).attr("r", 0),
      upd => upd,
      sai => dur ? sai.transition().duration(dur / 2).attr("r", 0).remove() : sai.remove(),
    )
      .attr("stroke", d => sel.has(d.iso3) ? TINTA : "rgba(22, 29, 29, 0.35)")
      .attr("stroke-width", d => sel.has(d.iso3) ? 1.8 : 0.6)
      .on("mouseenter", (ev, d) => { sobre = d.iso3; desenhar(); })
      .on("mousemove", (ev, d) => {
        const real = D.linhaDe.get(d.iso3).get(anoInteiro());
        tip.mostrar(ev, `<b>${d.pais}</b><span class="tip-sub">${REGIOES[d.regiao]?.nome ?? ""}, ${anoInteiro()}</span>` +
          `<dl><dt>${D.META[estado.x].nome}</dt><dd>${fmt(real?.[estado.x])}</dd>` +
          `<dt>${D.META[estado.y].nome}</dt><dd>${fmt(real?.[estado.y])}</dd>` +
          `<dt>População</dt><dd>${fmtPop(real?.populacao)}</dd></dl>`);
      })
      .on("mouseleave", () => { sobre = null; tip.esconder(); desenhar(); })
      .on("click", (ev, d) => aoClicar(d.iso3))
      .order();
    (dur ? circ.transition().duration(dur).ease(d3.easeCubicInOut) : circ)
      .attr("cx", d => x(d.vx)).attr("cy", d => y(d.vy)).attr("r", d => raio(d.vp))
      .attr("fill", cor).attr("fill-opacity", opacidade);

    // O rastro tem um ponto por ano já passado, ligados por uma linha até a posição atual.
    // O país sob o mouse também ganha rastro, com o ano escrito a cada cinco anos.
    const comRastro = estado.rastro ? [...new Set([...sel, sobre].filter(Boolean))] : [];
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
    gr.select("path").attr("stroke", d => corLinha(d.iso3))
      .attr("d", d => d3.line()([...d.passos.map(p => [p.px, p.py]), ...(d.atual ? [d.atual] : [])]));
    gr.selectAll("circle").data(d => d.passos.map(p => ({ ...p, iso3: d.iso3 }))).join("circle")
      .attr("cx", p => p.px).attr("cy", p => p.py).attr("r", 2.4)
      .attr("fill", p => corLinha(p.iso3)).attr("fill-opacity", 0.6);
    gr.selectAll("text").data(d => d.iso3 === sobre ? d.passos.filter(p => p.a % 5 === 0 && p.a !== ano) : [])
      .join("text").attr("class", "ano-rastro").attr("x", p => p.px + 5).attr("y", p => p.py - 5).text(p => p.a);

    const nomes = pts.filter(realce);
    const rot = gRotulos.selectAll("text").data(nomes, d => d.iso3).join("text").attr("class", "rotulo-pais")
      .text(d => d.pais);
    (dur ? rot.transition().duration(dur).ease(d3.easeCubicInOut) : rot)
      .attr("x", d => x(d.vx) + raio(d.vp) + 4).attr("y", d => y(d.vy) + 4);

    const linha = estado.curva ? ajustar(ano) : null;
    curva.attr("d", linha ? d3.line()(linha) : null);
    if (estado.mostrarR) {
      const { r, n } = D.correlacao(estado.x, estado.y, ano);
      textoR.text(r == null ? "" : `r = ${fmtR(r)} em ${n} países`);
    } else textoR.text("");

    return { ano, visiveis: pts.length, ausentes: [...sel].filter(i => !pts.some(p => p.iso3 === i)) };
  }

  return {
    // Recebe o estado inteiro. Se os eixos mudaram, refaz as escalas com uma transição.
    atualizar(novo, { dur = 0 } = {}) {
      estado = novo;
      const W = svgNo.clientWidth || 600;
      if (!geo || eixosDesenhados !== estado.x + "|" + estado.y + "|" + W) montar(geo ? dur : 0);
      return desenhar(dur);
    },
    redimensionar() { if (estado) { montar(0); desenhar(0); } },
  };
}
