import { dateToISO, getFridaysInMonth } from './dates.js';
// codigo para gerar os grupos de pessoas para cada sexta-feira de um determinado mês, considerando o tamanho do grupo e o histórico de participação
export function getMonthKey(month, groupSize) {
    return `${month}|${groupSize}`;
}

export function generateMonthGroups({ month, people, groupSize, savedMonths }) {
    const [year, monthNumber] = month.split('-').map(Number);
    const fridays = getFridaysInMonth(year, monthNumber);
    const weeklyGroupSizes = distributeExtraPeople({
        peopleCount: people.length,
        weeksCount: fridays.length,
        groupSize
    });
    const weekGroups = [];
    const historyMonths = { ...savedMonths };

    delete historyMonths[getMonthKey(month, groupSize)];

    fridays.forEach((friday, index) => {
        const date = dateToISO(friday);
        const group = createGroupForDate({
            date,
            people,
            groupSize: weeklyGroupSizes[index],
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
    const currentMonthParticipants = new Set(
        draftWeeks
            .filter(week => week.date.startsWith(date.slice(0, 7)))
            .flatMap(week => week.groups.flat())
    );
    const ranked = shuffle(candidates).sort((a, b) => {
        const monthParticipationDiff = Number(currentMonthParticipants.has(a)) - Number(currentMonthParticipants.has(b));
        if (monthParticipationDiff !== 0) return monthParticipationDiff;

        const countDiff = (history.counts[a] || 0) - (history.counts[b] || 0);
        if (countDiff !== 0) return countDiff;

        const lastA = history.lastDates[a] || '';
        const lastB = history.lastDates[b] || '';
        return lastA.localeCompare(lastB);
    });

    return ranked.slice(0, groupSize);
}

function distributeExtraPeople({ peopleCount, weeksCount, groupSize }) {
    const weeklySizes = Array(weeksCount).fill(groupSize);
    let extraPeople = Math.max(0, peopleCount - (weeksCount * groupSize));
    const expandableWeeks = Math.min(2, weeksCount);

    for (let offset = 0; extraPeople > 0; offset += 1) {
        const weekIndex = weeksCount - 1 - (offset % expandableWeeks);
        weeklySizes[weekIndex] += 1;
        extraPeople -= 1;
    }

    return weeklySizes;
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
