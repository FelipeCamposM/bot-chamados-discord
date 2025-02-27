import { Responder, ResponderType } from "#base";
import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, ComponentType, REST, Routes, StringSelectMenuBuilder, TextChannel, ButtonBuilder } from "discord.js";
import { ThreadsAPI } from "../../../api/thread.js";
import { APIChannel, ButtonStyle } from "discord-api-types/v10";
import { createEmbed } from "@magicyan/discord";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { formatDate } from "../../../functions/utility/formatDate.js";

const RESTInstance = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
const threadsAPI = new ThreadsAPI(RESTInstance);
const cargoId = "1288150802283757599";
const channelThreads = "1287785499322482711";



function gerarNumeroTicket(): string {
    const timestamp = Date.now(); 
    const ticketNumber = `${timestamp}`;
    return ticketNumber;
}

function registerTicket(assunto: string, descricao: string, email: string, numeroTicket: string) {
    console.log(`Ticket registrado. Número: ${numeroTicket}, Assunto: ${assunto}, Email: ${email}, Descrição: ${descricao}`);
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
                .setCustomId("ticketModal") 
                .setTitle("Abrir Novo Chamado");

            const assuntoInput = new TextInputBuilder()
                .setCustomId("assunto") 
                .setLabel("Assunto do Chamado")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const descricaoInput = new TextInputBuilder()
                .setCustomId("descricao")
                .setLabel("Dê uma descrição do chamado")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);
            
            const emailInput = new TextInputBuilder()
                .setCustomId("email")
                .setLabel("Envie seu email para receber avisos")
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(assuntoInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(descricaoInput),
                new ActionRowBuilder<TextInputBuilder>().addComponents(emailInput)
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
            const email = interaction.fields.getTextInputValue("email");

            const numeroTicket = gerarNumeroTicket();

            registerTicket(assunto, descricao, email, numeroTicket);

            const row = new ActionRowBuilder<StringSelectMenuBuilder>()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("newTicket")
                        .setPlaceholder("☰ Escolha uma das opções 📝")
                        .addOptions([
                            { label: "📌 Winthor 🟠", value: "Winthor" },
                            { label: "📌 Ellévti 🔵", value: "Ellevti" },
                            { label: "📌 Whatsapp 🟢", value: "Whatsapp" },
                            { label: "📌 Cadastro de Usuários 👤", value: "Cadastro-Usuario" },
                            { label: "📌 Problema com Equipamentos 🛠️", value: "Problema-Equipamentos" },
                            { label: "📌 Problema com Impressoras 🖨️", value: "Problema-Impressoras" },
                            { label: "📌 Problema com o Site 🌐", value: "Problema-Site" },
                            { label: "📌 Instalação de Software 💾", value: "Instalacao-Software" },
                            { label: "📌 Requisição de equipamento 🛠️", value: "Requisicao-Equipamento" },
                            { label: "📌 Obter Ajuda T.I. 💻", value: "Ajuda-TI" },
                        ])
                );

            const message = await interaction.reply({
                content: `🎫 **Seu chamado está quase pronto!**\nAssunto: ${assunto}.\n👉 Escolha uma das opções abaixo para classificar e finalizar: ⬇️`,
                components: [row],
                ephemeral: false,
                fetchReply: true 
            });

            const collector = message.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 30000 // Tempo limite de 30 segundos
            });

            collector.on("collect", async (selectInteraction) => {
                const selectedOption = selectInteraction.values[0];
                const threadTitle = `🚨🎫 Usuário: ${interaction.user.globalName} | Tipo: ${selectedOption} | Número Ticket: ${numeroTicket}`;


                const thread = await RESTInstance.post(Routes.threads(channelThreads), {
                    body: {
                        name: threadTitle,
                        type: 12, // THREAD_PRIVATE (exemplo de thread privada)
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
                        email: email,
                    }
                });
                console.log(chamado);
                
                try {
                    if (message) {
                        await message.delete();
                    }
                } catch (error) {
                    console.error("Erro ao deletar a mensagem:", error);
                }
                
                // Envia o e-mail quando todas as seleções são feitas
                await sendEmail();
                console.log("Envio do e-mail concluído!");
            });

            collector.on("end", async (collected, reason) => {
                console.log(`COLETOR FINALIZADO: ${collected}`);
                if (reason === "time") {
                    try {
                        if (message) {
                            await message.delete(); // Deletar a mensagem se o tempo se esgotar
                        }
                    } catch (error) {
                        console.error("Erro ao deletar a mensagem após o tempo:", error);
                    }
                }
            });

            console.log("Iniciando envio do email...");

            async function sendEmail() {
                console.log("Envio do email iniciado!");

                const transporter = nodemailer.createTransport({
                    service: "outlook",
                    auth: {
                        user: process.env.EMAIL,
                        pass: process.env.PASSWORD,
                    },
                });

                async function getInfosEmail() {
                    console.log("Pegando informações do e-mail...");

                    try {
                        const infosEmail = await prisma.chamado.findUnique({
                            where: { ticket: numeroTicket },
                            select: {
                                typeproblem: true,
                                subtitle: true,
                                description: true,
                                requester: true,
                                email: true,
                                createdAt: true,
                            },
                        });

                        if (infosEmail) {
                            return infosEmail;
                        } else {
                            console.log("Dados não encontrados");
                            return null;
                        }
                    } catch (error) {
                        console.error("Erro ao tentar encontrar o e-mail:", error);
                        return null;
                    }
                }

                const emailData = await getInfosEmail();

                
                try {
                        if (emailData) {
                            const { typeproblem, subtitle, description, requester, email, createdAt } = emailData;
                        
                        await transporter.sendMail({
                            from: process.env.EMAIL,
                            to: email,
                            subject: "📝 Seu Chamado foi aberto!",
                            text: `🎫 Detalhes do Chamado:\n\n👤 Solicitante: ${requester}\n📅 Data Criação do Chamado: ${createdAt}\n📋 Tipo do Problema: ${typeproblem}\n📋 Assunto: ${subtitle}\n📋 Descrição: ${description}\n\n✅ Esse e-mail foi enviado automaticamente.`,
                            html: `
                                <div style="font-family: Arial, sans-serif; color: #333;">
                                    <h2 style="color: #2596be;">🎫 Detalhes do Chamado</h2>
                                    <p><strong>👤 Solicitante:</strong> ${requester}</p>
                                    <p><strong>📅 Data Criação do Chamado:</strong> ${formatDate(createdAt as Date)}</p>
                                    <p><strong>📋 Tipo do Problema:</strong> ${typeproblem}</p>
                                    <p><strong>📋 Assunto:</strong> ${subtitle}</p>
                                    <p><strong>📋 Descrição:</strong> ${description}</p>
                                    <hr>
                                    <p>✅ <em>Esse e-mail foi enviado automaticamente.</em></p>
                                </div>
                            `,
                        });
                        console.log("E-mail enviado com sucesso!");
                    }
                } catch (error) {
                    console.error("Erro ao enviar o e-mail:", error);
                }
            }

        } catch (error) {
            console.error("Erro ao processar a seleção ou criar thread:", error);
            await interaction.followUp({ content: "Ocorreu um erro ao processar o chamado.", ephemeral: true });
        }
    }
});
