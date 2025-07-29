# Role-Based Task Tracking

This feature enables different task completion criteria for different team roles. For example, developers' tasks are considered "done" when they move to Testing, while testers' tasks are "done" when they move to final completion states.

## Overview

The role-based tracking system recognizes that different team members have different definitions of "done" for their tasks:

- **Developers**: A task is complete when code is pushed to Testing/QA
- **Testers**: A task is complete when testing is finished and the card moves to Done/Released
- **Other roles**: Can be configured with custom completion criteria

## Team Configuration

### Default Team Structure

The system comes pre-configured with the following team members:

#### Developers
- **Indra Gunanda** (`@indragunanda`)
  - Tasks are done when cards reach: Testing, Test, QA, Quality Assurance, Ready for Testing, In Testing
  
- **Muhammad Juan Alfirdaus** (`@muhammadjuanalfirdaus`)
  - Tasks are done when cards reach: Testing, Test, QA, Quality Assurance, Ready for Testing, In Testing

#### Testers
- **Rama Rambudiarto** (`@ramarambudiarto`)
  - Tasks are done when cards reach: Done, Complete, Completed, Released, Deployed, Live, Closed

## How It Works

### 1. Card Status Recognition

When the bot analyzes Trello cards, it checks:
- Who is assigned to the card
- What role that person has
- Whether the card's current list/status matches their "done" criteria

### 2. Reporting

The daily reports will show:
- Role-specific completion status for each team member
- Cards that are "done" for some members but not others
- Separate tracking for developers vs testers in the Hall of Shame

### 3. Example Scenarios

**Scenario 1: Card in Development**
- Card assigned to: Indra (Developer)
- Current status: "In Progress"
- Result: Card is marked as "outdated" for Indra

**Scenario 2: Card in Testing**
- Card assigned to: Indra (Developer) and Rama (Tester)
- Current status: "Testing"
- Result: 
  - ✅ Done for Indra (developer's work is complete)
  - ❌ Not done for Rama (testing still in progress)

**Scenario 3: Card Released**
- Card assigned to: Indra (Developer) and Rama (Tester)
- Current status: "Done"
- Result: ✅ Done for both team members

## Configuration

### Enable Role-Based Tracking

Add to your `.env` file:

```env
# Enable role-based task tracking
ENABLE_ROLE_BASED_TRACKING=true

# Optional: Customize done statuses for developers
DEVELOPER_DONE_STATUSES=Testing,Test,QA,Ready for Testing

# Optional: Customize done statuses for testers  
TESTER_DONE_STATUSES=Done,Complete,Released,Deployed
```

### Modifying Team Members

Edit `src/config/teamRoles.js` to:
- Add new team members
- Change role assignments
- Add new roles (e.g., Product Owners, Designers)
- Customize status mappings

Example of adding a new developer:

```javascript
developers: {
  members: [
    // Existing members...
    {
      username: 'newdeveloper',
      fullName: 'New Developer Name',
      aliases: ['newdev', '@newdeveloper']
    }
  ],
  // Status configurations...
}
```

## Report Features

### 1. Individual Status Tracking

Reports will show role-specific status for each assigned member:

```
❌ Fix API endpoint bug
  🎯 TERTUDUH: INDRA GUNANDA, RAMA RAMBUDIARTO
  → Indra Gunanda (Dev): ✅ done
  → Rama Rambudiarto (QA): ❌ in_progress
```

### 2. Role-Aware Hall of Shame

The Hall of Shame only includes cards that are not done for specific members:

```
🏆 HALL OF SHAME - JUARA PROKRASTINASI 🏆

🥇 JUARA 1: RAMA RAMBUDIARTO
🔍 QA Tester
🎉 SELAMAT! KAMU BERHASIL MENELANTARKAN 5 CARD!
📝 Card yang dilupakan:
   🎯 Fix API endpoint (di Testing)
   🎯 Update user profile (di Testing)
```

### 3. Pressure Messages by Role

AI-generated or default pressure messages are customized by role:

**For Developers:**
```
☕ Morning Indra! Sambil ngopi, coba push 3 card ke Testing dong. 
Ada yang udah 7 hari stuck di development loh 😏
```

**For Testers:**
```
☕ Morning Rama! Sambil ngopi, coba selesaikan testing 5 card ya. 
Ada yang udah 10 hari nunggu di-test 🧪
```

## Best Practices

1. **Clear List Names**: Use clear, consistent list names in Trello that match the configured statuses

2. **Proper Assignment**: Always assign cards to the appropriate team members based on who's responsible for the current phase

3. **Status Transitions**: 
   - Developers should move cards to Testing when dev work is complete
   - Testers should move cards to Done when testing is complete

4. **Regular Updates**: Keep cards moving through the pipeline to avoid accumulation in any single status

## Troubleshooting

### Cards Not Recognized Correctly

Check:
1. Team member names match exactly in `teamRoles.js`
2. List names in Trello match the configured status names
3. Cards are properly assigned to team members

### Role Not Detected

Ensure:
1. Member username/fullName is correctly configured
2. No typos in the configuration file
3. Role-based tracking is enabled in `.env`

### Custom Roles Needed

To add custom roles:
1. Edit `src/config/teamRoles.js`
2. Add new role object with members and status configurations
3. Restart the bot

## Future Enhancements

Possible improvements:
- Dynamic role assignment via Trello labels
- Multiple role support per person
- Time-based status transitions
- Custom completion criteria per project/board