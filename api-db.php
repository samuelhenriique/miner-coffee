<?php
require_once 'database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Garante que sempre retornará JSON
header('Content-Type: application/json');

// Tratar requisições OPTIONS para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $db = new Database();
    
    // Determinar action baseado no método da requisição
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        // Primeiro, verificar se action está na URL (para removePerson e addPerson)
        $action = $_GET['action'] ?? null;
        
        // Se não estiver na URL, verificar no corpo da requisição
        if (!$action) {
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true);
            $action = $input['action'] ?? 'updateGroup';
        } else {
            // Se action está na URL, ainda precisamos do input para outras operações
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true);
        }
    } else {
        $action = $_GET['action'] ?? 'groups';
    }
    

    
    if ($action === 'people') {
        // Retorna lista de pessoas do banco
        $people = $db->getPessoas();
        echo json_encode(['success' => true, 'data' => $people]);
        exit;
    }
    
    if ($action === 'availableDates') {
        $month = $_GET['month'] ?? date('Y-m');
        $dates = $db->getDatasDisponiveisDoMes($month);
        echo json_encode(['success' => true, 'data' => $dates]);
        exit;
    }
    
    if ($action === 'updateGroup') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode(['success' => false, 'error' => 'Método não permitido']);
            exit;
        }
        
        $input = json_decode(file_get_contents('php://input'), true);
        $date = $input['date'] ?? '';
        $groupIndex = $input['groupIndex'] ?? 0;
        $members = $input['members'] ?? [];
        
        if (empty($date) || empty($members)) {
            echo json_encode(['success' => false, 'error' => 'Data e membros são obrigatórios']);
            exit;
        }
        
        // Validar formato da data
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            echo json_encode(['success' => false, 'error' => 'Formato de data inválido']);
            exit;
        }
        
        try {
            $result = $db->updateGrupoEspecifico($date, $groupIndex, $members);
            if ($result) {
                echo json_encode(['success' => true, 'message' => 'Grupo atualizado com sucesso']);
            } else {
                echo json_encode(['success' => false, 'error' => 'Falha ao atualizar grupo']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Erro interno: ' . $e->getMessage()]);
        }
        exit;
    }
    
    if ($action === 'groups') {
        $formation = isset($_GET['formation']) ? $_GET['formation'] : 'multiple';
        $groupSize = isset($_GET['groupSize']) ? max(2, min(15, intval($_GET['groupSize']))) : 2;
        $month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
        
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            echo json_encode(['success' => false, 'error' => 'Formato de mês inválido']);
            exit;
        }
        
        // Pega lista atual de pessoas
        $people = $db->getPessoas();
        $totalPessoas = count($people);
        
        // Verifica se já existem grupos salvos para este mês com a mesma configuração
        if ($formation === 'single') {
            // Para grupo único, verificar se número de pessoas é o mesmo
            $gruposSalvos = $db->getGruposPorMesComFormacao($month, 'single');
            // Verifica se o número de pessoas mudou
            if (!empty($gruposSalvos)) {
                $primeiroGrupo = current($gruposSalvos);
                $pessoasSalvas = json_decode($primeiroGrupo['pessoas'], true);
                if (count($pessoasSalvas) !== $totalPessoas) {
                    // Número de pessoas mudou, limpar grupos salvos
                    $db->limparGruposMes($month, 'single');
                    $gruposSalvos = [];
                }
            }
        } else {
            // Para múltiplos grupos, verificar tamanho específico e número total de pessoas
            $gruposSalvos = $db->getGruposPorMesComFormacao($month, 'multiple', $groupSize);
            // Verifica se o número total de pessoas mudou
            if (!empty($gruposSalvos)) {
                // Conta total de pessoas nos grupos salvos
                $pessoasSalvasTotal = [];
                foreach ($gruposSalvos as $grupo) {
                    if ($grupo['semana'] == 1) { // Pega apenas a primeira semana para contar
                        $pessoasSalvas = json_decode($grupo['pessoas'], true);
                        $pessoasSalvasTotal = array_merge($pessoasSalvasTotal, $pessoasSalvas);
                    }
                }
                $pessoasSalvasTotal = array_unique($pessoasSalvasTotal);
                
                // Se número total de pessoas diferentes dos grupos salvos, limpar
                if (count($pessoasSalvasTotal) !== $totalPessoas) {
                    $db->limparGruposMes($month, 'multiple');
                    $gruposSalvos = [];
                }
            }
        }
        
        if (!empty($gruposSalvos)) {
            // Converte grupos salvos para formato de resposta
            $weekGroups = [];
            $currentWeek = null;
            
            foreach ($gruposSalvos as $grupo) {
                if ($currentWeek === null || $currentWeek['weekNumber'] !== $grupo['semana']) {
                    if ($currentWeek !== null) {
                        $weekGroups[] = $currentWeek;
                    }
                    
                    $currentWeek = [
                        'date' => $grupo['data_sexta'],
                        'weekNumber' => $grupo['semana'],
                        'groups' => []
                    ];
                }
                
                // Verifica se pessoas é JSON válido antes de decodificar
                $pessoasDecoded = json_decode($grupo['pessoas'], true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    // Garante que os grupos sejam inseridos na posição correta baseado no numero_grupo
                    $currentWeek['groups'][$grupo['numero_grupo'] - 1] = $pessoasDecoded;
                } else {
                    // Se não for JSON válido, trata como array simples
                    $currentWeek['groups'][$grupo['numero_grupo'] - 1] = [$grupo['pessoas']];
                }
            }
            
            if ($currentWeek !== null) {
                // Reorganiza os grupos para remover índices vazios, mantendo a ordem
                if (isset($currentWeek['groups'])) {
                    $currentWeek['groups'] = array_values($currentWeek['groups']);
                }
                $weekGroups[] = $currentWeek;
                
                // Reorganiza todos os grupos de todas as semanas
                foreach ($weekGroups as &$week) {
                    $week['groups'] = array_values($week['groups']);
                }
            }
            
        } else {
            // Gera novos grupos
            list($year, $monthNum) = explode('-', $month);
            $monthNum = str_pad($monthNum, 2, '0', STR_PAD_LEFT);
            $fridays = getFridays($year, $monthNum);
            $people = $db->getPessoas();
            
            // Buscar o último grupo do mês anterior (apenas para a primeira semana)
            $ultimoGrupoMesAnterior = null;
            try {
                $reflection = new ReflectionClass($db);
                $method = $reflection->getMethod('getUltimoGrupoDoMesAnterior');
                $method->setAccessible(true);
                $ultimoGrupoMesAnterior = $method->invoke($db, $month, $groupSize);
            } catch (Exception $e) {
                error_log("Erro ao buscar último grupo do mês anterior: " . $e->getMessage());
            }
            
            $weekGroups = [];
            foreach ($fridays as $i => $friday) {
                // Passa o último grupo do mês anterior apenas para a primeira semana
                $ultimoGrupoParaEssaSemana = ($i === 0) ? $ultimoGrupoMesAnterior : null;
                
                if ($formation === 'single') {
                    // Um único grupo por semana, mas respeitando o tamanho do grupo
                    $groups = createGroupsWithCooldown($people, $groupSize, $weekGroups, $i, $ultimoGrupoParaEssaSemana);
                    // Pega apenas o primeiro grupo (um grupo por semana)
                    $groups = !empty($groups) ? [$groups[0]] : [];
                } else {
                    // Múltiplos grupos por semana
                    $groups = createGroupsWithCooldown($people, $groupSize, $weekGroups, $i, $ultimoGrupoParaEssaSemana);
                }
                
                $weekGroups[] = [
                    'date' => new DateTime($friday, new DateTimeZone('America/Sao_Paulo')),
                    'weekNumber' => $i + 1,
                    'groups' => $groups
                ];
            }
            
            // Salva no banco
            if ($formation === 'single') {
                $db->salvarGrupos($month, $groupSize, $weekGroups, 'single');
            } else {
                $db->salvarGrupos($month, $groupSize, $weekGroups, 'multiple');
            }
            
            // Converte DateTime para string na resposta
            foreach ($weekGroups as &$week) {
                $week['date'] = $week['date']->format('Y-m-d');
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'month' => $month,
                'formation' => $formation,
                'groupSize' => $groupSize,
                'weekGroups' => $weekGroups
            ]
        ]);
        exit;
    }
    
    if ($action === 'reset') {
        $month = isset($_GET['month']) ? $_GET['month'] : date('Y-m');
        $db->limparGruposMes($month);
        echo json_encode(['success' => true, 'message' => 'Grupos do mês resetados']);
        exit;
    }
    
    if ($action === 'addPerson') {
        try {
            error_log("Dados recebidos para adição: " . ($rawInput ?? 'undefined'));
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Erro ao decodificar JSON: " . json_last_error_msg());
            }
            
            $name = trim($input['name'] ?? '');
            $addToExistingGroups = $input['addToExistingGroups'] ?? true;
            $selectedDates = $input['selectedDates'] ?? [];
            
            if (empty($name)) {
                throw new Exception("Nome da pessoa é obrigatório");
            }
            
            error_log("Tentando adicionar pessoa: " . $name);
            $db->adicionarPessoa($name);
            
            $pessoas = $db->getPessoas();
            echo json_encode([
                'success' => true,
                'message' => 'Pessoa adicionada com sucesso',
                'people' => $pessoas
            ]);
        } catch (Exception $e) {
            error_log("Erro ao adicionar pessoa: " . $e->getMessage());
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }

    if ($action === 'removePerson') {
        try {
            error_log("Dados recebidos para remoção: " . ($rawInput ?? 'undefined'));
            
            if (empty($rawInput)) {
                throw new Exception("Nenhum dado foi enviado");
            }
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Erro ao decodificar JSON: " . json_last_error_msg());
            }
            
            $name = trim($input['name'] ?? '');
            if (empty($name)) {
                throw new Exception("Nome da pessoa é obrigatório");
            }
            
            error_log("Tentando remover pessoa: " . $name);
            $db->removerPessoa($name);
            
            $pessoas = $db->getPessoas();
            error_log("Lista atualizada: " . json_encode($pessoas));
            
            echo json_encode([
                'success' => true,
                'message' => 'Pessoa removida com sucesso',
                'people' => $pessoas
            ]);
        } catch (Exception $e) {
            error_log("Erro detalhado na remoção: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            
            http_response_code(200); // Manter código 200 para evitar erro no JS
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
        exit;
    }
    
    echo json_encode(['success' => false, 'error' => 'Ação não encontrada']);
    
} catch (Exception $e) {
    error_log("Erro na API: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function getFridays($year, $month) {
    $fridays = [];
    $monthInt = (int)$month;
    
    // Configura timezone para Brasil
    date_default_timezone_set('America/Sao_Paulo');
    
    // Pega o número de dias do mês
    $daysInMonth = date('t', mktime(0, 0, 0, $monthInt, 1, $year));
    
    // Percorre todos os dias do mês
    for ($day = 1; $day <= $daysInMonth; $day++) {
        $date = new DateTime("$year-" . str_pad($monthInt, 2, '0', STR_PAD_LEFT) . "-" . str_pad($day, 2, '0', STR_PAD_LEFT));
        
        // Se é sexta-feira (5), adiciona à lista
        if ($date->format('N') == 5) {
            $fridays[] = $date->format('Y-m-d');
        }
    }
    
    return $fridays;
}

function createSingleGroup($people, $groupSize) {
    if (empty($people)) {
        return [];
    }
    
    shuffle($people);
    $groups = [];
    $totalPeople = count($people);
    
    // Divide as pessoas em grupos do tamanho especificado
    for ($i = 0; $i < $totalPeople; $i += $groupSize) {
        $group = array_slice($people, $i, $groupSize);
        if (!empty($group)) {
            $groups[] = $group;
        }
    }
    
    return $groups;
}

function createOneGroupPerWeek($people, $groupSize) {
    if (empty($people) || $groupSize <= 0) {
        return [];
    }
    
    shuffle($people);
    
    // Retorna apenas um grupo com o tamanho especificado
    $group = array_slice($people, 0, $groupSize);
    
    return [$group]; // Retorna array com um único grupo
}

function createGroupsWithCooldown($people, $groupSize, $weekGroups = [], $currentWeekIndex = 0, $ultimoGrupoMesAnterior = null) {
    if (empty($people) || $groupSize <= 0) {
        return [];
    }
    
    // Lista de pessoas que participaram nas últimas 2 semanas
    $recentParticipants = [];
    
    // Se é a primeira semana do mês e temos o último grupo do mês anterior, adiciona essas pessoas na restrição
    if ($currentWeekIndex === 0 && !empty($ultimoGrupoMesAnterior)) {
        $recentParticipants = array_merge($recentParticipants, $ultimoGrupoMesAnterior);
        error_log("Aplicando restrição do último grupo do mês anterior: " . implode(", ", $ultimoGrupoMesAnterior));
    }
    
    // Verifica as 2 semanas anteriores (se existirem)
    for ($i = max(0, $currentWeekIndex - 2); $i < $currentWeekIndex; $i++) {
        if (isset($weekGroups[$i]) && isset($weekGroups[$i]['groups'])) {
            foreach ($weekGroups[$i]['groups'] as $group) {
                $recentParticipants = array_merge($recentParticipants, $group);
            }
        }
    }
    
    // Remove duplicatas
    $recentParticipants = array_unique($recentParticipants);
    
    // Filtra pessoas que podem participar (não participaram nas últimas 2 semanas)
    $availablePeople = array_diff($people, $recentParticipants);
    
    // Se não há pessoas suficientes disponíveis, relaxa a restrição gradualmente
    if (count($availablePeople) < $groupSize) {
        // Primeiro tenta apenas 1 semana de cooldown
        $recentParticipants = [];
        for ($i = max(0, $currentWeekIndex - 1); $i < $currentWeekIndex; $i++) {
            if (isset($weekGroups[$i]) && isset($weekGroups[$i]['groups'])) {
                foreach ($weekGroups[$i]['groups'] as $group) {
                    $recentParticipants = array_merge($recentParticipants, $group);
                }
            }
        }
        $recentParticipants = array_unique($recentParticipants);
        $availablePeople = array_diff($people, $recentParticipants);
        
        // Se ainda não há pessoas suficientes, permite qualquer pessoa
        if (count($availablePeople) < $groupSize) {
            $availablePeople = $people;
        }
    }
    
    // Embaralha pessoas disponíveis e seleciona o grupo
    $availablePeople = array_values($availablePeople);
    shuffle($availablePeople);
    
    $group = array_slice($availablePeople, 0, $groupSize);
    
    return [$group];
}
?>