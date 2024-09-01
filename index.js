import { Client, GatewayIntentBits } from 'discord.js';
import sleep from 'sleep-promise';
import checkAgents from './checkAgents.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});


client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});


client.on('messageCreate', async (message) => {
  if (message.channel.name === 'general') {
    // Fetch the last 25 messages (including the current one)
    const messages = await message.channel.messages.fetch({ limit: 5 });
    
    // Convert the messages to an array and reverse it to get chronological order
    const lastMessages = Array.from(messages.values()).reverse();

    // Call checkAgents with the last 25 messages
    await checkAgents(lastMessages, message);

    await sleep(5000)
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
