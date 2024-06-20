# Gather-Tracker
A JavaScript script for monitoring user activities and messaging within a Gather Town office, integrated with Telegram for real-time notifications.

## About The Project

This repository contains two scripts designed to work with different versions of the Gather Town chat system:
- **NewChatVersion.js**: For newer office setups that use the beta version of the new chat system. Note that this version might experience bugs such as repeated chat message notifications.
- **OldChatVersion.js**: Tailored for older office setups that still operate with the old chat system.

These scripts are designed to be used directly in a web browser (as Gather Town does not support this functionality in their installable apps).

## Getting Started

To use these scripts in your Gather Town office:
1. Open Gather Town in a web browser.
2. Choose the script corresponding to your office chat version. You'll need to modify:
   - The user ID you wish to monitor.
   - Your Telegram bot token and the chat ID you intend to use.
3. Press `F12` to open the browser's developer console, and paste the modified script there.

### Additional Tools

- Use the `getPlayers()` function to fetch the ID of the user you want to track, which is available after pasting the script.
- The `position()` function can help you determine current coordinates, which is useful for defining office zones (rooms).

## Acknowledgments

Thanks to michmich112 for the wrapper and additional functions provided. Check out their work at [michmich112 on GitHub](https://github.com/michmich112/teleporter).

## Development Status

The development of new enhancements or updates will be considerably slowed down as my current company no longer uses Gather Town.
