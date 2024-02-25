
# Q & A
## The mac running message is damaged and cannot be opened. You should move it to the trash.
### Intel Mac
1. Open settings
2. Security & Privacy
3. Security
4. Allow apps downloaded from: App Store and identified developers
5. Open the app again

### Apple Silicon Mac
1. Open terminal
2. Run the following command
```bash
sudo /usr/bin/xattr -c /Applications/YourAppName.app
```

### If the above command does not work, try the following command
```bash
sudo xattr -r -d com.apple.quarantine /Applications/YourAppName.app
```

