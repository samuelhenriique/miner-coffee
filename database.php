<?php
define('DB_HOST', 'localhost');
define('DB_PORT', '3307');
define('DB_NAME', 'lanchinho_miner');
define('DB_USER', 'root');
define('DB_PASS', '123456');

class Database {
    private $pdo;
    
    public function __construct() {
        try {
            $this->pdo = new PDO(
                "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
            
            // Criar banco se não existir
            $this->pdo->exec("CREATE DATABASE IF NOT EXISTS " . DB_NAME);
            $this->pdo->exec("USE " . DB_NAME);
            
            // Criar tabelas
            $this->createTables();
            
        } catch (PDOException $e) {
            error_log("Erro de conexão com o banco: " . $e->getMessage());
            throw new Exception("Erro ao conectar ao banco de dados");
        }
    }

    private function createTables() {
        try {
            // Criar tabela pessoas
            $sql = "CREATE TABLE IF NOT EXISTS pessoas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(255) NOT NULL UNIQUE,
                ativo TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )";
            $this->pdo->exec($sql);
            
            // Criar tabela grupos_gerados
            $sql = "CREATE TABLE IF NOT EXISTS grupos_gerados (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mes VARCHAR(7) NOT NULL,
                tamanho_grupo INT NOT NULL,
                formacao VARCHAR(20) DEFAULT 'multiple',
                semana INT NOT NULL,
                data_sexta DATE NOT NULL,
                pessoas TEXT NOT NULL,
                numero_grupo INT NOT NULL
            )";
            $this->pdo->exec($sql);
            
            // Adicionar coluna formacao se não existir (para compatibilidade)
            try {
                $this->pdo->exec("ALTER TABLE grupos_gerados ADD COLUMN formacao VARCHAR(20) DEFAULT 'multiple'");
            } catch (PDOException $e) {
                // Coluna já existe, ignora erro
            }
            
            // Verificar se existem pessoas, se não adicionar as padrão
            $count = $this->pdo->query("SELECT COUNT(*) FROM pessoas")->fetchColumn();
            if ($count == 0) {
                $pessoasPadrao = ['Samuel', 'Tavares', 'Anderson Ramos', 'Anderson Mazzuchello',
                                'Diego', 'Gustavo', 'Iza', 'Natali', 'Bruno', 'Alessandro', 'Luquinha'];
                
                $insertSql = "INSERT INTO pessoas (nome, ativo) VALUES (?, 1)";
                $stmt = $this->pdo->prepare($insertSql);
                
                foreach ($pessoasPadrao as $pessoa) {
                    $stmt->execute([$pessoa]);
                }
            }
        } catch (PDOException $e) {
            error_log("Erro ao criar tabelas: " . $e->getMessage());
        }
    }
    
    public function getPessoas() {
        try {
            $sql = "SELECT nome FROM pessoas WHERE ativo = 1 ORDER BY nome";
            $stmt = $this->pdo->query($sql);
            $result = $stmt->fetchAll(PDO::FETCH_COLUMN);
            error_log("Pessoas encontradas: " . json_encode($result));
            return $result;
        } catch (PDOException $e) {
            error_log("Erro ao buscar pessoas: " . $e->getMessage());
            throw new Exception("Erro ao buscar lista de pessoas");
        }
    }

    public function adicionarPessoa($nome) {
        try {
            error_log("Tentando adicionar pessoa: " . $nome);
            
            // Verifica se a pessoa já existe
            $check = $this->pdo->prepare("SELECT COUNT(*) FROM pessoas WHERE nome = ? AND ativo = 1");
            $check->execute([$nome]);
            if ($check->fetchColumn() > 0) {
                error_log("Pessoa já existe: " . $nome);
                throw new Exception("Pessoa já existe na lista");
            }

            // Adiciona nova pessoa
            $sql = "INSERT INTO pessoas (nome, ativo) VALUES (?, 1)";
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([$nome]);
            
            // Limpa grupos salvos quando uma pessoa é adicionada
            $this->limparTodosGrupos();
            
            error_log("Pessoa adicionada com sucesso: " . $nome);
            return $result;
        } catch (PDOException $e) {
            error_log("Erro ao adicionar pessoa: " . $e->getMessage());
            throw new Exception("Erro ao adicionar pessoa ao banco de dados: " . $e->getMessage());
        }
    }

    public function removerPessoa($nome) {
        try {
            error_log("Tentando remover pessoa: " . $nome);
            
            // Verifica se a pessoa existe antes de tentar remover
            $check = $this->pdo->prepare("SELECT COUNT(*) FROM pessoas WHERE nome = ? AND ativo = 1");
            $check->execute([$nome]);
            if ($check->fetchColumn() == 0) {
                error_log("Pessoa não encontrada: " . $nome);
                throw new Exception("Pessoa não encontrada na lista");
            }

            // Marca pessoa como inativa
            $sql = "UPDATE pessoas SET ativo = 0 WHERE nome = ? AND ativo = 1";
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([$nome]);
            
            // Limpa grupos salvos quando uma pessoa é removida
            $this->limparTodosGrupos();
            
            error_log("Pessoa removida com sucesso: " . $nome);
            return $result;
        } catch (PDOException $e) {
            error_log("Erro PDO ao remover pessoa: " . $e->getMessage());
            throw new Exception("Erro ao remover pessoa do banco de dados: " . $e->getMessage());
        }
    }
    
    private function limparTodosGrupos() {
        $sql = "DELETE FROM grupos_gerados";
        $this->pdo->exec($sql);
        error_log("Todos os grupos foram limpos devido a mudança na lista de pessoas");
    }
    
    public function getGruposPorMes($mes, $tamanhoGrupo = null) {
        if ($tamanhoGrupo !== null) {
            $sql = "SELECT * FROM grupos_gerados WHERE mes = ? AND tamanho_grupo = ? ORDER BY semana, numero_grupo";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$mes, $tamanhoGrupo]);
        } else {
            $sql = "SELECT * FROM grupos_gerados WHERE mes = ? ORDER BY semana, numero_grupo";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$mes]);
        }
        return $stmt->fetchAll();
    }
    
    public function getGruposPorMesComFormacao($mes, $formacao, $tamanhoGrupo = null) {
        if ($formacao === 'single') {
            $sql = "SELECT * FROM grupos_gerados WHERE mes = ? AND formacao = ? ORDER BY semana, numero_grupo";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$mes, $formacao]);
        } else {
            $sql = "SELECT * FROM grupos_gerados WHERE mes = ? AND formacao = ? AND tamanho_grupo = ? ORDER BY semana, numero_grupo";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$mes, $formacao, $tamanhoGrupo]);
        }
        return $stmt->fetchAll();
    }
    
    public function salvarGrupos($mes, $tamanhoGrupo, $grupos, $formacao = 'multiple') {
        // Limpa grupos existentes do mês com a mesma formação
        $this->limparGruposMes($mes, $formacao);
        
        $sql = "INSERT INTO grupos_gerados (mes, tamanho_grupo, formacao, semana, data_sexta, pessoas, numero_grupo) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->pdo->prepare($sql);
        
        foreach ($grupos as $weekData) {
            foreach ($weekData['groups'] as $numGrupo => $pessoas) {
                $stmt->execute([
                    $mes,
                    $tamanhoGrupo,
                    $formacao,
                    $weekData['weekNumber'],
                    $weekData['date']->format('Y-m-d'),
                    json_encode($pessoas),
                    $numGrupo + 1
                ]);
            }
        }
    }
    
    public function limparGruposMes($mes, $formacao = null) {
        if ($formacao) {
            $sql = "DELETE FROM grupos_gerados WHERE mes = ? AND formacao = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$mes, $formacao]);
        } else {
            $sql = "DELETE FROM grupos_gerados WHERE mes = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$mes]);
        }
    }
    
    public function getPdo() {
        return $this->pdo;
    }

    public function adicionarPessoaEmTodasAsDatas($nome, $mes) {
        try {
            // Busca todas as datas existentes do mês
            $stmt = $this->pdo->prepare("SELECT DISTINCT data_sexta FROM grupos_gerados WHERE mes = ?");
            $stmt->execute([$mes]);
            $datas = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            foreach ($datas as $data) {
                $this->adicionarPessoaEmData($nome, $data);
            }
        } catch (PDOException $e) {
            error_log("Erro ao adicionar pessoa em todas as datas: " . $e->getMessage());
            throw new Exception("Erro ao adicionar pessoa aos grupos existentes");
        }
    }

    public function adicionarPessoaEmDatas($nome, $datasArray) {
        try {
            foreach ($datasArray as $data) {
                $this->adicionarPessoaEmData($nome, $data);
            }
        } catch (Exception $e) {
            error_log("Erro ao adicionar pessoa em datas específicas: " . $e->getMessage());
            throw new Exception("Erro ao adicionar pessoa às datas selecionadas");
        }
    }

    private function adicionarPessoaEmData($nome, $data) {
        try {
            // Busca todos os grupos da data
            $stmt = $this->pdo->prepare("SELECT id, pessoas FROM grupos_gerados WHERE data_sexta = ?");
            $stmt->execute([$data]);
            $grupos = $stmt->fetchAll();
            
            if (empty($grupos)) {
                return; // Não há grupos para esta data
            }
            
            // Encontra o grupo com menos pessoas para adicionar
            $grupoEscolhido = null;
            $menorTamanho = PHP_INT_MAX;
            
            foreach ($grupos as $grupo) {
                $pessoas = json_decode($grupo['pessoas'], true);
                if (!in_array($nome, $pessoas) && count($pessoas) < $menorTamanho) {
                    $menorTamanho = count($pessoas);
                    $grupoEscolhido = $grupo;
                }
            }
            
            if ($grupoEscolhido) {
                // Adiciona a pessoa ao grupo
                $pessoas = json_decode($grupoEscolhido['pessoas'], true);
                $pessoas[] = $nome;
                
                $updateStmt = $this->pdo->prepare("UPDATE grupos_gerados SET pessoas = ? WHERE id = ?");
                $updateStmt->execute([json_encode($pessoas), $grupoEscolhido['id']]);
            }
        } catch (PDOException $e) {
            error_log("Erro ao adicionar pessoa em data específica: " . $e->getMessage());
            throw new Exception("Erro ao processar grupo da data " . $data);
        }
    }

    public function getDatasDisponiveisDoMes($mes) {
        try {
            $stmt = $this->pdo->prepare("SELECT DISTINCT data_sexta FROM grupos_gerados WHERE mes = ? ORDER BY data_sexta");
            $stmt->execute([$mes]);
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (PDOException $e) {
            error_log("Erro ao buscar datas do mês: " . $e->getMessage());
            return [];
        }
    }

}
?>
