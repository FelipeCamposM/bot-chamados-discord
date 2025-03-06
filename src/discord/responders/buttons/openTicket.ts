import { Responder, ResponderType } from "#base";
import { ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle, REST, Routes, StringSelectMenuBuilder, TextChannel } from "discord.js";
import { ThreadsAPI } from "../../../api/thread.js";
import { APIChannel } from "discord-api-types/v10";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { formatDate } from "../../../functions/utility/formatDate.js";

const RESTInstance = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
const threadsAPI = new ThreadsAPI(RESTInstance);
const cargoId = "1328366427551432867";
const channelThreads = "1344713682340286464";

function gerarNumeroTicket(): string {
    const timestamp = Date.now(); 
    return `${timestamp}`;
}

const selectionCache = new Map<string, string>();
const prisma = new PrismaClient();

// Responder para o botão "newTicket" que exibe o menu de opções
new Responder({
    customId: "newTicket",
    type: ResponderType.Button,
    cache: "cached",
    async run(interaction) {
        try {
            const row = new ActionRowBuilder<StringSelectMenuBuilder>({ components: [
                new StringSelectMenuBuilder({
                    customId: "selectOption",
                    placeholder: "☰ Escolha uma das opções 📝",
                    options: [
                        { label: "Winthor", emoji: "🟠", value: "Winthor" },
                        { label: "Ellévti", emoji: "🔵", value: "Ellevti" },
                        { label: "Whatsapp", emoji: "🟢", value: "Whatsapp" },
                        { label: "ION", emoji: "⚪", value: "Ion" },
                        { label: "Cadastro de Usuários", emoji: "👤", value: "Cadastro-Usuario" },
                        { label: "Problema com Equipamentos", emoji: "🛠️", value: "Problema-Equipamentos" },
                        { label: "Problema com Impressoras", emoji: "🖨️", value: "Problema-Impressoras" },
                        { label: "Problema com o Site", emoji: "🌐", value: "Problema-Site" },
                        { label: "Instalação de Software", emoji: "💾", value: "Instalacao-Software" },
                        { label: "Requisição de Equipamento", emoji: "🛠️", value: "Requisicao-Equipamento" },
                        { label: "Obter Ajuda T.I.", emoji: "💻", value: "Ajuda-TI" },
                    ],
                }),
            ]});

            await interaction.reply({
                content: "**👉 Escolha uma das opções abaixo para selecionar como será feita a consulta: ⬇️**",
                components: [row],
                ephemeral: true,
            });
        } catch (error) {
            console.error("Erro ao processar a seleção ou criar thread:", error);
            await interaction.followUp({ content: "Ocorreu um erro ao processar o chamado.", ephemeral: true });
        }
    },
});

// Responder para o select menu, que exibe o modal
new Responder({
    customId: "selectOption",
    type: ResponderType.StringSelect,
    cache: "cached",
    async run(interaction) {
        const selectedValue = interaction.values[0];
        console.log("Foi selecionado a opção:", selectedValue);
        
        // Armazena a opção selecionada para uso no modal
        selectionCache.set(interaction.user.id, selectedValue);
        
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
            await interaction.followUp({ content: "Ocorreu um erro ao abrir o modal.", ephemeral: true });
        }
    }
});

// Responder para o modal submission
new Responder({
    customId: "ticketModal",
    type: ResponderType.Modal,
    cache: "cached",
    async run(modalInteraction) {
        try {
            // Deferindo a resposta imediatamente
            await modalInteraction.deferReply({ ephemeral: true });

            const assunto = modalInteraction.fields.getTextInputValue("assunto");
            const descricao = modalInteraction.fields.getTextInputValue("descricao");
            const email = modalInteraction.fields.getTextInputValue("email");
            const selectedOption = selectionCache.get(modalInteraction.user.id);
            const numeroTicket = gerarNumeroTicket();

            const threadTitle = `🚨🎫 Usuário: ${modalInteraction.user.globalName} | Tipo: ${selectedOption} | Número Ticket: ${numeroTicket}`;
            
            const thread = await RESTInstance.post(Routes.threads(channelThreads), {
                body: {
                    name: threadTitle,
                    type: 12, // THREAD_PRIVATE
                }
            }) as APIChannel;

            const threadId = thread.id;
            await threadsAPI.addMember(threadId, modalInteraction.user.id);

            const threadChannel = await modalInteraction.client.channels.fetch(threadId) as TextChannel;
            if (threadChannel) {
                await threadChannel.send(
                    `<@&${cargoId}> \n🚨 Um novo chamado foi aberto por **${modalInteraction.user.globalName}**. 🎟️\n**Assunto:** ${assunto}.\n**Descrição:** ${descricao}\n**Número Ticket:** ${numeroTicket}`
                );
            }

            // Registra o chamado no banco de dados
            const chamado = await prisma.chamado.create({
                data: {
                    requester: modalInteraction.user.globalName as string,
                    subtitle: assunto,
                    description: descricao,
                    typeproblem: selectedOption as string,
                    ticket: numeroTicket,
                    email: email,
                }
            });
            console.log(chamado);
            
            // Envia o e-mail de notificação
            await sendEmail();
            console.log("Envio do e-mail concluído!");

            // Finaliza a interação editando a resposta previamente deferida
            await modalInteraction.editReply({ content: "Seu chamado foi criado com sucesso!" });

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
                        return infosEmail || null;
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
            console.error("Erro ao processar o chamado do modal:", error);
            // Caso ocorra erro, edite a resposta da interação deferida
            await modalInteraction.editReply({ content: "Ocorreu um erro ao processar o chamado." });
        }
    }
});
