// Acesso a API do GitHub e controle do limite de consultas.
import { branchFilter } from './config.js';
import type { Commit } from './monitor.js';

const repoPath = (repository: string) =>
    `/repos/${repository.split('/').map(encodeURIComponent).join('/')}`;

let retryAfter = 0;

export function esperaDoGitHub(): number {
    return Math.max(0, retryAfter - Date.now());
}

export async function github<T>(path: string): Promise<T> {
    if (Date.now() < retryAfter) {
        throw new Error('Aguardando liberacao do limite da API do GitHub.');
    }

    const response = await fetch(`https://api.github.com${path}`, {
        headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Bruno-Lucas-Discord-Bot',
            ...(process.env.GITHUB_TOKEN?.trim()
                ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN.trim()}` }
                : {}),
        },
        signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
        if (
            response.status === 429 ||
            (response.status === 403 &&
                response.headers.get('x-ratelimit-remaining') === '0')
        ) {
            retryAfter = Math.max(
                Date.now() + 60_000,
                Number(response.headers.get('x-ratelimit-reset') || 0) * 1000,
                Date.now() +
                    Number(response.headers.get('retry-after') || 60) * 1000,
            );
        }
        throw new Error(
            `GitHub HTTP ${response.status}. Confira repositorio, token e permissoes no .env.`,
        );
    }

    return (await response.json()) as T;
}

export async function branches(repository: string): Promise<string[]> {
    if (branchFilter) {
        return [branchFilter];
    }

    const names: string[] = [];

    for (let page = 1; ; page++) {
        const batch = await github<{ name: string }[]>(
            `${repoPath(repository)}/branches?per_page=100&page=${page}`,
        );
        names.push(...batch.map((branch) => branch.name));

        if (batch.length < 100) {
            return names;
        }
    }
}
export const commits = (
    repository: string,
    branch: string,
    page: number,
    size = 100,
) =>
    github<Commit[]>(
        `${repoPath(repository)}/commits?sha=${encodeURIComponent(branch)}&per_page=${size}&page=${page}`,
    );

export interface CommitDetail {
    files?: { filename: string; status: string }[];
    stats?: { additions: number; deletions: number };
}
