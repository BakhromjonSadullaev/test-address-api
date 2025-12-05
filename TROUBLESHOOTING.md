# Troubleshooting Guide

## Geocoding Service Unavailable (503 Error)

If you're getting a `503` error with message "Geocoding service unavailable", this means Google Geocoding API returned `REQUEST_DENIED`. Here's how to fix it:

### Common Causes and Solutions

#### 1. **API Key Issues**

**Problem**: Invalid or missing API key

**Solution**:
- Verify your API key in `.env` file: `GOOGLE_GEOCODING_API_KEY=your_key_here`
- Make sure there are no extra spaces or quotes around the key
- Restart the application after updating `.env`

#### 2. **Geocoding API Not Enabled**

**Problem**: The Geocoding API is not enabled in your Google Cloud project

**Solution**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to "APIs & Services" → "Library"
4. Search for "Geocoding API"
5. Click "Enable"

#### 3. **Billing Not Enabled**

**Problem**: Google requires billing to be enabled even for free tier usage

**Solution**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "Billing"
3. Link a billing account to your project
4. Note: You get $200 free credit monthly, and Geocoding API has generous free tier

#### 4. **API Key Restrictions**

**Problem**: Your API key has restrictions that prevent it from being used

**Solution**:
1. Go to "APIs & Services" → "Credentials"
2. Click on your API key
3. Check "API restrictions":
   - Make sure "Geocoding API" is allowed, OR
   - Set to "Don't restrict key" (for testing)
4. Check "Application restrictions":
   - For development, you can set to "None"
   - For production, configure IP or HTTP referrer restrictions

#### 5. **API Quota Exceeded**

**Problem**: You've exceeded your API quota/limit

**Solution**:
1. Check your quota in Google Cloud Console
2. Wait for quota to reset (usually daily/monthly)
3. Consider upgrading your quota if needed

### Quick Verification Steps

1. **Test your API key directly**:
```bash
curl "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY"
```

2. **Check the response**:
   - If you get `"status": "OK"` → API key works!
   - If you get `"status": "REQUEST_DENIED"` → Follow the solutions above
   - If you get `"status": "OVER_QUERY_LIMIT"` → Quota exceeded

3. **Check application logs**:
   - Look for detailed error messages in your application logs
   - The error should indicate the specific issue

### Environment Variable Check

Make sure your `.env` file has:
```env
GOOGLE_GEOCODING_API_KEY=your_actual_api_key_here
```

**Important**: 
- No quotes around the key
- No spaces before/after the key
- Restart the application after changing `.env`

### Testing with cURL

Test your API key directly:
```bash
# Replace YOUR_API_KEY with your actual key
curl "https://maps.googleapis.com/maps/api/geocode/json?address=New+York&key=YOUR_API_KEY"
```

Expected successful response:
```json
{
  "results": [...],
  "status": "OK"
}
```

If you get `REQUEST_DENIED`, check the solutions above.

### Still Having Issues?

1. **Check Google Cloud Console**:
   - Verify API is enabled
   - Check billing status
   - Review API key restrictions

2. **Check Application Logs**:
   - Look for detailed error messages
   - Check if API key is being loaded correctly

3. **Verify API Key Format**:
   - Should start with `AIza...`
   - Should be about 39 characters long
   - No special characters or spaces



