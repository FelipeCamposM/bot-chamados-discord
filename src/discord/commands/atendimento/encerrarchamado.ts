import { Command } from "#base";
import { ApplicationCommandType, ThreadChannel, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { toZonedTime } from "date-fns-tz";
import nodemailer from "nodemailer";
import { formatDate } from "../../../functions/utility/formatDate.js";


const prisma = new PrismaClient();

new Command({
    name: "encerrarchamado",
    description: "Envie isso para encerrar o chamado atual 🎫",
    type: ApplicationCommandType.ChatInput,

    async run(interaction) {

        try {

            //id do cargo
            const allowedRoleId = "1328366427551432867";

            // Verifica se o usuário tem o cargo permitido
            const member = interaction.member;
            if (!member.roles.cache.has(allowedRoleId)) {
                await interaction.reply({
                    content: "Você não tem permissão para usar este comando.",
                    ephemeral: true,
                });
                return;
            }

            const modal = new ModalBuilder()
                .setCustomId("encerramentoModal")
                .setTitle("Mensagem de encerramento:");

            const msgfinalInput = new TextInputBuilder()
                .setCustomId("msgfinal") 
                .setLabel("Assunto do Chamado")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(msgfinalInput),
            );

            await interaction.showModal(modal).catch((error) => {
                console.error("Erro ao exibir o modal:", error);
                interaction.reply({ content: "Ocorreu um erro ao abrir o modal.", ephemeral: true });
                return;
            });

            // Aguarda a resposta ao modal, sem bloquear a execução do restante do código
    interaction.awaitModalSubmit({
        time: 60000, // Tempo limite para o usuário responder (em ms)
        filter: (i) => i.customId === "encerramentoModal" && i.user.id === interaction.user.id,
    }).then(async (submittedInteraction) => {
        const msgfinal = submittedInteraction.fields.getTextInputValue("msgfinal");

    // Responde ao usuário imediatamente
    // submittedInteraction.reply({ content: "Sua mensagem de encerramento foi recebida. Estamos processando o fechamento do chamado.", ephemeral: true });
    submittedInteraction.reply({ content: "✅ ***O assunto a ser tratado no chamado foi concluído*** ✅\n\n **Esse chamado será encerrado. ❎**\nObrigado pela atenção.", ephemeral: false });

    const channel = interaction.channel;
    const userFinishTicket = interaction.user.globalName;

    if (channel instanceof ThreadChannel) {
        const threadTitle = channel.name;
        const chamadoNumber = threadTitle.match(/\d+/)?.[0];

        if (chamadoNumber) {
            const now = new Date();
            const utcDate = toZonedTime(now, "America/Sao_Paulo");

            try {
                const updatedChamado = await prisma.chamado.update({
                    where: {
                        ticket: chamadoNumber,
                    },
                    data: {
                        finishedAt: utcDate,
                        finishedByUser: userFinishTicket,
                        reasonFinished: msgfinal,
                    },
                });

                if (!updatedChamado) {
                    console.log("Chamado não encontrado no banco de dados.");
                    return;
                }

                // Executa o envio de email em segundo plano
                sendEmail(chamadoNumber);
            } catch (error) {
                console.error("Erro ao atualizar o banco de dados:", error);
            }

            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (error) {
                    console.error("Erro ao deletar a thread:", error);
                }
            }, 3000);
        } else {
            console.log("Número do chamado não encontrado no título da thread.");
        }
    } else {
        console.log("Este comando só pode ser usado dentro de uma thread.");
    }
})
.catch((error) => {
    console.error("Erro ao aguardar a resposta do modal:", error);
    interaction.followUp({ content: "Ocorreu um erro ao processar a resposta do modal.", ephemeral: true });
});

                // Envia o e-mail quando todas as seleções são feitas
                async function sendEmail(chamadoNumber: string) {


                const transporter = nodemailer.createTransport({
                    service: "outlook",
                    auth: {
                        user: process.env.EMAIL,
                        pass: process.env.PASSWORD,
                    },
                });
    
                
                
                    const emailData = await prisma.chamado.findUnique({
                    where: {
                        ticket: chamadoNumber,
                    },
                    select: {
                        typeproblem: true,
                        subtitle: true,
                        description: true,
                        requester: true,
                        email: true,
                        attributedAt: true,
                        attributedByUser: true,
                        createdAt: true,
                        finishedAt: true,
                        finishedByUser: true,
                        reasonFinished: true,
                        },
                    });

                    
                    if (emailData) {
                        const { typeproblem, subtitle, description, requester, email, createdAt, attributedAt, attributedByUser, finishedAt, finishedByUser, reasonFinished } = emailData;

                        const info = await transporter.sendMail({
                            from: process.env.EMAIL, //email que vai enviar a mensagem
                            to: email, //email que vai receber a solicitação
                            subject: "📝 O Chamado foi encerrado!",
                            text: `🎫 Detalhes do Chamado:
                            
                            👤 Solicitante: ${requester}
                            📅 Data Criação do Chamado: ${formatDate(createdAt as Date)}
                            📋 Tipo do Problema: ${typeproblem}
                            📋 Assunto: ${subtitle}
                            📋 Descrição: R$ ${description}
                            📅 Data Solicitação: ${formatDate(attributedAt as Date)}
                            👤 Seu chamado foi atendido por: ${attributedByUser}
                            📅 Data de Encerramento: ${formatDate(finishedAt as Date)}
                            👤 Seu chamado foi encerrado por: ${finishedByUser}
                            
                            📜 Mensagem Final de Encerramento: ${reasonFinished}
                            
                            ✅ Esse e-mail foi enviado automaticamente.`,
                            
                        html: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2 style="color: #2596be;">🎫 Detalhes do Chamado</h2>
                            <p><strong>👤 Solicitante:</strong> ${requester}</p>
                            <p><strong>📅 Data Criação do Chamado: ${formatDate(createdAt as Date)}</p>
                            <p><strong>📋 Tipo do Problema:</strong> ${typeproblem}</p>
                            <p><strong>📋 Assunto:</strong> ${subtitle}</p>
                            <p><strong>📋 Descrição:</strong> ${description}</p>
                            <p><strong>📅 Data de Atribuição do Chamado:</strong> ${formatDate(attributedAt as Date)}</p>
                            <p><strong>👤 Seu chamado será atendido por:</strong> ${attributedByUser}</p>
                            <p><strong>📅 Data de Encerramento:</strong> ${formatDate(finishedAt as Date)}</p>
                            <p><strong>👤 Seu chamado foi encerrado por:</strong> ${finishedByUser}</p>
                            
                            <p><strong>📜 Mensagem Final de Encerramento:</strong> ${reasonFinished}</p>
                            
                            <hr>
                            
                            <hr>
                            <p>✅ <em>Esse e-mail foi enviado automaticamente.</em></p>
                        </div>
                        `,
                    });
                    console.log("Essas são as informações do e-mail:", info);
                    console.log("E-mail de encerramento enviado com sucesso!");
                    } else {
                        console.log("Erro ao enviar o e-mail de encerramento");
                    }
                }

        } catch (error) {
            console.error("Erro ao exibir o modal ou aguardar resposta:", error);
            if (!interaction.replied) {
                await interaction.reply({ content: "Ocorreu um erro ao abrir o modal.", ephemeral: true });
            }
        }
    }
});