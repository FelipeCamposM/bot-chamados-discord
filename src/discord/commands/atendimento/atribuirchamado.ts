import { Command } from "#base";
import {
  ApplicationCommandType,
  PermissionFlagsBits,
  ThreadChannel,
} from "discord.js";
import { PrismaClient } from "@prisma/client";
import { toZonedTime } from "date-fns-tz";
import nodemailer from "nodemailer";
import { formatDate } from "../../../functions/utility/formatDate.js";

const prisma = new PrismaClient();

new Command({
  name: "atribuirchamado",
  description: "Envie isso para atribuir o chamado à você 🎫",
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,

  async run(interaction) {
    const channel = interaction.channel;
    const userAttributeTicket = interaction.user.globalName;

    if (channel instanceof ThreadChannel) {
      try {
        const threadTitle = channel.name;
        // Usamos regex para capturar o número do ticket no título da thread
        const chamadoNumber = threadTitle.match(/Ticket:\s*(\d+)/)?.[1];
        console.log("Numero do chamado: 🔢", chamadoNumber);

        // Responde ao usuário que o chamado será atendido pelo departamento de TI
        await interaction.reply({
          content: `👤 Este chamado está sendo atendido por ***${userAttributeTicket}*** 💻`,
          ephemeral: false,
        });

        const now = new Date();
        const utcDate = toZonedTime(now, "America/Sao_Paulo");

        if (chamadoNumber) {
          // Atualiza o campo `attributedAt` e o `attributedByUser` no banco de dados
          const updatedChamado = await prisma.chamado.update({
            where: {
              ticket: chamadoNumber,
            },
            data: {
              attributedAt: utcDate,
              attributedByUser: userAttributeTicket,
            },
          });

          if (!updatedChamado) {
            await interaction.followUp({
              content: "Chamado não encontrado no banco de dados.",
              ephemeral: true,
            });
            return;
          }

          await sendEmail();
        }

        await interaction.followUp({
          content: "Chamado atribuído com sucesso!",
          ephemeral: true,
        });

        console.log("O e-mail está sendo enviado para atribuir o chamado...");
        // Envia o e-mail quando todas as seleções são feitas
        async function sendEmail() {
          const transporter = nodemailer.createTransport({
            service: "outlook",
            auth: {
              user: process.env.EMAIL,
              pass: process.env.PASSWORD,
            },
          });

          async function getInfosEmail() {
            try {
              console.log("Pegando informações do e-mail...");
              const infosEmail = await prisma.chamado.findUnique({
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
                },
              });

              if (infosEmail) {
                const emailData = {
                  typeproblem: infosEmail.typeproblem,
                  subtitle: infosEmail.subtitle,
                  description: infosEmail.description,
                  requester: infosEmail.requester,
                  email: infosEmail.email,
                  attributedAt: infosEmail.attributedAt,
                  attributedByUser: infosEmail.attributedByUser,
                  createdAt: infosEmail.createdAt,
                };

                return emailData;
              } else {
                console.log("Dados não encontrados");
              }

              console.log(infosEmail);
            } catch (error) {
              console.error("Erro ao tentar encontrar o e-mail:", error);
              return null;
            }
            return null;
          }

          const emailData = await getInfosEmail();

          try {
            console.log("Enviando o e-mail...");

            if (emailData) {
              const {
                typeproblem,
                subtitle,
                description,
                requester,
                email,
                createdAt,
                attributedAt,
                attributedByUser,
              } = emailData;

              const info = await transporter.sendMail({
                from: process.env.EMAIL, //email que vai enviar a mensagem
                to: email, //email que vai receber a solicitação
                subject: "📝 O Chamado foi atribuído!",
                text: `🎫 Detalhes do Chamado:
                          
                          👤 Solicitante: ${requester}
                          📅 Data Criação do Chamado: ${formatDate(
                            createdAt as Date
                          )}
                          📋 Tipo do Problema: ${typeproblem}
                          📋 Assunto: ${subtitle}
                          📋 Descrição: ${description}
                          📅 Data Solicitação: ${formatDate(
                            attributedAt as Date
                          )}
                          👤 Seu chamado será atendido por: ${attributedByUser}
                          
                          ✅ Esse e-mail foi enviado automaticamente.`,

                html: `
                            <div style="font-family: Arial, sans-serif; color: #333;">
                              <h2 style="color: #2596be;">🎫 Detalhes do Chamado</h2>
                              <p><strong>👤 Solicitante:</strong>  ${requester}</p>
                              <p><strong>📅 Data Criação do Chamado:</strong> ${formatDate(
                                createdAt as Date
                              )}</p>
                              <p><strong>📋 Tipo do Problema:</strong> ${typeproblem}</p>
                              <p><strong>📋 Assunto:</strong> ${subtitle}</p>
                              <p><strong>📋 Descrição:</strong> ${description}</p>
                              <p><strong>📅 Data de Atribuição do Chamado:</strong> ${formatDate(
                                attributedAt as Date
                              )}</p>
                              <p><strong>👤 Seu chamado será atendido por:</strong> ${attributedByUser}</p>
                              
                              <hr>
                              
                              <hr>
                              <p>✅ <em>Esse e-mail foi enviado automaticamente.</em></p>                              
                            </div>
                          `,
              });
              console.log(info);
              console.log("E-mail de atribuição enviado com sucesso!");
            }
          } catch (error) {
            console.error("Erro ao enviar o e-mail:", error);
          }
        }
      } catch (error) {
        console.error("Erro ao tentar atribuir o chamado:", error);
        await interaction.followUp({
          content: "Houve um erro ao tentar atribuir o chamado.",
          ephemeral: true,
        });
      }
    } else {
      await interaction.reply({
        content: "Este comando só pode ser usado dentro de uma thread.",
        ephemeral: true,
      });
    }
  },
});
