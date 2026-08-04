import { downloadMonthBanner } from './banner.js';
import { formatDate, getFridaysInMonth, getReadableMonth } from './dates.js';
import { generateMonthGroups, getMonthKey } from './groups.js';
import { loadAppState, saveAppState } from './storage.js';

class ModernLanchinhoMiner {
    constructor() {
        this.selectedGroupSize = 3;
        this.groupFormation = 'multiple';
        this.currentMonth = null;
        this.people = [];
        this.currentWeekGroups = [];
        this.state = loadAppState();
        this.init();
    }

    init() {
        this.people = [...this.state.people];
        this.setupEventListeners();
        this.setCurrentMonth();
        this.updateParticipantsCount();
        this.initializeGroupFormation();
        this.updateParticipantsDisplay();
        this.loadExistingGroups();
    }

    setupEventListeners() {
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (event) => this.selectGroupSize(Number(event.currentTarget.dataset.size)));
        });

        document.getElementById('generate-groups').addEventListener('click', () => this.generateGroups());
        document.getElementById('view-groups').addEventListener('click', () => this.openCompactView());
        document.getElementById('download-banner').addEventListener('click', () => this.downloadBanner());
        document.getElementById('export-data').addEventListener('click', () => this.exportData());
        document.getElementById('import-data').addEventListener('click', () => document.getElementById('import-file').click());
        document.getElementById('import-file').addEventListener('change', (event) => this.importData(event));
        document.getElementById('close-compact-view').addEventListener('click', () => this.closeCompactView());

        document.getElementById('compact-view-modal').addEventListener('click', (event) => {
            if (event.target.id === 'compact-view-modal') this.closeCompactView();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') this.closeCompactView();
        });

        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('month-year').addEventListener('change', (event) => this.updateMonth(event.target.value));

        document.getElementById('month-display').addEventListener('click', () => {
            document.getElementById('month-year').showPicker?.();
        });

        document.getElementById('add-person-form').addEventListener('submit', (event) => {
            event.preventDefault();
            const input = document.getElementById('person-name');
            const name = input.value.trim();

            if (name) {
                this.addPerson(name);
                input.value = '';
            }
        });

        document.getElementById('people-list').addEventListener('click', (event) => {
            const button = event.target.closest('.btn-remove');
            if (button) this.removePerson(button.dataset.name);
        });

        document.getElementById('groups-display').addEventListener('click', (event) => {
            const button = event.target.closest('.edit-group-btn');
            if (!button) return;

            this.editGroup(
                Number(button.dataset.week),
                Number(button.dataset.group),
                button.dataset.date
            );
        });
    }

    setCurrentMonth() {
        const now = new Date();
        this.updateMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }

    updateMonth(newMonth) {
        this.currentMonth = newMonth;
        document.getElementById('month-year').value = newMonth;
        this.updateMonthDisplay();
        this.calculateFridays();
        this.checkCanGenerate();
        this.loadExistingGroups();
    }

    updateMonthDisplay() {
        document.getElementById('month-display').textContent = getReadableMonth(this.currentMonth);
    }

    calculateFridays() {
        const [year, month] = this.currentMonth.split('-').map(Number);
        const fridays = getFridaysInMonth(year, month);
        document.getElementById('sextas-count').textContent = `${fridays.length} sextas-feiras`;
    }

    selectGroupSize(size) {
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelector(`[data-size="${size}"]`).classList.add('selected');

        this.selectedGroupSize = size;
        document.getElementById('group-size-display').textContent = size;
        this.checkCanGenerate();
        this.loadExistingGroups();
    }

    initializeGroupFormation() {
        const multipleRadio = document.getElementById('multiple-groups');
        if (multipleRadio) multipleRadio.checked = true;

        const groupSizeConfig = document.getElementById('group-size-config');
        if (groupSizeConfig) groupSizeConfig.style.display = 'block';

        this.selectGroupSize(this.selectedGroupSize);
    }

    checkCanGenerate() {
        const canGenerate = this.currentMonth && this.people.length >= this.selectedGroupSize;
        document.getElementById('generate-groups').disabled = !canGenerate;
    }

    loadExistingGroups() {
        if (!this.currentMonth) return;

        const savedMonth = this.state.months[this.getCurrentMonthKey()];
        if (savedMonth?.weekGroups?.length) {
            this.currentWeekGroups = savedMonth.weekGroups;
            this.displayGroups(this.currentWeekGroups);
            return;
        }

        this.currentWeekGroups = [];
        this.clearGroupsDisplay();
    }

    getCurrentMonthKey() {
        return getMonthKey(this.currentMonth, this.selectedGroupSize);
    }

    addPerson(name) {
        const normalized = name.toLocaleLowerCase('pt-BR');
        const alreadyExists = this.people.some(person => person.toLocaleLowerCase('pt-BR') === normalized);

        if (alreadyExists) {
            alert('Essa pessoa ja esta na lista.');
            return;
        }

        this.people.push(name);
        this.people.sort((a, b) => a.localeCompare(b, 'pt-BR'));
        this.persistState();
        this.updateParticipantsDisplay();
        this.updateParticipantsCount();
        this.showRegenerateMessage('A lista de participantes mudou. Gere novamente os grupos dos meses futuros que ainda nao foram publicados.');
    }

    removePerson(name) {
        const shouldRemove = confirm(`Remover ${name} da lista de participantes ativos? O historico ja salvo sera mantido.`);
        if (!shouldRemove) return;

        this.people = this.people.filter(person => person !== name);
        this.persistState();
        this.updateParticipantsDisplay();
        this.updateParticipantsCount();
        this.showRegenerateMessage('Participante removido dos proximos sorteios. O historico anterior continua guardado para evitar repeticoes proximas.');
    }

    updateParticipantsDisplay() {
        const container = document.getElementById('people-list');
        container.innerHTML = '';

        this.people.forEach(person => {
            const item = document.createElement('li');
            item.className = 'participant-item';
            item.innerHTML = `
                <div class="participant-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="participant-info">
                    <div class="participant-name">${this.escapeHtml(person)}</div>
                    <div class="participant-status">Ativo</div>
                </div>
                <button class="btn-remove" data-name="${this.escapeHtml(person)}" title="Remover participante">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;
            container.appendChild(item);
        });
    }

    updateParticipantsCount() {
        document.getElementById('participants-count').textContent = `${this.people.length} ativos`;
        this.checkCanGenerate();
    }

    showRegenerateMessage(message) {
        document.getElementById('groups-display').innerHTML = `
            <div class="empty-state">
                <h3>Grupos precisam ser revisados</h3>
                <p>${message}</p>
            </div>
        `;
    }

    changeMonth(direction) {
        const [year, month] = this.currentMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + direction, 1);
        this.updateMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    generateGroups() {
        if (!this.currentMonth || this.people.length < this.selectedGroupSize) {
            alert('Adicione participantes suficientes e selecione o mes.');
            return;
        }

        const weekGroups = generateMonthGroups({
            month: this.currentMonth,
            people: this.people,
            groupSize: this.selectedGroupSize,
            savedMonths: this.state.months
        });

        this.state.months[this.getCurrentMonthKey()] = {
            month: this.currentMonth,
            groupSize: this.selectedGroupSize,
            formation: this.groupFormation,
            generatedAt: new Date().toISOString(),
            weekGroups
        };

        this.currentWeekGroups = weekGroups;
        this.persistState();
        this.displayGroups(weekGroups);
    }

    displayGroups(weekGroups) {
        const container = document.getElementById('groups-display');

        if (!Array.isArray(weekGroups) || weekGroups.length === 0) {
            this.clearGroupsDisplay();
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
                const membersHtml = group.map(person => `<li>${this.escapeHtml(person)}</li>`).join('');
                const groupTitle = `Grupo ${globalGroupCounter++}`;

                return `
                    <div class="group" data-week="${weekIndex}" data-group="${groupIndex}" data-date="${weekData.date}">
                        <div class="group-title">${groupTitle}</div>
                        <ul class="group-members">
                            ${membersHtml}
                        </ul>
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
                    <div class="groups-grid">
                        ${groupsForWeek}
                    </div>
                </div>
            `;
        }).join('');
    }

    editGroup(weekIndex, groupIndex, date) {
        const group = this.currentWeekGroups[weekIndex]?.groups[groupIndex];
        if (!group) return;

        const availablePeople = this.people.filter(person => !group.includes(person));
        this.showEditModal(weekIndex, groupIndex, date, group, availablePeople);
    }

    showEditModal(weekIndex, groupIndex, date, currentMembers, availablePeople) {
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
                            <ul id="current-members-list">
                                ${currentMembers.map(member => this.renderMemberEditorItem(member, 'remove')).join('')}
                            </ul>
                        </div>
                        <div class="available-members">
                            <h4>Pessoas disponiveis</h4>
                            <ul id="available-members-list">
                                ${availablePeople.map(person => this.renderMemberEditorItem(person, 'add')).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn" data-modal-close type="button">Cancelar</button>
                    <button class="save-btn" data-save-group type="button">Salvar alteracoes</button>
                </div>
            </div>
        `;

        modal.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-modal-close]');
            if (closeButton) {
                modal.remove();
                return;
            }

            const memberButton = event.target.closest('[data-member-action]');
            if (memberButton) {
                this.moveMember(memberButton.dataset.member, memberButton.dataset.memberAction);
                return;
            }

            const saveButton = event.target.closest('[data-save-group]');
            if (saveButton) this.saveGroupEdit(weekIndex, groupIndex);
        });

        document.body.appendChild(modal);
    }

    renderMemberEditorItem(member, action) {
        const buttonClass = action === 'add' ? 'add-btn' : 'remove-btn';
        const buttonLabel = action === 'add' ? '+' : 'x';

        return `
            <li>
                <span>${this.escapeHtml(member)}</span>
                <button
                    class="${buttonClass}"
                    data-member-action="${action}"
                    data-member="${this.escapeHtml(member)}"
                    type="button"
                >
                    ${buttonLabel}
                </button>
            </li>
        `;
    }

    moveMember(member, action) {
        const sourceId = action === 'add' ? 'available-members-list' : 'current-members-list';
        const targetId = action === 'add' ? 'current-members-list' : 'available-members-list';
        const nextAction = action === 'add' ? 'remove' : 'add';
        const source = document.getElementById(sourceId);
        const target = document.getElementById(targetId);
        const item = Array.from(source.children).find(li => li.querySelector('span').textContent === member);

        if (item) item.remove();
        target.insertAdjacentHTML('beforeend', this.renderMemberEditorItem(member, nextAction));
    }

    saveGroupEdit(weekIndex, groupIndex) {
        const currentList = document.getElementById('current-members-list');
        const newMembers = Array.from(currentList.children).map(li => li.querySelector('span').textContent.trim());

        if (newMembers.length === 0) {
            alert('O grupo precisa ter pelo menos uma pessoa.');
            return;
        }

        this.currentWeekGroups[weekIndex].groups[groupIndex] = newMembers;

        const savedMonth = this.state.months[this.getCurrentMonthKey()];
        if (savedMonth) savedMonth.weekGroups = this.currentWeekGroups;

        this.persistState();
        this.displayGroups(this.currentWeekGroups);
        document.querySelector('.edit-modal')?.remove();
    }

    openCompactView() {
        if (!this.currentWeekGroups.length) {
            alert('Nenhum grupo foi gerado ainda. Gere os grupos primeiro.');
            return;
        }

        document.getElementById('compact-month').textContent = getReadableMonth(this.currentMonth);
        this.renderCompactGroups(document.getElementById('compact-groups-display'));

        document.getElementById('compact-view-modal').classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeCompactView() {
        document.getElementById('compact-view-modal').classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    renderCompactGroups(container) {
        let globalGroupCounter = 1;

        container.innerHTML = this.currentWeekGroups.map(week => {
            const groupsHTML = week.groups.map(group => {
                const membersHTML = group.map(member => `<li>${this.escapeHtml(member)}</li>`).join('');

                return `
                    <div class="compact-group">
                        <div class="compact-group-title">Grupo ${globalGroupCounter++}</div>
                        <ul class="compact-group-members">
                            ${membersHTML}
                        </ul>
                    </div>
                `;
            }).join('');

            return `
                <div class="compact-week-group">
                    <div class="compact-week-date">${formatDate(week.date, { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                    <div class="compact-groups-grid">
                        ${groupsHTML}
                    </div>
                </div>
            `;
        }).join('');
    }

    downloadBanner() {
        if (!this.currentWeekGroups.length) {
            alert('Gere os grupos antes de baixar o banner.');
            return;
        }

        downloadMonthBanner({
            weekGroups: this.currentWeekGroups,
            currentMonth: this.currentMonth
        });
    }

    exportData() {
        this.persistState();

        const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');

        link.href = URL.createObjectURL(blob);
        link.download = `backup-lanchinho-miner-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    importData(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const imported = JSON.parse(reader.result);

                if (!Array.isArray(imported.people) || !imported.months || typeof imported.months !== 'object') {
                    throw new Error('Arquivo de backup invalido.');
                }

                const shouldImport = confirm('Importar este backup? Ele vai substituir os dados deste navegador.');
                if (!shouldImport) return;

                this.state = {
                    version: 2,
                    people: imported.people,
                    months: imported.months,
                    updatedAt: new Date().toISOString()
                };
                this.people = [...this.state.people];
                this.persistState();
                this.updateParticipantsDisplay();
                this.updateParticipantsCount();
                this.loadExistingGroups();
                alert('Backup importado com sucesso.');
            } catch (error) {
                alert(error.message || 'Nao foi possivel importar o backup.');
            } finally {
                event.target.value = '';
            }
        };

        reader.readAsText(file);
    }

    clearGroupsDisplay() {
        document.getElementById('groups-display').innerHTML = `
            <div class="empty-state">
                <h3>Nenhum grupo gerado ainda</h3>
                <p>Clique em "Gerar grupos" para criar os grupos deste mes.</p>
            </div>
        `;
    }

    persistState() {
        this.state = saveAppState({
            ...this.state,
            people: [...this.people]
        });
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.modernLanchinho = new ModernLanchinhoMiner();
});
