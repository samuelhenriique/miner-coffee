import { formatDate, getReadableMonth } from './dates.js'; // codigo para formatar datas e obter o nome do mês de forma legível
import { escapeHtml } from './html.js';

export function renderGroups(weekGroups) {
    const container = document.getElementById('groups-display');

    if (!Array.isArray(weekGroups) || weekGroups.length === 0) {
        clearGroupsDisplay();
        return;
    }

    let globalGroupCounter = 1;

    container.innerHTML = weekGroups.map((weekData, weekIndex) => {
        const dateFormatted = formatDate(weekData.date, {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        const groupsForWeek = weekData.groups.map((group, groupIndex) => {
            const membersHtml = group.map(person => `<li>${escapeHtml(person)}</li>`).join('');
            const groupTitle = `Grupo ${globalGroupCounter++}`;

            return `
                <div class="group" data-week="${weekIndex}" data-group="${groupIndex}" data-date="${weekData.date}">
                    <div class="group-title">${groupTitle}</div>
                    <ul class="group-members">${membersHtml}</ul>
                    <div class="group-actions">
                        <button
                            class="edit-group-btn"
                            data-week="${weekIndex}"
                            data-group="${groupIndex}"
                            data-date="${weekData.date}"
                            type="button"
                        >
                            <i class="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="week-group">
                <div class="week-date">${dateFormatted}</div>
                <div class="groups-grid">${groupsForWeek}</div>
            </div>
        `;
    }).join('');
}

export function showGroupEditModal({ date, currentMembers, availablePeople, onSave }) {
    document.querySelector('.edit-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Editar grupo - ${formatDate(date)}</h3>
                <button class="close-modal" data-modal-close type="button">x</button>
            </div>
            <div class="modal-body">
                <div class="edit-sections">
                    <div class="current-members">
                        <h4>Membros do grupo</h4>
                        <ul id="current-members-list"></ul>
                    </div>
                    <div class="available-members">
                        <h4>Pessoas disponiveis</h4>
                        <ul id="available-members-list"></ul>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-btn" data-modal-close type="button">Cancelar</button>
                <button class="save-btn" data-save-group type="button">Salvar alteracoes</button>
            </div>
        </div>
    `;

    const members = [...currentMembers];
    const available = [...availablePeople];

    function renderLists() {
        modal.querySelector('#current-members-list').innerHTML = members
            .map(member => renderMemberEditorItem(member, 'remove'))
            .join('');
        modal.querySelector('#available-members-list').innerHTML = available
            .map(member => renderMemberEditorItem(member, 'add'))
            .join('');
    }

    modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-modal-close]')) {
            modal.remove();
            return;
        }

        const memberButton = event.target.closest('[data-member-action]');
        if (memberButton) {
            moveMember({
                member: memberButton.dataset.member,
                action: memberButton.dataset.memberAction,
                members,
                available
            });
            renderLists();
            return;
        }

        if (event.target.closest('[data-save-group]')) {
            if (members.length === 0) {
                alert('O grupo precisa ter pelo menos uma pessoa.');
                return;
            }

            onSave([...members]);
            modal.remove();
        }
    });

    renderLists();
    document.body.appendChild(modal);
}

export function openCompactGroupsView({ weekGroups, currentMonth }) {
    document.getElementById('compact-month').textContent = getReadableMonth(currentMonth);
    renderCompactGroups(document.getElementById('compact-groups-display'), weekGroups);
    document.getElementById('compact-view-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

export function closeCompactGroupsView() {
    document.getElementById('compact-view-modal').classList.remove('show');
    document.body.style.overflow = 'auto';
}

export function showRegenerateMessage(message) {
    document.getElementById('groups-display').innerHTML = `
        <div class="empty-state">
            <h3>Grupos precisam ser revisados</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

export function clearGroupsDisplay() {
    document.getElementById('groups-display').innerHTML = `
        <div class="empty-state">
            <h3>Nenhum grupo gerado ainda</h3>
            <p>Clique em "Gerar grupos" para criar os grupos deste mes.</p>
        </div>
    `;
}

function renderMemberEditorItem(member, action) {
    const buttonClass = action === 'add' ? 'add-btn' : 'remove-btn';
    const buttonLabel = action === 'add' ? '+' : 'x';

    return `
        <li>
            <span>${escapeHtml(member)}</span>
            <button
                class="${buttonClass}"
                data-member-action="${action}"
                data-member="${escapeHtml(member)}"
                type="button"
            >
                ${buttonLabel}
            </button>
        </li>
    `;
}

function moveMember({ member, action, members, available }) {
    const source = action === 'add' ? available : members;
    const target = action === 'add' ? members : available;
    const sourceIndex = source.indexOf(member);

    if (sourceIndex === -1) return;

    source.splice(sourceIndex, 1);
    target.push(member);
}

function renderCompactGroups(container, weekGroups) {
    let globalGroupCounter = 1;

    container.innerHTML = weekGroups.map(week => {
        const groupsHTML = week.groups.map(group => {
            const membersHTML = group.map(member => `<li>${escapeHtml(member)}</li>`).join('');

            return `
                <div class="compact-group">
                    <div class="compact-group-title">Grupo ${globalGroupCounter++}</div>
                    <ul class="compact-group-members">${membersHTML}</ul>
                </div>
            `;
        }).join('');

        return `
            <div class="compact-week-group">
                <div class="compact-week-date">${formatDate(week.date, { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                <div class="compact-groups-grid">${groupsHTML}</div>
            </div>
        `;
    }).join('');
}
