# Mobile Responsiveness Testing Guide

## Test Setup

### Using Chrome DevTools
1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Click "Toggle device toolbar" (Cmd+Shift+M)
3. Select device presets or set custom dimensions

### Test Devices
- **iPhone SE** (375px × 667px) - Small mobile
- **iPhone 12/13** (390px × 844px) - Standard mobile
- **iPad Mini** (768px × 1024px) - Tablet
- **iPad Pro** (1024px × 1366px) - Large tablet

## Testing Checklist

### 1. Navbar (All Pages)

#### Desktop (>768px)
- ✅ Logo visible on left
- ✅ All nav links visible horizontally
- ✅ Market status indicator visible
- ✅ IST clock visible
- ✅ Auth buttons (login/logout) visible

#### Mobile (≤768px)
- ✅ Logo visible on left
- ✅ Hamburger menu (☰) visible on right
- ✅ Nav links hidden
- ✅ IST clock hidden
- ✅ Market status visible
- ✅ Click hamburger → dropdown menu appears
- ✅ Click nav link → menu closes, navigates
- ✅ Dropdown has touch-friendly 48px tap targets

**Test Steps:**
```
1. Open any page at 375px width
2. Verify hamburger menu appears
3. Click hamburger
4. Verify dropdown shows all nav links
5. Click a link
6. Verify navigation works and menu closes
```

---

### 2. Strategy Builder

#### Desktop (>768px)
- ✅ Left panel (340px) on left side
- ✅ Chart panel on right side
- ✅ Both panels visible simultaneously
- ✅ Vertical split layout

#### Mobile (≤767px)
- ✅ Chart panel on TOP (50vh min-height)
- ✅ Left panel BELOW chart (50vh max-height)
- ✅ Left panel scrollable
- ✅ Chart responsive, no horizontal scroll
- ✅ Summary bar wraps on small screens
- ✅ Save button accessible

**Test Steps:**
```
1. Open Strategy Builder at 375px
2. Verify chart appears at top
3. Scroll down to see left panel controls
4. Add a leg
5. Verify chart updates
6. Verify no horizontal scroll
7. Test at 768px - should switch to side-by-side
```

---

### 3. Dashboard (Market Screener)

#### All Sizes
- ✅ Table has horizontal scroll on mobile
- ✅ Skeleton loader shows while loading
- ✅ Stale data banner appears when market closed
- ✅ Refresh button accessible
- ✅ Table columns readable

#### Mobile (≤768px)
- ✅ Table scrolls horizontally
- ✅ Touch scrolling works smoothly
- ✅ Header stays readable
- ✅ Padding reduced appropriately

**Test Steps:**
```
1. Open Dashboard at 375px
2. Verify table scrolls horizontally
3. Swipe table left/right
4. Click refresh button
5. Verify skeleton loader appears
6. Check stale banner (if market closed)
```

---

### 4. Portfolio Page

#### Tabs
- ✅ Three tabs visible and clickable
- ✅ Tab labels readable on mobile
- ✅ Active tab highlighted

#### Tables (All Tabs)
- ✅ Horizontal scroll enabled
- ✅ Columns readable
- ✅ Action buttons accessible
- ✅ No text overflow

#### Modals
- ✅ Paper position modal full width on mobile
- ✅ Input fields 48px min-height
- ✅ Touch-friendly buttons
- ✅ Modal scrollable if content overflows

**Test Steps:**
```
1. Open Portfolio at 375px
2. Test each tab (Strategies, Paper, History)
3. Verify tables scroll horizontally
4. Click "Add Paper Position"
5. Verify modal is full width
6. Test input fields (should not zoom on iOS)
7. Verify buttons are 48px min-height
```

---

### 5. Option Chain

#### Desktop
- ✅ Full table visible
- ✅ All columns readable

#### Mobile
- ✅ Table scrolls horizontally
- ✅ Strike column sticky (if implemented)
- ✅ Touch scrolling smooth
- ✅ No vertical overflow

**Test Steps:**
```
1. Open Option Chain at 375px
2. Swipe table horizontally
3. Verify all data accessible
4. Check strike prices readable
```

---

### 6. Forms & Inputs

#### All Forms (Login, Register, Modals)
- ✅ Inputs full width on mobile
- ✅ Min-height 48px (touch-friendly)
- ✅ Font-size 16px (prevents iOS zoom)
- ✅ Labels readable
- ✅ Buttons 48px min-height
- ✅ Submit buttons accessible

**Test Steps:**
```
1. Open Login page at 375px
2. Tap email input
3. Verify no zoom on iOS (font-size ≥16px)
4. Verify input is 48px tall
5. Test all form fields
6. Verify submit button is touch-friendly
```

---

### 7. Typography

#### All Pages
- ✅ No text overflow
- ✅ Word wrapping works
- ✅ Line lengths readable
- ✅ Headings scale appropriately
- ✅ Monospace text doesn't break layout

**Test Steps:**
```
1. Open each page at 375px
2. Check for horizontal scroll
3. Verify all text is readable
4. Check long strategy names wrap
5. Verify no text cuts off
```

---

### 8. Charts (OI Charts, IV Charts)

#### All Sizes
- ✅ Charts responsive
- ✅ Height adjusts appropriately
- ✅ No horizontal scroll
- ✅ Legends readable
- ✅ Touch interactions work

**Test Steps:**
```
1. Open OI Charts at 375px
2. Verify chart fills width
3. Verify chart height appropriate
4. Test touch interactions (if any)
5. Verify no horizontal scroll
```

---

## Responsive Breakpoints

```css
/* Mobile First */
< 480px   - Small mobile (iPhone SE)
< 768px   - Mobile
768px-1024px - Tablet
> 1024px  - Desktop
```

## Common Issues to Check

### ❌ Horizontal Scroll
- Check for fixed widths
- Check for large padding/margins
- Check for wide tables without scroll

### ❌ Text Overflow
- Check long strategy names
- Check table cells
- Check button labels

### ❌ Tiny Tap Targets
- Buttons should be ≥44px
- Links should be ≥44px
- Icons should be ≥44px

### ❌ iOS Zoom on Input Focus
- All inputs must have font-size ≥16px
- Check email, password, number inputs

### ❌ Unreadable Text
- Font sizes too small
- Insufficient contrast
- Line lengths too long

## Testing Tools

### Browser DevTools
```
Chrome: Cmd+Opt+I → Toggle Device Toolbar
Firefox: Cmd+Opt+M
Safari: Develop → Enter Responsive Design Mode
```

### Physical Devices
- Test on real iPhone/Android if available
- Check touch interactions
- Verify scrolling performance

### Lighthouse Mobile Audit
```
1. Open DevTools
2. Go to Lighthouse tab
3. Select "Mobile"
4. Run audit
5. Check "Mobile Friendly" score
```

## Viewport Meta Tag

Ensure `index.html` has:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

## CSS Media Queries Applied

### Global (`mobile.css`)
- Tables scroll horizontally on mobile
- Forms full width with touch-friendly inputs
- Typography prevents overflow
- Touch targets ≥44px

### Navbar
- Hamburger menu <768px
- Desktop nav >768px
- Clock hidden on mobile

### Strategy Builder
- Column-reverse layout <768px (chart on top)
- Side-by-side layout >768px
- Panel heights adjusted for mobile

### Dashboard
- Table skeleton loader
- Stale data banner responsive
- Padding adjustments

## Success Criteria

✅ **No horizontal scroll** on any page at 375px
✅ **All interactive elements** ≥44px tap target
✅ **All text readable** without zoom
✅ **Forms work** without iOS zoom
✅ **Tables scroll** horizontally when needed
✅ **Charts responsive** and fill width
✅ **Navigation accessible** via hamburger menu

## Quick Test Script

```bash
# Test all pages at 375px width
1. Strategy Builder - add legs, verify chart
2. Option Chain - scroll table
3. OI Charts - verify chart responsive
4. IV Charts - verify chart responsive
5. Dashboard - scroll table, refresh
6. Portfolio - all tabs, add position
7. Login - test form inputs
8. Register - test form inputs
```

## Reporting Issues

If you find responsive issues:
1. Note the page URL
2. Note the viewport width
3. Take screenshot
4. Describe expected vs actual behavior
5. Note device/browser if on physical device
