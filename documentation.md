# HomeStock - Stock Market Automation Tool

Version: 0.1.0

## What is HomeStock?

HomeStock is a desktop application that automates downloading and processing stock market data from NSE and BSE exchanges.

## Features

✅ Automatic daily downloads of market data  
✅ Excel file processing and transformation  
✅ Scheduled automation  
✅ View and manage downloaded files  
✅ Real-time logs monitoring  

## Installation

### Windows

1. Download `HomeStock Setup 0.1.0.exe`
2. Double-click the installer
3. Follow installation wizard
4. Launch HomeStock from Start Menu

### Mac

1. Download `HomeStock-0.1.0.dmg`
2. Open the DMG file
3. Drag HomeStock to Applications folder
4. Launch from Applications

## First Time Setup

1. Open HomeStock application
2. Go to **Settings**
3. Configure scheduler time (recommended: 6:45 PM)
4. Enable scheduler if you want automatic daily downloads

## How to Use

### Manual Download

1. Go to **Downloads** tab
2. Select date range
3. Choose job type (NSE Bhavcopy, NSE Delivery, or BSE Bhavcopy)
4. Click "Start Download"

### Process Files

1. Go to **Downloads** tab → **Downloaded Files**
2. Click the purple Process button next to any file
3. Processed files will appear in **Processed Files** tab

### View Logs

1. Go to **Logs** tab
2. Filter by type (Error, Warning, Success)
3. Use auto-scroll to see latest logs

### Scheduler

1. Go to **Settings**
2. Set your preferred time (after 6:30 PM IST recommended)
3. Toggle "Scheduler ON"
4. App will automatically download files daily

## File Locations

- **Downloaded files**: `downloads/` folder
- **Processed files**: `processed/` folder
- **Logs**: `logs/app.log`
- **Settings**: `settings.json`

## Troubleshooting

### Backend not starting

- Check if port 8000 is available
- Look at logs for errors

### Downloads failing

- Check your internet connection
- NSE/BSE data is only available after 6:30 PM IST
- Weekends and holidays have no data

### Processing errors

- Ensure the file format is correct
- Check logs for detailed error messages

## Support

For issues or questions, check the logs in the Logs tab.

## Version History

### v0.1.0 (Initial Release)

- NSE & BSE data downloads
- Excel processing engine
- Daily scheduler
- File management
- Logs viewer

---

[17/12, 5:26 pm] Pehal Health Care Tech Delhi: 1/ List of Underlyings and Information - NSE India
2/ All Reports- Equities, Indices, Mutual Fund, Securities Lending & Borrowing, SME - NSE India
[17/12, 5:27 pm] Pehal Health Care Tech Delhi: <https://www.nseindia.com/products-services/equity-derivatives-list-underlyings-information>
[17/12, 5:28 pm] Pehal Health Care Tech Delhi: <https://www.nseindia.com/all-reports>
