import { App, Modal, Notice } from 'obsidian';
import { ChatController } from './ChatController';
import { ClipboardService } from './ClipboardService';
import { GeminiNoteHelperSettings } from '../main';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatView, ChatUI } from './ChatUI';

export class ChatDOM {
    chatUI: ChatUI;

    constructor(chatUI: ChatUI) {
        this.chatUI = chatUI;
    }

    createInputContainer(container: HTMLElement, addMessage: (message: { role: string, parts: { text: string }[] }) => void) {
        const inputContainer = container.createEl("div", {
            cls: "input-container",
        });

        const questionInput = inputContainer.createEl("input", {
            type: "text",
            cls: "gemini-question-input",
        });

        const sendButton = inputContainer.createEl("button", {
            text: "Send",
            cls: "mod-cta",
        });

        const copyConversationButton = inputContainer.createEl("button", {
            text: "Copy Conversation",
            cls: "mod-cta",
        });
        copyConversationButton.addEventListener("click", () => {
            this.chatUI.chatController.copyConversation(this.chatUI.chatView.noteTitle, this.chatUI.chatView.chatHistory);
        });

        this.setupSendButton(questionInput, sendButton, addMessage);
    }

    setupAddMessage(chatContainer: HTMLElement) {
        return (message: { role: string, parts: { text: string }[] }) => {
            const messageEl = chatContainer.createEl("div", {
                cls: `chat-message ${message.role} chat-message-container`,
            });
            messageEl.style.display = "flex";
            messageEl.style.alignItems = "center";

            const textEl = messageEl.createEl("span");
            const role = message.role === 'user' ? 'You' : 'Gemini';
            const text = message.parts[0].text;
            textEl.setText(`${role}: ${text}`);

            const copyIcon = messageEl.createEl("span", {
                cls: "copy-icon",
            });
            copyIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
            copyIcon.style.marginLeft = "0.5rem";
            copyIcon.style.cursor = "pointer";

            copyIcon.addEventListener("click", () => {
                this.chatUI.clipboardService.copy(text, "Copied to clipboard!", "Failed to copy to clipboard.");
            });

            chatContainer.scrollTop = chatContainer.scrollHeight;
        };
    }

    setupSendButton(questionInput: HTMLInputElement, sendButton: HTMLButtonElement, addMessage: (message: { role: string, parts: { text: string }[] }) => void) {
        sendButton.addEventListener("click", async () => {
            const question = questionInput.value;
            if (!question) return;

            const userMessage = { role: "user", parts: [{ text: question }] };
            addMessage(userMessage);
            this.chatUI.chatView.chatHistory.push(userMessage);

            questionInput.value = "";

            sendButton.disabled = true;
            sendButton.textContent = "Sending...";

            try {
                const genAI = new GoogleGenerativeAI(this.chatUI.chatView.settings.geminiAPIKey);
                const model = genAI.getGenerativeModel({ model: this.chatUI.chatView.settings.model });

                if (this.chatUI.chatView.chatHistory.length === 1) {
                    this.chatUI.chatView.chatHistory.unshift({
                        role: "user",
                        parts: [{ text: `Based on the following note, please answer my questions:\n\n${this.chatUI.chatView.noteContent}` }],
                    });
                }

                const chat = model.startChat({
                    history: this.chatUI.chatView.chatHistory,
                });

                const result = await chat.sendMessage(question);
                const response = await result.response;
                const text = response.text();

                const geminiMessage = {
                    role: "model",
                    parts: [{ text }],
                };
                this.chatUI.chatView.chatHistory.push(geminiMessage);

                addMessage(geminiMessage);
            } catch (e) {
                console.error(e);
                addMessage({ role: "model", parts: [{ text: "Error: Could not get a response." }] });
            } finally {
                sendButton.disabled = false;
                sendButton.textContent = "Send";
                questionInput.focus();
            }
        });
    }
}