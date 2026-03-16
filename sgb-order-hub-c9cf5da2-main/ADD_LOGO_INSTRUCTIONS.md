# SGB Logo Integration Instructions

## Step 1: Save the Logo Image

1. Save the SGB logo image you provided as: `sgb-order-hub-c9cf5da2-main/public/sgb-logo.png`
2. Make sure the file is named exactly `sgb-logo.png`

## Step 2: Logo Will Appear In

The logo has been configured to appear in the following locations:

### 1. DashboardLayout (Main Navigation)
- Top-left corner of all dashboards
- Size: 40px height
- Appears on: Admin, Billing, Packing, Shipping dashboards

### 2. Home Page
- Hero section with larger logo
- Size: 80px height
- Professional presentation

### 3. Login/Register Pages
- Centered at top
- Size: 60px height
- Brand identity on auth pages

## Logo Specifications

### Current Settings
- Format: PNG (supports transparency)
- Path: `/sgb-logo.png`
- Alt text: "SGB Logo"
- Responsive sizing

### Recommended Image Specs
- Minimum size: 200x200 pixels
- Recommended: 400x400 pixels or higher
- Format: PNG with transparent background
- File size: Under 100KB for fast loading

## Fallback

If logo doesn't load, the system will show:
- Text: "SGB Order Hub"
- Styled with brand colors

## Testing

After adding the logo:
1. Refresh the browser
2. Check all dashboards
3. Verify logo appears clearly
4. Test on mobile devices

## Customization

To change logo size, edit these files:
- `src/components/DashboardLayout.tsx` - Line with `h-10`
- `src/pages/Home.tsx` - Line with `h-20`

Change `h-10` to `h-12` for larger, `h-8` for smaller.
