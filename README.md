<p align="center">
  <img src="docs/icon.png" width="112" alt="Ícone do Street View Image Extractor">
</p>

<h1 align="center">Street View Image Extractor</h1>

<p align="center">
  <strong>Baixe qualquer panorâmica do Google Street View como foto 360° equiretangular, em até 16K, com um clique.</strong>
</p>

<p align="center">
  <a href="https://github.com/WilliamSampaio/street-view-image-extractor/releases/latest"><img alt="Baixar a última versão" src="https://img.shields.io/github/v/release/WilliamSampaio/street-view-image-extractor?label=download&color=1a73e8"></a>
  <a href="https://github.com/WilliamSampaio/street-view-image-extractor/actions/workflows/release.yml"><img alt="Status do build" src="https://img.shields.io/github/actions/workflow/status/WilliamSampaio/street-view-image-extractor/release.yml?branch=master"></a>
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white">
  <a href="LICENSE"><img alt="Licença MIT" src="https://img.shields.io/badge/licen%C3%A7a-MIT-green"></a>
</p>

<p align="center">
  <a href="#instalação">Instalação</a> ·
  <a href="#como-usar">Como usar</a> ·
  <a href="#perguntas-frequentes">Perguntas frequentes</a> ·
  <a href="#english">English</a>
</p>

---

Está no Google Maps olhando um lugar incrível no Street View e queria guardar aquela vista inteira?
O **Street View Image Extractor** é uma extensão gratuita e de código aberto que salva a panorâmica
completa, 360° na horizontal e 180° na vertical, como uma imagem **equiretangular** pronta para
visualizadores 360°, óculos de realidade virtual e softwares 3D.

## Por que usar

- 🖼️ **Qualidade máxima:** monta a imagem original em até **16384×8192 pixels** (134 MP).
- 🎚️ **Você escolhe o tamanho:** Máxima, 8K, 5.7K, 4K, 2K e outras, conforme a necessidade.
- 🌐 **Pronta para 360°:** o JPEG já sai com metadados GPano e é reconhecido como foto 360° pelo Google Fotos, Facebook e outros visualizadores.
- 🧭 **Orientação geográfica real:** identifica onde fica o **norte verdadeiro** dentro da imagem e grava isso nos metadados (veja [Orientação geográfica](#orientação-geográfica)).
- ⚡ **Rápida:** baixa os pedaços da imagem em paralelo e mostra o progresso em tempo real.
- 🔒 **Privada:** tudo acontece no seu navegador. Não há servidor, conta ou coleta de dados.
- 🧩 **Leve:** menos de 30 KB e só pede acesso à aba quando você clica na extensão.

### Ideal para

Tours virtuais e VR · skybox e HDRI no Blender, Unity e Unreal · referência para arquitetura,
arte e ilustração · estudos urbanos e de mapeamento · papéis de parede e fundos 360°.

## Instalação

Funciona no **Google Chrome, Microsoft Edge, Brave, Opera, Vivaldi** e outros navegadores baseados em Chromium.

1. **Baixe** o arquivo `street-view-image-extractor-<versão>.zip` da
   [última versão](https://github.com/WilliamSampaio/street-view-image-extractor/releases/latest).
2. **Extraia** o `.zip` numa pasta que você não vá apagar.
3. **Abra a página de extensões** do seu navegador:

   | Navegador | Endereço |
   |---|---|
   | Chrome | `chrome://extensions` |
   | Edge | `edge://extensions` |
   | Brave | `brave://extensions` |
   | Opera | `opera://extensions` |

4. Ative o **Modo do desenvolvedor**, clique em **Carregar sem compactação** e escolha a pasta extraída.
5. Pronto! Fixe o ícone 🌐 na barra de ferramentas para ter acesso rápido.

> **Atualizando:** baixe a nova versão, substitua os arquivos na mesma pasta e clique em ↻ recarregar na página de extensões.

## Como usar

1. Abra o [Google Maps](https://www.google.com/maps) e entre no **Street View** de qualquer lugar.
2. Clique no ícone da extensão.
3. Escolha a **resolução** e a **qualidade** do JPEG.
4. Clique em **Extrair imagem**. Uma nova aba monta a panorâmica, mostra uma prévia e baixa o arquivo.

### Qual resolução escolher?

| Opção | Tamanho | Bom para |
|---|---|---|
| **Máxima** | 16384×8192 | Impressão, recortes e o máximo de detalhe |
| **8K** | 7680×3840 | Realidade virtual e skybox em alta qualidade |
| **4K** | 3840×1920 | Redes sociais e visualizadores 360° |
| **2K** | 2048×1024 | Prévias e arquivos leves |

As opções disponíveis variam conforme a panorâmica: as mais antigas vão até 13312×6656.
A extensão lembra a última resolução e a qualidade escolhidas.

## Orientação geográfica

Toda panorâmica do Street View tem um **heading**: o azimute (direção da bússola, 0°=Norte,
90°=Leste, 180°=Sul, 270°=Oeste), medido a partir do **Norte verdadeiro/geográfico** — não o
Norte magnético — que aponta para o **centro horizontal** da imagem equiretangular. A extensão
busca esse valor nos metadados do próprio Google (não é o `h=` que aparece na URL do Maps, que é
só a direção da câmera do visualizador) e calcula:

```text
northX = coordenada X onde o Norte verdadeiro aparece na imagem exportada
```

Esse valor é mostrado na tela de extração (📍 coordenadas, 🧭 heading e 🧭 posição do Norte) e
gravado no próprio JPEG como `GPano:PoseHeadingDegrees` (mais `PosePitchDegrees` e
`PoseRollDegrees`, quando disponíveis) — propriedades oficiais da especificação
[Photo Sphere XMP](https://developers.google.com/streetview/spherical-metadata). Quando a
panorâmica não expõe esses metadados, a extensão simplesmente não grava as propriedades `Pose*`,
sem afetar o restante do arquivo.

Opcionalmente, é gerado também um `panorama.json` com as mesmas coordenadas e ângulos, útil para
integrar a imagem com aplicações GIS.

A imagem em si **não é rotacionada**: ela sai exatamente como o Google monta, e a extensão apenas
informa onde o Norte está dentro dela.

Quando a orientação está disponível, a tela de extração também oferece **"Mostrar linhas
cardeais (N/E/S/W)"**: um toggle que sobrepõe linhas verticais coloridas ao preview marcando os
quatro pontos cardeais, só para conferência visual — nunca altera o JPEG baixado.

## Perguntas frequentes

<details>
<summary><strong>Onde a imagem é salva?</strong></summary>

Na pasta de downloads do navegador, com um nome como
`streetview_<id>_<latitude>_<longitude>_16384x8192.jpg`.
</details>

<details>
<summary><strong>Como vejo a imagem em 360°?</strong></summary>

Envie para o Google Fotos ou Facebook, que reconhecem a foto automaticamente, ou abra num
visualizador 360° de sua preferência. No Blender, use a imagem como textura *Environment*.
</details>

<details>
<summary><strong>O navegador ficou lento ou a aba travou.</strong></summary>

A resolução máxima usa cerca de 550 MB de memória durante a montagem. Escolha 8K ou 4K em
computadores com pouca RAM.
</details>

<details>
<summary><strong>A imagem ficou com partes pretas.</strong></summary>

Alguns pedaços da imagem não puderam ser baixados; a página de extração avisa quando isso acontece.
Tente novamente em alguns instantes.
</details>

<details>
<summary><strong>Funciona com fotos 360° enviadas por usuários (photospheres)?</strong></summary>

O suporte existe, mas é experimental. As panorâmicas oficiais do Street View são as mais confiáveis.
</details>

<details>
<summary><strong>A extensão coleta meus dados?</strong></summary>

Não. Ela lê apenas o endereço da aba ativa quando você clica no ícone e baixa as imagens e os
metadados de orientação diretamente dos servidores do Google. Nada é enviado a terceiros.
</details>

## Para desenvolvedores

```sh
git clone https://github.com/WilliamSampaio/street-view-image-extractor.git
cd street-view-image-extractor
npm run build
```

O build gera `dist/street-view-image-extractor/`, a pasta para carregar no navegador, e um `.zip`
para distribuição. Ele valida o `manifest.json` e confere se todo arquivo referenciado no HTML/JS
foi incluído. `npm run build` é só um atalho para `python3 build.py` (chamável direto, sem npm);
a extensão em si não usa bundler nem dependências além do Python 3.

| Arquivo | Função |
|---|---|
| `popup.html` / `popup.js` | Lê a panorâmica da URL e oferece as resoluções |
| `extractor.html` / `extractor.js` | Baixa os tiles, monta, redimensiona e salva o JPEG |
| `lib/pano.js` | Leitura da URL, níveis de zoom e endereços dos tiles |
| `lib/metadata.js` | Busca heading/pitch/roll/lat/lng reais da panorâmica |
| `lib/orientation.js` | Matemática pixel ↔ azimute (bearing) e Norte verdadeiro |
| `lib/xmp.js` | Metadados GPano (incluindo `Pose*`) para visualizadores 360° |
| `build.py` | Gera a pasta e o `.zip` em `dist/` |

**Testes:** a matemática de orientação (`lib/orientation.js`) tem testes unitários com o runner
nativo do Node (sem dependências extras):

```sh
npm test
```

**Releases automáticas:** cada push na branch `master` executa o
[workflow de release](.github/workflows/release.yml), que gera o build e publica uma nova versão
`MAJOR.MINOR.<número da execução>` (ex.: `v1.0.12`) com o `.zip` anexado. Para mudar a versão
principal, altere `MAJOR.MINOR` no `manifest.json`.

Contribuições são bem-vindas: abra uma *issue* ou envie um *pull request*.

## Aviso

Projeto independente, sem vínculo com o Google. As imagens do Street View pertencem ao Google e aos
seus autores; use-as de acordo com os
[Termos de Serviço do Google Maps](https://maps.google.com/help/terms_maps/). Os endereços usados
para baixar os tiles não são uma API oficial e podem mudar.

## Licença

Distribuído sob a [Licença MIT](LICENSE).

---

## English

**Street View Image Extractor** is a free, open-source Chrome extension that downloads Google Street
View panoramas as **equirectangular 360° images** (up to 16384×8192) with embedded GPano metadata,
ready for VR headsets, 360° photo viewers, Blender, Unity and Unreal Engine skyboxes. It also
detects the panorama's real-world **heading** and computes where **true north** falls inside the
exported image (`GPano:PoseHeadingDegrees` and an optional `panorama.json` sidecar), so the image
can be placed correctly in GIS/mapping applications.

1. Download the `.zip` from the [latest release](https://github.com/WilliamSampaio/street-view-image-extractor/releases/latest) and extract it.
2. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and select the extracted folder.
3. Open any Street View panorama on Google Maps, click the extension icon, pick a resolution and click **Extrair imagem** (Extract image).

Works on Chrome, Edge, Brave, Opera and other Chromium-based browsers. Licensed under MIT.
