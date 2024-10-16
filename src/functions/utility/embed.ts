import { Command } from "#base";
import { ApplicationCommandType } from "discord.js";

new Command({
    name: "profile",
    type: ApplicationCommandType.User,
    
    async run(interaction) {
        const { targetUser } = interaction;
        interaction.reply({ ephemeral, content: `${targetUser}"s profile` });
    },
});