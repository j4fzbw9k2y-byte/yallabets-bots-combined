# YallaBets Combined Bots

This project combines two Telegram bots in one service:
1. **VIP Bot** - Handles subscriptions and payments
2. **Admin Bot** - Manages predictions and publishing

## Features

### VIP Bot (@YallaBetsbot)
- ✅ Subscription management ($20/month)
- ✅ Payment verification via Ammer Pay
- ✅ Automatic VIP access control
- ✅ Subscription status tracking

### Admin Bot (@Yallabetsadminbot)
- ✅ Create predictions with detailed analysis
- ✅ Publish to Free/VIP/Both channels
- ✅ Track results and statistics
- ✅ Calculate win rate automatically

## Setup

### 1. Environment Variables

Set these in Render.com:

```
VIP_BOT_TOKEN=your_vip_bot_token
ADMIN_BOT_TOKEN=your_admin_bot_token
ADMIN_USER_ID=your_telegram_user_id
VIP_CHANNEL_ID=-1003495823265
FREE_CHANNEL=@yallabets
AMMER_PAY_API_KEY=your_ammer_pay_key (optional)
```

### 2. Deploy to Render

1. Connect this repository
2. Set Build Command: `npm install`
3. Set Start Command: `npm start`
4. Add environment variables
5. Deploy!

## Usage

### VIP Bot Commands
- `/start` - Welcome message
- `/subscribe` - Subscribe to VIP
- `/verify PAYMENT_ID` - Verify payment
- `/status` - Check subscription status
- `/help` - Show help

### Admin Bot Commands
- `/create` - Create new prediction (interactive)
- `/result <id> <won/lost>` - Add result
- `/stats` - View statistics
- `/list` - List recent predictions
- `/help` - Show help

## Database

SQLite database with 3 tables:
- `users` - VIP subscribers
- `predictions` - All predictions
- `results` - Prediction results

## Support

For issues or questions, contact @yallabets_support
