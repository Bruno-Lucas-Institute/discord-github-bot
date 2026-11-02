// Ciclo de acompanhamento: repositorios -> branches -> novos commits.
import { setTimeout as esperar } from 'node:timers/promises';
import type { EmbedBuilder } from 'discord.js';
import { organization, singleRepository, interval } from './config.js';
import {
    github,
    branches,
    commits,
    esperaDoGitHub,
    type CommitDetail,
} from './github.js';
import { load, save } from './storage.js';
import {
    listRepositories,
    pendingCommits,
    type State,
    type OrganizationState,
} from './monitor.js';
import { criarEmbedCommit, criarEmbedHistorico } from './embeds.js';

type EnviarEmbed = (embed: EmbedBuilder) => Promise<void>;

async function buscarRepositorios(): Promise<string[]> {
    if (!organization) {
        return [singleRepository!];
    }

    const nome = encodeURIComponent(organization);

    return listRepositories((pagina) =>
        github<{ full_name: string }[]>(
            `/orgs/${nome}/repos?type=all&per_page=100&page=${pagina}`,
        ),
    );
}

// Cada mensagem enviada confirma um commit e atualiza o arquivo de progresso.
async function verificarBranch(
    estado: State,
    branch: string,
    progresso: OrganizationState,
    enviar: EnviarEmbed,
    sinal: AbortSignal,
): Promise<void> {
    const repositorio = estado.repository;

    const atual = (await commits(repositorio, branch, 1, 1))[0];

    if (!atual) {
        return;
    }

    const anterior = Object.hasOwn(estado.branches, branch)
        ? estado.branches[branch]
        : undefined;

    if (!anterior) {
        // Primeira consulta: acompanha a partir de agora, sem enviar commits antigos.
        Object.defineProperty(estado.branches, branch, {
            value: atual.sha,
            writable: true,
            enumerable: true,
            configurable: true,
        });

        await save(progresso);

        return;
    }

    if (atual.sha === anterior) {
        return;
    }

    // Fixar o SHA evita que novos pushes mudem as paginas durante esta consulta.
    const novidades = await pendingCommits(anterior, (pagina) =>
        commits(repositorio, atual.sha, pagina),
    );

    if (novidades.historyChanged) {
        await enviar(criarEmbedHistorico(repositorio, branch, atual));
        estado.branches[branch] = atual.sha;

        await save(progresso);

        return;
    }

    for (const commit of novidades.commits) {
        if (sinal.aborted) {
            return;
        }

        const caminho = repositorio
            .split('/')
            .map(encodeURIComponent)
            .join('/');

        const detalhes = await github<CommitDetail>(
            `/repos/${caminho}/commits/${commit.sha}`,
        );

        await enviar(criarEmbedCommit(repositorio, branch, commit, detalhes));
        estado.branches[branch] = commit.sha;

        await save(progresso);
    }
}

async function verificarRepositorio(
    repositorio: string,
    progresso: OrganizationState,
    enviar: EnviarEmbed,
    sinal: AbortSignal,
): Promise<void> {
    if (!Object.hasOwn(progresso.repositories, repositorio)) {
        progresso.repositories[repositorio] = {
            repository: repositorio,
            branches: {},
        };
    }

    const estado = progresso.repositories[repositorio]!;

    const branchesAtivas = await branches(repositorio);

    for (const branch of branchesAtivas) {
        if (sinal.aborted) {
            return;
        }

        await verificarBranch(estado, branch, progresso, enviar, sinal);
    }

    // Limpa branches removidas do acompanhamento.
    for (const branch of Object.keys(estado.branches)) {
        if (!branchesAtivas.includes(branch)) {
            delete estado.branches[branch];
        }
    }

    await save(progresso);
}

function mensagemErro(erro: unknown): string {
    return erro instanceof Error ? erro.message : 'Erro inesperado';
}

// Repete as consultas ate o usuario encerrar o bot com Ctrl+C.
export async function acompanharGitHub(
    enviar: EnviarEmbed,
    sinal: AbortSignal,
): Promise<void> {
    const progresso = await load();

    while (!sinal.aborted) {
        try {
            const repositorios = await buscarRepositorios();

            for (const repositorio of repositorios) {
                if (sinal.aborted || esperaDoGitHub() > 0) {
                    break;
                }
                try {
                    await verificarRepositorio(
                        repositorio,
                        progresso,
                        enviar,
                        sinal,
                    );
                } catch (erro) {
                    console.error(
                        `Falha em ${repositorio}; os outros repositorios continuam:`,
                        mensagemErro(erro),
                    );
                }
            }
        } catch (erro) {
            console.error(
                'Falha na consulta; nova tentativa automatica:',
                mensagemErro(erro),
            );
        }

        if (!sinal.aborted) {
            const tempoEspera = Math.max(interval * 1000, esperaDoGitHub());
            try {
                await esperar(tempoEspera, undefined, { signal: sinal });
            } catch (erro) {
                // O encerramento cancela a espera para nao atrasar a parada do bot.
                if (!sinal.aborted) {
                    throw erro;
                }
            }
        }
    }
}
