# Bruno & Lucas Institute — GitHub → Discord

Bot em TypeScript que acompanha todos os repositorios acessiveis de uma organizacao e publica novos commits no Discord com repositorio, autor, branch, mensagem, previa dos arquivos, linhas adicionadas/removidas e link. A lista e atualizada a cada ciclo para descobrir novos repositorios.

## Preparar

1. Instale **Node.js 22.12 ou mais recente**.
2. No [Discord Developer Portal](https://discord.com/developers/applications), crie uma aplicacao. Em **Bot**, obtenha o token. Em **General Information**, copie o Application ID.
3. Preencha apenas o arquivo `.env`:

| Variavel | Valor |
| --- | --- |
| `DISCORD_TOKEN` | Token secreto do bot; o ID sozinho nao permite conectar |
| `DISCORD_CLIENT_ID` | Application ID / ID do bot |
| `DISCORD_GUILD_ID` | ID do servidor |
| `DISCORD_CHANNEL_ID` | ID do canal de texto |
| `GITHUB_ORGANIZATION` | `Bruno-Lucas-Institute` acompanha todos os repositorios acessiveis da organizacao |
| `GITHUB_REPOSITORY` | Opcional: `dono/repositorio` para acompanhar apenas um; usado se `GITHUB_ORGANIZATION` estiver vazio |
| `GITHUB_TOKEN` | Token do GitHub; obrigatorio se privado, recomendado se publico |
| `GITHUB_BRANCH` | Vazio acompanha todas as branches; `main` acompanha somente main |
| `POLL_INTERVAL_SECONDS` | Intervalo em segundos, padrao 60, minimo 30 |
| `BOT_NAME` | Nome exibido no rodape das mensagens |

O `.env` ja esta configurado com `GITHUB_ORGANIZATION=Bruno-Lucas-Institute`. Nao precisa listar cada repositorio. Tambem aceita o link da organizacao. Para o modo de repositorio unico, deixe a organizacao vazia e informe `GITHUB_REPOSITORY`.

Para copiar IDs no Discord, ative **Configuracoes do usuario → Avancado → Modo desenvolvedor**, clique com o botao direito no servidor/canal e escolha copiar ID.

4. Em **OAuth2 → URL Generator**, marque o escopo **bot** e as permissoes **View Channels**, **Send Messages** e **Embed Links**. Abra o link gerado e adicione o bot ao servidor. As permissoes tambem precisam estar liberadas no canal. Nao precisa ativar Message Content Intent.
5. No GitHub, crie um **fine-grained personal access token**, selecione **Resource owner: Bruno-Lucas-Institute**, **Repository access: All repositories** e permita **Contents: Read-only**. Isso permite acompanhar tambem novos repositorios privados aos quais sua conta tenha acesso. Organizacoes podem exigir aprovacao do token. Um token com apenas repositorios selecionados limita os privados acompanhados. Sem token, somente publicos sao acessiveis e o limite anonimo pode ser insuficiente.

## Executar

```powershell
npm install
npm run build
npm start
```

Para desenvolvimento: `npm run dev`. Para verificar: `npm run check` e `npm test`.

O terminal informa a conexao. Aguarde a primeira consulta antes de fazer um novo commit e push; o aviso aparece na consulta seguinte.

## Entender e editar o codigo

Comece por `src/index.ts`: ele conecta o bot, confere as permissoes do canal e inicia o acompanhamento.

| Arquivo | Responsabilidade |
| --- | --- |
| `src/config.ts` | Le e valida as opcoes do `.env` |
| `src/github.ts` | Faz consultas ao GitHub e respeita o limite da API |
| `src/watcher.ts` | Busca repositorios, verifica cada branch e envia os novos commits |
| `src/embeds.ts` | Define a aparencia das mensagens: cores, titulos e campos |
| `src/storage.ts` | Le e salva o progresso em `data/state.json` |
| `src/monitor.ts` | Trata paginacao, commits pendentes e o formato do progresso |
| `src/repository.ts` | Valida os nomes e links de organizacao/repositorio |

Para personalizar a mensagem, edite `src/embeds.ts`. Para mudar tokens, canal ou organizacao, edite apenas `.env`. Depois de alterar TypeScript, execute `npm run build` e reinicie com `npm start`.

O fluxo de `watcher.ts` e: `acompanharGitHub` → `verificarRepositorio` → `verificarBranch` → criar embed → enviar → salvar progresso. Os nomes de campos retornados pelo GitHub e do JSON salvo continuam em ingles para preservar a compatibilidade.

## Regras do acompanhamento

- A primeira consulta de cada branch de cada repositorio salva o commit atual sem publicar o historico antigo. Repositorios e branches descobertos depois tambem comecam no estado atual. Repositorios vazios sao acompanhados quando tiverem uma branch; o primeiro commit vira o ponto inicial.
- Uma falha em um repositorio nao impede a consulta dos demais. O limite da API pausa as consultas ate a liberacao. Com muitas branches/repositorios, aumente `POLL_INTERVAL_SECONDS` para reduzir o consumo da API.
- Acompanha commits enviados ao GitHub, incluindo commits de merges, nas branches configuradas. Nao monitora mudancas locais, issues, comentarios, releases nem eventos de abertura de pull request.
- `data/state.json` guarda o progresso separado por repositorio e branch. O formato anterior de repositorio unico e migrado automaticamente. Preserve esse arquivo ao reiniciar e execute apenas uma instancia. Commits feitos enquanto o bot estava desligado sao recuperados na proxima consulta para branches ja inicializadas.
- Um mesmo commit presente em duas branches pode gerar um aviso por branch. Se houver force push que remova o commit salvo do historico, envia um aviso e inicia um novo ponto de acompanhamento.
- Cada aviso mostra ate 12 arquivos, com texto limitado pelo Discord; o link abre os detalhes completos.
- Falhas de rede e limites da API geram tentativas automaticas. Uma interrupcao entre enviar a mensagem e salvar o progresso pode repetir o ultimo aviso.
- O processo precisa ficar rodando no computador ou numa hospedagem. Nao precisa abrir porta, configurar webhook ou ter dominio.
- `.env` e `data/` estao no `.gitignore`. Nunca publique seus tokens.

Referencias: [commits da API do GitHub](https://docs.github.com/en/rest/commits/commits) e [configuracao do cliente discord.js](https://github.com/discordjs/guide/blob/main/guide/creating-your-bot/main-file.md).
