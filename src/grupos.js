import { dataParaISO, obterSextasDoMes } from './datas.js';

export function criarChaveDoMes(mes, tamanhoGrupo) {
    return `${mes}|${tamanhoGrupo}`;
}

export function gerarGruposDoMes({ mes, pessoas, tamanhoGrupo, mesesSalvos }) {
    const [ano, numeroMes] = mes.split('-').map(Number);
    const sextas = obterSextasDoMes(ano, numeroMes);
    const tamanhos = distribuirPessoasExtras(pessoas.length, sextas.length, tamanhoGrupo);
    const historico = { ...mesesSalvos };

    delete historico[criarChaveDoMes(mes, tamanhoGrupo)];

    const totalDeVagas = tamanhos.reduce((total, tamanho) => total + tamanho, 0);
    const fila = criarFilaDeParticipacao({
        mes,
        pessoas,
        totalDeVagas,
        mesesSalvos: historico
    });
    let inicioDoGrupo = 0;

    return sextas.map((sexta, indice) => {
        const fimDoGrupo = inicioDoGrupo + tamanhos[indice];
        const grupo = fila.slice(inicioDoGrupo, fimDoGrupo);
        inicioDoGrupo = fimDoGrupo;

        return {
            date: dataParaISO(sexta),
            weekNumber: indice + 1,
            groups: [grupo]
        };
    });
}

export function trocarIntegrante({ semanas, indiceSemana, indiceGrupo, novosMembros }) {
    const grupoOriginal = semanas[indiceSemana]?.groups?.[indiceGrupo];
    if (!grupoOriginal) throw new Error('O grupo que voce tentou editar nao foi encontrado.');

    if (new Set(novosMembros).size !== novosMembros.length) {
        throw new Error('Uma pessoa nao pode aparecer duas vezes no mesmo grupo.');
    }

    const removidos = grupoOriginal.filter(pessoa => !novosMembros.includes(pessoa));
    const adicionados = novosMembros.filter(pessoa => !grupoOriginal.includes(pessoa));

    if (removidos.length === 0 && adicionados.length === 0) return copiarSemanas(semanas);

    if (novosMembros.length !== grupoOriginal.length || removidos.length !== 1 || adicionados.length !== 1) {
        throw new Error('Troque uma pessoa por vez: remova um integrante e adicione outro.');
    }

    const [pessoaRemovida] = removidos;
    const [pessoaAdicionada] = adicionados;
    const semanasAtualizadas = copiarSemanas(semanas);
    const outraVaga = encontrarOutraVaga({
        semanas: semanasAtualizadas,
        pessoa: pessoaAdicionada,
        substituta: pessoaRemovida,
        indiceSemanaEditada: indiceSemana,
        indiceGrupoEditado: indiceGrupo
    });

    if (!outraVaga) {
        throw new Error(`${pessoaAdicionada} nao possui outra vaga disponivel neste mes para trocar com ${pessoaRemovida}.`);
    }

    semanasAtualizadas[outraVaga.indiceSemana].groups[outraVaga.indiceGrupo][outraVaga.indiceMembro] = pessoaRemovida;
    semanasAtualizadas[indiceSemana].groups[indiceGrupo] = [...novosMembros];
    return semanasAtualizadas;
}

function criarFilaDeParticipacao({ mes, pessoas, totalDeVagas, mesesSalvos }) {
    const participacoes = obterHistorico(`${mes}-01`, pessoas, [], mesesSalvos);
    const ordem = embaralhar(pessoas)
        .sort((a, b) => {
            const diferencaTotal = participacoes.quantidades[a] - participacoes.quantidades[b];
            if (diferencaTotal !== 0) return diferencaTotal;

            return participacoes.ultimasDatas[a].localeCompare(participacoes.ultimasDatas[b]);
        });

    return Array.from(
        { length: totalDeVagas },
        (_, indice) => ordem[indice % ordem.length]
    );
}

function distribuirPessoasExtras(totalPessoas, totalSemanas, tamanhoBase) {
    const tamanhos = Array(totalSemanas).fill(tamanhoBase);
    let extras = Math.max(0, totalPessoas - totalSemanas * tamanhoBase);
    const semanasFinais = Math.min(2, totalSemanas);

    for (let indice = 0; extras > 0; indice += 1) {
        tamanhos[totalSemanas - 1 - (indice % semanasFinais)] += 1;
        extras -= 1;
    }

    return tamanhos;
}

function obterHistorico(data, pessoas, semanasEmCriacao, mesesSalvos) {
    const quantidades = Object.fromEntries(pessoas.map(pessoa => [pessoa, 0]));
    const ultimasDatas = Object.fromEntries(pessoas.map(pessoa => [pessoa, '']));

    juntarSemanas(semanasEmCriacao, mesesSalvos)
        .filter(semana => semana.date < data)
        .forEach(semana => {
            semana.groups.flat().forEach(pessoa => {
                quantidades[pessoa] = (quantidades[pessoa] || 0) + 1;
                if (!ultimasDatas[pessoa] || semana.date > ultimasDatas[pessoa]) {
                    ultimasDatas[pessoa] = semana.date;
                }
            });
        });

    return { quantidades, ultimasDatas };
}

function juntarSemanas(semanasEmCriacao, mesesSalvos) {
    const semanasSalvas = Object.values(mesesSalvos).flatMap(dadosDoMes => (
        Array.isArray(dadosDoMes.weekGroups)
            ? dadosDoMes.weekGroups.filter(semana => semana?.date && Array.isArray(semana.groups))
            : []
    ));

    return [...semanasSalvas, ...semanasEmCriacao];
}

function encontrarOutraVaga({ semanas, pessoa, substituta, indiceSemanaEditada, indiceGrupoEditado }) {
    const vagas = [];

    semanas.forEach((semana, indiceSemana) => {
        semana.groups.forEach((grupo, indiceGrupo) => {
            const grupoEditado = indiceSemana === indiceSemanaEditada && indiceGrupo === indiceGrupoEditado;
            if (grupoEditado || grupo.includes(substituta)) return;

            grupo.forEach((membro, indiceMembro) => {
                if (membro === pessoa) vagas.push({ indiceSemana, indiceGrupo, indiceMembro });
            });
        });
    });

    vagas.sort((a, b) => (
        Math.abs(a.indiceSemana - indiceSemanaEditada) - Math.abs(b.indiceSemana - indiceSemanaEditada)
    ));
    return vagas[0];
}

function copiarSemanas(semanas) {
    return semanas.map(semana => ({
        ...semana,
        groups: semana.groups.map(grupo => [...grupo])
    }));
}

function embaralhar(itens) {
    const copia = [...itens];
    for (let indice = copia.length - 1; indice > 0; indice -= 1) {
        const sorteado = Math.floor(Math.random() * (indice + 1));
        [copia[indice], copia[sorteado]] = [copia[sorteado], copia[indice]];
    }
    return copia;
}
