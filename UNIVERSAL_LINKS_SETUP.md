# Universal Links Setup for Dawah Nigeria

This guide explains how to set up universal links so that web URLs like `https://dawahnigeria.com/dawahcast/l/306254` can open your mobile app.

## How It Works

When a user clicks a link like `https://dawahnigeria.com/dawahcast/l/306254`:
- **If app is installed**: Opens the app directly to that lecture
- **If app is not installed**: Opens the web page normally

## Files to Host on Your Website

You need to host two configuration files on `https://dawahnigeria.com`:

### 1. iOS Universal Links: `apple-app-site-association`

**Location**: `https://dawahnigeria.com/.well-known/apple-app-site-association`

**Important**:
- Must be served with `Content-Type: application/json` header
- Must be accessible via HTTPS (no redirects)
- No `.json` extension in the filename

**File content** (see `apple-app-site-association` file created):

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.dawahnigeria.app",
        "paths": [
          "/dawahcast/l/*",
          "/dawahcast/a/*",
          "/dawahcast/p/*",
          "/dawahcast/q/*",
          "/dawahcast/lec/*"
        ]
      }
    ]
  }
}
```

**⚠️ IMPORTANT**: Replace `TEAM_ID` with your actual Apple Team ID.

**How to find your Team ID**:
1. Go to https://developer.apple.com/account
2. Click "Membership" in the sidebar
3. Your Team ID is shown there (10-character alphanumeric string)

### 2. Android App Links: `assetlinks.json`

**Location**: `https://dawahnigeria.com/.well-known/assetlinks.json`

**Important**:
- Must be served with `Content-Type: application/json` header
- Must be accessible via HTTPS

**File content** (see `assetlinks.json` file created):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.dawahnigeria.app",
    "sha256_cert_fingerprints": [
      "YOUR_RELEASE_KEY_SHA256_FINGERPRINT"
    ]
  }
}]
```

**⚠️ IMPORTANT**: Replace `YOUR_RELEASE_KEY_SHA256_FINGERPRINT` with your actual certificate fingerprint.

**How to get your SHA256 fingerprint**:

For release builds:
```bash
# If you have the keystore file
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias

# Look for "SHA256:" in the output
```

For development/debug builds (optional, for testing):
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

## Web Server Configuration

### Apache (.htaccess)

If you're using Apache, create/update `.well-known/.htaccess`:

```apache
# Allow access to .well-known directory
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>

# Set correct content type for JSON files
<FilesMatch "\.(json)$">
    Header set Content-Type "application/json"
</FilesMatch>

# Allow apple-app-site-association without .json extension
<Files "apple-app-site-association">
    Header set Content-Type "application/json"
</Files>
```

### Nginx

If you're using Nginx, add to your server block:

```nginx
location /.well-known/apple-app-site-association {
    default_type application/json;
    add_header Content-Type application/json;
}

location /.well-known/assetlinks.json {
    default_type application/json;
    add_header Content-Type application/json;
}
```

## Verification

### Test iOS Universal Links

1. **Host the files** on your website
2. **Verify accessibility**:
   ```bash
   curl -I https://dawahnigeria.com/.well-known/apple-app-site-association
   ```
   Should return `Content-Type: application/json`

3. **Test the link**:
   - Send yourself a link via Messages or Email: `https://dawahnigeria.com/dawahcast/l/306254`
   - Click the link (don't tap and hold, just tap)
   - Should open the app if installed

### Test Android App Links

1. **Host the files** on your website
2. **Verify accessibility**:
   ```bash
   curl https://dawahnigeria.com/.well-known/assetlinks.json
   ```
   Should return the JSON content

3. **Test with Android Studio**:
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "https://dawahnigeria.com/dawahcast/l/306254"
   ```

4. **Verify link handling**:
   ```bash
   adb shell dumpsys package d
   ```
   Look for `dawahnigeria.com` in the output

## Troubleshooting

### iOS Links Not Working

1. **Check file accessibility**: Make sure the file is accessible via HTTPS
2. **Verify Team ID**: Double-check your Apple Team ID in the association file
3. **Clear cache**: Uninstall and reinstall the app
4. **Check iOS version**: Universal links work on iOS 9+
5. **Don't tap and hold**: Just tap the link normally

### Android Links Not Working

1. **Verify fingerprint**: Make sure you're using the correct SHA256 fingerprint
2. **Check autoVerify**: Ensure your build includes the intent filters with `autoVerify: true`
3. **Clear defaults**: Go to Settings → Apps → Your App → Open by default → Clear defaults
4. **Rebuild app**: Run a clean build after adding intent filters

### General Issues

1. **HTTPS required**: Both files MUST be served over HTTPS
2. **No redirects**: Direct access to files, no 301/302 redirects
3. **Content-Type**: Must be `application/json`
4. **Case sensitive**: File paths and names are case-sensitive

## URL Path Mappings

The app handles these URL patterns:

| Web URL | App Route |
|---------|-----------|
| `https://dawahnigeria.com/dawahcast/l/[id]` | Opens lecture detail |
| `https://dawahnigeria.com/dawahcast/a/[id]` | Opens album detail (includes Quran reciters) |
| `https://dawahnigeria.com/dawahcast/p/[id]` | Opens playlist detail |
| `https://dawahnigeria.com/dawahcast/rp/[id]` | Opens lecturer (resource person) detail |

## After Setup

Once the files are hosted correctly:

1. **Rebuild your app** to include the updated `app.json` configuration
2. **Test on both platforms** (iOS and Android)
3. **Update share functionality** (already done in the app)
4. **Monitor analytics** to see how many users are using universal links

## Support

If you need help:
1. Check the verification steps above
2. Review the troubleshooting section
3. Test with the provided commands
4. Check web server logs for access to `.well-known` files
