// Ponto de entrada. Lê os dados uma vez e monta a história e o painel.

import { carregar } from "./base.js";
import { iniciarHistoria } from "./historia.js";
import { iniciarPainel } from "./explorar.js";
import { criarEscolhaPaises } from "./destaque.js";
import { meuPais, COR_MEU_PAIS, motivoIndisponivel } from "./meupais.js";
import { criarMapaMeuPais } from "./mapaMeuPais.js";
import { criarSeletorTema, restaurarRolagem } from "./tema.js";

criarSeletorTema(document.getElementById("seletorTema"));

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
        rotulo: "Buscar país", maximo: 1, cor: () => COR_MEU_PAIS,
        substituir: true, indisponivel: iso3 => motivoIndisponivel(D, iso3), compacto: true,
      });
      criarMapaMeuPais(D, document.getElementById("mapaMeuPais"), document.getElementById("legendaMeuPais"));
      // A lista dos países que não podem ser escolhidos sai dos dados, para não ficar desatualizada.
      const fora = [...D.info.values()].filter(p => motivoIndisponivel(D, p.iso3))
        .map(p => p.pais).sort((a, b) => a.localeCompare(b, "pt-BR"));
      document.getElementById("resumoIndisponiveis").textContent =
        `Dá para escolher ${D.info.size - fora.length} dos ${D.info.size} países. Por que ${fora.length} não podem`;
      document.getElementById("listaIndisponiveis").textContent =
        `Estes países não têm nenhum valor de PIB por pessoa nos dados do Banco Mundial, então não aparecem ` +
        `no gráfico de bolhas: ${fora.join(", ")}. Eles continuam no gráfico da COVID-19, no ranking e na tabela. ` +
        "No mapa, territórios sem código no Banco Mundial, como Taiwan e o Saara Ocidental, também ficam com hachura.";
      meuPais.aoMudar(() => escolha.atualizar());
      escolha.atualizar();
      iniciarHistoria(D);
      iniciarPainel(D);
      restaurarRolagem();
    })
    .catch(e => avisar("Os dados não carregaram. Abra a página por um servidor, não direto do arquivo. " + e));
}
