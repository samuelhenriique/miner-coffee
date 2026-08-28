import { getReadableMonth } from './dates.js';
import { escapeHtml } from './html.js';

export function getPreviousGroupHistory(savedMonths, referenceMonth) {
    return Object.entries(savedMonths)
        .filter(([, monthData]) => (
            monthData
            && typeof monthData.month === 'string'
            && monthData.month < referenceMonth
            && Array.isArray(monthData.weekGroups)
            && monthData.weekGroups.length > 0
        ))
        .map(([key, monthData]) => ({
            key,
            month: monthData.month,
            groupSize: monthData.groupSize,
            generatedAt: monthData.generatedAt,
            weekGroups: monthData.weekGroups
        }))
        .sort((a, b) => {
            const monthComparison = b.month.localeCompare(a.month);
            if (monthComparison !== 0) return monthComparison;

            return String(b.generatedAt || '').localeCompare(String(a.generatedAt || ''));
        });
}

export function openHistoryModal({ history, onView }) {
    const modal = document.getElementById('history-modal');
    const container = document.getElementById('history-list');

    if (history.length === 0) {
        container.innerHTML = `
            <div class="history-empty">
                <h3>Nenhum grupo anterior encontrado</h3>
                <p>Os meses gerados aparecerao aqui automaticamente.</p>
            </div>
        `;
    } else {
        container.innerHTML = history.map((entry, index) => `
            <article class="history-item">
                <div class="history-item-info">
                    <h3>${escapeHtml(getReadableMonth(entry.month))}</h3>
                    <p>Tamanho base: ${escapeHtml(entry.groupSize || '-')} pessoas</p>
                    <small>${formatGeneratedAt(entry.generatedAt)}</small>
                </div>
                <button class="history-view-button" data-history-index="${index}" type="button">
                    <i class="fas fa-eye"></i>
                    Ver grupos
                </button>
            </article>
        `).join('');
    }

    container.onclick = event => {
        const button = event.target.closest('[data-history-index]');
        if (!button) return;

        const entry = history[Number(button.dataset.historyIndex)];
        if (entry) onView(entry);
    };

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

export function closeHistoryModal() {
    document.getElementById('history-modal').classList.remove('show');
    document.body.style.overflow = 'auto';
}

function formatGeneratedAt(generatedAt) {
    if (!generatedAt) return 'Data de geracao nao informada';

    const date = new Date(generatedAt);
    if (Number.isNaN(date.getTime())) return 'Data de geracao nao informada';

    return `Gerado em ${date.toLocaleDateString('pt-BR')}`;
}
