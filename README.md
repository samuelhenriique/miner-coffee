#  Lanchinho Miner

Sistema inteligente de rotação de grupos para o café da empresa.

##  Características

###  **Funcionalidades Principais**
- **Geração Inteligente de Grupos**: Algoritmo que evita repetições
- **Gestão de Participantes**: Adicionar/remover pessoas facilmente
- **Persistência**: Grupos salvos no banco de dados
- **Edição Individual**: Modificar grupos específicos
- **Visualização Compacta**: Modal com visão resumida dos grupos

###  **Algoritmo Inteligente**
- **Cooldown de 2 semanas**: Pessoas não participam em semanas consecutivas
- **Continuidade entre meses**: Último grupo do mês não repete no primeiro do mês seguinte
- **Relaxamento automático**: Adapta-se quando há poucas pessoas disponíveis
- **Distribuição justa**: Garante participação equilibrada de todos

###  **Interface Moderna**
- **Design responsivo**: Funciona em desktop e mobile
- **Navegação por mês**: Fácil acesso a diferentes períodos
- **Feedback visual**: Indicadores claros de ações
- **Drag & Drop**: Edição intuitiva dos grupos

##  Instalação

### **Pré-requisitos**
- PHP 8.1+
- MySQL/MariaDB
- Servidor web (Apache/Nginx) ou PHP built-in server

### **Configuração**
1. Clone o repositório
2. Configure o banco de dados em database.php
3. Execute o SQL de criação das tabelas (automático na primeira execução)
4. Inicie o servidor: php -S localhost:8000

##  Estrutura do Projeto

`
lanchinho-miner/
 index.html          # Interface principal
 script.js           # Lógica do frontend
 style.css           # Estilos da aplicação
 api-db.php          # API REST
 database.php        # Camada de dados
 database.sql        # Estrutura do banco
 images.png          # Logo da aplicação
 README.md           # Documentação
`

##  Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: PHP 8.1+
- **Banco de Dados**: MySQL
- **API**: REST com JSON

##  Como Usar

1. **Adicionar Participantes**: Digite nomes na aba lateral
2. **Selecionar Mês**: Use a navegação superior
3. **Escolher Tamanho**: Selecione quantas pessoas por grupo
4. **Gerar Grupos**: Clique em "Gerar Grupos"
5. **Editar se Necessário**: Clique em grupos para modificar
6. **Ver Resumo**: Use o botão "Visualizar" para visão compacta

##  Desenvolvido com 

Sistema criado para facilitar a organização do café na empresa, garantindo uma distribuição justa e variada dos grupos ao longo do tempo.
