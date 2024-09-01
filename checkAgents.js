
import agents from './agents.js';
import { Anthropic } from '@anthropic-ai/sdk';
import { invokeAgent } from './invokeAgent.js';
import fs from "fs";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
export default async function checkAgents(lastMessages, message) {
  const messageContent = lastMessages.map(msg => `<message>\n${msg.content}\n</message>\n`).join('\n');

  fs.writeFileSync('conversation.txt', messageContent);

  let agentProbabilities = [];

  // Get the name of the last agent who sent a message
  let lastMessage = lastMessages[lastMessages.length - 1].content.toLowerCase();
  const lastAgentName = lastMessage.slice(2, lastMessage.indexOf(' '));

  for (const agent of agents) {
    // Skip this agent if it was the last one to send a message
    if (agent.name.toLowerCase() === lastAgentName) {
      console.log(`Skipping agent ${agent.name} as it was the last to respond`);
      continue;
    }

    const system = `
    You are a filtering function that decides whether an agent should be invoked based on the conversation and the agent's interests. Please review this conversation snippet and respond with a number from zero to one, where one means the agent would definitely want to be invoked and zero means the agent would definitely not want to be invoked. Only respond with the number. Because you will be given a conversation snippet of the last five messages, you should weight the end of the conversation more heavily than the start of it. Also, take into account the natural flow of the conversation and which agent would naturally be expected to respond.
    `;

    const prompt = `
    Here is the conversation snippet. 
        <conversation>
    ${messageContent}
    </conversation>

    You are deciding whether to invoke ${agent.name}. Here are are the conditions under which the agent wants to be invoked:
    <agent-invocation-conditions>
    ${agent.interests}
    </agent-invocation-conditions>


    Remember, respond with a number from zero to one. Then, explain your reasoning.
    `;

    try {
      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        system,
        messages: [{role: "user", content: [{"type": "text", "text":prompt}]}],
        max_tokens: 500,
        temperature: 0.5,
      });

      console.log(response.content[0].text)
      const probability = parseFloat(response.content[0].text);
      agentProbabilities.push({ agent, probability });
    } catch (error) {
      console.error(`Error checking agent ${agent.name}:`, error);
    }
  }

  // Sort agents by probability in descending order
  agentProbabilities.sort((a, b) => b.probability - a.probability);

  // Iterate through agents and try to invoke them
  for (const { agent, probability } of agentProbabilities) {
    console.log(`Agent ${agent.name} probability: ${probability}`);
    
    if (probability < 0.5) {
      console.log("No more agents with probability above 0.5");
      break;
    }

    console.log(`Attempting to invoke agent: ${agent.name}`);
    const success = await invokeAgent(agent, lastMessages, message);
    
    if (success) {
      console.log(`Successfully invoked agent: ${agent.name}`);
      return;
    } else {
      console.log(`Agent ${agent.name} declined to respond, trying next agent`);
    }
  }

  console.log("No suitable agent found or all agents declined to respond");
}
