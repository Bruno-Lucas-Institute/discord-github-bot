export interface Commit {
    sha: string;
    html_url: string;
    commit: { message: string; author: { name: string } | null };
    author: { login: string } | null;
}

export interface State {
    repository: string;
    branches: Record<string, string>;
}

export interface OrganizationState {
    version: 2;
    repositories: Record<string, State>;
}

export function readState(value: unknown): OrganizationState {
    const valid = (item: unknown): item is State => {
        if (!item || typeof item !== 'object') {
            return false;
        }

        const state = item as State;

        return (
            typeof state.repository === 'string' &&
            !!state.branches &&
            typeof state.branches === 'object' &&
            !Array.isArray(state.branches) &&
            Object.values(state.branches).every(
                (sha) => typeof sha === 'string',
            )
        );
    };

    if (valid(value)) {
        return { version: 2, repositories: { [value.repository]: value } };
    }

    const state = value as OrganizationState | null;

    if (
        state?.version === 2 &&
        state.repositories &&
        typeof state.repositories === 'object' &&
        !Array.isArray(state.repositories) &&
        Object.entries(state.repositories).every(
            ([key, item]) => valid(item) && key === item.repository,
        )
    ) {
        return state;
    }
    throw new Error('Estado invalido em data/state.json.');
}

export async function listRepositories(
    page: (number: number) => Promise<{ full_name: string }[]>,
): Promise<string[]> {
    const names = new Set<string>();

    for (let number = 1; ; number++) {
        const batch = await page(number);

        for (const repo of batch) {
            names.add(repo.full_name);
        }

        if (batch.length < 100) {
            return [...names];
        }
    }
}

// Busca ate o ultimo commit processado, inclusive em historicos paginados.
export async function pendingCommits(
    previous: string,
    page: (page: number) => Promise<Commit[]>,
): Promise<{ commits: Commit[]; historyChanged: boolean }> {
    const pending: Commit[] = [];

    for (let number = 1; ; number++) {
        const batch = await page(number);

        for (const commit of batch) {
            if (commit.sha === previous) {
                return { commits: pending.reverse(), historyChanged: false };
            }
            pending.push(commit);
        }

        if (batch.length < 100) {
            return { commits: [], historyChanged: true };
        }
    }
}
