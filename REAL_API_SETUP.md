# 🎨 Real API Setup Guide

## Overview

Your PaintMe app currently uses **mock transformations** for development. To get **real AI art transformations** using Replicate's flux-kontext-pro model, follow this guide.

## Current Status

- ✅ **Mock Mode**: Demo images (works in browser)
- ⏳ **Real API**: Actual AI transformations (requires setup)

## Quick Setup (3 Steps)

### 1. Enable Real API Mode

In `lib/replicate.ts`, change:
```typescript
const USE_MOCK_MODE = __DEV__ && true; // Change to false
```

To:
```typescript
const USE_MOCK_MODE = false; // Real API enabled
```

### 2. Set up Image Upload (Choose One)

#### Option A: Cloudinary (Recommended - Free Tier)

1. Sign up at [cloudinary.com](https://cloudinary.com) (free)
2. Get your cloud name and create an upload preset
3. Update `lib/imageUtils.ts`:

```typescript
const CLOUDINARY_CONFIG = {
  cloudName: 'your-cloud-name', // Your Cloudinary cloud name
  uploadPreset: 'your-preset',  // Your upload preset
  apiUrl: 'https://api.cloudinary.com/v1_1/your-cloud-name/image/upload'
};
```

#### Option B: Alternative Services
- **Imgur**: Simple image hosting with API
- **ImageBB**: Free image hosting
- **AWS S3**: Enterprise solution
- **Your own server**: Custom endpoint

### 3. Test on Mobile Device

The real API works best on mobile devices to avoid CORS issues:

```bash
# iOS
npx expo run:ios

# Android  
npx expo run:android

# Or use Expo Go app
npx expo start
```

## What You'll Get

✨ **Real AI Transformations**:
- **Caravaggio**: Dramatic chiaroscuro lighting, baroque style
- **Velázquez**: Royal court style, sophisticated realism  
- **Goya**: Expressive brushwork, romantic period aesthetics

## Testing

1. Upload a photo
2. Select an artist style
3. Wait 10-30 seconds for real AI processing
4. Get an actual classical painting transformation!

## Troubleshooting

### CORS Errors (Browser)
- **Solution**: Test on mobile device or Expo client
- **Why**: Browsers block cross-origin requests to APIs

### Upload Failures
- Check Cloudinary credentials
- Verify upload preset allows unsigned uploads
- Test image format (JPG, PNG, WebP)

### API Errors
- Verify Replicate API token in `.env`
- Check internet connection
- Monitor Replicate API status

## Production Deployment

For production apps:
1. Set up proper cloud storage (Cloudinary/AWS S3)
2. Implement error handling and retries
3. Add usage analytics and monitoring
4. Consider caching transformed images

## Support

- **Cloudinary Docs**: [cloudinary.com/documentation](https://cloudinary.com/documentation)
- **Replicate Docs**: [replicate.com/docs](https://replicate.com/docs)
- **Expo Docs**: [docs.expo.dev](https://docs.expo.dev)

Ready to create real masterpieces! 🎨✨ 