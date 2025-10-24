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
            hashInput, // Store the exact input that was hashed
            username: settings.username,
            timestamp,
            timestampFormatted: this.format24HourTime(timestamp),
            randomString,
            hashAlgorithm: settings.hashAlgorithm,
            outputFormat: settings.outputFormat
        };

        this.entries.unshift(entry); // Add to beginning
        this.saveEntries();
        return entry;
    }

    format24HourTime(timestamp) {
        const date = new Date(timestamp);
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        return date.toLocaleString('en-GB', options);
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

    deleteEntry(id) {
        this.entries = this.entries.filter(entry => entry.id !== id);
        this.saveEntries();
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
        this.historyList = document.querySelector('.history-list');
        this.searchInput = document.getElementById('history-search');
        this.modal = document.getElementById('entry-modal');
        this.modalBody = document.getElementById('modal-body');
        this.closeBtn = document.querySelector('.close');
        
        // Delete confirmation modal elements
        this.deleteModal = document.getElementById('delete-modal');
        this.confirmationCodeEl = document.getElementById('confirmation-code');
        this.deleteConfirmationInput = document.getElementById('delete-confirmation-input');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        this.closeDeleteBtn = document.querySelector('.close-delete');
        
        this.currentDeleteId = null;
        this.currentConfirmationCode = null;
        this.filteredEntries = [];
        
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

        // Delete modal events
        this.closeDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        this.confirmDeleteBtn.addEventListener('click', () => this.handleDeleteConfirmation());
        this.deleteModal.addEventListener('click', (e) => {
            if (e.target === this.deleteModal) this.closeDeleteModal();
        });
        this.deleteConfirmationInput.addEventListener('input', () => this.validateDeleteInput());
        this.deleteConfirmationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.confirmDeleteBtn.disabled === false) {
                this.handleDeleteConfirmation();
            }
        });

        // Search functionality
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
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

    renderHistory(entries = null) {
        const entriesToRender = entries || this.entryManager.getEntries();
        this.filteredEntries = entriesToRender;
        
        if (entriesToRender.length === 0) {
            const isEmpty = this.entryManager.getEntries().length === 0;
            this.historyList.innerHTML = `
                <div class="history-empty">
                    <p>${isEmpty ? 'No entries yet. Create your first Question & Answer pair!' : 'No entries match your search.'}</p>
                </div>
            `;
            return;
        }

        this.historyList.innerHTML = entriesToRender.map(entry => `
            <div class="history-card" data-entry-id="${entry.id}">
                <div class="card-header">
                    <div class="question">${this.escapeHtml(entry.question)}</div>
                    <div class="card-actions">
                        <button class="copy-btn" data-entry-id="${entry.id}" title="Copy hash">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                            </svg>
                        </button>
                        <button class="delete-btn-small" data-entry-id="${entry.id}" title="Delete entry">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="hash-info">${entry.hashedAnswer}</div>
                <div class="metadata">
                    <span class="username">${this.escapeHtml(entry.username)}</span>
                    <span class="timestamp">${entry.timestampFormatted}</span>
                </div>
            </div>
        `).join('');

        this.bindCardEventListeners();
    }

    bindCardEventListeners() {
        // Add click listeners to cards (but not buttons)
        this.historyList.querySelectorAll('.history-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons
                if (e.target.closest('.copy-btn') || e.target.closest('.delete-btn-small')) {
                    return;
                }
                const entryId = card.dataset.entryId;
                this.showEntryDetails(entryId);
            });
        });

        // Add copy button listeners
        this.historyList.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const entryId = btn.dataset.entryId;
                this.copyEntryHash(entryId);
            });
        });

        // Add delete button listeners
        this.historyList.querySelectorAll('.delete-btn-small').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const entryId = btn.dataset.entryId;
                this.showDeleteConfirmation(entryId);
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
                <strong>Exact Hash Input:</strong>
                <div class="hash-display">${this.escapeHtml(entry.hashInput)}</div>
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
        
        this.modal.classList.add('show');
    }

    closeModal() {
        this.modal.classList.remove('show');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async copyEntryHash(entryId) {
        const entry = this.entryManager.getEntry(entryId);
        if (!entry) return;

        try {
            await navigator.clipboard.writeText(entry.hashedAnswer);
            this.showTemporaryMessage('Hash copied to clipboard!');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = entry.hashedAnswer;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showTemporaryMessage('Hash copied to clipboard!');
        }
    }

    showDeleteConfirmation(entryId) {
        this.currentDeleteId = entryId;
        this.currentConfirmationCode = this.generateConfirmationCode();
        
        this.confirmationCodeEl.textContent = this.currentConfirmationCode;
        this.deleteConfirmationInput.value = '';
        this.confirmDeleteBtn.disabled = true;
        
        this.deleteModal.classList.add('show');
        setTimeout(() => {
            this.deleteConfirmationInput.focus();
        }, 100);
    }

    generateConfirmationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    validateDeleteInput() {
        const input = this.deleteConfirmationInput.value;
        this.confirmDeleteBtn.disabled = input !== this.currentConfirmationCode;
    }

    handleDeleteConfirmation() {
        if (this.deleteConfirmationInput.value === this.currentConfirmationCode) {
            this.entryManager.deleteEntry(this.currentDeleteId);
            this.renderHistory();
            this.closeDeleteModal();
            this.showTemporaryMessage('Entry deleted successfully!');
        }
    }

    closeDeleteModal() {
        this.deleteModal.classList.remove('show');
        this.currentDeleteId = null;
        this.currentConfirmationCode = null;
    }

    handleSearch() {
        const searchTerm = this.searchInput.value.toLowerCase().trim();
        
        if (!searchTerm) {
            // Show all entries if search is empty
            this.renderHistory();
            return;
        }

        const allEntries = this.entryManager.getEntries();
        const filteredEntries = allEntries.filter(entry => {
            // Search in question, answer, and hashed answer
            const question = entry.question.toLowerCase();
            const answer = entry.answer.toLowerCase();
            const hashedAnswer = entry.hashedAnswer.toLowerCase();
            const username = entry.username.toLowerCase();
            
            return question.includes(searchTerm) || 
                   answer.includes(searchTerm) || 
                   hashedAnswer.includes(searchTerm) ||
                   username.includes(searchTerm);
        });

        this.renderHistory(filteredEntries);
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
