// O país do leitor. Ele escolhe um país uma vez, no alto da página, e esse país fica destacado na
// história, no gráfico da COVID-19, na comparação do Brasil e no painel livre. A escolha fica
// guardada no navegador para a próxima visita.

// Magenta, um matiz que não aparece nas regiões nem na escala da distância até a curva. No teste
// de daltonismo ele fica perto do limite com o verde-água, então o país do leitor também ganha um
// contorno mais grosso e o nome em negrito.
export const COR_MEU_PAIS = "#d6007f";

const CHAVE = "riqueza-compra-saude:meu-pais";
const ouvintes = [];
let atual = null;
try { atual = localStorage.getItem(CHAVE); } catch { /* navegador sem localStorage */ }

export const meuPais = {
  obter: () => atual,
  // Um código que não existe nos dados, como o de uma versão antiga do site, é descartado.
  validar(D) { if (atual && !D.info.has(atual)) this.definir(null); },
  definir(iso3) {
    atual = iso3 || null;
    try { atual ? localStorage.setItem(CHAVE, atual) : localStorage.removeItem(CHAVE); } catch { /* sem localStorage */ }
    for (const f of ouvintes) f(atual);
  },
  aoMudar(f) { ouvintes.push(f); },
};
