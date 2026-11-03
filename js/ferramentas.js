// Botão flutuante de controles do painel. Quando o leitor rola até os gráficos e a barra de
// controles sai da tela, aparece um botão no canto inferior direito. Ele abre a mesma barra como um
// painel preso à janela, para o leitor mudar eixos, cores e países sem perder o gráfico de vista.
// A barra não é copiada, só muda de lugar na tela, então os controles continuam ligados ao painel.
//
// O controle de tempo segue a mesma ideia. Todas as visões do painel dependem do ano, então,
// quando o leitor rola para longe do gráfico de bolhas, o controle fica preso ao pé da tela.

export function iniciarFerramentas() {
  const $ = id => document.getElementById(id);
  const botao = $("abrirFerramentas"), barra = $("barraControles"), lugar = $("barraLugar");
  const fechar = $("fecharFerramentas"), painel = $("painel");
  let painelVisivel = false, barraVisivel = true, aberto = false;

  const atualizarBotao = () => { botao.hidden = !aberto && !(painelVisivel && !barraVisivel); };

  const tocador = $("tocador"), tocadorLugar = $("tocadorLugar");
  let tocadorVisivel = true;
  function atualizarTocador() {
    const prender = painelVisivel && !tocadorVisivel;
    if (prender === tocador.classList.contains("preso")) return;
    // O lugar guarda a altura do controle, para a página não pular quando ele sai do fluxo.
    tocadorLugar.style.minHeight = prender ? tocadorLugar.offsetHeight + "px" : "";
    tocador.classList.toggle("preso", prender);
  }

  function abrir() {
    // O lugar guarda a altura da barra, para a página não pular quando ela sai do fluxo.
    lugar.style.minHeight = barra.offsetHeight + "px";
    barra.classList.add("flutuante");
    barra.setAttribute("role", "dialog");
    barra.setAttribute("aria-labelledby", "tituloControles");
    fechar.hidden = false;
    aberto = true;
    botao.setAttribute("aria-expanded", "true");
    atualizarBotao();
    barra.querySelector("select, input, button:not([hidden])")?.focus();
  }
  function fecharFerramentas({ devolverFoco = true } = {}) {
    if (!aberto) return;
    barra.classList.remove("flutuante");
    barra.removeAttribute("role");
    barra.removeAttribute("aria-labelledby");
    lugar.style.minHeight = "";
    fechar.hidden = true;
    aberto = false;
    botao.setAttribute("aria-expanded", "false");
    atualizarBotao();
    if (devolverFoco && !botao.hidden) botao.focus();
  }

  botao.addEventListener("click", () => aberto ? fecharFerramentas() : abrir());
  fechar.addEventListener("click", () => fecharFerramentas());
  barra.addEventListener("keydown", ev => {
    if (aberto && ev.key === "Escape") { ev.stopPropagation(); fecharFerramentas(); }
  });

  new IntersectionObserver(([e]) => {
    painelVisivel = e.isIntersecting;
    // Fora do painel, a barra volta para o lugar dela.
    if (!painelVisivel) fecharFerramentas({ devolverFoco: false });
    atualizarBotao();
    atualizarTocador();
  }).observe(painel);
  new IntersectionObserver(([e]) => { tocadorVisivel = e.isIntersecting; atualizarTocador(); }).observe(tocadorLugar);
  new IntersectionObserver(([e]) => { barraVisivel = e.isIntersecting; atualizarBotao(); }).observe(lugar);
}
