// YallaBets Combined Bots - VIP Bot + Admin Bot
// Both bots run simultaneously in one process

const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const http = require('http');

// ============================================
// CONFIGURATION
// ============================================

const VIP_BOT_TOKEN = process.env.VIP_BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;
const ADMIN_USER_ID = parseInt(process.env.ADMIN_USER_ID);
const VIP_CHANNEL_ID = process.env.VIP_CHANNEL_ID;
const FREE_CHANNEL = process.env.FREE_CHANNEL;
const AMMER_PAY_API_KEY = process.env.AMMER_PAY_API_KEY || 'your_ammer_pay_api_key';

console.log('🔧 Configuration loaded:');
console.log('Admin User ID:', ADMIN_USER_ID);
console.log('VIP Channel:', VIP_CHANNEL_ID);
console.log('Free Channel:', FREE_CHANNEL);

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
    content TEXT,
    channel TEXT,
    message_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

    let message = `🎯 *مرحباً بك في YallaBets VIP!*\n\n`;
    
    if (user && user.subscription_status === 'active') {
      const endDate = new Date(user.subscription_end_date);
      message += `✅ *حالة الاشتراك:* نشط\n`;
      message += `📅 *ينتهي في:* ${endDate.toLocaleDateString('ar-SA')}\n\n`;
      message += `لديك وصول كامل للتوقعات المميزة!\n\n`;
    } else {
      message += `❌ *حالة الاشتراك:* غير نشط\n\n`;
      message += `🌟 *اشترك في VIP مقابل $20/شهر واحصل على:*\n`;
      message += `✓ 10-30 توقع احترافي أسبوعياً\n`;
      message += `✓ نسبة نجاح 85%+\n`;
      message += `✓ تحليل مفصل\n`;
      message += `✓ تحديثات مباشرة\n`;
      message += `✓ دعم أولوية\n\n`;
    }

    message += `📱 *الأوامر:*\n`;
    message += `/subscribe - الاشتراك في VIP ($20/شهر)\n`;
    message += `/status - التحقق من حالة الاشتراك\n`;
    message += `/help - المساعدة`;

    vipBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
});

// VIP Bot: Subscribe command
vipBot.onText(/\/subscribe/, (msg) => {
  const chatId = msg.chat.id;

  const message = `💎 *الاشتراك في YallaBets VIP*\n\n` +
    `💰 *السعر:* $20/شهر\n\n` +
    `🌟 *ما ستحصل عليه:*\n` +
    `✓ 10-30 توقع احترافي أسبوعياً\n` +
    `✓ نسبة نجاح 85%+\n` +
    `✓ تحليل مفصل للمباريات\n` +
    `✓ تحديثات مباشرة ودعم\n\n` +
    `📱 *للاشتراك:*\n` +
    `1. اضغط على الزر أدناه للدفع عبر Ammer Pay\n` +
    `2. بعد الدفع، أرسل /verify مع رقم الدفع\n` +
    `3. احصل على وصول VIP فوري!\n\n` +
    `💳 *رابط الدفع:* [اضغط هنا للدفع](https://ammer.sa/pay/yallabets)`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💳 ادفع $20 عبر Ammer Pay', url: 'https://ammer.sa/pay/yallabets' }],
      [{ text: '✅ دفعت - تحقق', callback_data: 'verify_payment' }]
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
      vipBot.sendMessage(chatId, '❌ خطأ في التحقق من الحالة. حاول مرة أخرى.');
      return;
    }

    let message = `📊 *حالة اشتراكك في VIP*\n\n`;

    if (user && user.subscription_status === 'active') {
      const endDate = new Date(user.subscription_end_date);
      const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
      
      message += `✅ *الحالة:* نشط\n`;
      message += `👤 *معرف المستخدم:* ${userId}\n`;
      message += `📅 *ينتهي في:* ${endDate.toLocaleDateString('ar-SA')}\n`;
      message += `⏰ *الأيام المتبقية:* ${daysLeft} يوم\n\n`;
      message += `استمتع بالتوقعات المميزة! 🎯`;
    } else {
      message += `❌ *الحالة:* غير نشط\n\n`;
      message += `اشترك الآن للحصول على توقعات مميزة!\n`;
      message += `استخدم /subscribe للبدء.`;
    }

    vipBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  });
});

// VIP Bot: Help command
vipBot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const message = `📱 *YallaBets VIP Bot - المساعدة*\n\n` +
    `*الأوامر المتاحة:*\n` +
    `/start - بدء البوت\n` +
    `/subscribe - الاشتراك في VIP ($20/شهر)\n` +
    `/status - التحقق من حالة اشتراكك\n` +
    `/help - عرض هذه الرسالة\n\n` +
    `*تحتاج مساعدة؟*\n` +
    `تواصل: @yallabets_support`;

  vipBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// VIP Bot: Callback query handler
vipBot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;

  if (query.data === 'verify_payment') {
    vipBot.sendMessage(chatId, 
      `✅ *التحقق من الدفع*\n\n` +
      `يرجى إرسال رقم الدفع بهذا التنسيق:\n` +
      `/verify PAYMENT_ID\n\n` +
      `مثال: /verify AMR123456`,
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
        vipBot.sendMessage(chatId, '❌ خطأ في تفعيل الاشتراك. يرجى التواصل مع الدعم.');
        console.error('Database error:', err);
        return;
      }

      const message = `🎉 *تم تفعيل الاشتراك!*\n\n` +
        `✅ اشتراكك في VIP نشط الآن!\n` +
        `📅 *ينتهي في:* ${subscriptionEndDate.toLocaleDateString('ar-SA')}\n\n` +
        `لديك الآن وصول إلى:\n` +
        `✓ التوقعات المميزة\n` +
        `✓ التحليل المفصل\n` +
        `✓ التحديثات المباشرة\n` +
        `✓ الدعم الأولوية\n\n` +
        `💎 *انضم لقناة VIP الآن:*\n` +
        `https://t.me/+eiWSPzmAmJY0Y2Q0\n\n` +
        `حظاً موفقاً! 🍀`;

      vipBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
  );
});

// ============================================
// ADMIN BOT - Simple Message Forwarding
// ============================================

const adminBot = new TelegramBot(ADMIN_BOT_TOKEN, { polling: true });

console.log('✅ Admin Bot started successfully!');

// Admin Bot: Temporary storage for pending messages
const pendingMessages = {};

// Admin Bot: Start command
adminBot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_USER_ID) {
    adminBot.sendMessage(chatId, '❌ غير مصرح. هذا البوت للإدارة فقط.');
    return;
  }

  const message = `🎯 *YallaBets Admin Bot*\n\n` +
    `مرحباً أدمن! أرسل أي رسالة (نص، صورة، فيديو) وسأسألك أين تريد نشرها.\n\n` +
    `*الأوامر:*\n` +
    `/start - بدء البوت\n` +
    `/stats - عرض الإحصائيات\n` +
    `/help - المساعدة`;

  adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Admin Bot: Stats command
adminBot.onText(/\/stats/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_USER_ID) {
    adminBot.sendMessage(chatId, '❌ غير مصرح.');
    return;
  }

  db.get('SELECT COUNT(*) as total FROM predictions', (err, row) => {
    if (err) {
      adminBot.sendMessage(chatId, '❌ خطأ في جلب الإحصائيات.');
      return;
    }

    db.get('SELECT COUNT(*) as vip_count FROM users WHERE subscription_status = "active"', (err2, row2) => {
      if (err2) {
        adminBot.sendMessage(chatId, '❌ خطأ في جلب الإحصائيات.');
        return;
      }

      const message = `📊 *الإحصائيات*\n\n` +
        `📈 *إجمالي المنشورات:* ${row.total}\n` +
        `💎 *المشتركون النشطون:* ${row2.vip_count}\n` +
        `💰 *الإيرادات الشهرية:* $${row2.vip_count * 20}`;

      adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
  });
});

// Admin Bot: Help command
adminBot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (userId !== ADMIN_USER_ID) {
    adminBot.sendMessage(chatId, '❌ غير مصرح.');
    return;
  }

  const message = `📱 *Admin Bot - المساعدة*\n\n` +
    `*كيفية الاستخدام:*\n` +
    `1. أرسل أي رسالة (نص، صورة، فيديو)\n` +
    `2. اختر أين تريد نشرها:\n` +
    `   • 🆓 Free فقط\n` +
    `   • 💎 VIP فقط\n` +
    `   • 📢 الاثنين معاً\n` +
    `3. سيتم النشر تلقائياً!\n\n` +
    `*الأوامر:*\n` +
    `/stats - عرض الإحصائيات\n` +
    `/help - المساعدة`;

  adminBot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Admin Bot: Handle any message (text, photo, video, etc.)
adminBot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Ignore if not admin or if it's a command
  if (userId !== ADMIN_USER_ID || msg.text?.startsWith('/')) {
    return;
  }

  // Store the message
  pendingMessages[chatId] = msg;

  // Ask where to publish
  const keyboard = {
    inline_keyboard: [
      [{ text: '🆓 Free فقط', callback_data: 'publish_free' }],
      [{ text: '💎 VIP فقط', callback_data: 'publish_vip' }],
      [{ text: '📢 الاثنين معاً', callback_data: 'publish_both' }]
    ]
  };

  adminBot.sendMessage(chatId, 
    `📢 *أين تريد نشر هذه الرسالة؟*`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
});

// Admin Bot: Handle publish callbacks
adminBot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;

  if (userId !== ADMIN_USER_ID) {
    adminBot.answerCallbackQuery(query.id, { text: '❌ غير مصرح' });
    return;
  }

  const originalMsg = pendingMessages[chatId];
  if (!originalMsg) {
    adminBot.answerCallbackQuery(query.id, { text: '❌ لم يتم العثور على الرسالة' });
    return;
  }

  let channel = '';
  if (query.data === 'publish_free') channel = 'free';
  else if (query.data === 'publish_vip') channel = 'vip';
  else if (query.data === 'publish_both') channel = 'both';

  // Function to forward message
  const forwardMessage = (targetChannel) => {
    if (originalMsg.text) {
      return adminBot.sendMessage(targetChannel, originalMsg.text);
    } else if (originalMsg.photo) {
      const photo = originalMsg.photo[originalMsg.photo.length - 1].file_id;
      return adminBot.sendPhoto(targetChannel, photo, { caption: originalMsg.caption || '' });
    } else if (originalMsg.video) {
      return adminBot.sendVideo(targetChannel, originalMsg.video.file_id, { caption: originalMsg.caption || '' });
    } else if (originalMsg.document) {
      return adminBot.sendDocument(targetChannel, originalMsg.document.file_id, { caption: originalMsg.caption || '' });
    }
  };

  // Publish to channels
  const promises = [];
  
  if (channel === 'free' || channel === 'both') {
    promises.push(forwardMessage(FREE_CHANNEL).catch(err => {
      console.error('Error posting to free channel:', err);
      return null;
    }));
  }

  if (channel === 'vip' || channel === 'both') {
    promises.push(forwardMessage(VIP_CHANNEL_ID).catch(err => {
      console.error('Error posting to VIP channel:', err);
      return null;
    }));
  }

  Promise.all(promises).then(() => {
    // Save to database
    const content = originalMsg.text || originalMsg.caption || '[Media]';
    db.run(
      `INSERT INTO predictions (content, channel) VALUES (?, ?)`,
      [content, channel],
      (err) => {
        if (err) console.error('Database error:', err);
      }
    );

    adminBot.sendMessage(chatId, `✅ تم النشر بنجاح!`);
    delete pendingMessages[chatId];
  });

  adminBot.answerCallbackQuery(query.id);
});

// ============================================
// ERROR HANDLING
// ============================================

vipBot.on('polling_error', (error) => {
  console.error('VIP Bot polling error:', error.message);
});

adminBot.on('polling_error', (error) => {
  console.error('Admin Bot polling error:', error.message);
});

// ============================================
// HTTP SERVER (for Render port binding)
// ============================================

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'running',
    bots: {
      vip: 'active',
      admin: 'active'
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`✅ HTTP server listening on port ${PORT}`);
  console.log('🚀 Both bots are running successfully!');
  console.log('📱 VIP Bot: Handling subscriptions');
  console.log('🎯 Admin Bot: Managing posts');
});
