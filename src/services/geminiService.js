const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
  constructor(apiKey) {
    if (!apiKey) {
      console.warn('Gemini API key not provided. AI features will be disabled.');
      this.enabled = false;
      return;
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.enabled = true;
  }

  /**
   * Generate personalized pressure message for a team member
   */
  async generatePressureMessage(memberName, outdatedCards, messageType = 'morning', memberRole = 'unknown') {
    if (!this.enabled) {
      return this.getDefaultPressureMessage(memberName, outdatedCards, messageType, memberRole);
    }

    try {
      const prompt = this.buildPressurePrompt(memberName, outdatedCards, messageType, memberRole);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating AI pressure message:', error);
      return this.getDefaultPressureMessage(memberName, outdatedCards, messageType, memberRole);
    }
  }

  /**
   * Build prompt for Gemini based on message type and context
   */
  buildPressurePrompt(memberName, outdatedCards, messageType, memberRole) {
    const totalCards = outdatedCards.length;
    const maxDays = Math.max(...outdatedCards.map(card => card.daysSinceActivity));
    const cardList = outdatedCards.slice(0, 3).map(card =>
      `- "${card.name}" (${card.daysSinceActivity} hari mangkrak${card.listName ? ` di ${card.listName}` : ''})`
    ).join('\n');

    // Get role-specific context
    let roleContext = '';
    let completionCriteria = '';

    if (memberRole === 'developers') {
      roleContext = 'Developer (Backend/Frontend)';
      completionCriteria = 'Card dianggap selesai kalau sudah dipush ke Testing/QA';
    } else if (memberRole === 'testers') {
      roleContext = 'QA Tester';
      completionCriteria = 'Card dianggap selesai kalau sudah Done/Released setelah testing';
    } else {
      roleContext = 'Team Member';
      completionCriteria = 'Card dianggap selesai kalau sudah dipindah ke status Done';
    }

    const baseContext = `
Kamu adalah seorang project manager yang sarkastis dan humoris. Tugasmu adalah membuat pesan pengingat dalam Bahasa Indonesia yang kreatif, sarkastis, tapi tetap profesional untuk mendorong tim menyelesaikan task mereka.

Context:
- Nama team member: ${memberName}
- Role: ${roleContext}
- Kriteria selesai: ${completionCriteria}
- Total card mangkrak: ${totalCards}
- Card paling lama diabaikan: ${maxDays} hari
- Contoh card yang mangkrak:
${cardList}
`;

    let specificRequest = '';

    switch (messageType) {
      case 'morning':
        specificRequest = `
Buat pesan pengingat PAGI yang:
1. Menyapa dengan sarkastis (referensi kopi, sarapan, atau aktivitas pagi)
2. Sindir halus tentang card yang mangkrak
3. Motivasi sarkastis untuk hari ini
4. Gunakan emoji yang relevan
5. Max 4-5 kalimat
6. Tone: 70% sarkastis, 30% motivasi
`;
        break;

      case 'afternoon':
        specificRequest = `
Buat pesan pengingat SIANG yang:
1. Tanyakan progress dengan nada sarkastis (referensi makan siang, ngantuk siang, dll)
2. Ingatkan berapa lama card sudah mangkrak
3. Sindir dengan humor tentang prokrastinasi
4. Gunakan emoji yang relevan
5. Max 4-5 kalimat
6. Tone: 80% sarkastis, 20% mendesak
`;
        break;

      case 'evening':
        specificRequest = `
Buat pesan pengingat SORE/MALAM yang:
1. Sindir tentang mau pulang tapi kerjaan belum selesai
2. Tanya apa card-card itu dibawa pulang untuk dikerjakan di rumah
3. Ancaman halus tentang meeting besok pagi
4. Gunakan emoji yang relevan
5. Max 4-5 kalimat
6. Tone: 90% sarkastis, 10% ancaman halus
`;
        break;

      case 'urgent':
        specificRequest = `
Buat pesan URGENT/DARURAT yang:
1. Langsung to the point dengan caps lock di beberapa kata
2. Sebutkan konsekuensi kalau tidak diselesaikan
3. Deadline ultimatum (misal: sebelum jam 5 sore)
4. Gunakan emoji warning/bahaya
5. Max 3-4 kalimat
6. Tone: 50% marah, 50% ultimatum
`;
        break;
    }

    return baseContext + specificRequest + `

PENTING:
- Jangan gunakan kata kasar atau offensive
- Tetap profesional walaupun sarkastis
- Mention nama ${memberName} di pesan
- Sebutkan salah satu card yang mangkrak
- Pesan harus memotivasi untuk action, bukan menjatuhkan mental`;
  }

  /**
   * Generate report analysis using AI
   */
  async generateReportAnalysis(reports) {
    if (!this.enabled) {
      return this.getDefaultReportAnalysis(reports);
    }

    try {
      const totalOutdated = reports.reduce((sum, r) => sum + (r.outdatedCards || 0), 0);
      const totalRecent = reports.reduce((sum, r) => sum + (r.recentCards || 0), 0);

      const prompt = `
Analisis laporan Trello berikut dan buat kesimpulan sarkastis dalam Bahasa Indonesia:

Data:
- Total board: ${reports.length}
- Total card update terbaru: ${totalRecent}
- Total card mangkrak: ${totalOutdated}
- Ratio card mangkrak: ${((totalOutdated / (totalOutdated + totalRecent)) * 100).toFixed(1)}%

Buat analisis singkat (3-4 kalimat) yang:
1. Sarkastis tapi tetap informatif
2. Berikan "diagnosa" kondisi tim
3. Saran improvement dengan nada humor
4. Gunakan analogi/perumpamaan lucu
5. Akhiri dengan motivasi sarkastis

Tone: Professional roasting, seperti stand up comedy tapi untuk kantor.
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      return this.getDefaultReportAnalysis(reports);
    }
  }

  /**
   * Generate custom roasting based on patterns
   */
  async generatePatternRoasting(pattern) {
    if (!this.enabled) {
      return null;
    }

    try {
      let prompt = '';

      switch (pattern.type) {
        case 'serial_procrastinator':
          prompt = `
Buat roasting singkat (2-3 kalimat) dalam Bahasa Indonesia untuk seseorang yang:
- Punya ${pattern.count} card mangkrak
- Card terlama: ${pattern.maxDays} hari
- Nickname: "Serial Procrastinator"

Tone: Sarkastis tapi lucu, seperti roasting teman.
`;
          break;

        case 'deadline_ignorer':
          prompt = `
Buat roasting singkat (2-3 kalimat) dalam Bahasa Indonesia untuk seseorang yang:
- Punya ${pattern.overdueCount} card melewati deadline
- Total hari overdue: ${pattern.totalOverdueDays}
- Nickname: "Deadline? What deadline?"

Tone: Sarkastis tentang ignorance terhadap deadline.
`;
          break;

        case 'ghost_worker':
          prompt = `
Buat roasting singkat (2-3 kalimat) dalam Bahasa Indonesia untuk seseorang yang:
- Tidak ada update sama sekali ${pattern.days} hari terakhir
- Nickname: "The Ghost Worker"

Tone: Sarkastis tentang keberadaan yang dipertanyakan.
`;
          break;
      }

      if (!prompt) return null;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating pattern roasting:', error);
      return null;
    }
  }

  /**
   * Default pressure message when AI is not available
   */
  getDefaultPressureMessage(memberName, outdatedCards, messageType, memberRole) {
    const totalCards = outdatedCards.length;
    const maxDays = Math.max(...outdatedCards.map(card => card.daysSinceActivity));

    const messages = {
      morning: {
        developers: `☕ Morning ${memberName}! Sambil ngopi, coba push ${totalCards} card ke Testing dong. Ada yang udah ${maxDays} hari stuck di development loh 😏`,
        testers: `☕ Morning ${memberName}! Sambil ngopi, coba selesaikan testing ${totalCards} card ya. Ada yang udah ${maxDays} hari nunggu di-test 🧪`,
        default: `☕ Morning ${memberName}! Sambil ngopi, coba cek ${totalCards} card yang udah ${maxDays} hari nganggur ya. Siapa tau abis ngopi jadi semangat 😏`
      },
      afternoon: {
        developers: `🌞 Halo ${memberName}, udah makan siang? ${totalCards} card masih stuck di development nih, udah ${maxDays} hari belum ke Testing 💻`,
        testers: `🌞 Halo ${memberName}, udah makan siang? ${totalCards} card masih nunggu testing nih, udah ${maxDays} hari di queue 🔍`,
        default: `🌞 Halo ${memberName}, udah makan siang? ${totalCards} card kamu masih lapar update nih, udah ${maxDays} hari puasa 🙄`
      },
      evening: {
        developers: `🌙 ${memberName}, mau pulang? Eits, ${totalCards} card belum di-push ke Testing loh. Yang paling parah udah ${maxDays} hari coding terus 💀`,
        testers: `🌙 ${memberName}, mau pulang? Eits, ${totalCards} card masih perlu testing loh. Yang paling lama udah ${maxDays} hari nunggu 🧐`,
        default: `🌙 ${memberName}, mau pulang? Eits, ${totalCards} card masih nungguin loh. Yang paling kasian udah ${maxDays} hari ditinggal 😢`
      },
      urgent: {
        developers: `🚨 URGENT @${memberName}! ${totalCards} card HARUS ke Testing SEKARANG! Ada yang udah ${maxDays} HARI stuck di dev! Push NOW! 💀`,
        testers: `🚨 URGENT @${memberName}! ${totalCards} card HARUS selesai testing SEKARANG! Ada yang udah ${maxDays} HARI nunggu! Test NOW! 💀`,
        default: `🚨 URGENT @${memberName}! ${totalCards} card HARUS diupdate SEKARANG! Ada yang udah ${maxDays} HARI mangkrak! No excuse! 💀`
      }
    };

    const roleKey = memberRole === 'developers' ? 'developers' :
                   memberRole === 'testers' ? 'testers' :
                   'default';

    return messages[messageType][roleKey] || messages[messageType].default || messages.morning.default;
  }

  /**
   * Default report analysis when AI is not available
   */
  getDefaultReportAnalysis(reports) {
    const totalOutdated = reports.reduce((sum, r) => sum + (r.outdatedCards || 0), 0);
    const totalRecent = reports.reduce((sum, r) => sum + (r.recentCards || 0), 0);
    const ratio = ((totalOutdated / (totalOutdated + totalRecent)) * 100).toFixed(1);

    if (ratio > 50) {
      return `🔍 Analisis AI: Dengan ${ratio}% card mangkrak, tim ini seperti parkiran mobil tua - banyak yang nganggur dan berdebu. Diagnosis: Prokrastinasi akut stadium 4. Saran: Coba matikan Instagram dulu kali ya? 💊`;
    } else if (ratio > 30) {
      return `🔍 Analisis AI: ${ratio}% card mangkrak itu ibarat punya 10 piring tapi cuma 7 yang dicuci. Sisanya? Nunggu jamur tumbuh. Diagnosis: Selective productivity syndrome. Resep: Deadline yang lebih menakutkan! 💉`;
    } else {
      return `🔍 Analisis AI: Cuma ${ratio}% card mangkrak? Wow, ini tim apa tim? Produktif banget! Tapi jangan senang dulu, masih ada yang mangkrak kan? Finish them! 🏁`;
    }
  }
}

module.exports = GeminiService;
