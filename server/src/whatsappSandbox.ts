import readline from "readline";
import { processWhatsAppMessage } from "./services/whatsapp.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("==================================================");
console.log(" 📱 BTNX WhatsApp Concierge — Interactive Sandbox");
console.log(" Type messages below to test conversational orders.");
console.log(" Try typing: 'hi', 'promos', 'size for 6ft 80kg', 'buy wool coat'");
console.log(" Type 'exit' to quit.");
console.log("==================================================\n");

const phoneNumber = "whatsapp:+2348099887766";
const clientName = "Fortune";

function promptUser() {
  rl.question("👤 You: ", async (userInput) => {
    const input = userInput.trim();
    if (input.toLowerCase() === "exit" || input.toLowerCase() === "quit") {
      console.log("\n👋 Exiting WhatsApp sandbox session. Goodbye!");
      rl.close();
      process.exit(0);
    }

    try {
      const response = await processWhatsAppMessage({
        from: phoneNumber,
        text: input,
        senderName: clientName,
      });

      console.log(`\n🤖 BTNX Concierge:\n${response.replyText}\n`);
      if (response.suggestedActions?.length) {
        console.log(`[Suggested Quick Replies]: ${response.suggestedActions.join(" | ")}\n`);
      }
      if (response.orderId) {
        console.log(`✨ [ORDER CREATED]: Confirmed Order ID #${response.orderId}\n`);
      }
    } catch (err) {
      console.error("Error processing response: ", err);
    }

    promptUser();
  });
}

promptUser();
