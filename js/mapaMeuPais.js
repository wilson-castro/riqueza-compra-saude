// Mapa da abertura, em que o leitor escolhe o país que vai acompanhar pela página. A cor é a
// expectativa de vida no ano mais recente com dado de todos os países. Países que não podem ser
// escolhidos ficam com hachura e explicam o motivo quando o mouse passa por cima. A busca ao lado
// faz a mesma escolha pelo teclado.

import { RAMPA, fmt, tip } from "./base.js";
import { meuPais, motivoIndisponivel, COR_MEU_PAIS } from "./meupais.js";

const ANO_MAPA = 2023;

export function criarMapaMeuPais(D, svgNo, legendaNo) {
  const svg = d3.select(svgNo);
  const c = "expectativa_vida";
  const valor = iso3 => { const d = D.linhaDe.get(iso3)?.get(ANO_MAPA); return D.valido(d, c) ? d[c] : null; };
  const ext = d3.extent([...D.info.keys()].map(valor).filter(v => v != null));
  const escala = d3.scaleLinear().domain(ext).range([0, 1]);
  legendaNo.innerHTML = `<span class="escala-residuo"><span>Expectativa de vida em ${ANO_MAPA}: ${fmt(ext[0])}</span>` +
    `<i style="background: linear-gradient(90deg, ${RAMPA(0)}, ${RAMPA(1)})"></i><span>${fmt(ext[1])} anos</span></span>` +
    `<span class="item"><i class="bola sem-dado-mapa"></i>Não pode ser escolhido</span>`;

  const defs = svg.append("defs");
  const hachura = defs.append("pattern").attr("id", "hachuraMeuPais").attr("width", 5).attr("height", 5)
    .attr("patternUnits", "userSpaceOnUse").attr("patternTransform", "rotate(45)");
  hachura.append("rect").attr("width", 5).attr("height", 5).attr("class", "hachura-fundo");
  hachura.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 5).attr("class", "hachura-linha");
  const g = svg.append("g");
  let mundo = null;

  function desenhar() {
    if (!mundo) return;
    const W = svgNo.clientWidth, H = Math.round(Math.min(W * 0.46, 520));
    const caminho = d3.geoPath(d3.geoEqualEarth().fitSize([W, H], mundo));
    svg.attr("height", H);
    const meu = meuPais.obter();
    const motivo = f => f.id ? motivoIndisponivel(D, f.id) : "Sem dados do Banco Mundial";
    // O país escolhido vai para o fim da lista, para o contorno dele ficar por cima dos vizinhos.
    const formas = mundo.features.slice().sort((a, b) => (a.id === meu) - (b.id === meu));
    g.selectAll("path").data(formas, (f, i) => f.id ?? "sem-" + i).join("path")
      .attr("class", f => "pais-escolha" + (motivo(f) ? " indisponivel" : ""))
      .attr("d", caminho)
      .attr("fill", f => {
        if (motivo(f)) return "url(#hachuraMeuPais)";
        const v = valor(f.id);
        return v == null ? "url(#hachuraMeuPais)" : RAMPA(escala(v));
      })
      // O contorno do país escolhido vai no style, para ganhar da borda fina definida no CSS.
      .style("stroke", f => f.id === meu ? COR_MEU_PAIS : null)
      .style("stroke-width", f => f.id === meu ? "2.5px" : null)
      .classed("escolhido", f => f.id === meu)
      .on("mousemove", (ev, f) => {
        const m = motivo(f);
        const nome = f.id ? D.info.get(f.id).pais : "Território sem código no Banco Mundial";
        tip.mostrar(ev, `<b>${nome}</b>` + (m ? `<span class="tip-sub">${m}</span>`
          : `<dl><dt>Expectativa de vida em ${ANO_MAPA}</dt><dd>${fmt(valor(f.id))} anos</dd></dl>` +
            (f.id === meu ? "<i>Este é o país escolhido</i>" : "<i>Clique para acompanhar este país</i>")));
      })
      .on("mouseleave", () => tip.esconder())
      .on("click", (ev, f) => { if (!motivo(f) && f.id !== meu) { tip.esconder(); meuPais.definir(f.id); } })
      .order();
  }

  d3.json("dados/mundo.json").then(geo => { mundo = geo; desenhar(); }).catch(() => svg.attr("height", 0));
  meuPais.aoMudar(desenhar);
  addEventListener("resize", desenhar);
}
