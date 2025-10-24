// Crypto utility functions
class CryptoUtils {
    static async sha256(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return new Uint8Array(hashBuffer);
    }

    static async sha512(text) {
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-512', data);
        return new Uint8Array(hashBuffer);
    }

    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    static arrayBufferToBase16(buffer) {
        const bytes = new Uint8Array(buffer);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    static generateRandomString(length = 16) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

// Settings management
class SettingsManager {
    constructor() {
        this.darkThemeToggle = document.getElementById('dark-theme-toggle');
        this.hashAlgorithmToggle = document.getElementById('hash-algorithm-toggle');
        this.outputFormatToggle = document.getElementById('output-format-toggle');
        this.usernameInput = document.getElementById('username-input');
        this.init();
    }

    init() {
        // Load saved settings
        const settings = this.loadSettings();
        
        // Apply theme
        this.applyTheme(settings.theme);
        this.darkThemeToggle.checked = settings.theme === 'dark';
        
        // Set algorithm
        this.hashAlgorithmToggle.checked = settings.hashAlgorithm === 'sha512';
        
        // Set output format
        this.outputFormatToggle.checked = settings.outputFormat === 'base64';
        
        // Set username
        this.usernameInput.value = settings.username;
        
        // Add event listeners
        this.darkThemeToggle.addEventListener('change', () => this.saveSettings());
        this.hashAlgorithmToggle.addEventListener('change', () => this.saveSettings());
        this.outputFormatToggle.addEventListener('change', () => this.saveSettings());
        this.usernameInput.addEventListener('input', () => this.saveSettings());
    }

    loadSettings() {
        const defaultSettings = {
            theme: 'light',
            hashAlgorithm: 'sha256',
            outputFormat: 'base16',
            username: 'Anonymous'
        };
        
        const saved = localStorage.getItem('hashStorageSettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    saveSettings() {
        const settings = {
            theme: this.darkThemeToggle.checked ? 'dark' : 'light',
            hashAlgorithm: this.hashAlgorithmToggle.checked ? 'sha512' : 'sha256',
            outputFormat: this.outputFormatToggle.checked ? 'base64' : 'base16',
            username: this.usernameInput.value || 'Anonymous'
        };
        
        localStorage.setItem('hashStorageSettings', JSON.stringify(settings));
        this.applyTheme(settings.theme);
        
        return settings;
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    getSettings() {
        return this.loadSettings();
    }
}

// Entry management
class EntryManager {
    constructor() {
        this.entries = this.loadEntries();
        this.settingsManager = null;
    }

    setSettingsManager(settingsManager) {
        this.settingsManager = settingsManager;
    }

    async createEntry(question, answer) {
        const settings = this.settingsManager.getSettings();
        const timestamp = Date.now();
        const randomString = CryptoUtils.generateRandomString();
        
        // Create the string to hash: answer + username + timestamp + randomString
        const hashInput = `${answer}|${settings.username}|${timestamp}|${randomString}`;
        
        // Hash the input
        const hashBytes = settings.hashAlgorithm === 'sha512' 
            ? await CryptoUtils.sha512(hashInput)
            : await CryptoUtils.sha256(hashInput);
            
        // Format the hash output
        const hashedAnswer = settings.outputFormat === 'base64'
            ? CryptoUtils.arrayBufferToBase64(hashBytes)
            : CryptoUtils.arrayBufferToBase16(hashBytes);

        const entry = {
            id: `entry_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            question,
            answer, // Store unhashed answer for reveal
            hashedAnswer,
            username: settings.username,
            timestamp,
            timestampFormatted: new Date(timestamp).toLocaleString(),
            randomString,
            hashAlgorithm: settings.hashAlgorithm,
            outputFormat: settings.outputFormat
        };

        this.entries.unshift(entry); // Add to beginning
        this.saveEntries();
        return entry;
    }

    loadEntries() {
        const saved = localStorage.getItem('hashStorageEntries');
        return saved ? JSON.parse(saved) : [];
    }

    saveEntries() {
        localStorage.setItem('hashStorageEntries', JSON.stringify(this.entries));
    }

    getEntries() {
        return this.entries;
    }

    getEntry(id) {
        return this.entries.find(entry => entry.id === id);
    }
}

// UI Manager
class UIManager {
    constructor() {
        this.settingsManager = new SettingsManager();
        this.entryManager = new EntryManager();
        this.entryManager.setSettingsManager(this.settingsManager);
        
        this.form = document.getElementById('qa-form');
        this.questionInput = document.getElementById('question-input');
        this.answerInput = document.getElementById('answer-input');
        this.historyView = document.querySelector('.history-view');
        this.modal = document.getElementById('entry-modal');
        this.modalBody = document.getElementById('modal-body');
        this.closeBtn = document.querySelector('.close');
        
        this.init();
    }

    init() {
        this.renderHistory();
        this.bindEvents();
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeModal();
        });
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const question = this.questionInput.value.trim();
        const answer = this.answerInput.value.trim();
        
        if (!question || !answer) {
            alert('Please fill in both the question and answer fields.');
            return;
        }

        try {
            const entry = await this.entryManager.createEntry(question, answer);
            this.renderHistory();
            
            // Clear form
            this.questionInput.value = '';
            this.answerInput.value = '';
            
            // Show success message
            this.showTemporaryMessage('Entry created successfully!');
            
        } catch (error) {
            console.error('Error creating entry:', error);
            alert('An error occurred while creating the entry. Please try again.');
        }
    }

    renderHistory() {
        const entries = this.entryManager.getEntries();
        
        if (entries.length === 0) {
            this.historyView.innerHTML = `
                <div class="history-empty">
                    <p>No entries yet. Create your first Question & Answer pair!</p>
                </div>
            `;
            return;
        }

        this.historyView.innerHTML = entries.map(entry => `
            <div class="history-card" data-entry-id="${entry.id}">
                <div class="question">${this.escapeHtml(entry.question)}</div>
                <div class="hash-info">${entry.hashedAnswer}</div>
                <div class="metadata">
                    <span class="username">${this.escapeHtml(entry.username)}</span>
                    <span class="timestamp">${entry.timestampFormatted}</span>
                </div>
            </div>
        `).join('');

        // Add click listeners to cards
        this.historyView.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', () => {
                const entryId = card.dataset.entryId;
                this.showEntryDetails(entryId);
            });
        });
    }

    showEntryDetails(entryId) {
        const entry = this.entryManager.getEntry(entryId);
        if (!entry) return;

        this.modalBody.innerHTML = `
            <div class="modal-detail">
                <strong>Question:</strong><br>
                ${this.escapeHtml(entry.question)}
            </div>
            <div class="modal-detail">
                <strong>Answer (Revealed):</strong><br>
                ${this.escapeHtml(entry.answer)}
            </div>
            <div class="modal-detail">
                <strong>Hashed Answer:</strong>
                <div class="hash-display">${entry.hashedAnswer}</div>
            </div>
            <div class="modal-detail">
                <strong>Username:</strong> ${this.escapeHtml(entry.username)}
            </div>
            <div class="modal-detail">
                <strong>Created:</strong> ${entry.timestampFormatted}
            </div>
            <div class="modal-detail">
                <strong>Timestamp (ms):</strong> ${entry.timestamp}
            </div>
            <div class="modal-detail">
                <strong>Hash Algorithm:</strong> ${entry.hashAlgorithm.toUpperCase()}
            </div>
            <div class="modal-detail">
                <strong>Output Format:</strong> ${entry.outputFormat.toUpperCase()}
            </div>
            <div class="modal-detail">
                <strong>Random String:</strong> ${entry.randomString}
            </div>
        `;
        
        this.modal.style.display = 'block';
    }

    closeModal() {
        this.modal.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showTemporaryMessage(message) {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--magenta-primary);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 1001;
            box-shadow: 0 4px 12px var(--magenta-shadow);
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.remove();
        }, 3000);
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new UIManager();
    
    // Add smooth transitions on theme change
    setTimeout(() => {
        document.body.classList.add('theme-transitions');
    }, 100);
});
