class ModernLanchinhoMiner {
    constructor() {
        this.selectedGroupSize = 3; // Padrão 3 pessoas
        this.groupFormation = 'multiple'; // sempre múltiplos grupos
        this.currentMonth = null;
        this.people = [];
        this.init();
    }

    async init() {
        await this.loadPeopleFromDB();
        this.setupEventListeners();
        this.setCurrentMonth();
        this.updateParticipantsCount();
        this.initializeGroupFormation();
        this.updateParticipantsDisplay();
        await this.loadExistingGroups(); // Carregar grupos existentes
    }

    async loadPeopleFromDB() {
        try {
            const response = await fetch('api-db.php?action=people');
            const result = await response.json();
            this.people = result.success ? result.data : this.getFallbackPeople();
        } catch {
            console.log('Erro ao carregar pessoas do banco, usando lista fixa');
            this.people = this.getFallbackPeople();
        } finally {
            this.updateParticipantsDisplay();
        }
    }

    getFallbackPeople() {
        return ['Samuel', 'Tavares', 'Anderson Ramos', 'Anderson Mazzuchello',
                'Diego', 'Gustavo', 'Iza', 'Natali', 'Bruno', 'Alessandro', 'Luquinha'];
    }

    async loadExistingGroups() {
        try {
            const response = await fetch(`api-db.php?action=groups&month=${this.currentMonth}&formation=${this.groupFormation}&groupSize=${this.selectedGroupSize}`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.weekGroups.length > 0) {
                this.displayGroups(result.data.weekGroups);
                console.log('Grupos existentes carregados com sucesso');
            }
        } catch (error) {
            console.log('Nenhum grupo existente encontrado ou erro ao carregar:', error);
        }
    }

    setupEventListeners() {
        // Event listeners para seleção de tamanho do grupo
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectGroupSize(+e.target.dataset.size));
        });

        // Event listeners básicos
        document.getElementById('generate-groups').addEventListener('click', () => this.generateGroups());
        document.getElementById('view-groups').addEventListener('click', () => this.openCompactView());
        document.getElementById('close-compact-view').addEventListener('click', () => this.closeCompactView());
        
        // Fechar modal ao clicar fora dele
        document.getElementById('compact-view-modal').addEventListener('click', (e) => {
            if (e.target.id === 'compact-view-modal') {
                this.closeCompactView();
            }
        });

        // Fechar modal com tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const compactModal = document.getElementById('compact-view-modal');
                if (compactModal.classList.contains('show')) {
                    this.closeCompactView();
                }
            }
        });
        document.getElementById('prev-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-month').addEventListener('click', () => this.changeMonth(1));
        document.getElementById('month-year').addEventListener('change', (e) => this.updateMonth(e.target.value));

        // CRUD de pessoas
        document.getElementById('add-person-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('person-name').value.trim();
            if (name) {
                this.addPerson(name);
                document.getElementById('person-name').value = '';
            }
        });

        document.getElementById('people-list').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove')) {
                const name = e.target.dataset.name;
                console.log('Clique no botão de remoção detectado para:', name);
                this.removePerson(name);
            } else if (e.target.closest('.btn-remove')) {
                // Se clicou no ícone dentro do botão
                const button = e.target.closest('.btn-remove');
                const name = button.dataset.name;
                console.log('Clique no ícone de remoção detectado para:', name);
                this.removePerson(name);
            }
        });

        // Event listeners para as opções de data
        document.getElementById('add-to-existing').addEventListener('change', (e) => {
            const dateSelection = document.getElementById('date-selection');
            if (e.target.checked) {
                dateSelection.style.display = 'block';
                this.loadAvailableDates();
            } else {
                dateSelection.style.display = 'none';
            }
        });

        document.getElementById('select-all-dates').addEventListener('change', (e) => {
            const dateCheckboxes = document.querySelectorAll('#available-dates input[type="checkbox"]');
            dateCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
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
    }

    updateMonthDisplay() {
        const [year, monthIndex] = this.currentMonth.split('-').map(Number);
        const monthName = new Date(year, monthIndex - 1).toLocaleDateString('pt-BR', { 
            month: 'long', 
            year: 'numeric' 
        });
        document.getElementById('month-display').textContent = 
            monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }

    calculateFridays() {
        const [year, month] = this.currentMonth.split('-').map(Number);
        const fridays = this.getFridaysInMonth(year, month);
        document.getElementById('sextas-count').textContent = `${fridays.length} sextas-feiras`;
    }

    getFridaysInMonth(year, month) {
        const fridays = [];
        const date = new Date(year, month - 1, 1);
        
        while (date.getMonth() === month - 1) {
            if (date.getDay() === 5) { // 5 = Friday
                fridays.push(new Date(date));
            }
            date.setDate(date.getDate() + 1);
        }
        
        return fridays;
    }



    selectGroupSize(size) {
        // Remove seleção anterior
        document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('selected'));
        
        // Adiciona nova seleção
        document.querySelector(`[data-size="${size}"]`).classList.add('selected');
        
        this.selectedGroupSize = size;
        document.getElementById('group-size-display').textContent = size;
        this.checkCanGenerate();
        
        // Carrega grupos existentes com novo tamanho
        this.loadExistingGroups();
    }

    initializeGroupFormation() {
        // Configuração inicial
        const multipleRadio = document.getElementById('multiple-groups');
        if (multipleRadio) {
            multipleRadio.checked = true;
            this.groupFormation = 'multiple';
        }
        
        // Mostra configuração de tamanho inicialmente
        const groupSizeConfig = document.getElementById('group-size-config');
        if (groupSizeConfig) {
            groupSizeConfig.style.display = 'block';
        }
        
        // Define o botão padrão como ativo (3 pessoas)
        this.selectGroupSize(3);
    }

    checkCanGenerate() {
        const canGenerate = this.currentMonth && this.people.length > 0 && this.selectedGroupSize;
        document.getElementById('generate-groups').disabled = !canGenerate;
    }

    async addPerson(name) {
        try {
            console.log('Tentando adicionar pessoa:', name);
            
            const addToExisting = document.getElementById('add-to-existing').checked;
            let selectedDates = [];
            
            if (addToExisting) {
                const dateCheckboxes = document.querySelectorAll('#available-dates input[type="checkbox"]:checked');
                selectedDates = Array.from(dateCheckboxes).map(cb => cb.value);
            }
            
            const response = await fetch('api-db.php?action=addPerson', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ 
                    name,
                    addToExistingGroups: addToExisting,
                    selectedDates: selectedDates.length > 0 ? selectedDates : []
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Resposta do servidor:', result);
            
            if (result.success) {
                if (Array.isArray(result.people)) {
                    this.people = result.people;
                    this.updateParticipantsDisplay();
                } else {
                    await this.loadPeopleFromDB();
                }
                
                this.updateParticipantsCount();
                
                // Limpar grupos e notificar que devem ser regenerados
                const groupsDisplay = document.getElementById('groups-display');
                groupsDisplay.innerHTML = `
                    <div class="empty-state">
                        <h3>⚠️ Grupos precisam ser regenerados</h3>
                        <p>Como a lista de participantes foi alterada, você precisa gerar os grupos novamente.</p>
                        <p>Clique em "Gerar Grupos" para criar grupos com a nova lógica melhorada!</p>
                    </div>
                `;
                
                await this.loadExistingGroups();
            } else {
                alert(result.error || 'Erro ao adicionar pessoa');
            }
        } catch (error) {
            console.error('Erro detalhado:', error);
            alert(`Erro ao adicionar pessoa: ${error.message}`);
        }
    }

    async removePerson(name) {
        try {
            console.log('Tentando remover pessoa:', name);
            
            const response = await fetch('api-db.php?action=removePerson', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ name })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Resposta do servidor:', result);
            
            if (result.success) {
                if (Array.isArray(result.people)) {
                    this.people = result.people;
                    this.updateParticipantsDisplay();
                } else {
                    await this.loadPeopleFromDB();
                }
                this.updateParticipantsCount();
                
                // Limpar grupos e notificar que devem ser regenerados
                const groupsDisplay = document.getElementById('groups-display');
                groupsDisplay.innerHTML = `
                    <div class="empty-state">
                        <h3>⚠️ Grupos precisam ser regenerados</h3>
                        <p>Como a lista de participantes foi alterada, você precisa gerar os grupos novamente.</p>
                        <p>Clique em "Gerar Grupos" para criar grupos com a nova lógica melhorada!</p>
                    </div>
                `;
                
                await this.loadExistingGroups();
            } else {
                alert(result.error || 'Erro ao remover pessoa');
            }
        } catch (error) {
            console.error('Erro detalhado:', error);
            alert(`Erro ao remover pessoa: ${error.message}`);
        }
    }

    updateParticipantsDisplay() {
        const container = document.getElementById('people-list');
        container.innerHTML = '';
        
        this.people.forEach(person => {
            const item = document.createElement('div');
            item.className = 'participant-item';
            item.innerHTML = `
                <div class="participant-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="participant-info">
                    <div class="participant-name">${person}</div>
                    <div class="participant-status">Ativo</div>
                </div>
                <button class="btn-remove" data-name="${person}" title="Remover participante">
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

    async loadAvailableDates() {
        try {
            const response = await fetch(`api-db.php?action=availableDates&month=${this.currentMonth}`);
            const result = await response.json();
            
            if (result.success && result.data.length > 0) {
                this.displayAvailableDates(result.data);
            } else {
                document.getElementById('available-dates').innerHTML = '<p>Nenhuma data disponível no mês atual</p>';
            }
        } catch (error) {
            console.error('Erro ao carregar datas disponíveis:', error);
        }
    }

    displayAvailableDates(dates) {
        const container = document.getElementById('available-dates');
        container.innerHTML = '';
        
        dates.forEach(date => {
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.innerHTML = `
                <input type="checkbox" value="${date}">
                <span class="checkmark"></span>
                ${this.formatDate(date)}
            `;
            container.appendChild(label);
        });
    }

    formatDate(dateString) {
        // Evita problemas de timezone criando a data localmente
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    changeMonth(direction) {
        const [year, month] = this.currentMonth.split('-').map(Number);
        const date = new Date(year, month - 1 + direction, 1);
        this.updateMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        
        // Carrega grupos existentes para o novo mês
        this.loadExistingGroups();
    }

    async generateGroups() {
        if (!this.currentMonth || (this.groupFormation === 'multiple' && !this.selectedGroupSize)) {
            alert('Configure as opções e selecione o mês');
            return;
        }

        try {
                        
            let url = `api-db.php?action=groups&month=${this.currentMonth}&formation=${this.groupFormation}`;
            if (this.groupFormation === 'multiple') {
                url += `&groupSize=${this.selectedGroupSize}`;
            }
            
            const response = await fetch(url);
                        
            const result = await response.json();
            
            if (result.success) {
                                                this.displayGroups(result.data.weekGroups);
            } else {
                console.error('DEBUG - Erro na API:', result.error);
                alert('Erro ao gerar grupos: ' + result.error);
            }
        } catch (error) {
            console.error('DEBUG - Erro de fetch:', error);
            alert('Erro ao comunicar com o servidor');
        }
    }

    displayGroups(weekGroups) {
        const container = document.getElementById('groups-display');
        
                
        if (!weekGroups || !Array.isArray(weekGroups) || weekGroups.length === 0) {
                        this.clearGroupsDisplay();
            return;
        }
        
        let globalGroupCounter = 1; // Contador global para numerar grupos sequencialmente
        
        const groupsHtml = weekGroups.map((weekData, weekIndex) => {
                        
            if (!weekData || !weekData.date || !Array.isArray(weekData.groups)) {
                                return '<div class="week-group"><p>Dados inválidos para esta semana</p></div>';
            }
            
            // Evita problemas de timezone criando a data localmente
            const [year, month, day] = weekData.date.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const dateFormatted = date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            
                        
            const groupsForWeek = weekData.groups.map((group, index) => {
                if (!Array.isArray(group)) {
                    return '<div class="group"><p>Grupo inválido</p></div>';
                }
                
                const membersHtml = group.map(person => {
                    return `<li>${person}</li>`;
                }).join('');
                
                // Usa o contador global e incrementa para o próximo grupo
                const groupTitle = `Grupo ${globalGroupCounter}`;
                globalGroupCounter++;
                
                return `
                    <div class="group" data-week="${weekIndex}" data-group="${index}" data-date="${weekData.date}">
                        <div class="group-title">${groupTitle}</div>
                        <ul class="group-members">
                            ${membersHtml}
                        </ul>
                        <div class="group-actions">
                            <button class="edit-group-btn" onclick="modernLanchinho.editGroup(${weekIndex}, ${index}, '${weekData.date}')">
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
        
                container.innerHTML = groupsHtml;
    }

    editGroup(weekIndex, groupIndex, date) {
        // Buscar o grupo atual na tela
        const groupElement = document.querySelector(`[data-week="${weekIndex}"][data-group="${groupIndex}"]`);
        if (!groupElement) return;
        
        // Extrair membros atuais do grupo
        const memberElements = groupElement.querySelectorAll('.group-members li');
        const currentMembers = Array.from(memberElements).map(li => li.textContent.trim());
        
        // Criar lista de pessoas disponíveis (todos menos os membros atuais)
        const availablePeople = this.people.filter(person => !currentMembers.includes(person));
        
        this.showEditModal(weekIndex, groupIndex, date, currentMembers, availablePeople);
    }

    showEditModal(weekIndex, groupIndex, date, currentMembers, availablePeople) {
        // Criar modal de edição
        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Editar Grupo - ${new Date(date).toLocaleDateString('pt-BR')}</h3>
                    <button class="close-modal" onclick="this.closest('.edit-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="edit-sections">
                        <div class="current-members">
                            <h4>Membros do Grupo</h4>
                            <ul id="current-members-list">
                                ${currentMembers.map(member => `
                                    <li>
                                        <span>${member}</span>
                                        <button onclick="modernLanchinho.removeMemberFromGroup('${member}')" class="remove-btn">×</button>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="available-members">
                            <h4>Pessoas Disponíveis</h4>
                            <ul id="available-members-list">
                                ${availablePeople.map(person => `
                                    <li>
                                        <span>${person}</span>
                                        <button onclick="modernLanchinho.addMemberToGroup('${person}')" class="add-btn">+</button>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn" onclick="this.closest('.edit-modal').remove()">Cancelar</button>
                    <button class="save-btn" onclick="modernLanchinho.saveGroupEdit(${weekIndex}, ${groupIndex}, '${date}')">Salvar Alterações</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    removeMemberFromGroup(member) {
        const currentList = document.getElementById('current-members-list');
        const availableList = document.getElementById('available-members-list');
        
        // Remove da lista atual
        const memberItem = Array.from(currentList.children).find(li => 
            li.querySelector('span').textContent === member
        );
        if (memberItem) memberItem.remove();
        
        // Adiciona à lista disponível
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${member}</span>
            <button onclick="modernLanchinho.addMemberToGroup('${member}')" class="add-btn">+</button>
        `;
        availableList.appendChild(li);
    }

    addMemberToGroup(member) {
        const currentList = document.getElementById('current-members-list');
        const availableList = document.getElementById('available-members-list');
        
        // Remove da lista disponível
        const memberItem = Array.from(availableList.children).find(li => 
            li.querySelector('span').textContent === member
        );
        if (memberItem) memberItem.remove();
        
        // Adiciona à lista atual
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${member}</span>
            <button onclick="modernLanchinho.removeMemberFromGroup('${member}')" class="remove-btn">×</button>
        `;
        currentList.appendChild(li);
    }

    async saveGroupEdit(weekIndex, groupIndex, date) {
        const currentList = document.getElementById('current-members-list');
        const newMembers = Array.from(currentList.children).map(li => 
            li.querySelector('span').textContent.trim()
        );
        
        try {
            const response = await fetch('api-db.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateGroup',
                    date: date,
                    groupIndex: groupIndex,
                    members: newMembers
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Atualizar a exibição do grupo na tela
                const groupElement = document.querySelector(`[data-week="${weekIndex}"][data-group="${groupIndex}"]`);
                const membersList = groupElement.querySelector('.group-members');
                membersList.innerHTML = newMembers.map(member => `<li>${member}</li>`).join('');
                
                // Fechar modal
                document.querySelector('.edit-modal').remove();
                
                alert('Grupo atualizado com sucesso!');
            } else {
                alert('Erro ao salvar alterações: ' + (result.error || 'Erro desconhecido'));
            }
        } catch (error) {
            alert('Erro ao salvar alterações: ' + error.message);
        }
    }

    // Métodos para visualização compacta
    openCompactView() {
        const groupsDisplay = document.getElementById('groups-display');
        const compactModal = document.getElementById('compact-view-modal');
        const compactMonth = document.getElementById('compact-month');
        const compactGroupsDisplay = document.getElementById('compact-groups-display');

        // Verificar se há grupos para mostrar
        if (groupsDisplay.innerHTML.includes('empty-state')) {
            alert('Nenhum grupo foi gerado ainda. Gere os grupos primeiro!');
            return;
        }

        // Definir o mês no título
        const [year, month] = this.currentMonth.split('-');
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        compactMonth.textContent = `${monthNames[parseInt(month) - 1]} ${year}`;

        // Copiar grupos para o formato compacto
        this.renderCompactGroups(compactGroupsDisplay);

        // Mostrar modal
        compactModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Prevenir scroll da página
    }

    closeCompactView() {
        const compactModal = document.getElementById('compact-view-modal');
        compactModal.classList.remove('show');
        document.body.style.overflow = 'auto'; // Restaurar scroll da página
    }

    renderCompactGroups(container) {
        // Buscar os grupos atuais na tela principal
        const weekGroups = document.querySelectorAll('.week-group');
        
        if (weekGroups.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #6c757d;">
                    <h3>Nenhum grupo encontrado</h3>
                    <p>Gere os grupos primeiro para visualizá-los aqui.</p>
                </div>
            `;
            return;
        }

        let compactHTML = '';
        let globalGroupCounter = 1;

        weekGroups.forEach(weekGroup => {
            const weekDate = weekGroup.querySelector('.week-date').textContent;
            const groups = weekGroup.querySelectorAll('.group');
            
            if (groups.length === 0) return;

            let groupsHTML = '';
            groups.forEach(group => {
                const members = Array.from(group.querySelectorAll('.group-members li'))
                    .map(li => li.textContent.trim());
                
                const membersHTML = members.map(member => `<li>${member}</li>`).join('');
                
                groupsHTML += `
                    <div class="compact-group">
                        <div class="compact-group-title">Grupo ${globalGroupCounter}</div>
                        <ul class="compact-group-members">
                            ${membersHTML}
                        </ul>
                    </div>
                `;
                globalGroupCounter++;
            });

            compactHTML += `
                <div class="compact-week-group">
                    <div class="compact-week-date">${weekDate}</div>
                    <div class="compact-groups-grid">
                        ${groupsHTML}
                    </div>
                </div>
            `;
        });

        container.innerHTML = compactHTML;
    }

    clearGroupsDisplay() {
        const container = document.getElementById('groups-display');
        container.innerHTML = `
            <div class="empty-state">
                <h3>Nenhum grupo gerado ainda</h3>
                <p>Clique em "Gerar Grupos" para criar os grupos deste mês</p>
            </div>
        `;
    }
}

// Inicializar o sistema quando a página carregar
let modernLanchinho;
document.addEventListener('DOMContentLoaded', () => {
    modernLanchinho = new ModernLanchinhoMiner();
});

