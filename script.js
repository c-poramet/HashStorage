// Theme management with localStorage persistence
class ThemeManager {
    constructor() {
        this.darkThemeToggle = document.getElementById('dark-theme-toggle');
        this.init();
    }

    init() {
        // Load saved theme from localStorage or default to light
        const savedTheme = localStorage.getItem('hashStorageTheme') || 'light';
        this.applyTheme(savedTheme);
        
        // Set toggle state
        this.darkThemeToggle.checked = savedTheme === 'dark';
        
        // Add event listener for theme toggle
        this.darkThemeToggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            this.applyTheme(newTheme);
            this.saveTheme(newTheme);
        });
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    saveTheme(theme) {
        localStorage.setItem('hashStorageTheme', theme);
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    
    // Add some interactive functionality to history items
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            historyItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            console.log(`Selected history item ${index + 1}`);
        });
    });
    
    // Form submission handler
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submitted');
            // Add your form handling logic here
        });
    }
});

// Add smooth transitions on theme change
document.addEventListener('DOMContentLoaded', () => {
    // Add transition class after initial load to prevent flash
    setTimeout(() => {
        document.body.classList.add('theme-transitions');
    }, 100);
});
