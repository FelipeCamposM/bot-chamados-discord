import { Responder, ResponderType } from "#base";
import { createRow } from "@magicyan/discord";
import { StringSelectMenuBuilder } from "discord.js";

new Responder({
    customId: "test",
    type: ResponderType.Button, cache: "cached",
    async run(interaction) {
        const row = createRow(
            new StringSelectMenuBuilder({
                customId: "test",
                placeholder: "test",
                options: [
                    { label: "a", value: "a" },
                    { label: "b", value: "b" },
                    { label: "c", value: "c" }
                ]
            })
        );

        interaction.update({components: [row]});
    },
});