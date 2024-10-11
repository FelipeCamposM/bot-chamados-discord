import { Command } from "#base";
import { ApplicationCommandType, CommandInteraction, TextChannel, PermissionsBitField } from "discord.js";

new Command({
    name: "limparchat",
    description: "Utilize para limpar o chat.",
    type: ApplicationCommandType.ChatInput,
    
    async run(interaction: CommandInteraction) {
        // Verifica se o usuário tem permissão para deletar mensagens
        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages)) {
            await interaction.reply({
                content: "Você não tem permissão para deletar mensagens.",
                ephemeral: true
            });
            return;
        }

        const channel = interaction.channel;

        // Garante que o canal é um canal de texto
        if (channel instanceof TextChannel) {
            try {
                // Busca as últimas 100 mensagens do canal
                const messages = await channel.messages.fetch({ limit: 100 });

                // Deleta as mensagens em massa
                await channel.bulkDelete(messages, true);
                
                await interaction.reply({
                    content: "O chat foi limpo com sucesso!",
                    ephemeral: true
                });
            } catch (error) {
                console.error("Erro ao tentar limpar o chat:", error);
                await interaction.reply({
                    content: "Houve um erro ao tentar limpar o chat.",
                    ephemeral: true
                });
            }
        } else {
            await interaction.reply({
                content: "Esse comando só pode ser usado em canais de texto.",
                ephemeral: true
            });
        }
    }
});
