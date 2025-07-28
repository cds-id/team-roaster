const axios = require('axios');
const config = require('../config');

/**
 * Helper script to list all accessible Trello boards
 * This helps users find their board IDs easily
 */
class BoardLister {
  constructor(apiKey, apiToken) {
    this.apiKey = apiKey;
    this.apiToken = apiToken;
    this.baseUrl = 'https://api.trello.com/1';
  }

  /**
   * Build URL with authentication parameters
   */
  buildUrl(endpoint) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('key', this.apiKey);
    url.searchParams.append('token', this.apiToken);
    return url.toString();
  }

  /**
   * Get all boards for the authenticated user
   */
  async getMyBoards() {
    try {
      const response = await axios.get(this.buildUrl('/members/me/boards'), {
        params: {
          fields: 'name,desc,url,dateLastActivity,starred,memberships',
          filter: 'open',
          organization: 'true',
          organization_fields: 'name,displayName'
        }
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new Error('Invalid API credentials. Please check your TRELLO_API_KEY and TRELLO_API_TOKEN.');
      }
      throw error;
    }
  }

  /**
   * Get member information
   */
  async getMemberInfo() {
    try {
      const response = await axios.get(this.buildUrl('/members/me'), {
        params: {
          fields: 'fullName,username,email'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching member info:', error.message);
      return null;
    }
  }

  /**
   * Format board information for display
   */
  formatBoardInfo(boards) {
    const sortedBoards = boards.sort((a, b) => {
      // Sort by starred first, then by last activity
      if (a.starred && !b.starred) return -1;
      if (!a.starred && b.starred) return 1;
      return new Date(b.dateLastActivity) - new Date(a.dateLastActivity);
    });

    return sortedBoards.map(board => ({
      id: board.id,
      name: board.name,
      description: board.desc || 'No description',
      url: board.url,
      organization: board.organization ? board.organization.displayName : 'Personal',
      starred: board.starred,
      lastActivity: new Date(board.dateLastActivity).toLocaleDateString()
    }));
  }

  /**
   * Display boards in a formatted table
   */
  displayBoards(boards, memberInfo) {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 TRELLO BOARDS LIST');
    console.log('='.repeat(80));

    if (memberInfo) {
      console.log(`\n👤 User: ${memberInfo.fullName} (@${memberInfo.username})`);
      if (memberInfo.email) {
        console.log(`📧 Email: ${memberInfo.email}`);
      }
    }

    console.log(`\n📋 Found ${boards.length} board(s):\n`);

    const formattedBoards = this.formatBoardInfo(boards);

    formattedBoards.forEach((board, index) => {
      console.log(`${index + 1}. ${board.starred ? '⭐ ' : ''}${board.name}`);
      console.log(`   ID: ${board.id}`);
      console.log(`   Organization: ${board.organization}`);
      if (board.description && board.description !== 'No description') {
        console.log(`   Description: ${board.description.substring(0, 60)}${board.description.length > 60 ? '...' : ''}`);
      }
      console.log(`   Last Activity: ${board.lastActivity}`);
      console.log(`   URL: ${board.url}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n💡 HOW TO USE BOARD IDs:');
    console.log('1. Copy the board ID(s) you want to monitor');
    console.log('2. Add them to your .env file:');
    console.log('   TRELLO_BOARD_IDS=board_id_1,board_id_2,board_id_3');
    console.log('\nExample:');

    if (formattedBoards.length > 0) {
      const exampleIds = formattedBoards.slice(0, 2).map(b => b.id).join(',');
      console.log(`   TRELLO_BOARD_IDS=${exampleIds}`);
    } else {
      console.log('   TRELLO_BOARD_IDS=your_board_id_here');
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Run the board lister
   */
  async run() {
    try {
      console.log('\n🔍 Fetching your Trello boards...\n');

      const [boards, memberInfo] = await Promise.all([
        this.getMyBoards(),
        this.getMemberInfo()
      ]);

      if (boards.length === 0) {
        console.log('❌ No boards found. Make sure you have access to at least one Trello board.');
        return;
      }

      this.displayBoards(boards, memberInfo);

      // If boards are already configured, show them
      if (config.trello.boardIds.length > 0) {
        console.log('📌 CURRENTLY CONFIGURED BOARDS:');
        console.log('The following board IDs are in your .env file:\n');

        for (const configuredId of config.trello.boardIds) {
          const board = boards.find(b => b.id === configuredId);
          if (board) {
            console.log(`✅ ${board.name} (${configuredId})`);
          } else {
            console.log(`❌ Unknown board (${configuredId}) - This board may have been deleted or you lost access`);
          }
        }
        console.log('');
      }

    } catch (error) {
      console.error('\n❌ ERROR:', error.message);

      if (error.message.includes('Invalid API credentials')) {
        console.error('\n📝 To fix this:');
        console.error('1. Go to https://trello.com/power-ups/admin');
        console.error('2. Create or access your Power-Up');
        console.error('3. Go to the "API Key" tab');
        console.error('4. Generate a new API Key');
        console.error('5. Click on "Token" to generate a token');
        console.error('6. Update your .env file with the new credentials');
      } else if (error.code === 'ENOTFOUND') {
        console.error('\n🌐 Network error. Please check your internet connection.');
      }

      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  // Check if API credentials are available
  if (!config.trello.apiKey || !config.trello.apiToken) {
    console.error('❌ Missing Trello API credentials!');
    console.error('\nPlease set the following in your .env file:');
    console.error('- TRELLO_API_KEY=your_api_key');
    console.error('- TRELLO_API_TOKEN=your_api_token');
    console.error('\nSee README.md for instructions on how to get these credentials.');
    process.exit(1);
  }

  const lister = new BoardLister(config.trello.apiKey, config.trello.apiToken);
  await lister.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = BoardLister;
