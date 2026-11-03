# Riqueza compra saúde?

Este site conta, com gráficos interativos, como mudaram a renda, a saúde, a demografia e as
diferenças entre mulheres e homens em 217 países, de 1990 a 2024. Os dados são os World Development Indicators (WDI), do Banco Mundial.

A página tem três partes. Primeiro vem uma história guiada, em que um gráfico de bolhas muda conforme
o texto rola. Depois vêm um gráfico sobre a COVID-19 e um retrato do Brasil. No fim fica um painel
livre, em que o leitor escolhe os indicadores, toca o tempo e acompanha países.

## Como ver no computador

O site é estático, feito só de HTML, CSS, JavaScript e CSV. O navegador não deixa uma página aberta
direto do arquivo ler outros arquivos, então é preciso um servidor local. Este comando sobe um
servidor na pasta do site.

```bash
cd exploracao/site
python3 -m http.server 8000
```

Depois abra http://localhost:8000 no navegador.

## Como publicar no GitHub Pages

O site está publicado em https://wilson-castro.github.io/riqueza-compra-saude/. O GitHub Pages
hospeda sites estáticos de graça a partir de um repositório, e esta pasta é o próprio repositório
`wilson-castro/riqueza-compra-saude`. O Pages serve o ramo `main` a partir da raiz.

Para publicar uma mudança, rode o script abaixo na pasta `exploracao/`. Ele refaz os dados, grava
as mudanças e envia tudo para o GitHub. O site se atualiza em um ou dois minutos.

```bash
cd exploracao
bash publicar.sh
```

Se quiser, escreva entre aspas o que mudou, como em `bash publicar.sh "Ajusta as cores"`.

O arquivo `.nojekyll` avisa o GitHub Pages para servir os arquivos como estão, sem passar pelo
Jekyll, o gerador de sites que ele usa por padrão.

## Onde mexer

- `index.html` tem o texto da história e a estrutura da página.
- `estilo.css` tem cores, tipos e o layout, incluindo o de celular.
- `js/historia.js` define o que o gráfico mostra em cada passo da história (a lista `PASSOS`), além
  dos gráficos da COVID-19 e do Brasil. Cada passo diz os eixos, o ano, os países em destaque, o
  modo de cor, se as bolhas ficam espalhadas ou em fila e as notas que aparecem dentro do gráfico.
- `js/bolhas.js` é o gráfico de bolhas usado na história e no painel. Ele pinta as bolhas pela
  região, pelo grupo de renda ou pela distância até a curva de tendência, e sabe reorganizar as
  bolhas numa fila ordenada por essa distância.
- `js/meupais.js` guarda o país que o leitor escolhe no alto da página. Esse país fica destacado em
  todos os gráficos, e a escolha fica salva no navegador.
- `js/destaque.js` é a busca de países com chips, usada em vários gráficos.
- `js/explorar.js` é o painel livre, com bolhas, matriz de correlação, linhas, coordenadas paralelas,
  mapa, ranking e tabela. O filtro feito nas coordenadas paralelas vale também para as bolhas, o
  mapa e o ranking.
  Nas bolhas, o leitor escolhe o indicador de cada eixo, do tamanho e da cor. As linhas mostram o
  valor ou a diferença para o mundo.
- `js/tema.js` guarda a escolha do tema (claro, escuro ou do sistema) e monta o seletor no alto
  da página. O script pequeno no começo de `index.html` aplica o tema antes de a página aparecer.
- `favicon.svg` é o ícone da aba do navegador.
- `js/ferramentas.js` mostra o botão flutuante de controles no canto inferior direito e abre a
  barra de controles do painel por cima dos gráficos. Ele também prende o controle de tempo ao pé
  da tela quando o leitor rola para longe do gráfico de bolhas.
- `js/tutorial.js` guia o leitor pelos controles e visões do painel, com foco e destaque a cada passo.
- `js/base.js` lê os dados e guarda cores, formatos e contas comuns. As cores dos dados têm uma
  versão para o tema claro e outra para o escuro. O site segue o tema do sistema do leitor, e as
  cores da página para o tema escuro ficam no começo de `estilo.css`.
- `dados/` tem os CSV que a página lê. Eles são gerados por `exploracao/gerar_dados_site.py` a
  partir dos dados completos em `exploracao/dados/`.
- `dados/mundo.json` tem o contorno dos países para o mapa. Ele vem do Natural Earth, um conjunto
  de mapas de domínio público, e é gerado por `exploracao/gerar_mapa_site.py`. O começo desse
  script explica como baixar o arquivo de origem.
- `vendor/d3.min.js` é uma cópia local do D3 7.9.0, para o site não depender de outro servidor.

O visual segue o Material Design 3. A fonte Roboto vem do Google Fonts. Sem internet, a página usa as fontes do
sistema.
