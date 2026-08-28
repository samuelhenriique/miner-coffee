import { escapeHtml } from './html.js';
 // Funções para gerenciar a lista de participantes, incluindo verificação de existência, ordenação e renderização na interface do usuário
export function hasParticipant(people, name) {
    const normalizedName = name.toLocaleLowerCase('pt-BR');
    return people.some(person => person.toLocaleLowerCase('pt-BR') === normalizedName);
}

export function sortParticipants(people) {
    return [...people].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function renderParticipants(people) {
    const container = document.getElementById('people-list');
    container.innerHTML = people.map(person => `
        <li class="participant-item">
            <div class="participant-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="participant-info">
                <div class="participant-name">${escapeHtml(person)}</div>
                <div class="participant-status">Ativo</div>
            </div>
            <button class="btn-remove" data-name="${escapeHtml(person)}" title="Remover participante">
                <i class="fas fa-trash-alt"></i>
            </button>
        </li>
    `).join('');
}
