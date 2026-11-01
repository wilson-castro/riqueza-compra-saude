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
  dos gráficos da COVID-19 e do Brasil.
- `js/bolhas.js` é o gráfico de bolhas usado na história e no painel.
- `js/explorar.js` é o painel livre, com bolhas, matriz de correlação, linhas e tabela.
- `js/base.js` lê os dados e guarda cores, formatos e contas comuns.
- `dados/` tem os CSV que a página lê. Eles são gerados por `exploracao/gerar_dados_site.py` a
  partir dos dados completos em `exploracao/dados/`.
- `vendor/d3.min.js` é uma cópia local do D3 7.9.0, para o site não depender de outro servidor.

O visual segue o Material Design 3. A fonte Roboto vem do Google Fonts. Sem internet, a página usa as fontes do
sistema.
