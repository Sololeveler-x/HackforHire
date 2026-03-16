# Copy SGB Logo - Quick Command

## Your Logo Location
```
C:\Users\JEEVAN\Downloads\cropped-IMG_1385__1_-removebg-preview-1-300x250.png
```

## Where It Needs To Go
```
C:\Users\JEEVAN\Downloads\sgb-order-hub-c9cf5da2-main\sgb-order-hub-c9cf5da2-main\public\sgb-logo.png
```

## Option 1: PowerShell Command (Recommended)

Open PowerShell in your project folder and run:

```powershell
Copy-Item "C:\Users\JEEVAN\Downloads\cropped-IMG_1385__1_-removebg-preview-1-300x250.png" -Destination "C:\Users\JEEVAN\Downloads\sgb-order-hub-c9cf5da2-main\sgb-order-hub-c9cf5da2-main\public\sgb-logo.png"
```

## Option 2: File Explorer (Easy Way)

1. Open File Explorer
2. Navigate to: `C:\Users\JEEVAN\Downloads\`
3. Find the file: `cropped-IMG_1385__1_-removebg-preview-1-300x250.png`
4. Copy it (Ctrl+C)
5. Navigate to: `C:\Users\JEEVAN\Downloads\sgb-order-hub-c9cf5da2-main\sgb-order-hub-c9cf5da2-main\public\`
6. Paste it (Ctrl+V)
7. Rename it to: `sgb-logo.png`

## Option 3: Command Prompt

```cmd
copy "C:\Users\JEEVAN\Downloads\cropped-IMG_1385__1_-removebg-preview-1-300x250.png" "C:\Users\JEEVAN\Downloads\sgb-order-hub-c9cf5da2-main\sgb-order-hub-c9cf5da2-main\public\sgb-logo.png"
```

## Verify It Worked

After copying, check that this file exists:
```
sgb-order-hub-c9cf5da2-main\public\sgb-logo.png
```

Then refresh your browser and the logo will appear!

## Quick Check

Run this command to verify the file is there:
```powershell
Test-Path "C:\Users\JEEVAN\Downloads\sgb-order-hub-c9cf5da2-main\sgb-order-hub-c9cf5da2-main\public\sgb-logo.png"
```

Should return: `True`
