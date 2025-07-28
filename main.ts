import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatView } from './chat/ChatUI';

// Remember to rename these classes and interfaces!

export interface GeminiNoteHelperSettings {
	geminiAPIKey: string;
	model: string;
}

const DEFAULT_SETTINGS: GeminiNoteHelperSettings = {
	geminiAPIKey: '',
	model: 'gemini-2.5-flash'
}

export default class GeminiNoteHelper extends Plugin {
	settings: GeminiNoteHelperSettings;

	async onload() {
		await this.loadSettings();

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'polish-note',
			name: 'Polish note',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file;
				if (!file) {
					return;
				}
				const content = await this.app.vault.read(file);
				const { body } = this.extractFrontmatter(content);

				const prompt = `You are an expert editor. Please polish the following note to make it more organized, clear, and well-written. Improve the structure, fix any grammatical errors, and maintain the same tone, but do not add any new information. Return only the polished note.\n\n${body}`;

				new PromptModal(this.app, "Polish", prompt, async (newPrompt) => {
					try {
						const genAI = new GoogleGenerativeAI(this.settings.geminiAPIKey);
						const model = genAI.getGenerativeModel({ model: this.settings.model });
						const result = await model.generateContent(newPrompt);
						const response = await result.response;
						const text = response.text();

						editor.replaceSelection(text);
						new Notice("Polished note has been inserted.");
					} catch (e) {
						console.error(e);
						new Notice("Error polishing note. Check the console for more details.");
					}
				}).open();
			}
		});

		this.addCommand({
			id: 'summarize-note',
			name: 'Summarize note',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const file = view.file;
				if (!file) {
					return;
				}
				const content = await this.app.vault.read(file);
				const { body } = this.extractFrontmatter(content);

				const prompt = `You are an expert summarizer. Please summarize the following note, capturing the key points and main ideas. Return only the summary.\n\n${body}`;

				new PromptModal(this.app, "Summarize", prompt, async (newPrompt) => {
					try {
						const genAI = new GoogleGenerativeAI(this.settings.geminiAPIKey);
						const model = genAI.getGenerativeModel({ model: this.settings.model });
						const result = await model.generateContent(newPrompt);
						const response = await result.response;
						const text = response.text();

						editor.replaceSelection(text);
						new Notice("Summary has been inserted.");
					} catch (e) {
						console.error(e);
						new Notice("Error summarizing note. Check the console for more details.");
					}
				}).open();
			}
		});

		this.addCommand({
            id: 'chat-with-note',
            name: 'Chat with note',
            editorCallback: async (editor: Editor, view: MarkdownView) => {
                const file = view.file;
                if (!file) {
                    return;
                }
                const content = await this.app.vault.read(file);
                const { body } = this.extractFrontmatter(content);

                new ChatView(this.app, this.settings, body, file.basename).open();
            }
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new GeminiNoteHelperSettingTab(this.app, this));
    }

    extractFrontmatter(content: string): { frontmatter: string, body: string } {
        const lines = content.split('\n');
        let frontmatterEndIndex = -1;

        if (lines[0] === '---') {
            for (let i = 1; i < lines.length; i++) {
                if (lines[i] === '---') {
                    frontmatterEndIndex = i;
                    break;
                }
            }
        }

        if (frontmatterEndIndex === -1) {
            return { frontmatter: '', body: content };
        }

        const frontmatter = lines.slice(0, frontmatterEndIndex + 1).join('\n');
        const body = lines.slice(frontmatterEndIndex + 1).join('\n').trim();

        return { frontmatter, body };
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class PromptModal extends Modal {
    buttonText: string;
    prompt: string;
    onSubmit: (prompt: string) => Promise<void>;

    constructor(app: App, buttonText: string, prompt: string, onSubmit: (prompt: string) => Promise<void>) {
        super(app);
        this.buttonText = buttonText;
        this.prompt = prompt;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const {contentEl} = this;

        contentEl.createEl("h1", { text: "Edit your prompt" });

        const promptTextArea = contentEl.createEl("textarea", {
            cls: "gemini-prompt-textarea",
        });
        promptTextArea.style.width = "100%";
        promptTextArea.style.height = "200px";
        promptTextArea.value = this.prompt;

        const buttonContainer = contentEl.createEl("div", {
            cls: "gemini-button-container",
        });
        buttonContainer.style.marginTop = "1rem";
        buttonContainer.style.textAlign = "right";

        const actionButton = buttonContainer.createEl("button", {
            text: this.buttonText,
            cls: "mod-cta",
        });

        const cancelButton = buttonContainer.createEl("button", {
            text: "Cancel",
        });
        cancelButton.style.marginLeft = "0.5rem";

        actionButton.addEventListener("click", async () => {
            actionButton.disabled = true;
            actionButton.textContent = `${this.buttonText}ing...`;
            const newPrompt = promptTextArea.value;
            await this.onSubmit(newPrompt);
            this.close();
        });

        cancelButton.addEventListener("click", () => {
            this.close();
        });
    }

    onClose() {
        let {contentEl} = this;
        contentEl.empty();
    }
}

class GeminiNoteHelperSettingTab extends PluginSettingTab {
	plugin: GeminiNoteHelper;

	constructor(app: App, plugin: GeminiNoteHelper) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Gemini API Key')
			.setDesc('Your Gemini API Key')
			.addText(text => text
				.setPlaceholder('Enter your API Key')
				.setValue(this.plugin.settings.geminiAPIKey)
				.onChange(async (value) => {
					this.plugin.settings.geminiAPIKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Model')
			.setDesc('The Gemini model to use')
			.addText(text => text
				.setPlaceholder('Enter the model name')
				.setValue(this.plugin.settings.model)
				.onChange(async (value) => {
					this.plugin.settings.model = value;
					await this.plugin.saveSettings();
				}));
	}
}