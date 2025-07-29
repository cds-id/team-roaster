/**
 * Team roles configuration
 * Defines team members by role and their task completion criteria
 */

const teamRoles = {
  // Developers - tasks are considered done when cards move to Testing
  developers: {
    members: [
      {
        username: 'indragunanda',
        fullName: 'Indra Gunanda',
        aliases: ['indra', '@indragunanda']
      },
      {
        username: 'muhammadjuanalfirdaus',
        fullName: 'Muhammad Juan Alfirdaus',
        aliases: ['juan', 'alfirdaus', '@muhammadjuanalfirdaus']
      }
    ],
    // List names that indicate a developer's task is complete
    doneStatuses: ['Testing', 'Test', 'QA', 'Quality Assurance', 'Ready for Testing', 'In Testing'],
    // List names that indicate work in progress
    inProgressStatuses: ['In Progress', 'Doing', 'Development', 'In Development', 'Working'],
    // List names that indicate work hasn't started
    todoStatuses: ['To Do', 'Backlog', 'Todo', 'Planned', 'Ready']
  },

  // Testers - tasks are considered done when cards move past Testing
  testers: {
    members: [
      {
        username: 'ramarambudiarto',
        fullName: 'Rama Rambudiarto',
        aliases: ['rama', '@ramarambudiarto']
      }
    ],
    // List names that indicate a tester's task is complete
    doneStatuses: ['Done', 'Complete', 'Completed', 'Released', 'Deployed', 'Live', 'Closed'],
    // List names that indicate testing in progress
    inProgressStatuses: ['Testing', 'Test', 'QA', 'Quality Assurance', 'In Testing', 'UAT'],
    // List names that indicate testing hasn't started
    todoStatuses: ['Ready for Testing', 'Awaiting Test', 'To Test']
  },

  // Additional roles can be added here
  productOwners: {
    members: [],
    // POs might track different statuses
    doneStatuses: ['Released', 'Live', 'Deployed'],
    inProgressStatuses: ['Review', 'UAT', 'Acceptance'],
    todoStatuses: ['Backlog', 'Planned']
  }
};

/**
 * Helper functions for role-based task tracking
 */
const roleHelpers = {
  /**
   * Get role for a member by username or full name
   */
  getMemberRole(memberIdentifier) {
    const identifier = memberIdentifier.toLowerCase().trim();

    for (const [role, config] of Object.entries(teamRoles)) {
      for (const member of config.members) {
        if (member.username.toLowerCase() === identifier ||
            member.fullName.toLowerCase() === identifier ||
            member.aliases.some(alias => alias.toLowerCase() === identifier)) {
          return role;
        }
      }
    }

    return 'unknown';
  },

  /**
   * Check if a card is "done" for a specific member
   */
  isCardDoneForMember(cardStatus, memberIdentifier) {
    const role = this.getMemberRole(memberIdentifier);
    const roleConfig = teamRoles[role];

    if (!roleConfig) return false;

    // Check if the card status matches any of the done statuses for this role
    return roleConfig.doneStatuses.some(status =>
      cardStatus.toLowerCase().includes(status.toLowerCase())
    );
  },

  /**
   * Check if a card is "in progress" for a specific member
   */
  isCardInProgressForMember(cardStatus, memberIdentifier) {
    const role = this.getMemberRole(memberIdentifier);
    const roleConfig = teamRoles[role];

    if (!roleConfig) return false;

    return roleConfig.inProgressStatuses.some(status =>
      cardStatus.toLowerCase().includes(status.toLowerCase())
    );
  },

  /**
   * Check if a card is "todo" for a specific member
   */
  isCardTodoForMember(cardStatus, memberIdentifier) {
    const role = this.getMemberRole(memberIdentifier);
    const roleConfig = teamRoles[role];

    if (!roleConfig) return false;

    return roleConfig.todoStatuses.some(status =>
      cardStatus.toLowerCase().includes(status.toLowerCase())
    );
  },

  /**
   * Get completion status for a card based on member role
   */
  getCardStatusForMember(cardStatus, memberIdentifier) {
    if (this.isCardDoneForMember(cardStatus, memberIdentifier)) {
      return 'done';
    } else if (this.isCardInProgressForMember(cardStatus, memberIdentifier)) {
      return 'in_progress';
    } else if (this.isCardTodoForMember(cardStatus, memberIdentifier)) {
      return 'todo';
    }
    return 'unknown';
  },

  /**
   * Filter cards that are "outdated" for a specific member
   * A card is outdated if it's assigned to the member and not in their "done" status
   */
  filterOutdatedCardsForMember(cards, memberIdentifier, listMap) {
    return cards.filter(card => {
      // Check if member is assigned to this card
      const isAssigned = card.members && card.members.some(member => {
        const memberName = member.fullName || member.username || '';
        return memberName.toLowerCase().includes(memberIdentifier.toLowerCase());
      });

      if (!isAssigned) return false;

      // Get the list name for this card
      const listName = listMap[card.idList]?.name || 'Unknown';

      // Card is outdated if it's not in the done status for this member's role
      return !this.isCardDoneForMember(listName, memberIdentifier);
    });
  },

  /**
   * Get all members across all roles
   */
  getAllMembers() {
    const allMembers = [];

    for (const [role, config] of Object.entries(teamRoles)) {
      for (const member of config.members) {
        allMembers.push({
          ...member,
          role
        });
      }
    }

    return allMembers;
  },

  /**
   * Get member by any identifier
   */
  getMemberInfo(identifier) {
    const allMembers = this.getAllMembers();
    const searchTerm = identifier.toLowerCase().trim();

    return allMembers.find(member =>
      member.username.toLowerCase() === searchTerm ||
      member.fullName.toLowerCase() === searchTerm ||
      member.aliases.some(alias => alias.toLowerCase() === searchTerm)
    );
  }
};

module.exports = {
  teamRoles,
  roleHelpers
};
