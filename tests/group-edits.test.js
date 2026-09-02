import test from 'node:test';
import assert from 'node:assert/strict';

import { swapGroupMember } from '../src/group-edits.js';

function createWeekGroups() {
    return [
        { date: '2026-09-04', groups: [['Samuel', 'Ana', 'Bruno']] },
        { date: '2026-09-11', groups: [['Gustavo', 'Carla', 'Diego']] },
        { date: '2026-09-18', groups: [['Eva', 'Fabio', 'Iza']] }
    ];
}

test('troca os integrantes entre as duas datas', () => {
    const weekGroups = createWeekGroups();
    const updated = swapGroupMember({
        weekGroups,
        weekIndex: 0,
        groupIndex: 0,
        newMembers: ['Ana', 'Bruno', 'Gustavo']
    });

    assert.deepEqual(updated[0].groups[0], ['Ana', 'Bruno', 'Gustavo']);
    assert.deepEqual(updated[1].groups[0], ['Samuel', 'Carla', 'Diego']);
});

test('nao altera os grupos originais antes da persistencia', () => {
    const weekGroups = createWeekGroups();

    swapGroupMember({
        weekGroups,
        weekIndex: 0,
        groupIndex: 0,
        newMembers: ['Ana', 'Bruno', 'Gustavo']
    });

    assert.deepEqual(weekGroups, createWeekGroups());
});

test('rejeita pessoa sem outra alocacao no mes', () => {
    assert.throws(() => swapGroupMember({
        weekGroups: createWeekGroups(),
        weekIndex: 0,
        groupIndex: 0,
        newMembers: ['Ana', 'Bruno', 'Pessoa sem grupo']
    }), /nao possui outra vaga/);
});

test('rejeita mais de uma troca no mesmo salvamento', () => {
    assert.throws(() => swapGroupMember({
        weekGroups: createWeekGroups(),
        weekIndex: 0,
        groupIndex: 0,
        newMembers: ['Gustavo', 'Carla', 'Bruno']
    }), /Troque uma pessoa por vez/);
});
