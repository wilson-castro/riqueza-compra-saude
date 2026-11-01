// Escolha de países para destacar. Junta uma busca com sugestões enquanto o leitor digita e os
// chips dos países já escolhidos. É usada no gráfico da COVID-19, na comparação do Brasil e no
// painel livre.

// Cores dos países destacados, numa ordem fixa. A paleta passou no teste de daltonismo para
// vizinhos na ordem. Nenhum matiz repete os das quatro regiões, para o destaque não parecer uma região.
export const PALETA_DESTAQUE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#6250d6"];

// Tira acentos e caixa, para "india" achar "Índia" e "sao tome" achar "São Tomé e Príncipe".
const normalizar = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Monta a busca dentro de `alvo`. `obter` devolve a lista atual de países escolhidos e `mudar`
// recebe a nova lista. Os chips são desenhados de novo a cada mudança, pela função `atualizar`.
// Sem a opção `cor`, cada país ganha uma cor da paleta de destaque quando é escolhido e fica com
// ela até sair da lista, mesmo que outros países entrem ou saiam.
export function criarEscolhaPaises(alvo, D, { obter, mudar, rotulo = "Destacar país", maximo = 6, cor = null }) {
  const vaga = new Map();
  function corDe(iso3) {
    if (cor) return cor(iso3);
    if (!vaga.has(iso3)) {
      const usadas = new Set(obter().filter(i => vaga.has(i)).map(i => vaga.get(i)));
      let k = 0;
      while (usadas.has(k)) k++;
      vaga.set(iso3, k);
    }
    return PALETA_DESTAQUE[vaga.get(iso3) % PALETA_DESTAQUE.length];
  }
  const id = alvo.id || "escolha" + Math.random().toString(36).slice(2);
  const paises = [...D.info.values()].sort((a, b) => a.pais.localeCompare(b.pais, "pt-BR"))
    .map(p => ({ iso3: p.iso3, pais: p.pais, chave: normalizar(p.pais) }));

  alvo.classList.add("escolha-paises");
  alvo.innerHTML = `
    <div class="busca">
      <label for="${id}-entrada">${rotulo}</label>
      <input id="${id}-entrada" type="text" autocomplete="off" spellcheck="false"
        placeholder="Digite o nome de um país" role="combobox" aria-autocomplete="list"
        aria-expanded="false" aria-controls="${id}-lista">
      <ul id="${id}-lista" role="listbox" hidden></ul>
    </div>
    <div class="chips" aria-live="polite"></div>`;
  const entrada = alvo.querySelector("input");
  const lista = alvo.querySelector("ul");
  const chips = d3.select(alvo.querySelector(".chips"));
  let sugestoes = [], ativa = -1;

  function fechar() {
    lista.hidden = true;
    entrada.setAttribute("aria-expanded", "false");
    entrada.removeAttribute("aria-activedescendant");
    ativa = -1;
  }
  function sugerir() {
    const termo = normalizar(entrada.value.trim());
    const escolhidos = new Set(obter());
    // Primeiro os nomes que começam com o termo, depois os que só o contêm.
    sugestoes = termo ? paises.filter(p => !escolhidos.has(p.iso3) && p.chave.includes(termo))
      .sort((a, b) => d3.descending(a.chave.startsWith(termo), b.chave.startsWith(termo))).slice(0, 8) : [];
    ativa = sugestoes.length ? 0 : -1;
    desenharLista(termo);
  }
  function desenharLista(termo) {
    if (!termo) return fechar();
    lista.hidden = false;
    entrada.setAttribute("aria-expanded", "true");
    d3.select(lista).selectAll("li").data(sugestoes.length ? sugestoes : [null]).join("li")
      .attr("id", (d, i) => `${id}-op-${i}`)
      .attr("role", d => d ? "option" : null)
      .attr("class", (d, i) => d ? (i === ativa ? "ativa" : null) : "vazia")
      .attr("aria-selected", (d, i) => d ? String(i === ativa) : null)
      .text(d => d ? d.pais : "Nenhum país com esse nome")
      .on("mousedown", (ev, d) => { ev.preventDefault(); if (d) escolher(d.iso3); });
    if (ativa >= 0) entrada.setAttribute("aria-activedescendant", `${id}-op-${ativa}`);
  }
  function escolher(iso3) {
    const atual = obter();
    if (!atual.includes(iso3) && atual.length < maximo) mudar([...atual, iso3]);
    entrada.value = "";
    fechar();
    entrada.focus();
  }

  entrada.addEventListener("input", sugerir);
  entrada.addEventListener("blur", fechar);
  entrada.addEventListener("keydown", ev => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      if (!sugestoes.length) return;
      ev.preventDefault();
      ativa = (ativa + (ev.key === "ArrowDown" ? 1 : -1) + sugestoes.length) % sugestoes.length;
      desenharLista(normalizar(entrada.value.trim()));
    } else if (ev.key === "Enter" && ativa >= 0) {
      ev.preventDefault();
      escolher(sugestoes[ativa].iso3);
    } else if (ev.key === "Escape") {
      entrada.value = "";
      fechar();
    }
  });

  function atualizar() {
    const ids = obter();
    for (const i of [...vaga.keys()]) if (!ids.includes(i)) vaga.delete(i);
    const ch = chips.selectAll("span.chip").data(ids, d => d).join(ent => {
      const s = ent.append("span").attr("class", "chip");
      s.append("span").attr("class", "nome");
      s.append("button").attr("type", "button").text("×");
      return s;
    }).style("--c", corDe);
    ch.select(".nome").text(d => D.info.get(d).pais);
    ch.select("button").attr("aria-label", d => "Tirar o destaque de " + D.info.get(d).pais)
      .on("click", (e, d) => mudar(obter().filter(i => i !== d)));
    chips.selectAll("button.limpar").data(ids.length > 1 ? [1] : []).join("button")
      .attr("class", "limpar").attr("type", "button").text("Limpar")
      .on("click", () => mudar([])).raise();
    entrada.disabled = ids.length >= maximo;
    entrada.placeholder = ids.length >= maximo ? `Até ${maximo} países` : "Digite o nome de um país";
  }
  return { atualizar, cor: corDe };
}
