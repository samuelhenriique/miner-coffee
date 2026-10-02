import test from 'node:test';
import assert from 'node:assert/strict';

import { calcularAlturaDoBanner } from '../src/banner.js';

function criarSemanas(quantidade) {
    return Array.from({ length: quantidade }, () => ({
        groups: [['Pessoa 1', 'Pessoa 2', 'Pessoa 3']]
    }));
}

test('mantem o tamanho padrao para ate quatro sextas-feiras', () => {
    assert.equal(calcularAlturaDoBanner(criarSemanas(4)), 1350);
});

test('aumenta o banner quando o mes possui cinco sextas-feiras', () => {
    assert.equal(calcularAlturaDoBanner(criarSemanas(5)), 1555);
});
