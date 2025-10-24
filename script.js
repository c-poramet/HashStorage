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
        this.usernameInput = document.getElementById('username-input');
        this.init();
    }

    init() {
        // Load saved settings
        const settings = this.loadSettings();
        
        // Apply theme
        this.applyTheme(settings.theme);
        this.darkThemeToggle.checked = settings.theme === 'dark';
        
        // Set username
        this.usernameInput.value = settings.username;
        
        // Add event listeners
        this.darkThemeToggle.addEventListener('change', () => this.saveSettings());
        this.usernameInput.addEventListener('input', () => this.saveSettings());
    }

    loadSettings() {
        const defaultSettings = {
            theme: 'light',
            username: 'Anonymous'
        };
        
        const saved = localStorage.getItem('hashStorageSettings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    }

    saveSettings() {
        const settings = {
            theme: this.darkThemeToggle.checked ? 'dark' : 'light',
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
        
        // Create the string to hash: answer + username + question + timestamp + randomString
        const hashInput = `${answer}|${settings.username}|${question}|${timestamp}|${randomString}`;
        
        // Hash the input with both algorithms
        const sha256Bytes = await CryptoUtils.sha256(hashInput);
        const sha512Bytes = await CryptoUtils.sha512(hashInput);
            
        // Format both hash outputs using Base64 (default)
        const hashedAnswerSHA256 = CryptoUtils.arrayBufferToBase64(sha256Bytes);
        const hashedAnswerSHA512 = CryptoUtils.arrayBufferToBase64(sha512Bytes);

        const entry = {
            id: `entry_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
            question,
            answer, // Store unhashed answer for reveal
            hashedAnswerSHA256,
            hashedAnswerSHA512,
            hashInput, // Store the exact input that was hashed
            username: settings.username,
            timestamp,
            timestampFormatted: this.format24HourTime(timestamp),
            randomString,
            outputFormat: 'base64'
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
        
        // QR Export modal elements
        this.qrModal = document.getElementById('qr-export-modal');
        this.closeQrBtn = document.querySelector('.close-qr');
        this.qrSha256Btn = document.getElementById('qr-sha256-btn');
        this.qrSha512Btn = document.getElementById('qr-sha512-btn');
        this.qrForegroundColor = document.getElementById('qr-foreground-color');
        this.qrBackgroundColor = document.getElementById('qr-background-color');
        this.qrCodeContainer = document.getElementById('qr-code-container');
        this.generateQrBtn = document.getElementById('generate-qr-btn');
        this.downloadQrBtn = document.getElementById('download-qr-btn');
        this.qrQuestionText = document.getElementById('qr-question-text');
        this.qrTimestampText = document.getElementById('qr-timestamp-text');
        
        this.currentDeleteId = null;
        this.currentConfirmationCode = null;
        this.currentQrEntry = null;
        this.currentQrCode = null;
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

        // QR Export modal events
        this.closeQrBtn.addEventListener('click', () => this.closeQrModal());
        this.qrModal.addEventListener('click', (e) => {
            if (e.target === this.qrModal) this.closeQrModal();
        });
        this.qrSha256Btn.addEventListener('click', () => this.selectHashType('sha256'));
        this.qrSha512Btn.addEventListener('click', () => this.selectHashType('sha512'));
        this.qrForegroundColor.addEventListener('input', () => this.updateColorHex());
        this.qrBackgroundColor.addEventListener('input', () => this.updateColorHex());
        this.generateQrBtn.addEventListener('click', () => this.generateQrCode());
        this.downloadQrBtn.addEventListener('click', () => this.downloadQrCode());

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
                        <button class="copy-btn" data-entry-id="${entry.id}" data-hash-type="sha256" title="Copy SHA256 hash">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                            </svg>
                        </button>
                        <button class="copy-btn-sha512" data-entry-id="${entry.id}" data-hash-type="sha512" title="Copy SHA512 hash">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/>
                            </svg>
                        </button>
                        <button class="qr-export-btn" data-entry-id="${entry.id}" title="Export as QR Code">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 11H5V13H3V11ZM3 7H5V9H3V7ZM3 15H5V17H3V15ZM7 15H9V17H7V15ZM7 19H9V21H7V19ZM7 11H9V13H7V11ZM7 7H9V9H7V7ZM7 3H9V5H7V3ZM11 15H13V17H11V15ZM11 19H13V21H11V19ZM11 11H13V13H11V11ZM11 7H13V9H11V7ZM11 3H13V5H11V3ZM15 11H17V13H15V11ZM15 7H17V9H15V7ZM15 3H17V5H15V3ZM19 7H21V9H19V7ZM19 3H21V5H19V3ZM19 15H21V17H19V15ZM19 19H21V21H19V19Z"/>
                            </svg>
                        </button>
                        <button class="delete-btn-small" data-entry-id="${entry.id}" title="Delete entry">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7H6V19ZM19 4H15.5L14.5 3H9.5L8.5 4H5V6H19V4Z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="hash-info">
                    <div class="hash-row"><strong>SHA256:</strong> ${entry.hashedAnswerSHA256}</div>
                    <div class="hash-row"><strong>SHA512:</strong> ${entry.hashedAnswerSHA512}</div>
                </div>
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
                if (e.target.closest('.copy-btn') || e.target.closest('.copy-btn-sha512') || e.target.closest('.qr-export-btn') || e.target.closest('.delete-btn-small')) {
                    return;
                }
                const entryId = card.dataset.entryId;
                this.showEntryDetails(entryId);
            });
        });

        // Add SHA256 copy button listeners
        this.historyList.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const entryId = btn.dataset.entryId;
                const hashType = btn.dataset.hashType;
                this.copyEntryHash(entryId, hashType);
            });
        });

        // Add SHA512 copy button listeners
        this.historyList.querySelectorAll('.copy-btn-sha512').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const entryId = btn.dataset.entryId;
                const hashType = btn.dataset.hashType;
                this.copyEntryHash(entryId, hashType);
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

        // Add QR export button listeners
        this.historyList.querySelectorAll('.qr-export-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const entryId = btn.dataset.entryId;
                this.showQrExportModal(entryId);
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
                <strong>SHA256 Hash:</strong>
                <div class="hash-display">${entry.hashedAnswerSHA256}</div>
            </div>
            <div class="modal-detail">
                <strong>SHA512 Hash:</strong>
                <div class="hash-display">${entry.hashedAnswerSHA512}</div>
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
                <strong>Random String:</strong> ${entry.randomString}
            </div>
            <div class="modal-detail">
                <strong>Hash Format:</strong> Base64
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

    async copyEntryHash(entryId, hashType = 'sha256') {
        const entry = this.entryManager.getEntry(entryId);
        if (!entry) return;

        const hashToCopy = hashType === 'sha512' ? entry.hashedAnswerSHA512 : entry.hashedAnswerSHA256;
        const algorithmName = hashType.toUpperCase();

        try {
            await navigator.clipboard.writeText(hashToCopy);
            this.showTemporaryMessage(`${algorithmName} hash copied to clipboard!`);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = hashToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showTemporaryMessage(`${algorithmName} hash copied to clipboard!`);
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
            // Search in question, answer, both hashes, and username
            const question = entry.question.toLowerCase();
            const answer = entry.answer.toLowerCase();
            const hashedAnswerSHA256 = entry.hashedAnswerSHA256.toLowerCase();
            const hashedAnswerSHA512 = entry.hashedAnswerSHA512.toLowerCase();
            const username = entry.username.toLowerCase();
            
            return question.includes(searchTerm) || 
                   answer.includes(searchTerm) || 
                   hashedAnswerSHA256.includes(searchTerm) ||
                   hashedAnswerSHA512.includes(searchTerm) ||
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

    // QR Export Modal Methods
    showQrExportModal(entryId) {
        const entry = this.entryManager.getEntry(entryId);
        if (!entry) return;

        this.currentQrEntry = entry;
        
        // Populate modal content
        this.qrQuestionText.textContent = entry.question;
        this.qrTimestampText.textContent = entry.timestampFormatted;
        
        // Reset to default state
        this.selectHashType('sha256');
        this.qrForegroundColor.value = '#000000';
        this.qrBackgroundColor.value = '#ffffff';
        this.updateColorHex();
        this.qrCodeContainer.innerHTML = '';
        this.downloadQrBtn.style.display = 'none';
        this.currentQrCode = null;
        
        this.qrModal.classList.add('show');
    }

    closeQrModal() {
        this.qrModal.classList.remove('show');
        this.currentQrEntry = null;
        this.currentQrCode = null;
        this.qrCodeContainer.innerHTML = '';
        this.downloadQrBtn.style.display = 'none';
    }

    selectHashType(hashType) {
        // Update button states
        this.qrSha256Btn.classList.toggle('active', hashType === 'sha256');
        this.qrSha512Btn.classList.toggle('active', hashType === 'sha512');
        
        // Clear previous QR code when changing hash type
        this.qrCodeContainer.innerHTML = '';
        this.downloadQrBtn.style.display = 'none';
        this.currentQrCode = null;
    }

    updateColorHex() {
        // Update hex displays
        const fgColorHex = document.querySelectorAll('.color-hex')[0];
        const bgColorHex = document.querySelectorAll('.color-hex')[1];
        
        if (fgColorHex) fgColorHex.textContent = this.qrForegroundColor.value.toUpperCase();
        if (bgColorHex) bgColorHex.textContent = this.qrBackgroundColor.value.toUpperCase();
    }

    generateQrCode() {
        if (!this.currentQrEntry) return;

        // Get selected hash type
        const issha256 = this.qrSha256Btn.classList.contains('active');
        const hashValue = issha256 ? this.currentQrEntry.hashedAnswerSHA256 : this.currentQrEntry.hashedAnswerSHA512;
        
        // Clear container
        this.qrCodeContainer.innerHTML = '';
        
        try {
            // Create QR code using QRious
            const qr = new QRious({
                element: null,
                value: hashValue,
                size: 300,
                foreground: this.qrForegroundColor.value,
                background: this.qrBackgroundColor.value,
                level: 'M'
            });

            // Add canvas to container
            this.qrCodeContainer.appendChild(qr.canvas);
            this.currentQrCode = qr;
            
            // Show download button
            this.downloadQrBtn.style.display = 'inline-block';
            
            this.showTemporaryMessage('QR code generated successfully!');
        } catch (error) {
            console.error('Error generating QR code:', error);
            this.showTemporaryMessage('Error generating QR code');
        }
    }

    downloadQrCode() {
        if (!this.currentQrCode || !this.currentQrEntry) return;

        try {
            // Create download link
            const canvas = this.currentQrCode.canvas;
            const dataUrl = canvas.toDataURL('image/png');
            
            // Get selected hash type for filename
            const hashType = this.qrSha256Btn.classList.contains('active') ? 'SHA256' : 'SHA512';
            
            // Create filename with timestamp
            const timestamp = new Date(this.currentQrEntry.timestamp).toISOString().split('T')[0];
            const filename = `QR_${hashType}_${timestamp}_${this.currentQrEntry.id}.png`;
            
            // Create temporary download link
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showTemporaryMessage('QR code downloaded successfully!');
        } catch (error) {
            console.error('Error downloading QR code:', error);
            this.showTemporaryMessage('Error downloading QR code');
        }
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
