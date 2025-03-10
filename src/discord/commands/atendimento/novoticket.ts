import { Command, URLStore } from "#base";
import { createEmbed } from "@magicyan/discord";
import { ApplicationCommandType, ButtonBuilder, ButtonStyle, TextChannel, ActionRowBuilder, ComponentType, PermissionFlagsBits } from "discord.js";

const canalEmbedId = "1286347876208873553";
const servidorId = "1285697402409582736";

new Command({
    name: "novoticket",
    description: "Envie isso para abrir um novo Chamado 🎫",
    type: ApplicationCommandType.ChatInput,
    defaultMemberPermissions: PermissionFlagsBits.Administrator,
    async run(interaction) {
        // Armazenar o channelId e o ticket no URLStore
        const urlStore = new URLStore();
        urlStore.set("channelId", interaction.channelId);
        urlStore.set("ticket", interaction.user.id);

        // Criar o embed
        const embed = createEmbed({
            title: "**Envie aqui o seu Chamado** 🎫 🚨",
            description: "**Abrindo um chamado:** 🎫\n\nPara abrir seu chamado clique em " + "Abrir novo chamado" + " e selecione a opção desejada.\n\n**Redirecionando:** ↗️\n\nAo clicar na opção selecionada, você será redirecionado para um canal aonde você irá digitar sobre o que se trata o chamado.\n\n**Quando for resolvido:** ✅\n\nAo ser resolvido, será enviado uma mensagem no seu privado avisando que o chamado foi resolvido",
            color: 0x00FF00, // Cor verde
            url: `https://discord.com/channels/${servidorId}/${canalEmbedId}` // URL do canal
        });

        // Botão para abrir um novo chamado
        let button = new ButtonBuilder()
            .setCustomId("newTicket")
            .setLabel("Abrir um novo Chamado +")
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(button);

        // Enviar o embed para um canal específico (use o ID real do canal)
        const channel = await interaction.client.channels.fetch(canalEmbedId) as TextChannel;
        if (channel) {
            const sentMessage = await channel.send({ embeds: [embed], components: [row] });

            // Coletor para detectar o clique no botão
            const collector = sentMessage.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 60000 // 1 minuto
            });

            collector.on("collect", async i => {
                if (i.customId === "newTicket") {
                    // Desativar o botão e começar o contador
                    let countdown = 60;

                    // Atualizar o estilo e desativar o botão com o contador
                    button = new ButtonBuilder()
                        .setCustomId("newTicket")
                        .setLabel(`Aguarde ${countdown}s para abrir novamente`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true); // Desativar o botão

                    const updatedRow = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(button);

                    // Atualizar a mensagem com o botão desativado
                    await i.update({ components: [updatedRow] });

                    // Atualizar o botão a cada segundo com o tempo restante
                    const interval = setInterval(async () => {
                        countdown -= 1;
                        button.setLabel(`Aguarde ${countdown}s para abrir novamente`);
                        const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
                        await sentMessage.edit({ components: [updatedRow] });

                        // Quando o tempo acabar, reativar o botão
                        if (countdown <= 0) {
                            clearInterval(interval);
                            button = new ButtonBuilder()
                                .setCustomId("newTicket")
                                .setLabel("Abrir um novo Chamado +")
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(false); // Reativar o botão

                            const reactivatedRow = new ActionRowBuilder<ButtonBuilder>()
                                .addComponents(button);

                            await sentMessage.edit({ components: [reactivatedRow] });
                        }
                    }, 1000); // Atualizar a cada segundo (1000ms)
                }
            });
        }

        // Responder de forma invisível para o usuário que executou o comando
        interaction.reply({ ephemeral: true, content: "Embed fixado no canal com sucesso!" });
    }
});
