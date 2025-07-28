const cron = require('node-cron');
const config = require('./config');
const TrelloService = require('./services/trelloService');
const WhatsAppService = require('./services/whatsappService');
const GeminiService = require('./services/geminiService');
const MessageSchedulerService = require('./services/messageSchedulerService');

// Initialize services
const trelloService = new TrelloService(config.trello.apiKey, config.trello.apiToken);
const whatsappService = new WhatsAppService(
  config.whatsapp.apiUrl,
  config.whatsapp.apiToken,
  config.whatsapp.groupId
);
const geminiService = new GeminiService(config.gemini.apiKey);

// Initialize message scheduler
const messageScheduler = new MessageSchedulerService(
  config,
  trelloService,
  whatsappService,
  geminiService
);

/**
 * Generate and send the Trello report
 */
async function generateAndSendReport() {
  console.log('Memulai pembuatan laporan Trello...');
  const startTime = Date.now();

  try {
    // Generate reports for all configured boards
    const reports = await trelloService.generateReport(
      config.trello.boardIds,
      config.report.daysToCheck
    );

    // Send the report to WhatsApp
    await whatsappService.sendTrelloReport(reports, config.report.daysToCheck);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Laporan berhasil dibuat dan dikirim dalam ${duration} detik`);
  } catch (error) {
    console.error('Error saat membuat atau mengirim laporan:', error);

    // Try to send error notification
    try {
      await whatsappService.sendErrorNotification(error);
    } catch (notificationError) {
      console.error('Gagal mengirim notifikasi error:', notificationError);
    }
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  console.log(`🚀 Bot Pengingat Trello Dimulai`);
  console.log(`🌍 Timezone: ${config.app.timezone}`);
  console.log(`📋 Memantau ${config.trello.boardIds.length} board`);
  console.log(`📱 Grup WhatsApp: ${config.whatsapp.groupId}`);
  console.log(`🔍 Memeriksa aktivitas dari ${config.report.daysToCheck} hari terakhir`);

  if (config.gemini.enabled) {
    console.log(`🤖 Gemini AI: Aktif`);
  }

  if (config.schedule.multipleSchedules.enabled) {
    console.log(`📅 Mode: Multiple jadwal`);
    console.log(`  - Pagi: ${config.schedule.multipleSchedules.morning}`);
    console.log(`  - Siang: ${config.schedule.multipleSchedules.afternoon}`);
    console.log(`  - Sore: ${config.schedule.multipleSchedules.evening}`);
    if (config.schedule.multipleSchedules.individualPressure.enabled) {
      console.log(`  - Pressure individual: ${config.schedule.multipleSchedules.individualPressure.times.join(', ')}`);
    }
  } else {
    console.log(`📅 Mode: Jadwal tunggal - ${config.schedule.cron}`);
  }

  if (config.report.splitMessages) {
    console.log(`💬 Mode pesan: Split (max ${config.report.maxCardsPerMessage} card/pesan)`);
  }

  console.log('');

  // Start the scheduler
  messageScheduler.startScheduler();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nMenghentikan Bot Pengingat Trello...');
    messageScheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n\nMenghentikan Bot Pengingat Trello...');
    messageScheduler.stop();
    process.exit(0);
  });
}

/**
 * Main function
 */
async function main() {
  // Check if we should run immediately (for testing)
  const args = process.argv.slice(2);
  const runNow = args.includes('--now') || args.includes('-n');

  if (runNow) {
    console.log('Menjalankan laporan sekarang...\n');

    // Use the message scheduler's sendFullReport method
    await messageScheduler.sendFullReport();

    // Ask if we should continue with scheduling
    if (!args.includes('--schedule')) {
      console.log('\nLaporan terkirim. Keluar...');
      process.exit(0);
    }
  }

  // Start the scheduler
  startScheduler();

  console.log('Bot sedang berjalan. Tekan Ctrl+C untuk berhenti.\n');

  // Show help
  if (config.app.nodeEnv === 'development') {
    console.log('💡 Tips:');
    console.log('   - Jalankan dengan --now untuk mengirim laporan sekarang');
    console.log('   - Contoh: npm start -- --now');
    console.log('   - Atau: node src/index.js --now');
    console.log('   - Set ENABLE_MULTIPLE_SCHEDULES=true untuk mode multiple jadwal');
    console.log('   - Set ENABLE_GEMINI=true dan GEMINI_API_KEY untuk AI messages\n');
  }
}

// Run the application
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
