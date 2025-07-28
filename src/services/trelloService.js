const axios = require('axios');

class TrelloService {
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
   * Get board information
   */
  async getBoard(boardId) {
    try {
      const response = await axios.get(this.buildUrl(`/boards/${boardId}`));
      return response.data;
    } catch (error) {
      console.error(`Error fetching board ${boardId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all lists for a board
   */
  async getBoardLists(boardId) {
    try {
      const response = await axios.get(this.buildUrl(`/boards/${boardId}/lists`));
      return response.data;
    } catch (error) {
      console.error(`Error fetching lists for board ${boardId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all cards for a board with member information
   */
  async getBoardCards(boardId) {
    try {
      const url = this.buildUrl(`/boards/${boardId}/cards`);
      const response = await axios.get(url, {
        params: {
          members: 'true',
          member_fields: 'fullName,username,avatarUrl',
          fields: 'name,desc,due,dueComplete,dateLastActivity,idList,labels,url,shortUrl'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching cards for board ${boardId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all members of a board
   */
  async getBoardMembers(boardId) {
    try {
      const response = await axios.get(this.buildUrl(`/boards/${boardId}/members`));
      return response.data;
    } catch (error) {
      console.error(`Error fetching members for board ${boardId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get card actions (history) to find who assigned members
   */
  async getCardActions(cardId) {
    try {
      const url = this.buildUrl(`/cards/${cardId}/actions`);
      const response = await axios.get(url, {
        params: {
          filter: 'addMemberToCard,removeMemberFromCard,updateCard',
          memberCreator: 'true',
          memberCreator_fields: 'fullName,username'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching actions for card ${cardId}:`, error.message);
      return [];
    }
  }

  /**
   * Get complete board data including lists, cards, and members
   */
  async getBoardData(boardId) {
    try {
      const [board, lists, cards, members] = await Promise.all([
        this.getBoard(boardId),
        this.getBoardLists(boardId),
        this.getBoardCards(boardId),
        this.getBoardMembers(boardId)
      ]);

      // Create a map of list IDs to list names
      const listMap = lists.reduce((acc, list) => {
        acc[list.id] = list;
        return acc;
      }, {});

      // Group cards by list
      const cardsByList = cards.reduce((acc, card) => {
        const listName = listMap[card.idList]?.name || 'Unknown';
        if (!acc[listName]) {
          acc[listName] = [];
        }
        acc[listName].push(card);
        return acc;
      }, {});

      return {
        board,
        lists,
        cards,
        cardsByList,
        members,
        listMap
      };
    } catch (error) {
      console.error(`Error fetching board data for ${boardId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get cards updated within the last N days
   */
  filterRecentCards(cards, daysToCheck) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToCheck);

    return cards.filter(card => {
      const lastActivity = new Date(card.dateLastActivity);
      return lastActivity >= cutoffDate;
    });
  }

  /**
   * Categorize cards by activity status
   */
  categorizeCardsByActivity(cards) {
    const now = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const outdatedCards = [];
    const recentCards = [];

    cards.forEach(card => {
      const lastActivity = new Date(card.dateLastActivity);
      const daysSinceActivity = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));

      if (lastActivity < threeDaysAgo) {
        outdatedCards.push({
          ...card,
          daysSinceActivity
        });
      } else {
        recentCards.push({
          ...card,
          daysSinceActivity
        });
      }
    });

    // Sort outdated cards by inactivity duration (longest first)
    outdatedCards.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

    // Sort recent cards by most recent activity
    recentCards.sort((a, b) => new Date(b.dateLastActivity) - new Date(a.dateLastActivity));

    return { outdatedCards, recentCards };
  }

  /**
   * Format card information for reporting
   */
  async formatCardInfo(card) {
    const actions = await this.getCardActions(card.id);

    // Find who assigned members
    const assignmentActions = actions.filter(action =>
      action.type === 'addMemberToCard'
    );

    const assignedBy = assignmentActions.length > 0
      ? assignmentActions[0].memberCreator.fullName
      : 'Unknown';

    return {
      name: card.name,
      url: card.shortUrl || card.url,
      members: card.members.map(m => m.fullName).join(', ') || 'Unassigned',
      assignedBy,
      lastActivity: card.dateLastActivity,
      due: card.due,
      dueComplete: card.dueComplete,
      labels: card.labels.map(l => l.name).filter(n => n).join(', '),
      description: card.desc,
      daysSinceActivity: card.daysSinceActivity || 0
    };
  }

  /**
   * Generate report data for multiple boards
   */
  async generateReport(boardIds, daysToCheck = 7) {
    const reports = [];

    for (const boardId of boardIds) {
      try {
        const boardData = await this.getBoardData(boardId);

        // Get all active cards (not archived)
        const activeCards = boardData.cards.filter(card => !card.closed);

        // Categorize cards by activity
        const { outdatedCards, recentCards } = this.categorizeCardsByActivity(activeCards);

        // Format outdated cards by status and collect member statistics
        const outdatedCardsByStatus = {};
        const memberStatistics = {};

        for (const card of outdatedCards) {
          const listName = boardData.listMap[card.idList]?.name || 'Unknown';
          if (!outdatedCardsByStatus[listName]) {
            outdatedCardsByStatus[listName] = [];
          }
          const formattedCard = await this.formatCardInfo(card);
          outdatedCardsByStatus[listName].push(formattedCard);

          // Collect member statistics for hall of shame
          if (card.members && card.members.length > 0) {
            card.members.forEach(member => {
              const memberName = member.fullName || member.username || 'Unknown';
              if (!memberStatistics[memberName]) {
                memberStatistics[memberName] = {
                  count: 0,
                  maxDays: 0,
                  totalDays: 0,
                  cards: []
                };
              }
              memberStatistics[memberName].count++;
              memberStatistics[memberName].maxDays = Math.max(
                memberStatistics[memberName].maxDays,
                card.daysSinceActivity
              );
              memberStatistics[memberName].totalDays += card.daysSinceActivity;
              memberStatistics[memberName].cards.push({
                name: card.name,
                days: card.daysSinceActivity
              });
            });
          }
        }

        // Format recent cards by status
        const recentCardsByStatus = {};
        for (const card of recentCards) {
          const listName = boardData.listMap[card.idList]?.name || 'Unknown';
          if (!recentCardsByStatus[listName]) {
            recentCardsByStatus[listName] = [];
          }
          const formattedCard = await this.formatCardInfo(card);
          recentCardsByStatus[listName].push(formattedCard);
        }

        reports.push({
          boardName: boardData.board.name,
          boardUrl: boardData.board.url,
          totalCards: activeCards.length,
          outdatedCards: outdatedCards.length,
          recentCards: recentCards.length,
          outdatedCardsByStatus,
          recentCardsByStatus,
          memberStatistics,
          lists: boardData.lists
        });
      } catch (error) {
        console.error(`Error generating report for board ${boardId}:`, error.message);
        reports.push({
          boardName: `Board ${boardId}`,
          error: error.message
        });
      }
    }

    return reports;
  }
}

module.exports = TrelloService;
