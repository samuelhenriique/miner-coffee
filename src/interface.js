import { formatarData, nomeDoMes } from './datas.js';

export function participanteExiste(pessoas, nome) {
    const nomeNormalizado = nome.toLocaleLowerCase('pt-BR');
    return pessoas.some(pessoa => pessoa.toLocaleLowerCase('pt-BR') === nomeNormalizado);
}

export function ordenarParticipantes(pessoas) {
    return [...pessoas].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function mostrarParticipantes(pessoas) {
    porId('people-list').innerHTML = pessoas.map(pessoa => `
        <li class="participant-item">
            <div class="participant-avatar"><i class="fas fa-user"></i></div>
            <div class="participant-info">
                <div class="participant-name">${escaparHtml(pessoa)}</div>
                <div class="participant-status">Ativo</div>
            </div>
            <button class="btn-remove" data-name="${escaparHtml(pessoa)}" title="Remover participante">
                <i class="fas fa-trash-alt"></i>
            </button>
        </li>
    `).join('');
}

export function mostrarGrupos(semanas) {
    if (!Array.isArray(semanas) || semanas.length === 0) {
        limparGrupos();
        return;
    }

    let numeroGrupo = 1;
    porId('groups-display').innerHTML = semanas.map((semana, indiceSemana) => {
        const grupos = semana.groups.map((grupo, indiceGrupo) => `
            <div class="group" data-week="${indiceSemana}" data-group="${indiceGrupo}" data-date="${semana.date}">
                <div class="group-title">Grupo ${numeroGrupo++}</div>
                <ul class="group-members">
                    ${grupo.map(pessoa => `<li>${escaparHtml(pessoa)}</li>`).join('')}
                </ul>
                <div class="group-actions">
                    <button
                        class="edit-group-btn"
                        data-week="${indiceSemana}"
                        data-group="${indiceGrupo}"
                        data-date="${semana.date}"
                        type="button"
                    >
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            </div>
        `).join('');

        const data = formatarData(semana.date, { day: '2-digit', month: 'long', year: 'numeric' });
        return `
            <div class="week-group">
                <div class="week-date">${data}</div>
                <div class="groups-grid">${grupos}</div>
            </div>
        `;
    }).join('');
}

export function abrirEdicaoDoGrupo({ data, membrosAtuais, pessoasDisponiveis, aoSalvar }) {
    document.querySelector('.edit-modal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'edit-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Editar grupo - ${formatarData(data)}</h3>
                <button class="close-modal" data-modal-close type="button">x</button>
            </div>
            <div class="modal-body">
                <p class="edit-help">Remova uma pessoa e adicione outra. Ao salvar, elas trocarao de datas.</p>
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

    const membros = [...membrosAtuais];
    const disponiveis = [...pessoasDisponiveis];

    function atualizarListas() {
        modal.querySelector('#current-members-list').innerHTML = membros
            .map(membro => itemDeEdicao(membro, 'remove'))
            .join('');
        modal.querySelector('#available-members-list').innerHTML = disponiveis
            .map(membro => itemDeEdicao(membro, 'add'))
            .join('');
    }

    modal.addEventListener('click', evento => {
        if (evento.target.closest('[data-modal-close]')) {
            modal.remove();
            return;
        }

        const botaoMembro = evento.target.closest('[data-member-action]');
        if (botaoMembro) {
            moverMembro({
                membro: botaoMembro.dataset.member,
                acao: botaoMembro.dataset.memberAction,
                membros,
                disponiveis
            });
            atualizarListas();
            return;
        }

        if (evento.target.closest('[data-save-group]')) {
            if (membros.length === 0) {
                alert('O grupo precisa ter pelo menos uma pessoa.');
                return;
            }

            if (aoSalvar([...membros]) !== false) modal.remove();
        }
    });

    atualizarListas();
    document.body.appendChild(modal);
}

export function abrirVisualizacaoCompacta({ semanas, mes }) {
    porId('compact-month').textContent = nomeDoMes(mes);
    mostrarGruposCompactos(porId('compact-groups-display'), semanas);
    porId('compact-view-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

export function fecharVisualizacaoCompacta() {
    porId('compact-view-modal').classList.remove('show');
    document.body.style.overflow = 'auto';
}

export function mostrarAvisoDeRevisao(mensagem) {
    porId('groups-display').innerHTML = `
        <div class="empty-state">
            <h3>Grupos precisam ser revisados</h3>
            <p>${escaparHtml(mensagem)}</p>
        </div>
    `;
}

export function limparGrupos() {
    porId('groups-display').innerHTML = `
        <div class="empty-state">
            <h3>Nenhum grupo gerado ainda</h3>
            <p>Clique em "Gerar grupos" para criar os grupos deste mes.</p>
        </div>
    `;
}

export function obterHistoricoAnterior(mesesSalvos, mesDeReferencia) {
    return Object.values(mesesSalvos)
        .filter(dados => (
            dados
            && typeof dados.month === 'string'
            && dados.month < mesDeReferencia
            && Array.isArray(dados.weekGroups)
            && dados.weekGroups.length > 0
        ))
        .sort((a, b) => {
            const diferencaMes = b.month.localeCompare(a.month);
            return diferencaMes || String(b.generatedAt || '').localeCompare(String(a.generatedAt || ''));
        });
}

export function abrirHistorico({ historico, aoVisualizar }) {
    const modal = porId('history-modal');
    const lista = porId('history-list');

    lista.innerHTML = historico.length === 0
        ? `
            <div class="history-empty">
                <h3>Nenhum grupo anterior encontrado</h3>
                <p>Os meses gerados aparecerao aqui automaticamente.</p>
            </div>
        `
        : historico.map((registro, indice) => `
            <article class="history-item">
                <div class="history-item-info">
                    <h3>${escaparHtml(nomeDoMes(registro.month))}</h3>
                    <p>Tamanho base: ${escaparHtml(registro.groupSize || '-')} pessoas</p>
                    <small>${formatarDataDeGeracao(registro.generatedAt)}</small>
                </div>
                <button class="history-view-button" data-history-index="${indice}" type="button">
                    <i class="fas fa-eye"></i> Ver grupos
                </button>
            </article>
        `).join('');

    lista.onclick = evento => {
        const botao = evento.target.closest('[data-history-index]');
        if (!botao) return;

        const registro = historico[Number(botao.dataset.historyIndex)];
        if (registro) aoVisualizar(registro);
    };

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

export function fecharHistorico() {
    porId('history-modal').classList.remove('show');
    document.body.style.overflow = 'auto';
}

function mostrarGruposCompactos(elemento, semanas) {
    let numeroGrupo = 1;
    elemento.innerHTML = semanas.map(semana => `
        <div class="compact-week-group">
            <div class="compact-week-date">
                ${formatarData(semana.date, { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <div class="compact-groups-grid">
                ${semana.groups.map(grupo => `
                    <div class="compact-group">
                        <div class="compact-group-title">Grupo ${numeroGrupo++}</div>
                        <ul class="compact-group-members">
                            ${grupo.map(membro => `<li>${escaparHtml(membro)}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function itemDeEdicao(membro, acao) {
    const adicionar = acao === 'add';
    return `
        <li>
            <span>${escaparHtml(membro)}</span>
            <button
                class="${adicionar ? 'add-btn' : 'remove-btn'}"
                data-member-action="${acao}"
                data-member="${escaparHtml(membro)}"
                type="button"
            >
                ${adicionar ? '+' : 'x'}
            </button>
        </li>
    `;
}

function moverMembro({ membro, acao, membros, disponiveis }) {
    const origem = acao === 'add' ? disponiveis : membros;
    const destino = acao === 'add' ? membros : disponiveis;
    const indice = origem.indexOf(membro);
    if (indice === -1) return;

    origem.splice(indice, 1);
    destino.push(membro);
}

function formatarDataDeGeracao(dataISO) {
    if (!dataISO) return 'Data de geracao nao informada';
    const data = new Date(dataISO);
    return Number.isNaN(data.getTime())
        ? 'Data de geracao nao informada'
        : `Gerado em ${data.toLocaleDateString('pt-BR')}`;
}

function escaparHtml(valor) {
    return String(valor)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function porId(id) {
    return document.getElementById(id);
}
