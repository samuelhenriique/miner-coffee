# Lanchinho Miner

Sistema para montar os grupos do cafe de sexta-feira da equipe, mantendo historico para evitar que as mesmas pessoas caiam em datas muito proximas.

## O que ele faz

- Gera um grupo por sexta-feira do mes.
- Usa o tamanho escolhido como base e amplia os dois ultimos grupos quando necessario para incluir todos no mes.
- Evita repetir pessoas que participaram nas sextas mais recentes.
- Leva em conta o fim do mes anterior ao gerar o inicio do mes seguinte.
- Permite adicionar e remover participantes ativos.
- Permite editar grupos manualmente antes de publicar.
- Permite consultar os grupos gerados nos meses anteriores.
- Salva o historico no navegador.
- Exporta e importa backup em JSON.
- Baixa um banner em PNG com os grupos do mes.

## Como rodar localmente

Nao precisa mais de MySQL/MariaDB para usar a versao principal. Rode um servidor simples na pasta:

```powershell
php -S localhost:8000
```

Depois acesse:

```txt
http://localhost:8000
```

Para executar os testes automatizados:

```powershell
npm test
```

Tambem funciona com qualquer servidor estatico local. O importante e acessar por `http://`, porque os arquivos JavaScript estao separados em modulos.

## Estrutura do projeto

```txt
miner-coffee/
  index.html
  README.md
  assets/
    images/
      logo.png
    styles/
      main.css
  src/
    app.js
    backup.js
    banner.js
    dates.js
    defaults.js
    group-edits.js
    groups-view.js
    groups.js
    history.js
    html.js
    participants.js
    storage.js
  legacy/
    mysql/
      api-db.php
      database.php
      database.sql
```

Responsabilidades principais:

- `src/app.js`: coordena o estado e os eventos da aplicacao.
- `src/participants.js`: regras simples e renderizacao dos participantes.
- `src/groups.js`: regra de geracao dos grupos e historico.
- `src/group-edits.js`: troca consistente de integrantes entre duas datas.
- `src/groups-view.js`: renderizacao dos grupos, edicao e visualizacao compacta.
- `src/history.js`: listagem e visualizacao dos grupos de meses anteriores.
- `src/storage.js`: leitura e gravacao no navegador.
- `src/backup.js`: exportacao, leitura e validacao inicial dos backups.
- `src/banner.js`: geracao do PNG para postagem.
- `src/dates.js`: formatacao e calculo das sextas-feiras.
- `src/html.js`: escape de textos inseridos no HTML.
- `assets/styles/main.css`: estilos da aplicacao.

## Como hospedar

Como o app principal agora e estatico, voce pode hospedar a pasta em servicos simples como:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- qualquer hospedagem que sirva HTML, CSS e JavaScript

Arquivos necessarios para publicar:

```txt
index.html
assets/
src/
```

Os arquivos PHP ficaram em `legacy/mysql/` apenas como legado da versao antiga com banco.

## Backup do RH

Os dados ficam salvos no navegador de quem usa o sistema. Para nao perder historico:

1. Depois de gerar ou editar grupos, clique em `Exportar backup`.
2. Guarde o arquivo JSON em uma pasta compartilhada do RH.
3. Se trocar de computador ou navegador, clique em `Importar backup`.

Esse fluxo mantem a hospedagem simples e ainda preserva o historico usado para evitar repeticoes.

## Fluxo sugerido

1. Escolha o mes.
2. Confira a lista de participantes ativos.
3. Escolha o tamanho do grupo.
4. Clique em `Gerar grupos`.
5. Ajuste manualmente algum grupo se precisar.
6. Clique em `Baixar banner`.
7. Clique em `Exportar backup` para guardar o historico atualizado.
