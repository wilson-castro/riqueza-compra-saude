// Ponto de entrada. Lê os dados uma vez e monta a história e o painel.

import { carregar } from "./base.js";
import { iniciarHistoria } from "./historia.js";
import { iniciarPainel } from "./explorar.js";
import { criarEscolhaPaises } from "./destaque.js";
import { meuPais, COR_MEU_PAIS } from "./meupais.js";

const avisar = msg => { document.getElementById("erro").textContent = msg; };

if (typeof d3 === "undefined") {
  avisar("O D3 não carregou. Confira se o arquivo vendor/d3.min.js foi publicado junto com a página.");
} else {
  carregar()
    .then(D => {
      meuPais.validar(D);
      const escolha = criarEscolhaPaises(document.getElementById("escolhaMeuPais"), D, {
        obter: () => meuPais.obter() ? [meuPais.obter()] : [],
        mudar: lista => meuPais.definir(lista[0] ?? null),
        rotulo: "Seu país, para acompanhar em todos os gráficos", maximo: 1, cor: () => COR_MEU_PAIS,
      });
      meuPais.aoMudar(() => escolha.atualizar());
      escolha.atualizar();
      iniciarHistoria(D);
      iniciarPainel(D);
    })
    .catch(e => avisar("Os dados não carregaram. Abra a página por um servidor, não direto do arquivo. " + e));
}
