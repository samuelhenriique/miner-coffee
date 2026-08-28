import { DEFAULT_PEOPLE, STORAGE_KEY } from './defaults.js';
// Funções para carregar e salvar o estado do aplicativo no localStorage do navegador, incluindo fallback para valores padrão
export function loadAppState() {
    const fallback = createFallbackState();

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return fallback;

        const parsed = JSON.parse(raw);

        return {
            version: 2,
            people: Array.isArray(parsed.people) && parsed.people.length ? parsed.people : fallback.people,
            months: parsed.months && typeof parsed.months === 'object' ? parsed.months : {},
            updatedAt: parsed.updatedAt || fallback.updatedAt
        };
    } catch {
        return fallback;
    }
}

export function saveAppState(state) {
    const nextState = {
        ...state,
        version: 2,
        updatedAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    return nextState;
}

export function createFallbackState() {
    return {
        version: 2,
        people: [...DEFAULT_PEOPLE],
        months: {},
        updatedAt: new Date().toISOString()
    };
}
