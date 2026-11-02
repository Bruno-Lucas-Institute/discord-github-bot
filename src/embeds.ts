// Personalize aqui as cores, os textos e os campos das mensagens.
import { EmbedBuilder } from 'discord.js';
import { name } from './config.js';
import type { Commit } from './monitor.js';
import type { CommitDetail } from './github.js';

const clip = (text: string, limit: number) =>
    text.length > limit ? `${text.slice(0, limit - 1)}…` : text;

export function criarEmbedCommit(
    repository: string,
    branch: string,
    commit: Commit,
    detail: CommitDetail,
): EmbedBuilder {
    const files = detail.files || [];

    const fileText = files
        .slice(0, 12)
        .map((file) => `${file.status}: ${file.filename}`)
        .join('\n');

    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(clip(`Novo commit em ${repository}`, 256))
        .setURL(commit.html_url)
        .setDescription(clip(commit.commit.message, 3000))
        .addFields(
            {
                name: 'Autor',
                value: clip(
                    commit.author?.login ||
                        commit.commit.author?.name ||
                        'Desconhecido',
                    256,
                ),
                inline: true,
            },
            {
                name: 'Branch',
                value: clip(branch, 256),
                inline: true,
            },
            {
                name: 'Commit',
                value: commit.sha.slice(0, 7),
                inline: true,
            },
            {
                name: 'Arquivos (previa; lista completa no link)',
                value: clip(fileText || 'Veja os detalhes no GitHub.', 1024),
            },
        )
        .setFooter({
            text: `${name} • +${detail.stats?.additions ?? 0} / -${detail.stats?.deletions ?? 0} linhas`,
        })
        .setTimestamp();
}

export function criarEmbedHistorico(
    repository: string,
    branch: string,
    latest: Commit,
): EmbedBuilder {
    return new EmbedBuilder()
        .setColor(0xe5a000)
        .setTitle('Historico da branch alterado')
        .setDescription(
            clip(
                `${repository}: a branch ${branch} teve seu historico reescrito. O acompanhamento continuara a partir do commit atual.`,
                4000,
            ),
        )
        .setURL(latest.html_url)
        .setFooter({ text: name });
}
