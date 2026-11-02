export function parseRepository(value: string): string {
    let path = value.trim();

    if (/^https?:\/\//i.test(path)) {
        const url = new URL(path);

        if (url.hostname !== 'github.com' || url.username || url.password) {
            throw new Error(
                'Use um link de repositorio em https://github.com/dono/repositorio.',
            );
        }
        path = url.pathname;
    }
    path = path.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '');

    const parts = path.split('/');

    if (
        parts[0]?.toLowerCase() === 'orgs' ||
        parts.length !== 2 ||
        parts.some(
            (part) => !/^[\w.-]+$/.test(part) || part === '.' || part === '..',
        )
    ) {
        throw new Error(
            'GITHUB_REPOSITORY precisa identificar um repositorio: Bruno-Lucas-Institute/NOME-DO-REPOSITORIO. Abra a aba Repositories da organizacao, clique no repositorio desejado e copie o link dele. O nome da organizacao sozinho nao e suficiente.',
        );
    }

    return path;
}

export function parseOrganization(value: string): string {
    let name = value.trim();

    if (/^https?:\/\//i.test(name)) {
        const url = new URL(name);

        if (url.hostname !== 'github.com' || url.username || url.password) {
            throw new Error('Use uma organizacao do GitHub.');
        }

        const parts = url.pathname.split('/').filter(Boolean);

        if (
            parts[0] === 'orgs' &&
            (parts.length === 2 ||
                (parts.length === 3 && parts[2] === 'repositories'))
        ) {
            name = parts[1]!;
        } else if (parts.length === 1) {
            name = parts[0]!;
        } else {
            throw new Error(
                'Use o nome ou link da organizacao, sem um repositorio especifico.',
            );
        }
    }

    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(name)) {
        throw new Error(
            'GITHUB_ORGANIZATION deve ser o nome da organizacao, por exemplo Bruno-Lucas-Institute.',
        );
    }

    return name;
}
