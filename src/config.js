require('dotenv').config();

const config = {
  // Trello API Configuration
  trello: {
    apiKey: process.env.TRELLO_API_KEY,
    apiToken: process.env.TRELLO_API_TOKEN,
    boardIds: process.env.TRELLO_BOARD_IDS ? process.env.TRELLO_BOARD_IDS.split(',').map(id => id.trim()) : []
  },

  // WhatsApp Configuration
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || 'https://maid-sender.ciptadusa.com/send/message',
    apiToken: process.env.WHATSAPP_API_TOKEN || 'Y2RzOmNkcw==',
    groupId: process.env.WHATSAPP_GROUP_ID
  },

  // Gemini AI Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    enabled: process.env.ENABLE_GEMINI === 'true' || !!process.env.GEMINI_API_KEY
  },

  // Schedule Configuration / Konfigurasi Jadwal
  schedule: {
    // Cron format: minute hour day month day-of-week
    // Format cron: menit jam hari bulan hari-minggu
    // Default: Setiap hari jam 9:00 pagi
    // Contoh:
    // '0 9 * * *' - Setiap hari jam 09:00 pagi
    // '0 9 * * 1-5' - Senin-Jumat jam 09:00 pagi (hari kerja)
    // '0 8,17 * * *' - Setiap hari jam 08:00 pagi dan 17:00 sore
    // '30 14 * * 1' - Setiap hari Senin jam 14:30
    // '0 10 * * 1,3,5' - Senin, Rabu, Jumat jam 10:00 pagi
    cron: process.env.REMINDER_SCHEDULE || '0 9 * * *',

    // Multiple schedules for different message types
    multipleSchedules: {
      enabled: process.env.ENABLE_MULTIPLE_SCHEDULES === 'true',
      morning: process.env.MORNING_SCHEDULE || '0 9 * * *',
      afternoon: process.env.AFTERNOON_SCHEDULE || '0 14 * * *',
      evening: process.env.EVENING_SCHEDULE || '0 17 * * *',
      // Send individual pressure messages throughout the day
      individualPressure: {
        enabled: process.env.ENABLE_INDIVIDUAL_PRESSURE === 'true',
        times: process.env.PRESSURE_TIMES ? process.env.PRESSURE_TIMES.split(',') : ['10:00', '15:00', '16:30']
      }
    }
  },

  // Application Configuration
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    logLevel: process.env.LOG_LEVEL || 'info',
    timezone: process.env.TZ || 'UTC'
  },

  // Report Configuration / Konfigurasi Laporan
  report: {
    // Jumlah hari untuk mengecek aktivitas (default: 30 hari untuk menangkap card yang mangkrak)
    daysToCheck: parseInt(process.env.DAYS_TO_CHECK, 10) || 30,
    // Sertakan label dalam laporan
    includeLabels: process.env.INCLUDE_LABELS === 'true',
    // Sertakan tanggal deadline dalam laporan
    includeDueDates: process.env.INCLUDE_DUE_DATES === 'true',
    // Split report into multiple messages
    splitMessages: process.env.SPLIT_MESSAGES === 'true',
    // Max cards per message when splitting
    maxCardsPerMessage: parseInt(process.env.MAX_CARDS_PER_MESSAGE, 10) || 5,
    // Delay between messages in seconds
    messageDelay: parseInt(process.env.MESSAGE_DELAY, 10) || 2,
    // Enable role-based task tracking (developers vs testers)
    enableRoleBasedTracking: process.env.ENABLE_ROLE_BASED_TRACKING === 'true',
    // Custom done status for developers (when enabled)
    developerDoneStatuses: process.env.DEVELOPER_DONE_STATUSES ?
      process.env.DEVELOPER_DONE_STATUSES.split(',').map(s => s.trim()) :
      ['Testing', 'Test', 'QA', 'Quality Assurance', 'Ready for Testing', 'In Testing'],
    // Custom done status for testers (when enabled)
    testerDoneStatuses: process.env.TESTER_DONE_STATUSES ?
      process.env.TESTER_DONE_STATUSES.split(',').map(s => s.trim()) :
      ['Done', 'Complete', 'Completed', 'Released', 'Deployed', 'Live', 'Closed']
  }
};

// Validate required configuration
const validateConfig = () => {
  const errors = [];

  if (!config.trello.apiKey) {
    errors.push('TRELLO_API_KEY is required');
  }

  if (!config.trello.apiToken) {
    errors.push('TRELLO_API_TOKEN is required');
  }

  if (config.trello.boardIds.length === 0) {
    errors.push('TRELLO_BOARD_IDS is required (comma-separated list)');
  }

  if (!config.whatsapp.groupId) {
    errors.push('WHATSAPP_GROUP_ID is required');
  }

  if (config.gemini.enabled && !config.gemini.apiKey) {
    errors.push('GEMINI_API_KEY is required when Gemini is enabled');
  }

  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach(error => console.error(`  - ${error}`));
    console.error('\nPlease check your .env file or environment variables.');
    process.exit(1);
  }
};

// Only validate in production or when explicitly requested
if (config.app.nodeEnv === 'production' || process.env.VALIDATE_CONFIG === 'true') {
  validateConfig();
}

module.exports = config;
