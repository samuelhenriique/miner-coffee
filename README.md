# Lanchinho Miner

Projeto para organizar os grupos do cafe de sexta-feira da equipe.

## O que faz

- Cria um grupo para cada sexta-feira do mes.
- Evita repeticoes proximas e prioriza quem ainda nao participou no mes.
- Aumenta os dois ultimos grupos quando necessario para incluir todos.
- Permite trocar integrantes entre datas sem duplicar ou deixar alguem sem grupo.
- Guarda os grupos no navegador e permite exportar um backup JSON.
- Gera um banner PNG para divulgar os grupos.

## Como rodar

Na pasta do projeto, execute:

```powershell
php -S localhost:8000
```

Abra [http://localhost:8000](http://localhost:8000) no navegador.

> Nao abra o `index.html` diretamente: os arquivos JavaScript usam modulos e precisam ser servidos por HTTP.

## Como usar

1. Escolha o mes.
2. Confira os participantes ativos.
3. Escolha o tamanho-base do grupo.
4. Clique em **Gerar grupos**.
5. Se precisar, edite uma pessoa por vez para trocar sua data com outra pessoa.
6. Use **Baixar banner** ou **Grupos anteriores** quando necessario.

## Dados e backup

Os dados ficam no navegador. Por isso, use **Exportar backup** depois de gerar ou editar grupos importantes.

Para usar os dados em outro computador ou navegador, clique em **Importar backup** e escolha o arquivo JSON exportado.

## Testes

```powershell
npm test
```

## Arquivos principais

- `src/aplicativo.js`: controla a aplicacao e os eventos.
- `src/grupos.js`: gera grupos e realiza trocas de integrantes.
- `src/dados.js`: salva dados locais e gerencia backups.
- `src/interface.js`: mostra participantes, grupos e modais.

Para publicar, envie `index.html`, `assets/` e `src/` para qualquer hospedagem de site estatico.
