// Summit Trust Holdings Configuration
const CONFIG = {
    SUPABASE_URL: 'https://jotfmjdmorjweoumdvuq.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvdGZtamRtb3Jqd2VvdW1kdnVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3Mzk2OTksImV4cCI6MjA5MTMxNTY5OX0.bTkJKZtHEz_cBBHsYwWiWMotLpCpKU68_ROE-mKWm4s',
    CLOUDINARY_CLOUD_NAME: 'ddvwy00eg',
    CLOUDINARY_UPLOAD_PRESET: 'summit-trust-uploads',
    NITROSEND_API_KEY: 'nskey_live_44879eb57a52d337b55f7687101029cb',
    NITROSEND_WP_KEY: 'wpkey_live_e05d0cdc72236cbdbb6a2116b9d5ca09',
    NITROSEND_API_URL: 'https://api.nitrosend.com/v1/my/messages',
    NITROSEND_FROM_EMAIL: 'help@reserved-citizen.nitrosend.net',
    NITROSEND_FROM_NAME: 'Summit Trust Holdings',
    TAWK_TO_PROPERTY_ID: '69d7c8a78d80621c3581cfc7',
    TAWK_TO_WIDGET_ID: '1jlpefk1u',
    APP_NAME: 'Summit Trust Holdings',
    SLOGAN: 'Banking, held in trust',
    CONTACT_EMAIL: 'summittrustbnk@proton.me',
    LOCATION: 'London, United Kingdom',
    APP_VERSION: '2.0.0',
    LOGO_LIGHT: 'https://res.cloudinary.com/ddvwy00eg/image/upload/v1793590593/logo-light_vzggah.svg',
    LOGO_DARK: 'https://res.cloudinary.com/ddvwy00eg/image/upload/v1793590608/logo-dark_blxgcl.svg',
    FAVICON: 'https://res.cloudinary.com/ddvwy00eg/image/upload/v1793590574/favicon_oz94ys.svg',
    OG_IMAGE: 'https://res.cloudinary.com/ddvwy00eg/image/upload/v1793590634/og_rvwmor.png',
    SUPPORTED_LANGUAGES: ['en', 'es', 'fr', 'de', 'pt', 'ar', 'zh'],
    CURRENCY_SYMBOL: '$',
    DATE_FORMAT: 'YYYY-MM-DD',
    TRANSACTION_PIN_LENGTH: 4
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

