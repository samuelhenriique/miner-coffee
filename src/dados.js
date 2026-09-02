const CHAVE_ARMAZENAMENTO = 'lanchinho-miner-v2';

const PARTICIPANTES_PADRAO = [
    'Samuel',
    'Matheus',
    'Anderson Mazzuchello',
    'Diego',
    'Gustavo Matos',
    'Gustavo Gross',
    'Iza',
    'Julia',
    'Bruno',
    'Alessandro',
    'Luquinha',
    'Greice'
];

export function carregarEstado() {
    const estadoInicial = criarEstadoInicial();

    try {
        const textoSalvo = localStorage.getItem(CHAVE_ARMAZENAMENTO);
        if (!textoSalvo) return estadoInicial;

        const dadosSalvos = JSON.parse(textoSalvo);
        return {
            version: 2,
            people: Array.isArray(dadosSalvos.people) && dadosSalvos.people.length
                ? dadosSalvos.people
                : estadoInicial.people,
            months: dadosSalvos.months && typeof dadosSalvos.months === 'object'
                ? dadosSalvos.months
                : {},
            updatedAt: dadosSalvos.updatedAt || estadoInicial.updatedAt
        };
    } catch {
        return estadoInicial;
    }
}

export function salvarEstado(estado) {
    const estadoAtualizado = {
        ...estado,
        version: 2,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estadoAtualizado));
    return estadoAtualizado;
}

export function baixarBackup(estado) {
    const arquivo = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(arquivo);
    link.download = `backup-lanchinho-miner-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

export function lerBackup(arquivo) {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();

        leitor.onload = () => {
            try {
                const dados = JSON.parse(leitor.result);
                if (!Array.isArray(dados.people) || !dados.months || typeof dados.months !== 'object') {
                    throw new Error('Arquivo de backup invalido.');
                }
                resolve(dados);
            } catch (erro) {
                reject(erro);
            }
        };

        leitor.onerror = () => reject(new Error('Nao foi possivel ler o arquivo de backup.'));
        leitor.readAsText(arquivo);
    });
}

function criarEstadoInicial() {
    return {
        version: 2,
        people: [...PARTICIPANTES_PADRAO],
        months: {},
        updatedAt: new Date().toISOString()
    };
}
