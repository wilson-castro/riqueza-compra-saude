// Escolha de países para destacar. Junta uma busca com sugestões enquanto o leitor digita e os
// chips dos países já escolhidos. É usada no gráfico da COVID-19, na comparação do Brasil e no
// painel livre.

// Cores dos países destacados, numa ordem fixa. A paleta passou no teste de daltonismo para
// vizinhos na ordem. Alguns matizes lembram os das regiões. Por isso a linha destacada é mais
// grossa, tem contorno branco e leva o nome na ponta, enquanto as linhas das regiões ficam apagadas.
// No tema escuro, os mesmos matizes ganham tons próprios para o fundo escuro.
export const PALETA_DESTAQUE = matchMedia("(prefers-color-scheme: dark)").matches
  ? ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9"]
  : ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#6250d6"];

// Tira acentos e caixa, para "india" achar "Índia" e "sao tome" achar "São Tomé e Príncipe".
const normalizar = t => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Monta a busca dentro de `alvo`. `obter` devolve a lista atual de países escolhidos e `mudar`
// recebe a nova lista. Com `substituir`, escolher um país quando a lista está cheia troca o último,
// em vez de travar o campo. `indisponivel` devolve o motivo de um país não poder ser escolhido, ou
// null. Esses países aparecem na lista de sugestões, desabilitados e com o motivo. Os chips são desenhados de novo a cada mudança, pela função `atualizar`.
// Sem a opção `cor`, ou quando ela devolve null, o país ganha uma cor da paleta de destaque quando
// é escolhido e fica com ela até sair da lista, mesmo que outros países entrem ou saiam.
export function criarEscolhaPaises(alvo, D, { obter, mudar, rotulo = "Destacar país", maximo = 6, cor = null,
                                               substituir = false, indisponivel = () => null }) {
  const vaga = new Map();
  function corDe(iso3) {
    const fixa = cor?.(iso3);
    if (fixa) return fixa;
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
        placeholder="Buscar país" role="combobox" aria-autocomplete="list"
        aria-expanded="false" aria-controls="${id}-lista" aria-describedby="${id}-ajuda">
      <ul id="${id}-lista" role="listbox" hidden></ul>
    </div>
    <p class="ajuda ajuda-busca" id="${id}-ajuda">Digite um nome e escolha um país nas sugestões.</p>
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
      .sort((a, b) => d3.descending(a.chave.startsWith(termo), b.chave.startsWith(termo))).slice(0, 8)
      .map(p => ({ ...p, motivo: indisponivel(p.iso3) })) : [];
    ativa = sugestoes.findIndex(p => !p.motivo);
    desenharLista(termo);
  }
  function desenharLista(termo) {
    if (!termo) return fechar();
    lista.hidden = false;
    entrada.setAttribute("aria-expanded", "true");
    d3.select(lista).selectAll("li").data(sugestoes.length ? sugestoes : [null]).join("li")
      .attr("id", (d, i) => `${id}-op-${i}`)
      .attr("role", d => d ? "option" : null)
      .attr("class", (d, i) => !d ? "vazia" : d.motivo ? "indisponivel" : i === ativa ? "ativa" : null)
      .attr("aria-selected", (d, i) => d ? String(i === ativa) : null)
      .attr("aria-disabled", d => d?.motivo ? "true" : null)
      .html(d => !d ? "Nenhum país com esse nome"
        : d.motivo ? `${d.pais}<span class="motivo">${d.motivo}</span>` : d.pais)
      .on("mousedown", (ev, d) => { ev.preventDefault(); if (d && !d.motivo) escolher(d.iso3); });
    if (ativa >= 0) entrada.setAttribute("aria-activedescendant", `${id}-op-${ativa}`);
  }
  function escolher(iso3) {
    const atual = obter();
    if (indisponivel(iso3)) return;
    if (!atual.includes(iso3) && atual.length < maximo) mudar([...atual, iso3]);
    else if (!atual.includes(iso3) && substituir) mudar([...atual.slice(0, maximo - 1), iso3]);
    entrada.value = "";
    fechar();
    entrada.focus();
  }

  entrada.addEventListener("input", sugerir);
  entrada.addEventListener("blur", fechar);
  entrada.addEventListener("keydown", ev => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      // As setas pulam os países desabilitados.
      if (!sugestoes.some(p => !p.motivo)) return;
      ev.preventDefault();
      do ativa = (ativa + (ev.key === "ArrowDown" ? 1 : -1) + sugestoes.length) % sugestoes.length;
      while (sugestoes[ativa].motivo);
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
    entrada.disabled = !substituir && ids.length >= maximo;
    entrada.placeholder = substituir && ids.length >= maximo ? "Trocar país"
      : ids.length < maximo ? "Buscar país" : `Até ${maximo} países`;
  }
  return { atualizar, cor: corDe };
}
