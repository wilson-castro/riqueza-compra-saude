// O país do leitor. Ele escolhe um país uma vez, no alto da página, e esse país fica destacado na
// história, no gráfico da COVID-19, na comparação do Brasil e no painel livre. A escolha fica
// guardada no navegador para a próxima visita.

// Magenta, um matiz que não aparece nas regiões nem na escala da distância até a curva. No teste
// de daltonismo ele fica perto do limite com o verde-água, então o país do leitor também ganha um
// contorno mais grosso e o nome em negrito.
export const COR_MEU_PAIS = matchMedia("(prefers-color-scheme: dark)").matches ? "#ec4fa3" : "#d6007f";

// Na primeira visita o país é o Brasil. Se o leitor tira o Brasil sem escolher outro, a página
// guarda uma marca vazia, para não trazer o Brasil de volta na visita seguinte.
const CHAVE = "riqueza-compra-saude:meu-pais";
const PADRAO = "BRA";
const ouvintes = [];
let atual = PADRAO;
try {
  const salvo = localStorage.getItem(CHAVE);
  if (salvo !== null) atual = salvo || null;
} catch { /* navegador sem localStorage */ }

// Um país sem nenhum valor de PIB por pessoa nunca aparece no gráfico de bolhas, que é o centro da
// história e do painel. Por isso ele não pode ser o país do leitor. A função devolve o motivo, para
// a busca e o mapa mostrarem ao leitor por que o país está desabilitado.
export function motivoIndisponivel(D, iso3) {
  if (!D.info.has(iso3)) return "Sem dados do Banco Mundial";
  const serie = D.linhaDe.get(iso3);
  return [...serie.values()].some(d => D.valido(d, "pib_pc_ppp")) ? null
    : "Sem PIB por pessoa, não aparece no gráfico de bolhas";
}

export const meuPais = {
  obter: () => atual,
  // Um código que não existe nos dados, como o de uma versão antiga do site, é descartado, assim
  // como um país que não pode mais ser escolhido.
  validar(D) { if (atual && motivoIndisponivel(D, atual)) this.definir(null); },
  definir(iso3) {
    atual = iso3 || null;
    try { localStorage.setItem(CHAVE, atual ?? ""); } catch { /* sem localStorage */ }
    for (const f of ouvintes) f(atual);
  },
  aoMudar(f) { ouvintes.push(f); },
};
