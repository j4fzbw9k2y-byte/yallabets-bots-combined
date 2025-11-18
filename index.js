// YallaBets Combined Bots - VIP Bot + Admin Bot
// Both bots run simultaneously in one process

const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

// ============================================
// CONFIGURATION
// ============================================

const VIP_BOT_TOKEN = process.env.VIP_BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID);
const VIP_CHANNEL_ID = process.env.VIP_CHANNEL_ID;
const FREE_CHANNEL = process.env.FREE_CHANNEL;
const AMMER_PAY_API_KEY = process.env.AMMER_PAY_API_KEY || 'your_ammer_pay_api_key';

// ============================================
// DATABASE SETUP
// ============================================

const db = new sqlite3.Database('./yallabets.db');

db.serialize(() => {
  // Users table for VIP subscriptions
  db.run(`CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY,
    username TEXT,
    subscription_status TEXT DEFAULT 'inactive',
    subscription_end_date TEXT,
    payment_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Predictions table
  db.run(`CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_name TEXT,
    league TEXT,
    prediction TEXT,
    odds TEXT,
    match_time TEXT,
    analysis TEXT,
    channel TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Results table
  db.run(`CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id INTEGER,
    result TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(prediction_id) REFERENCES predictions(id)
  )`);
});

// ============================================
// VIP BOT - Subscription Management
// ============================================

const vipBot = new TelegramBot(VIP_BOT_TOKEN, { polling: true });

console.log('✅ VIP Bot started successfully!');

// VIP Bot: Start command
vipBot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || 'Unknown';

  // Check subscription status
  db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return;
    }

    let message = `🎯 *Welcome to YallaBets VIP!*\n\n`;
    
    if (user && user.subscription_status === 'active') {
      const endDate = new Date(user.subscription_end_date);
      message += `✅ *Your VIP Status:* Active\n`;
      message += `📅 *Expires:* ${endDate.toLocaleDateString()}\n\n`;
      message += `You have full access to premium predictions!\n\n`;
    } else {
      message += `❌ *Your VIP Status:* Inactive\n\n`;
      message += `🌟 *Subscribe to VIP for $20/month and get:*\n`;
      message += `✓ 10-30 expert predictions per week\n`;
      message += `✓ 85%+ win rate\n`;
      message += `✓ Detailed analysis\n`;
      message += `✓ Live updates\n`;
      message += `✓ Priority support\n\n`;
    }

    message += `📱 *Commands:*\n`;
    message += `/subscribe - Subscribe to VIP ($20/month)\n`;
    message += `/status - Check subscription status\n`;
    message += `/help - Get help`;

    vipBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
});

// VIP Bot: Subscribe command
vipBot.onText(/\/subscribe/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  const message = `💎 *Subscribe to YallaBets VIP*\n\n` +
    `💰 *Price:* $20/month\n\n` +
    `🌟 *What you get:*\n` +
    `✓ 10-30 expert predictions weekly\n` +
    `✓ 85%+ win rate\n` +
    `✓ Detailed match analysis\n` +
    `✓ Live updates & support\n\n` +
    `📱 *To subscribe:*\n` +
    `1. Click the button below to pay via Ammer Pay\n` +
    `2. After payment, send /verify with your payment ID\n` +
    `3. Get instant VIP access!\n\n` +
    `💳 *Payment Link:* [Click here to pay](https://ammer.sa/pay/yallabets)`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💳 Pay $20 via Ammer Pay', url: 'https://ammer.sa/pay/yallabets' }],
      [{ text: '✅ I paid - Verify', callback_data: 'verify_payment' }]
    ]
  };

  vipBot.sendMessage(chatId, message, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
});

// VIP Bot: Status command
vipBot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  db.get('SELECT * FROM users WHERE user_id = ?', [userId], (err, user) => {
    if (err) {
      vipBot.sendMessage(chatId, '❌ Error checking status. Please try again.');
      return;
    }

    let message = `📊 *Your VIP Status*\n\n`;

    if (user && user.subscription_status === 'active') {
      const endDate = new Date(user.subscription_end_date);
      const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      
      message += `✅ *Status:* Active\n`;
      message += `👤 *User ID:* ${userId}\n`;
      message += `📅 *Expires:* ${endDate.toLocaleDateString()}\n`;
      message += `⏰ *Days Left:* ${daysLeft} days\n\n`;
      message += `Enjoy your premium predictions! 🎯`;
    } else {
      message += `❌ *Status:* Inactive\n\n`;
      message += `Subscribe now to get premium predictions!\n`;
      message += `Use /subscribe to get started.`;
    }

    vipBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
});

// VIP Bot: Help command
vipBot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const message = `📱 *YallaBets VIP Bot - Help*\n\n` +
    `*Available Commands:*\n` +
    `/start - Start the bot\n` +
    `/subscribe - Subscribe to VIP ($20/month)\n` +
    `/status - Check your subscription status\n` +
    `/help - Show this help message\n\n` +
    `*Need Support?*\n` +
    `Contact: @yallabets_support`;

  vipBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// VIP Bot: Callback query handler
vipBot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (query.data === 'verify_payment') {
    vipBot.sendMessage(chatId, 
      `✅ *Payment Verification*\n\n` +
      `Please send your payment ID in this format:\n` +
      `/verify PAYMENT_ID\n\n` +
      `Example: /verify AMR123456`,
      { parse_mode: 'Markdown' }
    );
  }

  vipBot.answerCallbackQuery(query.id);
});

// VIP Bot: Verify payment
vipBot.onText(/\/verify (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || 'Unknown';
  const paymentId = match[1];

  // In production, verify with Ammer Pay API
  // For now, we'll activate immediately
  
  const subscriptionEndDate = new Date();
  subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

  db.run(
    `INSERT OR REPLACE INTO users (user_id, username, subscription_status, subscription_end_date, payment_id) 
     VALUES (?, ?, 'active', ?, ?)`,
    [userId, username, subscriptionEndDate.toISOString(), paymentId],
    (err) => {
      if (err) {
        vipBot.sendMessage(chatId, '❌ Error activating subscription. Please contact support.');
        console.error('Database error:', err);
        return;
      }

      const message = `🎉 *Subscription Activated!*\n\n` +
        `✅ Your VIP subscription is now active!\n` +
        `📅 *Expires:* ${subscriptionEndDate.toLocaleDateString()}\n\n` +
        `You now have access to:\n` +
        `✓ Premium predictions\n` +
        `✓ Detailed analysis\n` +
        `✓ Live updates\n` +
        `✓ Priority support\n\n` +
        `Join our VIP channel: ${VIP_CHANNEL_ID}\n\n` +
        `Good luck! 🍀`;

      vipBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
  );
});

// ============================================
// ADMIN BOT - Predictions Management
// ============================================

const adminBot = new TelegramBot(ADMIN_BOT_TOKEN, { polling: true });

console.log('✅ Admin Bot started successfully!');

// Admin Bot: Temporary storage for prediction creation
const tempPredictions = {};

// Admin Bot: Start command
adminBot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_USER_ID) {
    adminBot.sendMessage(chatId, '❌ Unauthorized. This bot is for admin use only.');
    return;
  }

  const message = `🎯 *YallaBets Admin Bot*\n\n` +
    `Welcome Admin! Manage your predictions here.\n\n` +
    `*Commands:*\n` +
    `/create - Create new prediction\n` +
    `/result - Add result to prediction\n` +
    `/stats - View statistics\n` +
    `/list - List recent predictions\n` +
    `/help - Show help`;

  adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Admin Bot: Create prediction
adminBot.onText(/\/create/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_USER_ID) {
    adminBot.sendMessage(chatId, '❌ Unauthorized.');
    return;
  }

  tempPredictions[chatId] = { step: 1 };

  adminBot.sendMessage(chatId, 
    `📝 *Create New Prediction - Step 1/6*\n\n` +
    `Enter the match name:\n` +
    `Example: Chelsea vs Arsenal`,
    { parse_mode: 'Markdown' }
  );
});

// Admin Bot: Handle prediction creation steps
adminBot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (userId !== ADMIN_USER_ID || !tempPredictions[chatId] || text.startsWith('/')) {
    return;
  }

  const pred = tempPredictions[chatId];

  switch (pred.step) {
    case 1: // Match name
      pred.match_name = text;
      pred.step = 2;
      adminBot.sendMessage(chatId, 
        `📝 *Step 2/6*\n\nEnter the league:\nExample: Premier League`,
        { parse_mode: 'Markdown' }
      );
      break;

    case 2: // League
      pred.league = text;
      pred.step = 3;
      adminBot.sendMessage(chatId, 
        `📝 *Step 3/6*\n\nEnter your prediction:\nExample: Chelsea to Win`,
        { parse_mode: 'Markdown' }
      );
      break;

    case 3: // Prediction
      pred.prediction = text;
      pred.step = 4;
      adminBot.sendMessage(chatId, 
        `📝 *Step 4/6*\n\nEnter the odds:\nExample: 2.10`,
        { parse_mode: 'Markdown' }
      );
      break;

    case 4: // Odds
      pred.odds = text;
      pred.step = 5;
      adminBot.sendMessage(chatId, 
        `📝 *Step 5/6*\n\nEnter match time:\nExample: Nov 18, 20:00 GMT`,
        { parse_mode: 'Markdown' }
      );
      break;

    case 5: // Match time
      pred.match_time = text;
      pred.step = 6;
      adminBot.sendMessage(chatId, 
        `📝 *Step 6/6*\n\nEnter analysis (optional, or type 'skip'):\nExample: Chelsea has strong form...`,
        { parse_mode: 'Markdown' }
      );
      break;

    case 6: // Analysis
      pred.analysis = text === 'skip' ? '' : text;
      pred.step = 7;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🆓 Free Channel Only', callback_data: 'publish_free' }],
          [{ text: '💎 VIP Channel Only', callback_data: 'publish_vip' }],
          [{ text: '📢 Both Channels', callback_data: 'publish_both' }]
        ]
      };

      adminBot.sendMessage(chatId, 
        `✅ *Prediction Ready!*\n\n` +
        `📊 *Match:* ${pred.match_name}\n` +
        `🏆 *League:* ${pred.league}\n` +
        `🎯 *Prediction:* ${pred.prediction}\n` +
        `💰 *Odds:* ${pred.odds}\n` +
        `⏰ *Time:* ${pred.match_time}\n` +
        `📝 *Analysis:* ${pred.analysis || 'None'}\n\n` +
        `Where do you want to publish?`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );
      break;
  }
});

// Admin Bot: Handle publish callbacks
adminBot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (userId !== ADMIN_USER_ID) {
    adminBot.answerCallbackQuery(query.id, { text: '❌ Unauthorized' });
    return;
  }

  const pred = tempPredictions[chatId];
  if (!pred || pred.step !== 7) {
    adminBot.answerCallbackQuery(query.id);
    return;
  }

  let channel = '';
  if (query.data === 'publish_free') channel = 'free';
  else if (query.data === 'publish_vip') channel = 'vip';
  else if (query.data === 'publish_both') channel = 'both';

  // Save to database
  db.run(
    `INSERT INTO predictions (match_name, league, prediction, odds, match_time, analysis, channel) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [pred.match_name, pred.league, pred.prediction, pred.odds, pred.match_time, pred.analysis, channel],
    function(err) {
      if (err) {
        adminBot.sendMessage(chatId, '❌ Error saving prediction.');
        console.error('Database error:', err);
        return;
      }

      const predictionId = this.lastID;

      // Format message
      const message = `⚽️ *${pred.match_name}*\n\n` +
        `🏆 *League:* ${pred.league}\n` +
        `🎯 *Prediction:* ${pred.prediction}\n` +
        `💰 *Odds:* ${pred.odds}\n` +
        `⏰ *Match Time:* ${pred.match_time}\n\n` +
        (pred.analysis ? `📊 *Analysis:*\n${pred.analysis}\n\n` : '') +
        `🍀 Good luck!`;

      // Publish to channels
      if (channel === 'free' || channel === 'both') {
        adminBot.sendMessage(FREE_CHANNEL, message, { parse_mode: 'Markdown' })
          .catch(err => console.error('Error posting to free channel:', err));
      }

      if (channel === 'vip' || channel === 'both') {
        adminBot.sendMessage(VIP_CHANNEL_ID, message, { parse_mode: 'Markdown' })
          .catch(err => console.error('Error posting to VIP channel:', err));
      }

      adminBot.sendMessage(chatId, `✅ Prediction published successfully! (ID: ${predictionId})`);
      delete tempPredictions[chatId];
    }
  );

  adminBot.answerCallbackQuery(query.id);
});

// Admin Bot: Stats command
adminBot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_USER_ID) {
    adminBot.sendMessage(chatId, '❌ Unauthorized.');
    return;
  }

  db.all(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as losses
     FROM predictions`,
    (err, rows) => {
      if (err) {
        adminBot.sendMessage(chatId, '❌ Error fetching stats.');
        return;
      }

      const stats = rows[0];
      const winRate = stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : 0;

      const message = `📊 *Statistics*\n\n` +
        `📈 *Total Predictions:* ${stats.total}\n` +
        `✅ *Wins:* ${stats.wins}\n` +
        `❌ *Losses:* ${stats.losses}\n` +
        `🎯 *Win Rate:* ${winRate}%`;

      adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
  );
});

// Admin Bot: Help command
adminBot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_USER_ID) {
    adminBot.sendMessage(chatId, '❌ Unauthorized.');
    return;
  }

  const message = `📱 *Admin Bot - Help*\n\n` +
    `*Commands:*\n` +
    `/create - Create new prediction\n` +
    `/result <id> <won/lost> - Add result\n` +
    `/stats - View statistics\n` +
    `/list - List recent predictions\n` +
    `/help - Show this help`;

  adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// ============================================
// ERROR HANDLING
// ============================================

vipBot.on('polling_error', (error) => {
  console.error('VIP Bot polling error:', error);
});

adminBot.on('polling_error', (error) => {
  console.error('Admin Bot polling error:', error);
});

console.log('🚀 Both bots are running successfully!');
console.log('📱 VIP Bot: Handling subscriptions');
console.log('🎯 Admin Bot: Managing predictions');
