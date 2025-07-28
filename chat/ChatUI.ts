import { App, Modal, Notice } from 'obsidian';
import { ChatController } from './ChatController';
import { ClipboardService } from './ClipboardService';
import { GeminiNoteHelperSettings } from '../main';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatDOM } from './ChatDOM';

export class ChatUI {
    chatView: ChatView;
    chatController: ChatController;
    clipboardService: ClipboardService;
    chatDOM: ChatDOM;

    constructor(chatView: ChatView, chatController: ChatController, clipboardService: ClipboardService) {
        this.chatView = chatView;
        this.chatController = chatController;
        this.clipboardService = clipboardService;
        this.chatDOM = new ChatDOM(this);
    }

    createInputContainer(container: HTMLElement, addMessage: (message: { role: string, parts: { text: string }[] }) => void) {
        this.chatDOM.createInputContainer(container, addMessage);
    }

    setupAddMessage(chatContainer: HTMLElement) {
        return this.chatDOM.setupAddMessage(chatContainer);
    }

    setupSendButton(questionInput: HTMLInputElement, sendButton: HTMLButtonElement, addMessage: (message: { role: string, parts: { text: string }[] }) => void) {
        this.chatDOM.setupSendButton(questionInput, sendButton, addMessage);
    }
}

export class ChatView extends Modal {
    settings: GeminiNoteHelperSettings;
    noteContent: string;
    noteTitle: string;
    chatHistory: { role: string, parts: { text: string }[] }[] = [];
    chatController: ChatController;
    clipboardService: ClipboardService;
    chatUI: ChatUI;

    constructor(app: App, settings: GeminiNoteHelperSettings, noteContent: string, noteTitle: string) {
        super(app);
        this.settings = settings;
        this.noteContent = noteContent;
        this.noteTitle = noteTitle;
        this.chatController = new ChatController();
        this.clipboardService = new ClipboardService();
        this.chatUI = new ChatUI(this, this.chatController, this.clipboardService);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();

        contentEl.createEl("h1", { text: "Chat with your note" });

        const chatContainer = contentEl.createEl("div", {
            cls: "chat-container",
        });

        const addMessage = this.chatUI.setupAddMessage(chatContainer);
        this.chatUI.createInputContainer(contentEl, addMessage);
    }

    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}
