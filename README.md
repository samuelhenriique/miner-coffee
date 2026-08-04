# Lanchinho Miner

Sistema para montar os grupos do cafe de sexta-feira da equipe, mantendo historico para evitar que as mesmas pessoas caiam em datas muito proximas.

## O que ele faz

- Gera um grupo por sexta-feira do mes.
- Evita repetir pessoas que participaram nas sextas mais recentes.
- Leva em conta o fim do mes anterior ao gerar o inicio do mes seguinte.
- Permite adicionar e remover participantes ativos.
- Permite editar grupos manualmente antes de publicar.
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
    banner.js
    dates.js
    defaults.js
    groups.js
    storage.js
  legacy/
    mysql/
      api-db.php
      database.php
      database.sql
```

Responsabilidades principais:

- `src/app.js`: controla a interface e os eventos da tela.
- `src/groups.js`: regra de geracao dos grupos e historico.
- `src/storage.js`: leitura e gravacao no navegador.
- `src/banner.js`: geracao do PNG para postagem.
- `src/dates.js`: formatacao e calculo das sextas-feiras.
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
