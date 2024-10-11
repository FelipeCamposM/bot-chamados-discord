import { Command } from "#base";
import { createRow } from "@magicyan/discord";
import { ApplicationCommandType, ButtonBuilder, ButtonStyle } from "discord.js";

new Command({
	name: "ping",
	description: "Replies with pong 🏓",
	type: ApplicationCommandType.ChatInput,
	run(interaction){
		const row = createRow(
			new ButtonBuilder({customId: "test", label: "Teste", style: ButtonStyle.Success})
		);
		
		interaction.reply({ephemeral, components: [row]});
	}
});