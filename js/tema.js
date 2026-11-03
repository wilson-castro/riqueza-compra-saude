// Tema claro ou escuro. O leitor escolhe "Claro", "Escuro" ou "Do sistema" no alto da página, e a
// escolha fica guardada no navegador. Um script pequeno no head de index.html lê a mesma escolha
// antes de a página aparecer, para ela não piscar com o tema errado.
//
// As cores dos gráficos são calculadas uma vez, quando a página abre. Por isso trocar o tema
// recarrega a página. A posição de rolagem é guardada antes e devolvida depois.

const CHAVE = "riqueza-compra-saude:tema";
const CHAVE_ROLAGEM = "riqueza-compra-saude:rolagem";
const sistemaEscuro = matchMedia("(prefers-color-scheme: dark)");

export function escolhaTema() {
  try { return localStorage.getItem(CHAVE) || "sistema"; } catch { return "sistema"; }
}

const escolha = escolhaTema();
export const ESCURO = escolha === "escuro" || (escolha === "sistema" && sistemaEscuro.matches);

// Com "Do sistema", a página acompanha o sistema quando ele muda com a página aberta.
sistemaEscuro.addEventListener("change", () => { if (escolhaTema() === "sistema") recarregar(); });

function recarregar() {
  try { sessionStorage.setItem(CHAVE_ROLAGEM, String(scrollY)); } catch { /* sem armazenamento */ }
  location.reload();
}

export function definirTema(valor) {
  try { localStorage.setItem(CHAVE, valor); } catch { /* sem armazenamento */ }
  recarregar();
}

// Volta para a posição de antes da troca de tema. Deve ser chamada depois que os gráficos foram
// desenhados, porque antes disso a página ainda não tem a altura final.
export function restaurarRolagem() {
  let y = null;
  try { y = sessionStorage.getItem(CHAVE_ROLAGEM); sessionStorage.removeItem(CHAVE_ROLAGEM); } catch { /* sem armazenamento */ }
  if (y != null) scrollTo({ top: +y, behavior: "instant" });
}

// Monta os três botões do seletor dentro de `alvo`.
export function criarSeletorTema(alvo) {
  const opcoes = [["claro", "Claro"], ["escuro", "Escuro"], ["sistema", "Do sistema"]];
  alvo.innerHTML = `<span class="rotulo-tema" id="rotuloTema">Tema</span>` +
    opcoes.map(([v, nome]) => `<button type="button" data-tema="${v}" aria-pressed="${v === escolha}">${nome}</button>`).join("");
  alvo.setAttribute("role", "group");
  alvo.setAttribute("aria-labelledby", "rotuloTema");
  alvo.addEventListener("click", ev => {
    const v = ev.target.closest("button")?.dataset.tema;
    if (v && v !== escolha) definirTema(v);
  });
}
