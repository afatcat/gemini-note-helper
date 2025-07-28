import { Notice } from 'obsidian';

export class ClipboardService {
    copy(text: string, successMessage: string, errorMessage: string) {
        navigator.clipboard.writeText(text).then(() => {
            new Notice(successMessage);
        }, () => {
            new Notice(errorMessage);
        });
    }
}
