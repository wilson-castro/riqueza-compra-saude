// Ponto de entrada. Lê os dados uma vez e monta a história e o painel.

import { carregar } from "./base.js";
import { iniciarHistoria } from "./historia.js";
import { iniciarPainel } from "./explorar.js";

const avisar = msg => { document.getElementById("erro").textContent = msg; };

if (typeof d3 === "undefined") {
  avisar("O D3 não carregou. Confira se o arquivo vendor/d3.min.js foi publicado junto com a página.");
} else {
  carregar()
    .then(D => { iniciarHistoria(D); iniciarPainel(D); })
    .catch(e => avisar("Os dados não carregaram. Abra a página por um servidor, não direto do arquivo. " + e));
}
