const cron = require('node-cron');

class MessageSchedulerService {
  constructor(config, trelloService, whatsappService, geminiService) {
    this.config = config;
    this.trelloService = trelloService;
    this.whatsappService = whatsappService;
    this.geminiService = geminiService;
    this.scheduledJobs = [];
  }

  /**
   * Start all scheduled jobs
   */
  startScheduler() {
    if (this.config.schedule.multipleSchedules.enabled) {
      console.log('🕐 Mengaktifkan jadwal multiple...');
      this.setupMultipleSchedules();
    } else {
      console.log('🕐 Mengaktifkan jadwal single...');
      this.setupSingleSchedule();
    }
  }

  /**
   * Setup single daily report schedule
   */
  setupSingleSchedule() {
    const job = cron.schedule(this.config.schedule.cron, async () => {
      console.log(`\n[${new Date().toISOString()}] Menjalankan laporan terjadwal...`);
      await this.sendFullReport();
    }, {
      scheduled: true,
      timezone: this.config.app.timezone
    });

    this.scheduledJobs.push(job);
    console.log(`📅 Laporan penuh dijadwalkan: ${this.config.schedule.cron}`);
  }

  /**
   * Setup multiple schedules for different message types
   */
  setupMultipleSchedules() {
    // Morning summary
    const morningJob = cron.schedule(this.config.schedule.multipleSchedules.morning, async () => {
      console.log(`\n[${new Date().toISOString()}] Mengirim rangkuman pagi...`);
      await this.sendMorningSummary();
    }, {
      scheduled: true,
      timezone: this.config.app.timezone
    });
    this.scheduledJobs.push(morningJob);
    console.log(`🌅 Rangkuman pagi dijadwalkan: ${this.config.schedule.multipleSchedules.morning}`);

    // Afternoon check
    const afternoonJob = cron.schedule(this.config.schedule.multipleSchedules.afternoon, async () => {
      console.log(`\n[${new Date().toISOString()}] Mengirim cek progress siang...`);
      await this.sendAfternoonCheck();
    }, {
      scheduled: true,
      timezone: this.config.app.timezone
    });
    this.scheduledJobs.push(afternoonJob);
    console.log(`☀️ Cek siang dijadwalkan: ${this.config.schedule.multipleSchedules.afternoon}`);

    // Evening report
    const eveningJob = cron.schedule(this.config.schedule.multipleSchedules.evening, async () => {
      console.log(`\n[${new Date().toISOString()}] Mengirim laporan sore...`);
      await this.sendEveningReport();
    }, {
      scheduled: true,
      timezone: this.config.app.timezone
    });
    this.scheduledJobs.push(eveningJob);
    console.log(`🌙 Laporan sore dijadwalkan: ${this.config.schedule.multipleSchedules.evening}`);

    // Individual pressure messages
    if (this.config.schedule.multipleSchedules.individualPressure.enabled) {
      this.setupIndividualPressureSchedules();
    }
  }

  /**
   * Setup individual pressure message schedules
   */
  setupIndividualPressureSchedules() {
    const times = this.config.schedule.multipleSchedules.individualPressure.times;

    times.forEach(time => {
      const [hour, minute] = time.split(':');
      const cronTime = `${minute} ${hour} * * *`;

      const job = cron.schedule(cronTime, async () => {
        console.log(`\n[${new Date().toISOString()}] Mengirim pressure message individual...`);
        await this.sendIndividualPressureMessages();
      }, {
        scheduled: true,
        timezone: this.config.app.timezone
      });

      this.scheduledJobs.push(job);
      console.log(`💬 Pressure individual dijadwalkan: ${time}`);
    });
  }

  /**
   * Send full report (original behavior)
   */
  async sendFullReport() {
    try {
      const reports = await this.trelloService.generateReport(
        this.config.trello.boardIds,
        this.config.report.daysToCheck
      );

      if (this.config.report.splitMessages) {
        await this.sendSplitReport(reports);
      } else {
        await this.whatsappService.sendTrelloReport(reports, this.config.report.daysToCheck);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      await this.whatsappService.sendErrorNotification(error);
    }
  }

  /**
   * Send morning summary - focus on overview and motivation
   */
  async sendMorningSummary() {
    try {
      const reports = await this.trelloService.generateReport(
        this.config.trello.boardIds,
        this.config.report.daysToCheck
      );

      let message = `☀️ *SELAMAT PAGI TIM!* ☀️\n`;
      message += `${this.formatIndonesianDate(new Date())}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      // AI-generated morning greeting
      if (this.geminiService && this.geminiService.enabled) {
        const analysis = await this.geminiService.generateReportAnalysis(reports);
        message += `${analysis}\n\n`;
      }

      // Quick stats
      const totalOutdated = reports.reduce((sum, r) => sum + (r.outdatedCards || 0), 0);
      const totalRecent = reports.reduce((sum, r) => sum + (r.recentCards || 0), 0);

      message += `📊 *STATUS PAGI INI:*\n`;
      message += `✅ Card terupdate: ${totalRecent}\n`;
      message += `❌ Card mangkrak: ${totalOutdated}\n\n`;

      if (totalOutdated > 0) {
        message += `⚠️ *Ada ${totalOutdated} card yang butuh perhatian!*\n`;
        message += `_Detail akan dikirim terpisah..._\n\n`;
      }

      message += `☕ _Semoga kopinya strong, semangat kerja juga strong!_`;

      await this.whatsappService.sendMessage(message);

      // Send detailed outdated cards after delay
      if (totalOutdated > 0) {
        await this.delay(this.config.report.messageDelay * 1000);
        await this.sendOutdatedCardDetails(reports, 'morning');
      }
    } catch (error) {
      console.error('Error sending morning summary:', error);
    }
  }

  /**
   * Send afternoon progress check
   */
  async sendAfternoonCheck() {
    try {
      const reports = await this.trelloService.generateReport(
        this.config.trello.boardIds,
        this.config.report.daysToCheck
      );

      const totalOutdated = reports.reduce((sum, r) => sum + (r.outdatedCards || 0), 0);

      if (totalOutdated === 0) {
        console.log('Tidak ada card mangkrak, skip afternoon check');
        return;
      }

      let message = `🌞 *CEK PROGRESS SIANG* 🌞\n`;
      message += `${this.formatIndonesianDate(new Date())}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      message += `🤔 *Gimana nih progressnya?*\n`;
      message += `Masih ada ${totalOutdated} card yang belum disentuh...\n\n`;

      // Get top 3 procrastinators
      const procrastinators = this.getTopProcrastinators(reports, 3);

      if (procrastinators.length > 0) {
        message += `🏆 *TOP PROKRASTINATOR SIANG INI:*\n`;
        procrastinators.forEach((person, index) => {
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
          message += `${medal} ${person.name}: ${person.count} card mangkrak\n`;
        });
        message += `\n_Ayo dong, masih ada waktu sampai sore!_ ⏰`;
      }

      await this.whatsappService.sendMessage(message);
    } catch (error) {
      console.error('Error sending afternoon check:', error);
    }
  }

  /**
   * Send evening detailed report
   */
  async sendEveningReport() {
    try {
      const reports = await this.trelloService.generateReport(
        this.config.trello.boardIds,
        this.config.report.daysToCheck
      );

      let message = `🌙 *LAPORAN SORE - FINAL CALL!* 🌙\n`;
      message += `${this.formatIndonesianDate(new Date())}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      const totalOutdated = reports.reduce((sum, r) => sum + (r.outdatedCards || 0), 0);
      const totalRecent = reports.reduce((sum, r) => sum + (r.recentCards || 0), 0);

      if (totalOutdated > 10) {
        message += `🚨 *ALERT! ${totalOutdated} CARD MASIH MANGKRAK!* 🚨\n`;
        message += `_Ini emergency meeting material nih..._\n\n`;
      }

      // Send summary first
      await this.whatsappService.sendMessage(message);

      // Send detailed report in chunks
      await this.delay(this.config.report.messageDelay * 1000);
      await this.sendSplitReport(reports, 'evening');
    } catch (error) {
      console.error('Error sending evening report:', error);
    }
  }

  /**
   * Send individual pressure messages to specific team members
   */
  async sendIndividualPressureMessages() {
    try {
      const reports = await this.trelloService.generateReport(
        this.config.trello.boardIds,
        this.config.report.daysToCheck
      );

      // Collect all members with outdated cards
      const memberStats = this.aggregateMemberStatistics(reports);

      // Send personalized messages to top offenders
      const topOffenders = Object.entries(memberStats)
        .filter(([name, stats]) => stats.count >= 3) // Only pressure those with 3+ outdated cards
        .sort((a, b) => b[1].maxDays - a[1].maxDays)
        .slice(0, 3); // Top 3 only

      for (const [memberName, stats] of topOffenders) {
        let message = `📱 *PERSONAL REMINDER* 📱\n\n`;

        // Get AI-generated pressure message
        if (this.geminiService && this.geminiService.enabled) {
          const pressureMsg = await this.geminiService.generatePressureMessage(
            memberName,
            stats.cards,
            this.getMessageType()
          );
          message += pressureMsg;
        } else {
          message += `Halo ${memberName}! 👋\n\n`;
          message += `Friendly reminder: Kamu punya ${stats.count} card yang mangkrak.\n`;
          message += `Yang paling parah udah ${stats.maxDays} hari loh! 😱\n\n`;
          message += `Yuk, minimal update 1 card hari ini? 💪`;
        }

        await this.whatsappService.sendMessage(message);
        await this.delay(this.config.report.messageDelay * 1000);
      }
    } catch (error) {
      console.error('Error sending individual pressure messages:', error);
    }
  }

  /**
   * Send report split into multiple messages
   */
  async sendSplitReport(reports, timeOfDay = 'general') {
    try {
      // Message 1: Header and summary
      let headerMessage = this.buildHeaderMessage(reports, timeOfDay);
      await this.whatsappService.sendMessage(headerMessage);
      await this.delay(this.config.report.messageDelay * 1000);

      // Message 2: Recent updates (positive reinforcement)
      const recentMessage = this.buildRecentUpdatesMessage(reports);
      if (recentMessage) {
        await this.whatsappService.sendMessage(recentMessage);
        await this.delay(this.config.report.messageDelay * 1000);
      }

      // Message 3+: Outdated cards by board
      for (const report of reports) {
        if (report.outdatedCards > 0) {
          const outdatedMessage = this.buildOutdatedCardsMessage(report);
          await this.whatsappService.sendMessage(outdatedMessage);
          await this.delay(this.config.report.messageDelay * 1000);
        }
      }

      // Final message: Hall of Shame
      const shameMessage = await this.buildHallOfShameMessage(reports);
      if (shameMessage) {
        await this.whatsappService.sendMessage(shameMessage);
      }
    } catch (error) {
      console.error('Error sending split report:', error);
      throw error;
    }
  }

  /**
   * Send detailed outdated cards for specific time
   */
  async sendOutdatedCardDetails(reports, timeOfDay) {
    for (const report of reports) {
      if (report.outdatedCards > 0) {
        const message = this.buildOutdatedCardsMessage(report, timeOfDay);
        await this.whatsappService.sendMessage(message);
        await this.delay(this.config.report.messageDelay * 1000);
      }
    }
  }

  /**
   * Build header message
   */
  buildHeaderMessage(reports, timeOfDay) {
    const totalOutdated = reports.reduce((sum, r) => sum + (r.outdatedCards || 0), 0);
    const totalRecent = reports.reduce((sum, r) => sum + (r.recentCards || 0), 0);

    let emoji = timeOfDay === 'morning' ? '☀️' : timeOfDay === 'evening' ? '🌙' : '📋';
    let message = `${emoji} *LAPORAN TRELLO* ${emoji}\n`;
    message += `${this.formatIndonesianDate(new Date())}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    message += `📊 *RINGKASAN:*\n`;
    message += `• Board dipantau: ${reports.length}\n`;
    message += `• Update terbaru: ${totalRecent} card ✅\n`;
    message += `• Card mangkrak: ${totalOutdated} card ❌\n\n`;

    if (totalOutdated > 15) {
      message += `🚨🚨🚨 *CRITICAL ALERT!* 🚨🚨🚨\n`;
      message += `*${totalOutdated} CARD MANGKRAK! INI DARURAT!*`;
    } else if (totalOutdated > 10) {
      message += `⚠️ *Warning: Terlalu banyak card nganggur!* ⚠️`;
    }

    return message;
  }

  /**
   * Build recent updates message
   */
  buildRecentUpdatesMessage(reports) {
    const hasRecentUpdates = reports.some(r => r.recentCards > 0);
    if (!hasRecentUpdates) return null;

    let message = `✅ *YANG RAJIN UPDATE* ✅\n`;
    message += `_Applause untuk yang masih ingat tugasnya! 👏_\n`;
    message += `════════════════════════════════\n\n`;

    for (const report of reports) {
      if (report.recentCards > 0) {
        message += `📌 *${report.boardName}*\n`;

        // Show only summary of recent cards
        const recentStatuses = Object.keys(report.recentCardsByStatus);
        for (const status of recentStatuses) {
          const cards = report.recentCardsByStatus[status];
          message += `• ${status}: ${cards.length} card terupdate\n`;
        }
        message += `\n`;
      }
    }

    return message;
  }

  /**
   * Build outdated cards message for a specific board
   */
  buildOutdatedCardsMessage(report, timeOfDay = 'general') {
    let message = `💀 *CARD MANGKRAK: ${report.boardName}* 💀\n`;
    message += `Total: ${report.outdatedCards} card terbengkalai\n`;
    message += `════════════════════════════════\n\n`;

    let cardCount = 0;
    const maxCards = this.config.report.maxCardsPerMessage;

    for (const [status, cards] of Object.entries(report.outdatedCardsByStatus)) {
      if (cards.length > 0 && cardCount < maxCards) {
        message += `📍 *${status}* (${cards.length} card)\n`;
        message += `─────────────────────\n`;

        for (const card of cards.slice(0, maxCards - cardCount)) {
          message += `❌ *${this.escapeMarkdown(card.name)}*\n`;

          if (card.members && card.members !== 'Unassigned') {
            message += `  🎯 PIC: *${card.members.toUpperCase()}*\n`;
          }

          message += `  ⏰ Mangkrak: *${card.daysSinceActivity} HARI*\n`;

          if (card.daysSinceActivity >= 7) {
            message += `  ${this.getPressureEmoji(card.daysSinceActivity)}\n`;
          }

          message += `  🔗 ${card.url}\n\n`;
          cardCount++;
        }
      }
    }

    if (report.outdatedCards > maxCards) {
      message += `\n_...dan ${report.outdatedCards - maxCards} card lainnya_ 😱`;
    }

    return message;
  }

  /**
   * Build hall of shame message
   */
  async buildHallOfShameMessage(reports) {
    const memberStats = this.aggregateMemberStatistics(reports);
    const shameList = Object.entries(memberStats)
      .sort((a, b) => b[1].maxDays - a[1].maxDays || b[1].count - a[1].count)
      .slice(0, 5);

    if (shameList.length === 0) return null;

    let message = `🏆 *HALL OF SHAME* 🏆\n`;
    message += `_Penghargaan Prokrastinator Terbaik_\n`;
    message += `════════════════════════════════\n\n`;

    for (let i = 0; i < shameList.length; i++) {
      const [name, stats] = shameList[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '💩';

      if (i === 0) {
        message += `${medal} *JUARA 1: ${name.toUpperCase()}* ${medal}\n`;
        message += `🎊 ${stats.count} card mangkrak! Rekor: ${stats.maxDays} hari! 🎊\n`;

        // Add AI roasting for the champion
        if (this.geminiService && this.geminiService.enabled) {
          const roasting = await this.geminiService.generatePatternRoasting({
            type: 'serial_procrastinator',
            count: stats.count,
            maxDays: stats.maxDays
          });
          if (roasting) {
            message += `\n_${roasting}_\n`;
          }
        }
        message += `\n`;
      } else {
        message += `${medal} ${name}: ${stats.count} card (max ${stats.maxDays} hari)\n`;
      }
    }

    message += `\n💐 _Hadiah: Lembur gratis weekend ini!_ 💐`;
    return message;
  }

  /**
   * Helper methods
   */

  getMessageType() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  getPressureEmoji(days) {
    if (days >= 14) return '💀💀💀 FOSIL DETECTED!';
    if (days >= 10) return '🔥🔥 KEBAKARAN!';
    if (days >= 7) return '😤 SEMINGGU WOY!';
    return '';
  }

  formatIndonesianDate(date) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${dayName}, ${day} ${month} ${year} - ${hours}:${minutes}`;
  }

  escapeMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`');
  }

  getTopProcrastinators(reports, limit = 3) {
    const memberStats = this.aggregateMemberStatistics(reports);
    return Object.entries(memberStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count || b.maxDays - a.maxDays)
      .slice(0, limit);
  }

  aggregateMemberStatistics(reports) {
    const allStats = {};

    reports.forEach(report => {
      if (report.memberStatistics) {
        Object.entries(report.memberStatistics).forEach(([name, stats]) => {
          if (!allStats[name]) {
            allStats[name] = { count: 0, maxDays: 0, cards: [] };
          }
          allStats[name].count += stats.count;
          allStats[name].maxDays = Math.max(allStats[name].maxDays, stats.maxDays);
          allStats[name].cards.push(...stats.cards);
        });
      }
    });

    return allStats;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    this.scheduledJobs.forEach(job => job.stop());
    this.scheduledJobs = [];
    console.log('All scheduled jobs stopped');
  }
}

module.exports = MessageSchedulerService;
