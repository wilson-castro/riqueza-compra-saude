import { reduzMovimento } from "./base.js";

export function iniciarTutorial(parar) {
  const $ = id => document.getElementById(id);
  const dialogo = $("tutorialPainel");
  const botao = $("abrirTutorial");
  const chave = "tutorial-painel-visto";
  const passos = [
    ["grupoEixos", "Escolha os indicadores", "Escolha o indicador da altura e o da posição para os lados. Trocar eixos inverte a comparação."],
    ["grupoDesenho", "Leia as cores e os tamanhos", "A cor compara grupos ou mostra mais um indicador. O tamanho da bolha mostra outro."],
    ["tocadorBolhas", "Cada gráfico tem o seu tempo", "Embaixo de cada gráfico há um controle de tempo. Tocar faz os anos passarem, e os botões ao lado andam um ano por vez. Mudar o ano de um gráfico não muda o dos outros."],
    ["svgBolhas", "Acompanhe um país", "Clique numa bolha para acompanhar o país em todos os gráficos. A busca em Países acompanhados faz o mesmo pelo nome."],
    ["svgMatriz", "Compare as relações", "A matriz mostra quais indicadores sobem ou descem juntos. Clique numa célula para levar o par para as bolhas, e clique de novo para voltar."],
    ["svgCoord", "Filtre vários indicadores", "Arraste sobre um eixo das coordenadas paralelas para ficar só com os países naquela faixa. O filtro vale também para as bolhas, o mapa e o ranking."],
    ["svgMapa", "Veja no mapa e no ranking", "O mapa e o ranking mostram o indicador do eixo vertical das bolhas, cada um no seu próprio ano."],
    ["abrirTutorial", "Controles sempre à mão", "Quando você rolar para os gráficos, o botão Controles no canto inferior direito abre os mesmos controles do alto do painel."],
  ];
  let passo = 0, destacado = null;
  try { $("conviteTutorial").hidden = localStorage.getItem(chave) === "sim"; } catch {}

  function mostrar() {
    destacado?.classList.remove("destaque-tutorial");
    const [id, titulo, texto] = passos[passo];
    const alvo = $(id);
    // A visão inteira inclui as instruções que ajudam a entender o gráfico destacado.
    destacado = alvo.closest(".visao") || alvo;
    destacado.classList.add("destaque-tutorial");
    $("passoTutorial").textContent = `Passo ${passo + 1} de ${passos.length}`;
    $("tituloTutorial").textContent = titulo;
    $("textoTutorial").textContent = texto;
    $("tutorialVoltar").disabled = passo === 0;
    $("tutorialProximo").disabled = passo === passos.length - 1;
    // O início da visão fica acima do diálogo, inclusive em telas estreitas.
    destacado.scrollIntoView({ behavior: reduzMovimento() ? "instant" : "smooth", block: "start" });
  }
  botao.addEventListener("click", () => {
    parar();
    passo = 0;
    dialogo.showModal();
    mostrar();
    dialogo.focus({ preventScroll: true });
    $("conviteTutorial").hidden = true;
    // O tutorial continua disponível quando o navegador bloqueia o armazenamento.
    try { localStorage.setItem(chave, "sim"); } catch {}
  });
  $("tutorialVoltar").addEventListener("click", () => {
    if (passo > 0) { passo--; mostrar(); dialogo.focus({ preventScroll: true }); }
  });
  $("tutorialProximo").addEventListener("click", () => {
    if (passo < passos.length - 1) { passo++; mostrar(); dialogo.focus({ preventScroll: true }); }
  });
  $("tutorialFechar").addEventListener("click", () => dialogo.close());
  dialogo.addEventListener("keydown", ev => {
    // As teclas do tutorial não devem chegar aos atalhos do painel.
    ev.stopPropagation();
  });
  dialogo.addEventListener("close", () => {
    destacado?.classList.remove("destaque-tutorial");
    botao.focus({ preventScroll: true });
    botao.scrollIntoView({ behavior: reduzMovimento() ? "instant" : "smooth", block: "nearest" });
  });
}
