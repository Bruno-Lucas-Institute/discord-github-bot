import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    pendingCommits,
    listRepositories,
    readState,
    type Commit,
} from './monitor.js';
import { parseRepository, parseOrganization } from './repository.js';

const commit = (sha: string): Commit => ({
    sha,
    html_url: '',
    commit: {
        message: sha,
        author: null,
    },
    author: null,
});

test('organizacao aceita nome e link da lista de repositorios', () => {
    assert.equal(
        parseOrganization('Bruno-Lucas-Institute'),
        'Bruno-Lucas-Institute',
    );
    assert.equal(
        parseOrganization(
            'https://github.com/orgs/Bruno-Lucas-Institute/repositories',
        ),
        'Bruno-Lucas-Institute',
    );
    assert.throws(() => parseOrganization('https://example.com/org'), /GitHub/);
});
test('descobre todos os repositorios com paginacao e inclui novos na proxima consulta', async () => {
    const firstPage = Array.from({ length: 100 }, (_, i) => ({
        full_name: `org/repo${i}`,
    }));

    let added = false;

    const page = async (number: number) =>
        number === 1 ? firstPage : added ? [{ full_name: 'org/new' }] : [];
    assert.equal((await listRepositories(page)).length, 100);
    added = true;
    assert.equal((await listRepositories(page)).length, 101);
});
test('migra estado antigo sem perder progresso e isola branches por repositorio', () => {
    const state = readState({
        repository: 'org/first',
        branches: { main: 'sha-first' },
    });
    state.repositories['org/second'] = {
        repository: 'org/second',
        branches: { main: 'sha-second' },
    };

    const restored = readState(JSON.parse(JSON.stringify(state)));
    assert.equal(
        restored.repositories['org/first']?.branches.main,
        'sha-first',
    );
    assert.equal(
        restored.repositories['org/second']?.branches.main,
        'sha-second',
    );
    assert.throws(
        () =>
            readState({
                version: 2,
                repositories: { bad: {} },
            }),
        /Estado invalido/,
    );
});

test('aceita caminho e link direto de repositorio', () => {
    assert.equal(
        parseRepository('Bruno-Lucas-Institute/site'),
        'Bruno-Lucas-Institute/site',
    );
    assert.equal(
        parseRepository('https://github.com/Bruno-Lucas-Institute/site.git/'),
        'Bruno-Lucas-Institute/site',
    );
});
test('explica quando falta o repositorio e rejeita lista de organizacao', () => {
    assert.throws(
        () => parseRepository('Bruno-Lucas-Institute'),
        /nome da organizacao sozinho/,
    );
    assert.throws(
        () =>
            parseRepository(
                'https://github.com/orgs/Bruno-Lucas-Institute/repositories',
            ),
        /nome da organizacao sozinho/,
    );
    assert.throws(
        () => parseRepository('https://example.com/owner/repo'),
        /github.com/,
    );
});

test('envia commits do mais antigo ao mais novo, sem repetir o anterior', async () => {
    const result = await pendingCommits('old', async () =>
        ['new', 'middle', 'old'].map(commit),
    );
    assert.deepEqual(
        result.commits.map((item) => item.sha),
        ['middle', 'new'],
    );
    assert.equal(result.historyChanged, false);
});
test('busca commits alem da primeira pagina', async () => {
    const pages: number[] = [];

    const result = await pendingCommits('old', async (page) => {
        pages.push(page);

        return page === 1
            ? Array.from({ length: 100 }, (_, i) => commit(`sha${i}`))
            : [commit('extra'), commit('old')];
    });
    assert.deepEqual(pages, [1, 2]);
    assert.equal(result.commits.length, 101);
    assert.equal(result.commits[0]?.sha, 'extra');
});
test('historico reescrito nao reenvia todos os commits antigos', async () => {
    const result = await pendingCommits('removed', async () => [commit('new')]);
    assert.equal(result.historyChanged, true);
    assert.deepEqual(result.commits, []);
});
test('falha na API interrompe o lote sem marcar como processado', async () => {
    await assert.rejects(
        pendingCommits('old', async () => {
            throw new Error('HTTP 403');
        }),
        /HTTP 403/,
    );
});
