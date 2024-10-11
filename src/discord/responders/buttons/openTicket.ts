import { Responder, ResponderType } from "#base";
import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ComponentType, REST, Routes, StringSelectMenuBuilder, TextChannel, ButtonBuilder } from "discord.js";
import { ThreadsAPI } from "../../../api/thread.js";
import { APIChannel, ButtonStyle } from "discord-api-types/v10";
import { createEmbed } from "@magicyan/discord";
import { PrismaClient } from "@prisma/client";


const RESTInstance = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
const threadsAPI = new ThreadsAPI(RESTInstance);
const cargoId = "1288150802283757599";

function gerarNumeroTicket(): string {
    const timestamp = Date.now(); 
    const ticketNumber = `${timestamp}`;
    return ticketNumber;
}

function registerTicket(assunto: string, descricao: string, numeroTicket: string) {
    console.log(`Ticket registrado. Número: ${numeroTicket}, Assunto: ${assunto}, Descrição: ${descricao}`);
}

new Responder({
    customId: "newTicket",
    type: ResponderType.Button,
    async run(interaction) {
        try {
            const sentMessage = await interaction.reply({
                embeds: [createEmbed({
                    color: "#2596be",
                    title: ` ***O usuário ${interaction.user.globalName} abriu um novo chamado.*** 🎫\n\n*Caso seja o usuário mencionado, prossiga o chamado. ✅*\n\nCaso contrário, \nPor favor aguarde até que este seja finalizado e essa mensagem desapareça para iniciar um novo chamado! 🕔`
                })],
                fetchReply: true, 
                ephemeral: false 
            });

            const answerButton = new ButtonBuilder()
                .setCustomId("answerButton") 
                .setLabel("Continuar Abertura do Chamado")
                .setStyle(ButtonStyle.Primary);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(answerButton);

            // Atualizar a mensagem com o botão de "Abrir Novo Chamado"
            await sentMessage.edit({ components: [row] });

            setTimeout(async () => {
                try {
                    await sentMessage.delete(); 
                } catch (error) {
                    console.error("Erro ao deletar o embed:", error);
                }
            }, 20000); // 20000ms = 20 segundos

        } catch (error) {
            console.error("Erro ao processar o comando:", error);
            await interaction.reply({ content: "Ocorreu um erro ao processar o chamado.", ephemeral: true });
        }
    },
});


new Responder({
    customId: "answerButton",
    type: ResponderType.Button,
    async run(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('ticketModal') 
                .setTitle('Abrir Novo Chamado');

            const assuntoInput = new TextInputBuilder()
                .setCustomId('assunto') 
                .setLabel('Assunto do Chamado')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const descricaoInput = new TextInputBuilder()
                .setCustomId('descricao')
                .setLabel('Dê uma descrição do chamado')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(assuntoInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(descricaoInput)
            );

            await interaction.showModal(modal);
        } catch (error) {
            console.error("Erro ao exibir o modal:", error);
            await interaction.reply({ content: "Ocorreu um erro ao abrir o modal.", ephemeral: true });
        }
    }
});

const prisma = new PrismaClient();


new Responder({
    customId: "ticketModal",
    type: ResponderType.Modal,
    async run(interaction) {
        try {
            const assunto = interaction.fields.getTextInputValue("assunto");
            const descricao = interaction.fields.getTextInputValue("descricao");

            const numeroTicket = gerarNumeroTicket();

            registerTicket(assunto, descricao, numeroTicket);

            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("newTicket")
                        .setPlaceholder("☰ Escolha uma das opções do chamado")
                        .addOptions([
                            { label: "Problema com Sistema", value: "Problema-Sistema" },
                            { label: "Problema com Equipamentos", value: "Problema-Equipamentos" },
                            { label: "Novo equipamento", value: "Novo-Equipamento" },
                            { label: "Instalação de Software", value: "Instalacao-Software" },
                            { label: "Problema com Impressoras", value: "Problema-Impressoras" },
                        ])
                );

            const message = await interaction.reply({
                content: `Seu chamado está quase pronto!\nAssunto: ${assunto}.\nEscolha uma das opções abaixo:`,
                components: [row],
                ephemeral: false,
                fetchReply: true 
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 15000 // Tempo limite de 15 segundos
            });

            collector.on('collect', async (selectInteraction) => {
                const selectedOption = selectInteraction.values[0];
                const threadTitle = `🚨 Chamado: Número Ticket: ${numeroTicket} | Tipo: ${selectedOption} | Usuário: ${interaction.user.globalName}`;

                const channelThreads = "1287785499322482711";

                const thread = await RESTInstance.post(Routes.threads(channelThreads), {
                    body: {
                        name: threadTitle,
                        type: 11, // THREAD_PRIVATE (exemplo de thread privada)
                    }
                }) as APIChannel;

                const threadId = thread.id; // Pegar o ID da thread recém-criada

                await threadsAPI.addMember(threadId, interaction.user.id);

                const threadChannel = await interaction.client.channels.fetch(threadId) as TextChannel;
                if (threadChannel) {
                    await threadChannel.send(`<@&${cargoId}> \n🚨 Um novo chamado foi aberto por **${interaction.user.globalName}**. 🎟️\n**Assunto:** ${assunto}.\n**Descrição:** ${descricao}\n**Número Ticket:** ${numeroTicket}`);
                }

                // Enviar chamado para o banco apos a seleção
                const chamado = await prisma.chamado.create({
                    data: {
                        requester: interaction.user.globalName as string,
                        subtitle: assunto,
                        description: descricao,
                        typeproblem: selectedOption,
                        ticket: numeroTicket,
                    }
                });

                const channel = await interaction.client.channels.fetch("1288150006112583854") as TextChannel;
                if (channel) {
                    await channel.send(`**Thread criada:** ${threadTitle}\n **Descricão:** ${descricao}\n **Data de criação:** ${new Date()}`);
                }

                try {
                    if (message) {
                        await message.delete();
                    }
                } catch (error) {
                    console.error("Erro ao deletar a mensagem:", error);
                }
            });

            collector.on('end', async (collected, reason) => {
                // Se o coletor terminou por tempo (sem interação), deletar a mensagem
                if (reason === 'time') {
                    try {
                        if (message) {
                            await message.delete(); // Deletar a mensagem se o tempo se esgotar
                        }
                    } catch (error) {
                        console.error("Erro ao deletar a mensagem após o tempo:", error);
                    }
                }
            });
        } catch (error) {
            console.error("Erro ao processar a seleção ou criar thread:", error);
            await interaction.followUp({ content: "Ocorreu um erro ao processar o chamado.", ephemeral: true });
        }
    }
});
