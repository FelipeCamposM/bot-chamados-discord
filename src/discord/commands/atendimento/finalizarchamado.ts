import { Responder, ResponderType } from "#base";
import { createRow } from "@magicyan/discord";
import { ComponentType, REST, Routes, StringSelectMenuBuilder } from "discord.js";


const RESTInstance = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);

new Responder({
    customId: "openTicket",
    type: ResponderType.Button, cache: "cached",
    async run(interaction) {
        await interaction.reply({ ephemeral: true, content: "Ticket aberto com sucesso!" });
    }
});


new Responder({
    customId: "ticketModal",
    type: ResponderType.Modal, cache: "cached",
    async run(interaction) {
        const { fields } = interaction;
        const assunto = fields.getTextInputValue("assunto");
        const usuario = fields.getTextInputValue("usuario");
        
        const row = createRow(
            new StringSelectMenuBuilder({
                customId: "newTicket",
                placeholder: "Escolha uma das opções do chamado",
                options: [
                    { label: "Problema com Sistema", value: "Problema-Sistema" },
                    { label: "Novo equipamento", value: "Novo-Equipamento" },
                    { label: "Instalação de Software", value: "Instalacao-Software" },
                    { label: "Problema com Impressoras", value: "Problema-Impressoras" },
                ]
            })
        );
        
        console.log(row);

        await interaction.reply({ ephemeral: true, content: `Registrado como ${usuario}` });

        const channel = interaction.channel;

        if (!channel) {
            await interaction.followUp({ content: "Erro: O canal não foi encontrado.", ephemeral: true });
            return;
        }

        // Escutar a interação da seleção
        interaction.channel.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 15000 })
            .then(async selectInteraction => {
                const selectedOption = selectInteraction.values[0];
                const threadTitle = `Chamado: ${selectedOption} 🚨 Assunto: ${assunto} Usuário: ${interaction.user.tag}`; // Título da thread com base na opção

                

                // Criar a thread após a seleção
                const thread = await RESTInstance.post(Routes.threads(channel.id), {
                    body: {
                        name: threadTitle,
                        type: 12, // THREAD_PRIVATE (exemplo)
                    }
                });

                console.log(thread);

                await selectInteraction.reply(`Thread criada: ${threadTitle}`);
            })
            .catch(console.error);
    },
    
});
