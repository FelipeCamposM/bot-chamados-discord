import { Command } from "#base";
import { ApplicationCommandType, ThreadChannel } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { toZonedTime } from 'date-fns-tz';

const prisma = new PrismaClient();

new Command({
    name: "encerrarchamado",
    description: "Envie isso para encerrar o chamado atual 🎫",
    type: ApplicationCommandType.ChatInput,

    async run(interaction) {
        const channel = interaction.channel;
        const userFinishTicket = interaction.user.globalName;

        if (channel instanceof ThreadChannel) {
            try {
                const threadTitle = channel.name;
                // Usamos regex para capturar o número do ticket no título da thread
                const chamadoNumber = threadTitle.match(/\d+/)?.[0];

                // Responde ao usuário que o chamado será encerrado
                await interaction.reply({ content: "Chamado encerrado, a Thread será fechada.", ephemeral: true });
                
                const now = new Date();
                const utcDate = toZonedTime(now, 'America/Sao_Paulo');

                if (chamadoNumber) {
                    // Atualiza o campo `finishedAt` no banco de dados
                    const updatedChamado = await prisma.chamado.update({
                        where: {
                            ticket: chamadoNumber,
                        },
                        data: {
                            finishedAt: utcDate,
                            finishedByUser: userFinishTicket,
                        },
                    });

                    if (!updatedChamado) {
                        await interaction.followUp({ content: "Chamado não encontrado no banco de dados.", ephemeral: true });
                        return;
                    }
                }

                // Aguarda alguns milissegundos e deleta a thread
                setTimeout(async () => {
                    await channel.delete();
                }, 3000);

            } catch (error) {
                console.error("Erro ao tentar encerrar o chamado:", error);
                await interaction.followUp({ content: "Houve um erro ao tentar encerrar o chamado.", ephemeral: true });
            }
        } else {
            await interaction.reply({ content: "Este comando só pode ser usado dentro de uma thread.", ephemeral: true });
        }
    }
});
