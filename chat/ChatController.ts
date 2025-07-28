import { ClipboardService } from './ClipboardService';

export class ChatController {
    clipboardService: ClipboardService;

    constructor() {
        this.clipboardService = new ClipboardService();
    }

    copyConversation(noteTitle: string, chatHistory: { role: string, parts: { text: string }[] }[]) {
        const conversation = `## Chat with ${noteTitle}\n\n` + chatHistory.map(message => {
            const role = message.role === 'user' ? 'You' : 'Gemini';
            return `${role}: ${message.parts[0].text}`;
        }).join('\n');

        this.clipboardService.copy(conversation, "Copied to clipboard!", "Failed to copy to clipboard.");
    }
}
