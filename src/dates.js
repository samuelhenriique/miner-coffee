export function getFridaysInMonth(year, month) { // regra para pegar todas as sextas-feiras de um determinado mês e ano
    const fridays = [];
    const date = new Date(year, month - 1, 1);

    while (date.getMonth() === month - 1) {
        if (date.getDay() === 5) fridays.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }

    return fridays;
}

export function dateToISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDate(dateString, options = {}) {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options
    });
}

export function getReadableMonth(monthValue) {
    const [year, month] = monthValue.split('-').map(Number);
    const label = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    });

    return label.charAt(0).toUpperCase() + label.slice(1);
}
