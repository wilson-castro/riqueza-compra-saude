// Peças usadas pela história e pelo painel livre. Aqui ficam a leitura dos dados, as cores, os formatos e as contas.
// O D3 vem de vendor/d3.min.js como variável global.

export const ANO_MIN = 1990;
export const ANO_MAX = 2024;

// Regiões do Banco Mundial. Servem para os nomes no texto, nas dicas e na comparação do Brasil.
export const REGIOES = {
  LCN: { nome: "América Latina e Caribe" },
  SSF: { nome: "África Subsaariana" },
  SAS: { nome: "Sul da Ásia" },
  EAS: { nome: "Leste Asiático e Pacífico" },
  ECS: { nome: "Europa e Ásia Central" },
  MEA: { nome: "Oriente Médio e Norte da África" },
  NAC: { nome: "América do Norte" },
};
// A cor das bolhas segue as quatro regiões do Gapminder, mas com uma paleta própria do site
// (terracota, verde-água, violeta e ocre). A paleta passou no teste de daltonismo para todos os
// pares, porque num gráfico de bolhas qualquer região pode ficar ao lado de qualquer outra.
export const REGIOES4 = {
  africa: { nome: "África", cor: "#a83a2a" },
  americas: { nome: "Américas", cor: "#2aa198" },
  asia: { nome: "Ásia", cor: "#6a55c8" },
  europe: { nome: "Europa", cor: "#c99a1a" },
};
// O grupo de renda tem ordem, então usa uma rampa de um só matiz, do claro ao escuro.
export const RENDA = {
  LIC: { nome: "Renda baixa", cor: "#c6e3e9" },
  LMC: { nome: "Renda média-baixa", cor: "#8cc3cf" },
  UMC: { nome: "Renda média-alta", cor: "#4b98aa" },
  HIC: { nome: "Renda alta", cor: "#2b5f6c" },
};
export const CINZA = "#d6dde2";
export const TINTA = "#161d1d";
export const TINTA_2 = "#3f4948";
export const DIVERGENTE = d3.piecewise(d3.interpolateLab, ["#fc6b38", "#f2f2f2", "#4b98aa"]);
// Cor da distância até a curva. Laranja fica abaixo do que a renda prevê, azul-petróleo fica
// acima. O meio é um cinza médio, e não branco, para as bolhas perto da curva não sumirem no fundo.
export const RESIDUO_CORES = ["#c4512b", "#c3c9cc", "#23808f"];
export const RESIDUO = d3.piecewise(d3.interpolateLab, RESIDUO_CORES);

// Nomes curtos para rótulos onde o nome completo não cabe.
export const CURTO = {
  pib_pc_ppp: "PIB por pessoa", expectativa_vida: "Expectativa de vida",
  mortalidade_infantil: "Mortalidade infantil", fecundidade: "Fecundidade",
  acesso_eletricidade: "Eletricidade", uso_internet: "Internet", populacao_urbana: "População urbana",
  agropecuaria_pib: "Agropecuária no PIB", agua_potavel: "Água potável",
  populacao_65_mais: "65 anos ou mais", mulheres_trabalho: "Mulheres no trabalho",
  fecundidade_adolescente: "Fecundidade adolescente", diferenca_vida_genero: "Diferença de vida (M − H)",
};

// O que cada indicador mede, em linguagem simples. O texto segue as definições do WDI.
export const DESCRICAO = {
  pib_pc_ppp: "Valor de tudo o que o país produz num ano, dividido pela população. Está em dólares internacionais de 2021, que corrigem a diferença de preços entre os países.",
  expectativa_vida: "Quantos anos viveria um bebê nascido naquele ano, se as taxas de morte de cada idade continuassem as mesmas ao longo da vida dele.",
  mortalidade_infantil: "Quantos bebês morrem antes de completar 1 ano de idade, a cada mil nascidos vivos.",
  fecundidade: "Número médio de filhos que uma mulher teria ao longo da vida, se tivesse filhos no ritmo de cada idade naquele ano. Perto de 2,1 filhos, a população se repõe.",
  acesso_eletricidade: "Parte da população que tem acesso à eletricidade.",
  uso_internet: "Parte da população que usou a internet nos últimos três meses, em qualquer lugar.",
  populacao_urbana: "Parte da população que vive em cidades. Cada país usa a sua própria definição de área urbana.",
  agropecuaria_pib: "Parte do PIB que vem da agricultura, da pecuária, da pesca e da produção florestal.",
  agua_potavel: "Parte da população que usa uma fonte de água protegida e gasta até 30 minutos para buscar a água, contando ida e volta. A série começa em 2000.",
  populacao_65_mais: "Parte da população que tem 65 anos ou mais.",
  mulheres_trabalho: "Parte das mulheres com 15 anos ou mais que trabalham ou procuram trabalho. É uma estimativa de modelo da Organização Internacional do Trabalho.",
  fecundidade_adolescente: "Nascimentos num ano a cada mil mulheres de 15 a 19 anos.",
  diferenca_vida_genero: "Expectativa de vida das mulheres menos a dos homens, em anos. Um valor positivo quer dizer que as mulheres vivem mais.",
};

export const pt = d3.formatLocale({ decimal: ",", thousands: ".", grouping: [3], currency: ["US$ ", ""] });

export function fmt(v) {
  if (v == null) return "sem dado";
  const a = Math.abs(v);
  return a >= 1000 ? pt.format(",.0f")(v) : a >= 100 ? pt.format(".0f")(v) : pt.format(".1f")(v);
}
export function fmtPop(v) {
  if (v == null) return "sem dado";
  return v >= 1e9 ? pt.format(".2f")(v / 1e9) + " bi" : v >= 1e6 ? pt.format(".1f")(v / 1e6) + " mi"
       : pt.format(",.0f")(v);
}
export const fmtR = r => r == null ? "sem dado" : pt.format("+.2f")(r);

// Marcas 1, 2 e 5 de cada potência de 10. Os ticks padrão do D3 em escala log poluem o eixo.
// Em gráfico estreito, só as potências de 10, para os rótulos não se sobreporem.
export function marcasLog(dom, estreito = false) {
  const out = [];
  for (let e = Math.floor(Math.log10(dom[0])); e <= Math.ceil(Math.log10(dom[1])); e++)
    for (const m of estreito ? [1] : [1, 2, 5]) { const v = m * 10 ** e; if (v >= dom[0] && v <= dom[1]) out.push(v); }
  return out;
}
export const rotuloLog = v => v >= 1000 ? pt.format(",.0f")(v / 1000) + " mil" : pt.format(",")(v);

export function pearson(xs, ys) {
  const mx = d3.mean(xs), my = d3.mean(ys);
  let s = 0, sx = 0, sy = 0;
  for (let i = 0; i < xs.length; i++) {
    s += (xs[i] - mx) * (ys[i] - my); sx += (xs[i] - mx) ** 2; sy += (ys[i] - my) ** 2;
  }
  return s / Math.sqrt(sx * sy);
}

// O nome em português vem do próprio navegador, a partir do código de duas letras do país.
// Quando o navegador não conhece o código, fica o nome em inglês do Banco Mundial.
const nomesPt = typeof Intl.DisplayNames === "function"
  ? new Intl.DisplayNames(["pt-BR"], { type: "region" }) : null;
function nomeEmPortugues(iso2, ingles) {
  if (!nomesPt || !/^[A-Z]{2}$/.test(iso2)) return ingles;
  try {
    const n = nomesPt.of(iso2);
    return n && n !== iso2 ? n : ingles;
  } catch { return ingles; }
}

let promessa = null;

// Lê os três CSV uma vez só e monta os índices usados pelos gráficos.
export function carregar() {
  promessa ??= Promise.all([
    d3.csv("dados/serie.csv", d3.autoType),
    d3.csv("dados/paises.csv"),
    d3.csv("dados/indicadores.csv", d3.autoType),
  ]).then(([serie, paises, indicadores]) => {
    const info = new Map(paises.map(p => [p.iso3, { ...p, pais: nomeEmPortugues(p.iso2, p.nome) }]));
    const linhas = serie.filter(d => info.has(d.iso3)).map(d => Object.assign(d, info.get(d.iso3)));
    const agregados = serie.filter(d => !info.has(d.iso3));
    const META = Object.fromEntries(indicadores.map(d => [d.coluna, d]));
    const ehLog = c => META[c].escala_log === 1;
    const valido = (d, c) => d != null && d[c] != null && (!ehLog(c) || d[c] > 0);
    const linhaDe = new Map();
    for (const d of linhas) {
      if (!linhaDe.has(d.iso3)) linhaDe.set(d.iso3, new Map());
      linhaDe.get(d.iso3).set(d.ano, d);
    }
    const agregadoDe = d3.group(agregados, d => d.iso3);

    // Valor de um país num instante contínuo do tempo. Entre dois anos, a posição é interpolada
    // (em log quando o eixo é log) só se os dois anos tiverem o dado. Se o ano inteiro não tem
    // dado, o país some, em vez de ganhar um valor inventado.
    function valorEm(iso3, c, t) {
      const a = Math.min(ANO_MAX, Math.floor(t + 1e-9)), f = t - a;
      const da = linhaDe.get(iso3).get(a);
      if (!valido(da, c)) return null;
      const db = f > 0 ? linhaDe.get(iso3).get(a + 1) : null;
      if (!valido(db, c)) return da[c];
      return ehLog(c) ? 10 ** (Math.log10(da[c]) + (Math.log10(db[c]) - Math.log10(da[c])) * f)
                      : da[c] + (db[c] - da[c]) * f;
    }

    // Correlação de Pearson entre dois indicadores num ano. Indicadores em log entram em log.
    function correlacao(a, b, ano) {
      const v = (d, c) => valido(d, c) ? (ehLog(c) ? Math.log10(d[c]) : d[c]) : null;
      const pares = [];
      for (const m of linhaDe.values()) {
        const d = m.get(ano);
        const p = [v(d, a), v(d, b)];
        if (p[0] != null && p[1] != null) pares.push(p);
      }
      return { r: pares.length > 2 ? pearson(pares.map(p => p[0]), pares.map(p => p[1])) : null, n: pares.length };
    }

    return {
      linhas, info, META, ehLog, valido, linhaDe, agregadoDe, valorEm, correlacao,
      eixos: indicadores.map(d => d.coluna).filter(c => c !== "populacao"),
      rotuloEixo: c => `${META[c].nome} (${META[c].unidade}${ehLog(c) ? ", escala log" : ""})`,
    };
  });
  return promessa;
}

export const tip = {
  no: null,
  mostrar(ev, html) {
    this.no ??= document.getElementById("tip");
    this.no.innerHTML = html;
    this.no.style.opacity = 1;
    const w = this.no.offsetWidth, h = this.no.offsetHeight;
    const x = ev.clientX + 16 + w > innerWidth ? ev.clientX - w - 16 : ev.clientX + 16;
    const y = ev.clientY + 14 + h > innerHeight ? ev.clientY - h - 14 : ev.clientY + 14;
    this.no.style.left = x + "px";
    this.no.style.top = y + "px";
  },
  esconder() { if (this.no) this.no.style.opacity = 0; },
};

export const reduzMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
