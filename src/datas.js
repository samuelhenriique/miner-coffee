export function obterSextasDoMes(ano, mes) {
    const sextas = [];
    const data = new Date(ano, mes - 1, 1);

    while (data.getMonth() === mes - 1) {
        if (data.getDay() === 5) sextas.push(new Date(data));
        data.setDate(data.getDate() + 1);
    }

    return sextas;
}

export function dataParaISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

export function formatarData(dataISO, opcoes = {}) {
    const [ano, mes, dia] = dataISO.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);

    return data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...opcoes
    });
}

export function nomeDoMes(mesISO) {
    const [ano, mes] = mesISO.split('-').map(Number);
    const nome = new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    });

    return nome.charAt(0).toUpperCase() + nome.slice(1);
}
