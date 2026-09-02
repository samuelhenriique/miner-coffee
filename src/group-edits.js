export function swapGroupMember({ weekGroups, weekIndex, groupIndex, newMembers }) {
    const originalGroup = weekGroups[weekIndex]?.groups?.[groupIndex];

    if (!originalGroup) {
        throw new Error('O grupo que voce tentou editar nao foi encontrado.');
    }

    if (new Set(newMembers).size !== newMembers.length) {
        throw new Error('Uma pessoa nao pode aparecer duas vezes no mesmo grupo.');
    }

    const removedMembers = originalGroup.filter(member => !newMembers.includes(member));
    const addedMembers = newMembers.filter(member => !originalGroup.includes(member));

    if (removedMembers.length === 0 && addedMembers.length === 0) {
        return cloneWeekGroups(weekGroups);
    }

    if (
        newMembers.length !== originalGroup.length
        || removedMembers.length !== 1
        || addedMembers.length !== 1
    ) {
        throw new Error('Troque uma pessoa por vez: remova um integrante e adicione outro.');
    }

    const [removedMember] = removedMembers;
    const [addedMember] = addedMembers;
    const updatedWeekGroups = cloneWeekGroups(weekGroups);
    const swapLocation = findBestSwapLocation({
        weekGroups: updatedWeekGroups,
        member: addedMember,
        replacement: removedMember,
        editedWeekIndex: weekIndex,
        editedGroupIndex: groupIndex
    });

    if (!swapLocation) {
        throw new Error(`${addedMember} nao possui outra vaga disponivel neste mes para trocar com ${removedMember}.`);
    }

    const otherGroup = updatedWeekGroups[swapLocation.weekIndex].groups[swapLocation.groupIndex];
    otherGroup[swapLocation.memberIndex] = removedMember;
    updatedWeekGroups[weekIndex].groups[groupIndex] = [...newMembers];

    return updatedWeekGroups;
}

function findBestSwapLocation({
    weekGroups,
    member,
    replacement,
    editedWeekIndex,
    editedGroupIndex
}) {
    const locations = [];

    weekGroups.forEach((week, weekIndex) => {
        week.groups.forEach((group, groupIndex) => {
            const isEditedGroup = weekIndex === editedWeekIndex && groupIndex === editedGroupIndex;
            if (isEditedGroup || group.includes(replacement)) return;

            group.forEach((groupMember, memberIndex) => {
                if (groupMember === member) {
                    locations.push({ weekIndex, groupIndex, memberIndex });
                }
            });
        });
    });

    locations.sort((a, b) => (
        Math.abs(a.weekIndex - editedWeekIndex) - Math.abs(b.weekIndex - editedWeekIndex)
    ));

    return locations[0];
}

function cloneWeekGroups(weekGroups) {
    return weekGroups.map(week => ({
        ...week,
        groups: week.groups.map(group => [...group])
    }));
}
