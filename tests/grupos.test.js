import test from 'node:test';
import assert from 'node:assert/strict';

import { gerarGruposDoMes, trocarIntegrante } from '../src/grupos.js';

function criarSemanas() {
    return [
        { date: '2026-09-04', groups: [['Samuel', 'Ana', 'Bruno']] },
        { date: '2026-09-11', groups: [['Gustavo', 'Carla', 'Diego']] },
        { date: '2026-09-18', groups: [['Eva', 'Fabio', 'Iza']] }
    ];
}

test('inclui 14 pessoas distribuindo as extras nos dois ultimos grupos', () => {
    const pessoas = Array.from({ length: 14 }, (_, indice) => `Pessoa ${indice + 1}`);
    const semanas = gerarGruposDoMes({
        mes: '2026-09',
        pessoas,
        tamanhoGrupo: 3,
        mesesSalvos: {}
    });

    assert.deepEqual(semanas.map(semana => semana.groups[0].length), [3, 3, 4, 4]);
    assert.equal(new Set(semanas.flatMap(semana => semana.groups.flat())).size, 14);
});

test('percorre todos antes de repetir em um mes com cinco sextas-feiras', () => {
    const pessoas = Array.from({ length: 11 }, (_, indice) => `Pessoa ${indice + 1}`);
    const semanas = gerarGruposDoMes({
        mes: '2026-10',
        pessoas,
        tamanhoGrupo: 3,
        mesesSalvos: {}
    });
    const fila = semanas.flatMap(semana => semana.groups.flat());

    assert.equal(fila.length, 15);
    assert.equal(new Set(fila.slice(0, pessoas.length)).size, pessoas.length);
    assert.deepEqual(fila.slice(pessoas.length), fila.slice(0, 4));

    fila.slice(pessoas.length).forEach(pessoa => {
        const participacoes = fila
            .map((integrante, indice) => integrante === pessoa ? indice : -1)
            .filter(indice => indice >= 0);

        assert.equal(participacoes[1] - participacoes[0], pessoas.length);
    });
});

test('troca os integrantes entre duas datas', () => {
    const semanas = trocarIntegrante({
        semanas: criarSemanas(),
        indiceSemana: 0,
        indiceGrupo: 0,
        novosMembros: ['Ana', 'Bruno', 'Gustavo']
    });

    assert.deepEqual(semanas[0].groups[0], ['Ana', 'Bruno', 'Gustavo']);
    assert.deepEqual(semanas[1].groups[0], ['Samuel', 'Carla', 'Diego']);
});

test('nao altera os grupos originais antes da persistencia', () => {
    const semanas = criarSemanas();
    trocarIntegrante({
        semanas,
        indiceSemana: 0,
        indiceGrupo: 0,
        novosMembros: ['Ana', 'Bruno', 'Gustavo']
    });

    assert.deepEqual(semanas, criarSemanas());
});

test('rejeita pessoa sem outra alocacao no mes', () => {
    assert.throws(() => trocarIntegrante({
        semanas: criarSemanas(),
        indiceSemana: 0,
        indiceGrupo: 0,
        novosMembros: ['Ana', 'Bruno', 'Pessoa sem grupo']
    }), /nao possui outra vaga/);
});

test('rejeita mais de uma troca no mesmo salvamento', () => {
    assert.throws(() => trocarIntegrante({
        semanas: criarSemanas(),
        indiceSemana: 0,
        indiceGrupo: 0,
        novosMembros: ['Gustavo', 'Carla', 'Bruno']
    }), /Troque uma pessoa por vez/);
});
