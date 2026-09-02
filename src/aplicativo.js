import { baixarBannerDoMes } from './banner.js';
import { baixarBackup, carregarEstado, lerBackup, salvarEstado } from './dados.js';
import { nomeDoMes, obterSextasDoMes } from './datas.js';
import { criarChaveDoMes, gerarGruposDoMes, trocarIntegrante } from './grupos.js';
import {
    abrirEdicaoDoGrupo,
    abrirHistorico,
    abrirVisualizacaoCompacta,
    fecharHistorico,
    fecharVisualizacaoCompacta,
    limparGrupos,
    mostrarAvisoDeRevisao,
    mostrarGrupos,
    mostrarParticipantes,
    obterHistoricoAnterior,
    ordenarParticipantes,
    participanteExiste
} from './interface.js';

class AplicativoLanchinho {
    constructor() {
        this.tamanhoGrupo = 3;
        this.mesAtual = mesAtualISO();
        this.pessoas = [];
        this.semanasAtuais = [];
        this.estado = carregarEstado();
        this.iniciar();
    }

    iniciar() {
        this.pessoas = [...this.estado.people];
        this.configurarEventos();
        mostrarParticipantes(this.pessoas);
        this.atualizarQuantidadeDeParticipantes();
        this.atualizarMes(this.mesAtual);
    }

    configurarEventos() {
        document.querySelectorAll('.size-btn').forEach(botao => {
            botao.addEventListener('click', evento => {
                this.selecionarTamanho(Number(evento.currentTarget.dataset.size));
            });
        });

        porId('generate-groups').addEventListener('click', () => this.gerarGrupos());
        porId('view-groups').addEventListener('click', () => this.visualizarGrupos());
        porId('view-history').addEventListener('click', () => this.visualizarHistorico());
        porId('download-banner').addEventListener('click', () => this.baixarBanner());
        porId('export-data').addEventListener('click', () => this.exportarDados());
        porId('import-data').addEventListener('click', () => porId('import-file').click());
        porId('import-file').addEventListener('change', evento => this.importarDados(evento));
        porId('close-compact-view').addEventListener('click', fecharVisualizacaoCompacta);
        porId('close-history').addEventListener('click', fecharHistorico);

        porId('compact-view-modal').addEventListener('click', evento => {
            if (evento.target.id === 'compact-view-modal') fecharVisualizacaoCompacta();
        });

        porId('history-modal').addEventListener('click', evento => {
            if (evento.target.id === 'history-modal') fecharHistorico();
        });

        document.addEventListener('keydown', evento => {
            if (evento.key === 'Escape') {
                fecharVisualizacaoCompacta();
                fecharHistorico();
            }
        });

        porId('prev-month').addEventListener('click', () => this.mudarMes(-1));
        porId('next-month').addEventListener('click', () => this.mudarMes(1));
        porId('month-year').addEventListener('change', evento => this.atualizarMes(evento.target.value));
        porId('month-display').addEventListener('click', () => porId('month-year').showPicker?.());

        porId('add-person-form').addEventListener('submit', evento => {
            evento.preventDefault();
            const campoNome = porId('person-name');
            const nome = campoNome.value.trim();
            if (!nome) return;

            this.adicionarPessoa(nome);
            campoNome.value = '';
        });

        porId('people-list').addEventListener('click', evento => {
            const botao = evento.target.closest('.btn-remove');
            if (botao) this.removerPessoa(botao.dataset.name);
        });

        porId('groups-display').addEventListener('click', evento => {
            const botao = evento.target.closest('.edit-group-btn');
            if (!botao) return;

            this.editarGrupo(
                Number(botao.dataset.week),
                Number(botao.dataset.group),
                botao.dataset.date
            );
        });
    }

    atualizarMes(novoMes) {
        this.mesAtual = novoMes;
        porId('month-year').value = novoMes;
        porId('month-display').textContent = nomeDoMes(novoMes);

        const [ano, mes] = novoMes.split('-').map(Number);
        const totalSextas = obterSextasDoMes(ano, mes).length;
        porId('sextas-count').textContent = `${totalSextas} sextas-feiras`;

        this.atualizarBotaoGerar();
        this.carregarGruposDoMes();
    }

    mudarMes(direcao) {
        const [ano, mes] = this.mesAtual.split('-').map(Number);
        const novaData = new Date(ano, mes - 1 + direcao, 1);
        const novoMes = `${novaData.getFullYear()}-${String(novaData.getMonth() + 1).padStart(2, '0')}`;
        this.atualizarMes(novoMes);
    }

    selecionarTamanho(tamanho) {
        document.querySelectorAll('.size-btn').forEach(botao => botao.classList.remove('selected'));
        document.querySelector(`[data-size="${tamanho}"]`).classList.add('selected');

        this.tamanhoGrupo = tamanho;
        porId('group-size-display').textContent = tamanho;
        this.atualizarBotaoGerar();
        this.carregarGruposDoMes();
    }

    adicionarPessoa(nome) {
        if (participanteExiste(this.pessoas, nome)) {
            alert('Essa pessoa ja esta na lista.');
            return;
        }

        this.pessoas = ordenarParticipantes([...this.pessoas, nome]);
        this.salvar();
        mostrarParticipantes(this.pessoas);
        this.atualizarQuantidadeDeParticipantes();
        mostrarAvisoDeRevisao('A lista de participantes mudou. Gere novamente os grupos dos meses futuros que ainda nao foram publicados.');
    }

    removerPessoa(nome) {
        if (!confirm(`Remover ${nome} da lista de participantes ativos? O historico ja salvo sera mantido.`)) return;

        this.pessoas = this.pessoas.filter(pessoa => pessoa !== nome);
        this.salvar();
        mostrarParticipantes(this.pessoas);
        this.atualizarQuantidadeDeParticipantes();
        mostrarAvisoDeRevisao('Participante removido dos proximos sorteios. O historico anterior continua guardado.');
    }

    carregarGruposDoMes() {
        const mesSalvo = this.estado.months[this.chaveAtual()];
        if (mesSalvo?.weekGroups?.length) {
            this.semanasAtuais = mesSalvo.weekGroups;
            mostrarGrupos(this.semanasAtuais);
            return;
        }

        this.semanasAtuais = [];
        limparGrupos();
    }

    gerarGrupos() {
        if (this.pessoas.length < this.tamanhoGrupo) {
            alert('Adicione participantes suficientes e selecione o mes.');
            return;
        }

        this.semanasAtuais = gerarGruposDoMes({
            mes: this.mesAtual,
            pessoas: this.pessoas,
            tamanhoGrupo: this.tamanhoGrupo,
            mesesSalvos: this.estado.months
        });

        this.estado.months[this.chaveAtual()] = {
            month: this.mesAtual,
            groupSize: this.tamanhoGrupo,
            formation: 'multiple',
            generatedAt: new Date().toISOString(),
            weekGroups: this.semanasAtuais
        };

        this.salvar();
        mostrarGrupos(this.semanasAtuais);
    }

    editarGrupo(indiceSemana, indiceGrupo, data) {
        const grupo = this.semanasAtuais[indiceSemana]?.groups[indiceGrupo];
        if (!grupo) return;

        abrirEdicaoDoGrupo({
            data,
            membrosAtuais: grupo,
            pessoasDisponiveis: this.pessoas.filter(pessoa => !grupo.includes(pessoa)),
            aoSalvar: novosMembros => this.salvarTroca(indiceSemana, indiceGrupo, novosMembros)
        });
    }

    salvarTroca(indiceSemana, indiceGrupo, novosMembros) {
        try {
            this.semanasAtuais = trocarIntegrante({
                semanas: this.semanasAtuais,
                indiceSemana,
                indiceGrupo,
                novosMembros
            });
        } catch (erro) {
            alert(erro.message || 'Nao foi possivel trocar os integrantes.');
            return false;
        }

        this.estado.months[this.chaveAtual()].weekGroups = this.semanasAtuais;
        this.salvar();
        mostrarGrupos(this.semanasAtuais);
        return true;
    }

    visualizarGrupos() {
        if (!this.semanasAtuais.length) {
            alert('Nenhum grupo foi gerado ainda. Gere os grupos primeiro.');
            return;
        }

        abrirVisualizacaoCompacta({ semanas: this.semanasAtuais, mes: this.mesAtual });
    }

    visualizarHistorico() {
        abrirHistorico({
            historico: obterHistoricoAnterior(this.estado.months, mesAtualISO()),
            aoVisualizar: registro => {
                fecharHistorico();
                abrirVisualizacaoCompacta({ semanas: registro.weekGroups, mes: registro.month });
            }
        });
    }

    baixarBanner() {
        if (!this.semanasAtuais.length) {
            alert('Gere os grupos antes de baixar o banner.');
            return;
        }

        baixarBannerDoMes({ semanas: this.semanasAtuais, mes: this.mesAtual });
    }

    exportarDados() {
        this.salvar();
        baixarBackup(this.estado);
    }

    async importarDados(evento) {
        const arquivo = evento.target.files?.[0];
        if (!arquivo) return;

        try {
            const dados = await lerBackup(arquivo);
            if (!confirm('Importar este backup? Ele vai substituir os dados deste navegador.')) return;

            this.estado = {
                version: 2,
                people: dados.people,
                months: dados.months,
                updatedAt: new Date().toISOString()
            };
            this.pessoas = [...this.estado.people];
            this.salvar();
            mostrarParticipantes(this.pessoas);
            this.atualizarQuantidadeDeParticipantes();
            this.carregarGruposDoMes();
            alert('Backup importado com sucesso.');
        } catch (erro) {
            alert(erro.message || 'Nao foi possivel importar o backup.');
        } finally {
            evento.target.value = '';
        }
    }

    atualizarQuantidadeDeParticipantes() {
        porId('participants-count').textContent = `${this.pessoas.length} ativos`;
        this.atualizarBotaoGerar();
    }

    atualizarBotaoGerar() {
        porId('generate-groups').disabled = this.pessoas.length < this.tamanhoGrupo;
    }

    chaveAtual() {
        return criarChaveDoMes(this.mesAtual, this.tamanhoGrupo);
    }

    salvar() {
        this.estado = salvarEstado({ ...this.estado, people: [...this.pessoas] });
    }
}

function mesAtualISO() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

function porId(id) {
    return document.getElementById(id);
}

document.addEventListener('DOMContentLoaded', () => {
    const aplicativo = new AplicativoLanchinho();
    window.modernLanchinho = aplicativo;
});
