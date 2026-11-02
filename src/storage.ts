// Grava o progresso para continuar do mesmo ponto apos reiniciar.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { readState, type OrganizationState } from './monitor.js';

const statePath = new URL('../data/state.json', import.meta.url);

export async function save(state: OrganizationState): Promise<void> {
    await mkdir(new URL('../data/', import.meta.url), { recursive: true });

    const temp = new URL(`${statePath.href}.tmp`);

    await writeFile(temp, JSON.stringify(state, null, 2));

    await rename(temp, statePath);
}

export async function load(): Promise<OrganizationState> {
    try {
        return readState(JSON.parse(await readFile(statePath, 'utf8')));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return { version: 2, repositories: {} };
        }
        throw error;
    }
}
