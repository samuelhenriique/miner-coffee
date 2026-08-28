import { downloadMonthBanner } from './banner.js';
import { downloadBackup, readBackupFile } from './backup.js';
import { getFridaysInMonth, getReadableMonth } from './dates.js';
import { generateMonthGroups, getMonthKey } from './groups.js';
import {
    clearGroupsDisplay,
    closeCompactGroupsView,
    openCompactGroupsView,
    renderGroups,
    showGroupEditModal,
    showRegenerateMessage
} from './groups-view.js';
import { closeHistoryModal, getPreviousGroupHistory, openHistoryModal } from './history.js';
import { hasParticipant, renderParticipants, sortParticipants } from './participants.js';
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
        renderParticipants(this.people);
        this.loadExistingGroups();
    }

    setupEventListeners() {
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (event) => this.selectGroupSize(Number(event.currentTarget.dataset.size)));
        });

        document.getElementById('generate-groups').addEventListener('click', () => this.generateGroups());
        document.getElementById('view-groups').addEventListener('click', () => this.openCompactView());
        document.getElementById('view-history').addEventListener('click', () => this.openGroupHistory());
        document.getElementById('download-banner').addEventListener('click', () => this.downloadBanner());
        document.getElementById('export-data').addEventListener('click', () => this.exportData());
        document.getElementById('import-data').addEventListener('click', () => document.getElementById('import-file').click());
        document.getElementById('import-file').addEventListener('change', (event) => this.importData(event));
        document.getElementById('close-compact-view').addEventListener('click', () => this.closeCompactView());
        document.getElementById('close-history').addEventListener('click', () => closeHistoryModal());

        document.getElementById('compact-view-modal').addEventListener('click', (event) => {
            if (event.target.id === 'compact-view-modal') this.closeCompactView();
        });

        document.getElementById('history-modal').addEventListener('click', (event) => {
            if (event.target.id === 'history-modal') closeHistoryModal();
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeCompactView();
                closeHistoryModal();
            }
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
            renderGroups(this.currentWeekGroups);
            return;
        }

        this.currentWeekGroups = [];
        clearGroupsDisplay();
    }

    getCurrentMonthKey() {
        return getMonthKey(this.currentMonth, this.selectedGroupSize);
    }

    addPerson(name) {
        if (hasParticipant(this.people, name)) {
            alert('Essa pessoa ja esta na lista.');
            return;
        }

        this.people = sortParticipants([...this.people, name]);
        this.persistState();
        renderParticipants(this.people);
        this.updateParticipantsCount();
        showRegenerateMessage('A lista de participantes mudou. Gere novamente os grupos dos meses futuros que ainda nao foram publicados.');
    }

    removePerson(name) {
        const shouldRemove = confirm(`Remover ${name} da lista de participantes ativos? O historico ja salvo sera mantido.`);
        if (!shouldRemove) return;

        this.people = this.people.filter(person => person !== name);
        this.persistState();
        renderParticipants(this.people);
        this.updateParticipantsCount();
        showRegenerateMessage('Participante removido dos proximos sorteios. O historico anterior continua guardado para evitar repeticoes proximas.');
    }

    updateParticipantsCount() {
        document.getElementById('participants-count').textContent = `${this.people.length} ativos`;
        this.checkCanGenerate();
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
        renderGroups(weekGroups);
    }

    editGroup(weekIndex, groupIndex, date) {
        const group = this.currentWeekGroups[weekIndex]?.groups[groupIndex];
        if (!group) return;

        const availablePeople = this.people.filter(person => !group.includes(person));
        showGroupEditModal({
            date,
            currentMembers: group,
            availablePeople,
            onSave: newMembers => this.saveGroupEdit(weekIndex, groupIndex, newMembers)
        });
    }

    saveGroupEdit(weekIndex, groupIndex, newMembers) {
        this.currentWeekGroups[weekIndex].groups[groupIndex] = newMembers;

        const savedMonth = this.state.months[this.getCurrentMonthKey()];
        if (savedMonth) savedMonth.weekGroups = this.currentWeekGroups;

        this.persistState();
        renderGroups(this.currentWeekGroups);
    }

    openCompactView() {
        if (!this.currentWeekGroups.length) {
            alert('Nenhum grupo foi gerado ainda. Gere os grupos primeiro.');
            return;
        }

        openCompactGroupsView({
            weekGroups: this.currentWeekGroups,
            currentMonth: this.currentMonth
        });
    }

    closeCompactView() {
        closeCompactGroupsView();
    }

    openGroupHistory() {
        const now = new Date();
        const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const history = getPreviousGroupHistory(this.state.months, referenceMonth);

        openHistoryModal({
            history,
            onView: entry => {
                closeHistoryModal();
                openCompactGroupsView({
                    weekGroups: entry.weekGroups,
                    currentMonth: entry.month
                });
            }
        });
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
        downloadBackup(this.state);
    }

    async importData(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const imported = await readBackupFile(file);
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
            renderParticipants(this.people);
            this.updateParticipantsCount();
            this.loadExistingGroups();
            alert('Backup importado com sucesso.');
        } catch (error) {
            alert(error.message || 'Nao foi possivel importar o backup.');
        } finally {
            event.target.value = '';
        }
    }

    persistState() {
        this.state = saveAppState({
            ...this.state,
            people: [...this.people]
        });
    }

}

document.addEventListener('DOMContentLoaded', () => {
    window.modernLanchinho = new ModernLanchinhoMiner();
});
