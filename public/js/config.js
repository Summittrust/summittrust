// Summit Trust Bank Configuration
const CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key',
    CLOUDINARY_CLOUD_NAME: 'your-cloud-name',
    CLOUDINARY_UPLOAD_PRESET: 'your-upload-preset',
    TAWK_TO_PROPERTY_ID: 'YOUR_PROPERTY_ID',
    TAWK_TO_WIDGET_ID: 'YOUR_WIDGET_ID',
    APP_NAME: 'Summit Trust Bank',
    APP_VERSION: '1.0.0',
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'pt', 'ar', 'zh'],
    CURRENCY_SYMBOL: '$',
    DATE_FORMAT: 'YYYY-MM-DD',
    TRANSACTION_PIN_LENGTH: 4,
    RECOVERY_PHRASE_WORDS: 8
};

// Language translations
const TRANSLATIONS = {
    en: {
        home: 'Home',
        login: 'Login',
        register: 'Register',
        dashboard: 'Dashboard',
        send: 'Send Money',
        transactions: 'Transactions',
        loans: 'Loans',
        investments: 'Investments',
        cards: 'Cards',
        settings: 'Settings',
        about: 'About'
    },
    es: {
        home: 'Inicio',
        login: 'Iniciar Sesión',
        register: 'Registrarse',
        dashboard: 'Panel',
        send: 'Enviar Dinero',
        transactions: 'Transacciones',
        loans: 'Préstamos',
        investments: 'Inversiones',
        cards: 'Tarjetas',
        settings: 'Ajustes',
        about: 'Acerca de'
    },
    fr: {
        home: 'Accueil',
        login: 'Connexion',
        register: 'S\'inscrire',
        dashboard: 'Tableau de bord',
        send: 'Envoyer',
        transactions: 'Transactions',
        loans: 'Prêts',
        investments: 'Investissements',
        cards: 'Cartes',
        settings: 'Paramètres',
        about: 'À propos'
    },
    de: {
        home: 'Startseite',
        login: 'Anmelden',
        register: 'Registrieren',
        dashboard: 'Dashboard',
        send: 'Geld senden',
        transactions: 'Transaktionen',
        loans: 'Darlehen',
        investments: 'Investitionen',
        cards: 'Karten',
        settings: 'Einstellungen',
        about: 'Über uns'
    },
    pt: {
        home: 'Início',
        login: 'Entrar',
        register: 'Registrar',
        dashboard: 'Painel',
        send: 'Enviar',
        transactions: 'Transações',
        loans: 'Empréstimos',
        investments: 'Investimentos',
        cards: 'Cartões',
        settings: 'Configurações',
        about: 'Sobre'
    },
    ar: {
        home: 'الرئيسية',
        login: 'تسجيل الدخول',
        register: 'التسجيل',
        dashboard: 'لوحة التحكم',
        send: 'إرسال',
        transactions: 'المعاملات',
        loans: 'القروض',
        investments: 'الاستثمارات',
        cards: 'البطاقات',
        settings: 'الإعدادات',
        about: 'حول'
    },
    zh: {
        home: '首页',
        login: '登录',
        register: '注册',
        dashboard: '仪表板',
        send: '发送',
        transactions: '交易',
        loans: '贷款',
        investments: '投资',
        cards: '卡片',
        settings: '设置',
        about: '关于'
    }
};

console.log('Config loaded successfully');