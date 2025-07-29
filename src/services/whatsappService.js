const axios = require('axios');
const { roleHelpers } = require('../config/teamRoles');

class WhatsAppService {
  constructor(apiUrl, apiToken, groupId) {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
    this.groupId = groupId;
  }

  /**
   * Send a message to WhatsApp
   */
  async sendMessage(message) {
    try {
      const response = await axios.post(this.apiUrl, {
        phone: this.groupId,
        message: message,
        is_forwarded: false
      }, {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'authorization': `Basic ${this.apiToken}`,
          'content-type': 'application/json',
          'origin': 'https://maid-sender.ciptadusa.com',
          'referer': 'https://maid-sender.ciptadusa.com/',
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
        }
      });

      if (response.data.code === 'SUCCESS') {
        console.log('WhatsApp message sent successfully:', response.data.message);
        return response.data;
      } else {
        throw new Error(`Failed to send WhatsApp message: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  }

  /**
   * Get pressure message based on days of inactivity
   */
  getPressureMessage(daysSinceActivity) {
    if (daysSinceActivity >= 14) {
      return `💀💀💀 *WOW! ${daysSinceActivity} HARI?! INI CARD APA FOSIL?! MUSEUM MANA YANG MAU TERIMA?!* 💀💀💀`;
    } else if (daysSinceActivity >= 10) {
      return `🔥🔥 *HEBAT! ${daysSinceActivity} HARI DITERLANTARKAN! KAMU JUARA PROKRASTINASI NIH!* 🔥🔥`;
    } else if (daysSinceActivity >= 7) {
      return `😤 *KEREN! SEMINGGU PENUH (${daysSinceActivity} HARI) DIABAIKAN! ADA REKOR DUNIA UNTUK INI GAK YA?* 😤`;
    } else if (daysSinceActivity >= 5) {
      return `🙄 *Hmm, ${daysSinceActivity} hari ya? Lagi sibuk apa sih sampe lupa sama card ini?* 🙄`;
    } else if (daysSinceActivity >= 3) {
      return `😏 *Psst, tau gak? Card ini udah ${daysSinceActivity} hari kesepian nungguin kamu!* 😏`;
    }
    return '';
  }

  /**
   * Get sarcastic status message
   */
  getSarcasticStatusMessage(status) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('done') || statusLower.includes('complete')) {
      return '✅ Card yang Katanya "Selesai" (tapi siapa tau...)';
    } else if (statusLower.includes('progress') || statusLower.includes('doing')) {
      return '🏃 Card yang "Lagi Dikerjain" (katanya sih...)';
    } else if (statusLower.includes('todo') || statusLower.includes('backlog')) {
      return '📝 Card yang "Mau Dikerjain" (entah kapan...)';
    } else if (statusLower.includes('review') || statusLower.includes('test')) {
      return '🔍 Card yang "Lagi Direview" (semoga gak stuck selamanya...)';
    }
    return `📌 ${status}`;
  }

  /**
   * Format date in Indonesian
   */
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

    return `${dayName}, ${day} ${month} ${year} pukul ${hours}:${minutes}`;
  }

  /**
   * Format and send Trello report to WhatsApp
   */
  async sendTrelloReport(reports, daysChecked) {
    const now = new Date();
    const formattedDate = this.formatIndonesianDate(now);

    let message = `📋 *LAPORAN HARIAN TRELLO - EDISI ROASTING* 🔥\n`;
    message += `📅 ${formattedDate}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `💭 _"Kerja keras adalah kunci sukses, tapi sepertinya ada yang lupa kuncinya..."_\n\n`;

    // Calculate totals
    const totalOutdatedCards = reports.reduce((sum, r) => sum + (r.outdatedCards || 0), 0);
    const totalRecentCards = reports.reduce((sum, r) => sum + (r.recentCards || 0), 0);

    // Collect all outdated cards with member info for hall of shame
    const hallOfShame = {};

    for (const report of reports) {
      if (report.error) {
        message += `❌ *${report.boardName}*\n`;
        message += `Error: ${report.error}\n\n`;
        continue;
      }

      message += `📌 *Board: ${report.boardName}*\n`;
      message += `🔗 ${report.boardUrl}\n`;
      message += `📊 Total Card: ${report.totalCards} | Mangkrak: ${report.outdatedCards} | Update Terbaru: ${report.recentCards}\n`;

      // Show team composition
      if (report.memberStatistics && Object.keys(report.memberStatistics).length > 0) {
        const devCount = Object.values(report.memberStatistics).filter(m => m.role === 'developers').length;
        const qaCount = Object.values(report.memberStatistics).filter(m => m.role === 'testers').length;
        if (devCount > 0 || qaCount > 0) {
          message += `👥 Tim: ${devCount} Dev, ${qaCount} QA\n`;
        }
      }
      message += `\n`;

      // SECTION 1: Show recent updates FIRST (positive reinforcement)
      if (report.recentCards > 0) {
        message += `🌟 *YANG RAJIN UPDATE (3 HARI TERAKHIR)* 🌟\n`;
        message += `_Wah ada yang masih ingat punya kerjaan ternyata! 👏_\n`;
        message += `════════════════════════════════\n\n`;

        const recentStatuses = Object.keys(report.recentCardsByStatus);
        for (const status of recentStatuses) {
          const cards = report.recentCardsByStatus[status];
          if (cards.length > 0) {
            message += `${this.getSarcasticStatusMessage(status)} (${cards.length} card)\n`;
            message += `─────────────────────\n`;

            for (const card of cards) {
              message += `✅ *${this.escapeMarkdown(card.name)}*\n`;

              if (card.members && card.members !== 'Unassigned') {
                message += `  👤 Si rajin: ${card.members} 🏆\n`;

                // Show role-based status for each member
                if (card.memberDetails && card.memberDetails.length > 0) {
                  card.memberDetails.forEach(member => {
                    const statusEmoji = member.status === 'done' ? '✅' : member.status === 'in_progress' ? '🔄' : '📋';
                    message += `     → ${member.name} (${member.role}): ${statusEmoji} ${member.status}\n`;
                  });
                }
              } else {
                message += `  ⚠️ Belum ada yang handle (tapi masih fresh kok!)\n`;
              }

              const daysSince = card.daysSinceActivity;
              if (daysSince === 0) {
                message += `  🕐 Update: *HARI INI!* Wow, rajin banget! ✨\n`;
              } else if (daysSince === 1) {
                message += `  🕐 Update: Kemarin (masih anget lah...)\n`;
              } else {
                message += `  🕐 Update: ${daysSince} hari yang lalu (lumayan lah...)\n`;
              }

              if (card.due) {
                const dueDate = new Date(card.due);
                const isOverdue = dueDate < now && !card.dueComplete;
                const dueStatus = card.dueComplete ? '✅' : (isOverdue ? '💀' : '⏳');
                message += `  📅 Deadline: ${dueDate.toLocaleDateString('id-ID')} ${dueStatus}\n`;
              }

              message += `  🔗 ${card.url}\n\n`;
            }
          }
        }
        message += `\n`;
      }

      // SECTION 2: Show outdated cards (for pressure)
      if (report.outdatedCards > 0) {
        message += `💀 *CARD YANG TERLUPAKAN (3+ HARI MANGKRAK)* 💀\n`;
        message += `_Ini dia card-card yang katanya "lagi dikerjain"... 3 hari yang lalu! 🤔_\n`;
        message += `════════════════════════════════\n\n`;

        const outdatedStatuses = Object.keys(report.outdatedCardsByStatus);
        for (const status of outdatedStatuses) {
          const cards = report.outdatedCardsByStatus[status];
          if (cards.length > 0) {
            message += `${this.getSarcasticStatusMessage(status)} (${cards.length} card terbengkalai)\n`;
            message += `─────────────────────\n`;

            for (const card of cards) {
              const pressureMsg = this.getPressureMessage(card.daysSinceActivity);

              message += `❌ *${this.escapeMarkdown(card.name)}*\n`;

              if (card.members && card.members !== 'Unassigned') {
                message += `  🎯 *TERTUDUH: ${card.members.toUpperCase()}* 👈\n`;
                message += `  ✏️ Yang nyuruh: ${card.assignedBy} (ikut tanggung jawab ya!)\n`;

                // Show role-based status for each member
                if (card.memberDetails && card.memberDetails.length > 0) {
                  card.memberDetails.forEach(member => {
                    const role = member.role === 'developers' ? 'Dev' : member.role === 'testers' ? 'QA' : member.role;
                    const isDone = member.status === 'done';

                    if (isDone) {
                      message += `     → ${member.name} (${role}): ✅ Udah selesai bagiannya!\n`;
                    } else {
                      message += `     → ${member.name} (${role}): ❌ Masih harus selesaikan ini!\n`;

                      // Only add to hall of shame if not done for this member
                      if (!hallOfShame[member.name]) {
                        hallOfShame[member.name] = { count: 0, maxDays: 0, cards: [], role: member.role };
                      }
                      hallOfShame[member.name].count++;
                      hallOfShame[member.name].maxDays = Math.max(hallOfShame[member.name].maxDays, card.daysSinceActivity);
                      hallOfShame[member.name].cards.push({
                        name: card.name,
                        status: card.listName,
                        days: card.daysSinceActivity
                      });
                    }
                  });
                }
              } else {
                message += `  👻 *GAK ADA YANG MAU HANDLE! HANTU KALI YA?*\n`;
              }

              message += `  ⏰ *Tidur selama: ${card.daysSinceActivity} HARI* 😴\n`;

              if (pressureMsg) {
                message += `  ${pressureMsg}\n`;
              }

              if (card.due) {
                const dueDate = new Date(card.due);
                const isOverdue = dueDate < now && !card.dueComplete;
                if (isOverdue) {
                  const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
                  message += `  💀 *DEADLINE LEWAT ${daysOverdue} HARI: ${dueDate.toLocaleDateString('id-ID')}* (RIP 🪦)\n`;
                } else if (!card.dueComplete) {
                  const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
                  message += `  ⏳ Deadline: ${dueDate.toLocaleDateString('id-ID')} (tinggal ${daysUntilDue} hari lagi loh!)\n`;
                }
              }

              message += `  🔗 ${card.url}\n\n`;
            }
          }
        }
        message += `\n`;
      } else if (report.recentCards === 0) {
        message += `😴 *SEMUA CARD TIDUR NYENYAK*\n`;
        message += `_Gak ada yang update, gak ada yang mangkrak... Ini project masih hidup kan?_ 🤷\n\n`;
      }

      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    // SECTION 3: HALL OF SHAME - The Grand Finale!
    const shameList = Object.entries(hallOfShame)
      .sort((a, b) => b[1].maxDays - a[1].maxDays || b[1].count - a[1].count);

    if (shameList.length > 0) {
      message += `🏆 *HALL OF SHAME - JUARA PROKRASTINASI* 🏆\n`;
      message += `_Dan pemenangnya adalah..._\n`;
      message += `════════════════════════════════\n\n`;

      shameList.forEach((person, index) => {
        const [name, data] = person;
        let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '💩';

        if (index === 0) {
          message += `${medal} *JUARA 1: ${name.toUpperCase()}* ${medal}\n`;

          // Show role
          const roleLabel = data.role === 'developers' ? '💻 Developer' : data.role === 'testers' ? '🔍 QA Tester' : '👤 Unknown';
          message += `${roleLabel}\n`;

          message += `🎉 *SELAMAT! KAMU BERHASIL MENELANTARKAN ${data.count} CARD!* 🎉\n`;
          message += `⏱️ *REKOR: ${data.maxDays} HARI TANPA SENTUHAN!*\n`;

          // Show specific cards with their status
          if (data.cards && data.cards.length > 0) {
            const cardsToShow = data.cards.slice(0, 3);
            message += `📝 Card yang dilupakan:\n`;
            cardsToShow.forEach(card => {
              if (typeof card === 'object' && card.name) {
                const emoji = data.role === 'developers' && card.status.toLowerCase().includes('test') ? '🎯' : '💀';
                message += `   ${emoji} ${card.name} (di ${card.status})\n`;
              } else {
                message += `   💀 ${card}\n`;
              }
            });
            if (data.cards.length > 3) {
              message += `   ... dan ${data.cards.length - 3} lainnya\n`;
            }
          }

          message += `👏 _Standing ovation untuk dedikasi dalam mengabaikan tugas!_ 👏\n\n`;
        } else {
          const roleIcon = data.role === 'developers' ? '💻' : data.role === 'testers' ? '🔍' : '👤';
          message += `${medal} ${name} ${roleIcon}: ${data.count} card mangkrak (max ${data.maxDays} hari)\n`;
        }
      });

      if (shameList.length > 0) {
        message += `\n💐 _Hadiah untuk juara: Overtime gratis minggu ini!_ 💐\n`;
      }
      message += `\n`;
    }

    // Add summary
    const totalBoards = reports.filter(r => !r.error).length;

    message += `📊 *STATISTIK HARI INI*\n`;
    message += `• Board dipantau: ${totalBoards}\n`;
    message += `• Yang rajin update: ${totalRecentCards} card 👍\n`;
    message += `• Yang mangkrak: ${totalOutdatedCards} card 👎\n\n`;

    if (totalOutdatedCards > 15) {
      message += `💀💀💀 *CODE RED! ${totalOutdatedCards} CARD MANGKRAK!* 💀💀💀\n`;
      message += `*INI BUKAN DRILL! REPEAT, BUKAN DRILL!*\n`;
      message += `*EMERGENCY MEETING SEKARANG JUGA!* 🚨\n\n`;
    } else if (totalOutdatedCards > 10) {
      message += `🔥 *BAHAYA! Terlalu banyak card nganggur nih!* 🔥\n`;
      message += `*Mungkin saatnya evaluasi cara kerja? Just saying...* 🤷\n\n`;
    } else if (totalOutdatedCards > 5) {
      message += `😬 *Hmm, lumayan banyak juga yang mangkrak ya...* 😬\n\n`;
    } else if (totalOutdatedCards === 0 && totalRecentCards > 0) {
      message += `🎊 *WOW! SEMUA CARD TERUPDATE! INI BENERAN TIM KITA?!* 🎊\n\n`;
    }

    message += `💭 _"Remember: Card yang gak diupdate itu seperti mantan yang gak di-move on-in..."_\n`;
    message += `\n🤖 _Report by: Bot yang gak pernah bolos kerja (unlike some people...)_`;

    // Send the message
    return await this.sendMessage(message);
  }

  /**
   * Send error notification
   */
  async sendErrorNotification(error) {
    const message = `🚨 *ERROR TRELLO REMINDER*\n\n` +
                   `Terjadi kesalahan saat membuat laporan harian:\n\n` +
                   `❌ ${error.message}\n\n` +
                   `Silakan cek log untuk detail lebih lanjut.`;

    return await this.sendMessage(message);
  }

  /**
   * Escape special markdown characters for WhatsApp
   */
  escapeMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/~/g, '\\~')
      .replace(/`/g, '\\`');
  }
}

module.exports = WhatsAppService;
