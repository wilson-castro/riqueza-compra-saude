// Controle de tempo de um gráfico do painel. Cada gráfico tem o seu, logo abaixo dele, e o ano de
// um não muda o dos outros. O controle tem o botão Tocar, os botões de ano anterior e próximo, o
// ano em destaque, uma barra para arrastar e a velocidade.
//
// Com `continuo`, o tempo anda em frações de ano, para as bolhas se moverem sem saltos. Sem ele, o
// gráfico recebe só anos inteiros.

import { ANO_MIN, ANO_MAX, reduzMovimento } from "./base.js";

let contador = 0;
const todos = new Set();

// Para todos os controles de uma vez. O tutorial usa isso ao abrir.
export function pararTodos() { for (const t of todos) t.parar(); }

export function criarTocador(alvo, { inicial = ANO_MIN, continuo = false, aoMudar, nome = "gráfico" }) {
  const id = "tocador" + ++contador;
  let t = inicial, quadro = null, velocidade = 2;
  const ano = () => Math.min(ANO_MAX, Math.floor(t + 1e-9));

  alvo.classList.add("tocador");
  alvo.setAttribute("role", "group");
  alvo.setAttribute("aria-label", `Tempo do ${nome}`);
  alvo.innerHTML = `
    <button type="button" class="botao-principal tocar" aria-pressed="false"><span aria-hidden="true">▶</span> <span>Tocar</span></button>
    <button type="button" class="botao-discreto voltar" aria-label="Ano anterior"><span aria-hidden="true">‹</span> <span class="texto-botao">Ano anterior</span></button>
    <output class="ano-tocador" for="${id}-barra">${ano()}</output>
    <button type="button" class="botao-discreto avancar" aria-label="Próximo ano"><span class="texto-botao">Próximo ano</span> <span aria-hidden="true">›</span></button>
    <label class="so-leitor" for="${id}-barra">Ano do ${nome}</label>
    <input id="${id}-barra" class="barra-tocador" type="range" min="${ANO_MIN}" max="${ANO_MAX}" step="${continuo ? 0.01 : 1}" value="${t}">
    <label class="tocador-vel">Velocidade
      <select>
        <option value="1">1 ano por segundo</option>
        <option value="2" selected>2 anos por segundo</option>
        <option value="4">4 anos por segundo</option>
      </select></label>`;
  const $ = s => alvo.querySelector(s);
  const botao = $(".tocar"), barra = $(".barra-tocador"), saida = $(".ano-tocador");

  function mostrarAno() {
    barra.value = t;
    barra.setAttribute("aria-valuetext", String(ano()));
    barra.style.setProperty("--pct", `${(t - ANO_MIN) / (ANO_MAX - ANO_MIN) * 100}%`);
    saida.textContent = ano();
  }
  function irPara(novo, { avisar = true } = {}) {
    const antes = continuo ? t : ano();
    t = Math.max(ANO_MIN, Math.min(ANO_MAX, novo));
    if (!continuo) t = Math.round(t);
    mostrarAno();
    if (avisar && (continuo ? t !== antes : ano() !== antes)) aoMudar(t);
  }
  function tocar() {
    if (t >= ANO_MAX) irPara(ANO_MIN);
    // Quem pediu menos movimento no sistema vai direto ao último ano.
    if (reduzMovimento()) { irPara(ANO_MAX); return; }
    botao.innerHTML = '<span aria-hidden="true">Ⅱ</span> <span>Pausar</span>';
    botao.setAttribute("aria-pressed", "true");
    let antes = null, acumulado = t;
    const passo = agora => {
      if (antes != null) acumulado = Math.min(ANO_MAX, acumulado + (agora - antes) / 1000 * velocidade);
      antes = agora;
      irPara(continuo ? acumulado : Math.floor(acumulado));
      if (acumulado >= ANO_MAX) return parar();
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
  }
  function parar() {
    cancelAnimationFrame(quadro);
    quadro = null;
    botao.innerHTML = '<span aria-hidden="true">▶</span> <span>Tocar</span>';
    botao.setAttribute("aria-pressed", "false");
  }

  botao.addEventListener("click", () => quadro ? parar() : tocar());
  $(".voltar").addEventListener("click", () => { parar(); irPara(Math.ceil(t) - 1); });
  $(".avancar").addEventListener("click", () => { parar(); irPara(Math.floor(t) + 1); });
  barra.addEventListener("input", () => { parar(); irPara(+barra.value); });
  $("select").addEventListener("change", e => { velocidade = +e.target.value; });
  mostrarAno();

  const api = { ano, t: () => t, irPara, parar };
  todos.add(api);
  return api;
}
