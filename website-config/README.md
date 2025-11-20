# Website Configuration Files for Universal Links

These files need to be hosted on `https://dawahnigeria.com` to enable universal links.

## Files to Upload

### 1. `apple-app-site-association`
- **Upload to**: `https://dawahnigeria.com/.well-known/apple-app-site-association`
- **No file extension** (no `.json` at the end)
- **Before uploading**: Replace `TEAM_ID` with your actual Apple Team ID
  - Find at: https://developer.apple.com/account → Membership
  - Format: 10-character alphanumeric string (e.g., `AB12CD34EF`)

### 2. `assetlinks.json`
- **Upload to**: `https://dawahnigeria.com/.well-known/assetlinks.json`
- **Before uploading**: Replace `YOUR_RELEASE_KEY_SHA256_FINGERPRINT` with your Android app's SHA256 fingerprint
  - Get it by running: `keytool -list -v -keystore your-release-key.keystore`
  - Format: Long string of hex characters separated by colons

## Verification

After uploading, verify the files are accessible:

```bash
# Test iOS file
curl -I https://dawahnigeria.com/.well-known/apple-app-site-association

# Test Android file
curl https://dawahnigeria.com/.well-known/assetlinks.json
```

Both should:
- Return HTTP 200 status
- Have `Content-Type: application/json` header
- Be accessible via HTTPS (not HTTP)

## Important Notes

1. **HTTPS Required**: Both files MUST be served over HTTPS
2. **No Redirects**: Direct access required (no 301/302 redirects)
3. **Content-Type**: Must be `application/json`
4. **Case Sensitive**: All paths are case-sensitive
5. **No Cache**: Consider adding `Cache-Control: no-cache` header during testing

## Directory Structure

Your website should have:
```
https://dawahnigeria.com/
├── .well-known/
│   ├── apple-app-site-association (no extension!)
│   └── assetlinks.json
```

## Need Help?

See `UNIVERSAL_LINKS_SETUP.md` in the project root for detailed setup instructions and troubleshooting.
