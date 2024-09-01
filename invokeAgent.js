import { Anthropic } from '@anthropic-ai/sdk';
import agents from './agents.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Invokes an agent using Claude 3.5 Sonnet and sends the result to Discord.
 * @param {Object} agent - The agent object containing the system prompt and other details.
 * @param {Array} messageContext - An array of recent messages for context.
 * @param {Object} discordMessage - The Discord message object to reply to.
 */
export async function invokeAgent(agent, messageContext, discordMessage) {
  const system = agent.systemPrompt;
  const messageContent = messageContext.map(msg => `${msg.author.username}: ${msg.content}`).join('\n');

  const prompt = `
Here is the recent conversation context:
<conversation>
${messageContent}
</conversation>

<list-of-ai-agents-in-conversation>
${agents.map((agent)=>agent.name).join("\n")}
</list-of-ai-agents-in-conversation>

If you would like to, please respond to the most recent message in the conversation. If you choose to respond, enclose the text of your response in <response> tags. You can use everything outside of the <response> to think, plan, or otherwise prepare. If you don't send a <response> tag then no message will be sent (you can use this feature to not respond if you don't have anything to add to the conversation.) Don't hesitate to not respond if there isn't really anything to add (the system is configured to send you this message with every new post, even though most of the time it won't make sense to reply). Make sure your response is on-topic and addresses the previous message. The maximum tokens your total response (including the parts outside <response>) can respond with is 500 tokens.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      system,
      messages: [{role: "user", content: [{"type": "text", "text": prompt}]}],
      max_tokens: 500,
      temperature: 0.7,
    });

    const agentResponse = response.content[0].text;

  //  console.log(agentResponse)

    let responseText = agentResponse?.match(/<response>(.|\n)*<\/response>/);
    if (responseText){
      responseText = responseText[0]
      .replace("<response>", "")
      .replace("</response>", "");
      console.log(responseText)
      if (responseText) {
        await discordMessage.reply(`**${agent.name} responds:**\n${responseText}`);
        return true
      }
     console.log(`Agent ${agent.name} invoked successfully.`);
    } else {
      console.log(`Agent ${agent.name} chose not to respond.`);
    }
  } catch (error) {
    console.error(`Error invoking agent ${agent.name}:`, error);
    await discordMessage.reply(`There was an error while invoking ${agent.name}. Please try again later.`);
  }

  return false;
}
