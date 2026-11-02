// Ponto de entrada: conecta o Discord e inicia o acompanhamento.
import {
    Client,
    Events,
    GatewayIntentBits,
    PermissionFlagsBits,
} from 'discord.js';
import {
    token,
    clientId,
    guildId,
    channelId,
    organization,
    singleRepository,
} from './config.js';
import { acompanharGitHub } from './watcher.js';

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
    allowedMentions: { parse: [] },
});

const shutdown = new AbortController();

client.once(Events.ClientReady, async (ready) => {
    try {
        if (ready.user.id !== clientId) {
            throw new Error(
                'DISCORD_CLIENT_ID nao corresponde ao token informado.',
            );
        }

        const guild = await client.guilds.fetch(guildId);

        const channel = await guild.channels.fetch(channelId);

        if (!channel || !channel.isTextBased() || !channel.isSendable()) {
            throw new Error(
                'Canal invalido: use um canal de texto do servidor configurado.',
            );
        }

        const me = await guild.members.fetchMe();

        const permissions = channel.permissionsFor(me);

        if (
            !permissions?.has([
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
            ])
        ) {
            throw new Error(
                'O bot precisa de Ver canal, Enviar mensagens e Inserir links nesse canal.',
            );
        }
        console.log(
            `${ready.user.tag} conectado. Monitorando ${organization ? `todos os repositorios de ${organization}` : singleRepository}.`,
        );

        await acompanharGitHub(async (embed) => {
            await channel.send({
                embeds: [embed],
                allowedMentions: { parse: [] },
            });
        }, shutdown.signal);
        client.destroy();
    } catch (error) {
        console.error(
            error instanceof Error ? error.message : 'Falha ao iniciar.',
        );
        client.destroy();
        process.exitCode = 1;
    }
});
// Ctrl+C ou parada da hospedagem interrompem a espera entre as consultas.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => shutdown.abort());
}
client.on(Events.Error, (error) =>
    console.error('Erro do Discord:', error.message),
);

try {
    await client.login(token);
} catch {
    console.error(
        'Nao foi possivel conectar ao Discord. Confira DISCORD_TOKEN e a conexao.',
    );
    process.exitCode = 1;
    client.destroy();
}
