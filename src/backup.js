export function downloadBackup(state) { //esse codigo permite baixar o backup do estado atual do aplicativo como um arquivo JSON
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = `backup-lanchinho-miner-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

export function readBackupFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            try {
                const imported = JSON.parse(reader.result);

                if (!Array.isArray(imported.people) || !imported.months || typeof imported.months !== 'object') {
                    throw new Error('Arquivo de backup invalido.');
                }

                resolve(imported);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Nao foi possivel ler o arquivo de backup.'));
        reader.readAsText(file);
    });
}
