# Trello Reminder Bot

A Node.js application that fetches Trello board data and sends daily WhatsApp reminders about cards and their assignees in **Bahasa Indonesia**. The bot monitors your Trello boards and sends a comprehensive report to a WhatsApp group, showing card status, assignments, and recent activity. It includes **pressure messages** for team members with outdated cards (3+ days without activity), with increasing intensity based on inactivity duration.

## Features

- 📋 Fetches data from multiple Trello boards
- 📊 Groups cards by status/list
- 👤 Shows who assigned cards to team members
- 📅 Tracks due dates and overdue cards
- 🔍 Separates outdated cards (3+ days inactive) from recent updates
- 🚨 Sends pressure messages for outdated cards with increasing intensity
- 📱 Sends formatted reports to WhatsApp groups in Bahasa Indonesia
- ⏰ Automated daily scheduling using cron
- 🏷️ Includes card labels and descriptions
- 🔗 Provides direct links to cards
- 😡 Progressive pressure system based on inactivity duration
- 🤖 **Gemini AI integration** for personalized pressure messages
- 📬 **Multiple schedule support** - send different messages throughout the day
- 💬 **Split message mode** - break long reports into multiple messages
- 🎯 **Individual pressure messages** - target specific team members

## Prerequisites

- Node.js (v14 or higher)
- NPM or Yarn
- Trello account (Atlassian account)
- Trello Power-Up for API access
- WhatsApp group ID for notifications

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd trello-reminder
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp .env.example .env
```

4. Configure your `.env` file with your credentials (see Configuration section)

## Configuration

Edit the `.env` file with your settings:

### Trello Configuration
```env
# Get these from https://trello.com/app-key
TRELLO_API_KEY=your_trello_api_key_here
TRELLO_API_TOKEN=your_trello_api_token_here

# Comma-separated list of board IDs
TRELLO_BOARD_IDS=board_id_1,board_id_2
```

### WhatsApp Configuration
```env
# WhatsApp API endpoint (default provided)
WHATSAPP_API_URL=https://maid-sender.ciptadusa.com/send/message
WHATSAPP_API_TOKEN=Y2RzOmNkcw==

# Your WhatsApp group ID (format: 120363420669273495@g.us)
WHATSAPP_GROUP_ID=your_whatsapp_group_id@g.us
```

### Schedule Configuration
```env
# Cron format (default: daily at 9:00 AM)
REMINDER_SCHEDULE=0 9 * * *

# Timezone
TZ=UTC
```

### Report Configuration
```env
# Include cards updated in the last N days (default: 30 to catch outdated cards)
DAYS_TO_CHECK=30

# Include additional information
INCLUDE_LABELS=true
INCLUDE_DUE_DATES=true

# Split long reports into multiple messages
SPLIT_MESSAGES=true
MAX_CARDS_PER_MESSAGE=5
MESSAGE_DELAY=2  # Delay between messages in seconds
```

### Gemini AI Configuration (Optional)
```env
# Enable Gemini AI for personalized messages
GEMINI_API_KEY=your_gemini_api_key_here

# AI will automatically be enabled if API key is provided
# Get your API key from: https://makersuite.google.com/app/apikey
```

### Advanced Schedule Configuration
```env
# Enable multiple schedules for different message types
ENABLE_MULTIPLE_SCHEDULES=true

# Morning summary (overview and motivation)
MORNING_SCHEDULE=0 9 * * *

# Afternoon progress check
AFTERNOON_SCHEDULE=0 14 * * *

# Evening detailed report
EVENING_SCHEDULE=0 17 * * *

# Individual pressure messages throughout the day
ENABLE_INDIVIDUAL_PRESSURE=true
PRESSURE_TIMES=10:00,15:00,16:30
```

## Getting Trello API Credentials

**Important**: Although Trello uses Atlassian accounts for login, you still need Trello-specific API credentials. Atlassian API tokens (from id.atlassian.com) are for Jira/Confluence and won't work with Trello's API.

1. **Create a Power-Up** (Required for API access):
   - Go to https://trello.com/power-ups/admin
   - Click "Create a Power-Up"
   - Fill in the basic details (name, description)
   - Save the Power-Up

2. **API Key**:
   - In your Power-Up settings, go to the "API Key" tab
   - Click "Generate a new API Key"
   - Copy the API Key shown

3. **API Token**:
   - Next to your API Key, click the "Token" link
   - You'll be redirected to an authorization page
   - Click "Allow" to grant access
   - Copy the generated token

4. **Board IDs**:
   - Option 1: Use the helper script
     ```bash
     npm run list-boards
     ```
   - Option 2: Manual method
     - Open your Trello board in a browser
     - The URL will look like: `https://trello.com/b/BOARD_ID/board-name`
     - Copy the BOARD_ID part

## Usage

### List Available Boards
To find your Trello board IDs easily:
```bash
npm run list-boards
```
This will display all boards you have access to with their IDs, names, and other details.

### Run Once (Test Mode)
To test the bot and send a report immediately:
```bash
npm run dev
# or
npm run test
# or
node src/index.js --now
```

### Start Scheduler
To start the bot with scheduled reports:
```bash
npm start
# or
node src/index.js
```

### Run Once Then Schedule
To send an immediate report and then continue with scheduling:
```bash
npm run schedule
# or
node src/index.js --now --schedule
```

## Cron Schedule Format

The `REMINDER_SCHEDULE` uses cron format:

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7) (0 or 7 is Sunday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

Examples:
- `0 9 * * *` - Every day at 9:00 AM
- `0 9 * * 1-5` - Monday to Friday at 9:00 AM
- `0 9,18 * * *` - Every day at 9:00 AM and 6:00 PM
- `30 8 * * 1` - Every Monday at 8:30 AM

## Report Format

The WhatsApp report is sent in **Bahasa Indonesia** with multiple modes:

### Standard Mode (Single Report)
1. **Header**: Date and time in Indonesian format with sarcastic opening
2. **Recent Updates Section** (Positive reinforcement first):
   - Cards updated in the last 3 days
   - Sarcastic praise for active team members
3. **Outdated Cards Section** (Cards inactive for 3+ days):
   - Grouped by status with sarcastic comments
   - Shows responsible person in UPPERCASE
   - Progressive pressure based on inactivity:
     - 3-4 days: "😏 Card ini udah X hari kesepian nungguin kamu!"
     - 5-6 days: "🙄 Lagi sibuk apa sih sampe lupa?"
     - 7-9 days: "😤 KEREN! ADA REKOR DUNIA UNTUK INI GAK YA?"
     - 10-13 days: "🔥🔥 HEBAT! KAMU JUARA PROKRASTINASI!"
     - 14+ days: "💀💀💀 INI CARD APA FOSIL?! MUSEUM MANA YANG MAU?!"
4. **Hall of Shame**: Top procrastinators with medals
5. **Summary with AI Analysis** (if Gemini enabled)

### Multiple Schedule Mode
- **Morning (9 AM)**: Overview, AI motivation, quick stats
- **Afternoon (2 PM)**: Progress check, top 3 procrastinators
- **Evening (5 PM)**: Detailed report with full Hall of Shame
- **Individual Pressure**: Personalized AI messages to specific members

### Split Message Mode
When enabled, reports are split into digestible chunks:
1. Summary message
2. Recent updates message
3. Outdated cards by board (separate messages)
4. Hall of Shame finale

### AI-Generated Content (with Gemini)
- Personalized pressure messages based on context
- Sarcastic but professional roasting
- Pattern-based analysis (serial procrastinator, deadline ignorer, ghost worker)
- Dynamic content that varies by time of day

## Troubleshooting

### Common Issues

1. **"TRELLO_API_KEY is required" error**
   - Make sure your `.env` file exists and contains all required values
   - Check that you're in the correct directory

2. **"Invalid API Key" from Trello**
   - Verify your API key and token are correct
   - Regenerate them if necessary at https://trello.com/app-key

3. **WhatsApp messages not sending**
   - Verify the WhatsApp group ID format (should end with @g.us)
   - Check that the API endpoint is accessible
   - Review the console logs for detailed error messages

4. **No cards in report**
   - Check `DAYS_TO_CHECK` setting - increase if needed
   - Verify board IDs are correct
   - Ensure there has been activity on the boards

### Debug Mode

For more detailed logging, set the log level:
```env
LOG_LEVEL=debug
```

## Advanced Features

### Using Gemini AI

1. Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to your `.env` file:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
3. AI will automatically generate:
   - Personalized pressure messages
   - Report analysis with humor
   - Custom roasting for repeat offenders

### Multiple Schedules

Enable different messages throughout the day:
```env
ENABLE_MULTIPLE_SCHEDULES=true
MORNING_SCHEDULE=0 9 * * 1-5    # Weekdays only
AFTERNOON_SCHEDULE=0 14 * * 1-5  # Progress check
EVENING_SCHEDULE=0 17 * * 1-5    # End of day report
```

### Individual Targeting

Send personalized messages to specific procrastinators:
```env
ENABLE_INDIVIDUAL_PRESSURE=true
PRESSURE_TIMES=10:00,15:00,16:30
```

## Docker Support (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t trello-reminder .
docker run --env-file .env trello-reminder
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC License - see LICENSE file for details
