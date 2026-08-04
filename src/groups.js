import { dateToISO, getFridaysInMonth } from './dates.js';

export function getMonthKey(month, groupSize) {
    return `${month}|${groupSize}`;
}

export function generateMonthGroups({ month, people, groupSize, savedMonths }) {
    const [year, monthNumber] = month.split('-').map(Number);
    const fridays = getFridaysInMonth(year, monthNumber);
    const weekGroups = [];
    const historyMonths = { ...savedMonths };

    delete historyMonths[getMonthKey(month, groupSize)];

    fridays.forEach((friday, index) => {
        const date = dateToISO(friday);
        const group = createGroupForDate({
            date,
            people,
            groupSize,
            draftWeeks: weekGroups,
            savedMonths: historyMonths
        });

        weekGroups.push({
            date,
            weekNumber: index + 1,
            groups: [group]
        });
    });

    return weekGroups;
}

function createGroupForDate({ date, people, groupSize, draftWeeks, savedMonths }) {
    const recentTwoWeeks = getRecentParticipants(date, 2, draftWeeks, savedMonths);
    let candidates = people.filter(person => !recentTwoWeeks.has(person));

    if (candidates.length < groupSize) {
        const recentOneWeek = getRecentParticipants(date, 1, draftWeeks, savedMonths);
        candidates = people.filter(person => !recentOneWeek.has(person));
    }

    if (candidates.length < groupSize) candidates = people;

    const history = getParticipationHistory(date, people, draftWeeks, savedMonths);
    const ranked = shuffle(candidates).sort((a, b) => {
        const countDiff = (history.counts[a] || 0) - (history.counts[b] || 0);
        if (countDiff !== 0) return countDiff;

        const lastA = history.lastDates[a] || '';
        const lastB = history.lastDates[b] || '';
        return lastA.localeCompare(lastB);
    });

    return ranked.slice(0, groupSize);
}

function getRecentParticipants(beforeDate, weeksBack, draftWeeks, savedMonths) {
    const recentWeeks = getAllWeeks(draftWeeks, savedMonths)
        .filter(week => week.date < beforeDate)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, weeksBack);

    return new Set(recentWeeks.flatMap(week => week.groups.flat()));
}

function getParticipationHistory(beforeDate, people, draftWeeks, savedMonths) {
    const counts = {};
    const lastDates = {};

    getAllWeeks(draftWeeks, savedMonths)
        .filter(week => week.date < beforeDate)
        .forEach(week => {
            week.groups.flat().forEach(person => {
                counts[person] = (counts[person] || 0) + 1;
                if (!lastDates[person] || week.date > lastDates[person]) {
                    lastDates[person] = week.date;
                }
            });
        });

    people.forEach(person => {
        counts[person] = counts[person] || 0;
        lastDates[person] = lastDates[person] || '';
    });

    return { counts, lastDates };
}

function getAllWeeks(draftWeeks, savedMonths) {
    const weeks = [];

    Object.values(savedMonths).forEach(monthData => {
        if (Array.isArray(monthData.weekGroups)) {
            monthData.weekGroups.forEach(week => {
                if (week?.date && Array.isArray(week.groups)) weeks.push(week);
            });
        }
    });

    draftWeeks.forEach(week => weeks.push(week));
    return weeks;
}

function shuffle(items) {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}
