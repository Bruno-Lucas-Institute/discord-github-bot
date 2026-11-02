// Le e valida todas as configuracoes do .env.
import 'dotenv/config';
import { parseRepository, parseOrganization } from './repository.js';

function required(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Preencha ${name} no .env.`);
    }

    return value;
}
export const token = required('DISCORD_TOKEN');
export const clientId = required('DISCORD_CLIENT_ID');
export const guildId = required('DISCORD_GUILD_ID');
export const channelId = required('DISCORD_CHANNEL_ID');

const configuredRepository = process.env.GITHUB_REPOSITORY?.trim();
export const organization = process.env.GITHUB_ORGANIZATION?.trim()
    ? parseOrganization(process.env.GITHUB_ORGANIZATION)
    : configuredRepository && !configuredRepository.includes('/')
      ? parseOrganization(configuredRepository)
      : undefined;
export const singleRepository = organization
    ? undefined
    : parseRepository(required('GITHUB_REPOSITORY'));

for (const id of [clientId, guildId, channelId]) {
    if (!/^\d{17,20}$/.test(id)) {
        throw new Error('Os IDs do Discord devem conter de 17 a 20 digitos.');
    }
}
export const interval = Number(process.env.POLL_INTERVAL_SECONDS || 60);

if (!Number.isFinite(interval) || interval < 30) {
    throw new Error('POLL_INTERVAL_SECONDS deve ser pelo menos 30.');
}
export const branchFilter = process.env.GITHUB_BRANCH?.trim();
export const name = (process.env.BOT_NAME || 'Bruno & Lucas Institute').slice(
    0,
    200,
);
