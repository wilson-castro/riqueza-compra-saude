import { reduzMovimento } from "./base.js";

export function iniciarTutorial(parar) {
  const $ = id => document.getElementById(id);
  const dialogo = $("tutorialPainel");
  const botao = $("abrirTutorial");
  const chave = "tutorial-painel-visto";
  const passos = [
    ["grupoEixos", "Escolha os indicadores", "Escolha o indicador da altura e o da posição para os lados. Use Trocar eixos para inverter a comparação."],
    ["grupoDesenho", "Leia as cores e os tamanhos", "A cor permite comparar grupos ou valores. O tamanho mostra quanto cada país tem do indicador escolhido."],
    ["grupoTempo", "Veja os anos passarem", "Use Tocar para ver as mudanças ao longo dos anos. Você também pode escolher um ano na barra e ajustar a velocidade."],
    ["svgBolhas", "Acompanhe um país", "Clique numa bolha para acompanhar esse país nas outras visões. A busca em Países acompanhados também permite escolher países pelo nome."],
    ["svgMatriz", "Compare as relações", "A matriz mostra quais indicadores sobem ou descem juntos. Clique numa célula para usar aquele par no gráfico de bolhas."],
    ["svgCoord", "Filtre vários indicadores", "Escolha de 2 a 8 eixos nas coordenadas paralelas. Arraste sobre um eixo para filtrar uma faixa de valores também nas bolhas, no mapa e no ranking."],
    ["svgMapa", "Explore o mapa e o ranking", "O mapa mostra onde estão os valores do eixo vertical. Logo abaixo, o ranking ordena os países pelo mesmo indicador e permite acompanhá-los com um clique."],
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
