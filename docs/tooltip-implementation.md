# Tooltip Implementation for KPI Cards

## Overview

Since Tremor's Icon component doesn't support tooltips directly, we've implemented two solutions for adding hover information to the KPI cards in the dashboard.

## Solution 1: Radix UI Tooltip (Recommended)

This solution uses `@radix-ui/react-tooltip` which is already installed in the project. It provides a fully accessible, customizable tooltip component.

### Components Created:

1. **`/components/ui/tooltip.tsx`** - A reusable tooltip component using Radix UI primitives
2. **`/components/kpi-card.tsx`** - A wrapper component for KPI cards with tooltip support

### Implementation:

The KpiCard component is now used in `app/page.tsx` with the following tooltip texts:
- **Unique Users**: "Unique users (based on IP hash) from [start date] to [end date]"
- **Total Reports**: "Total reports received from [start date] to [end date]"
- **Latest Version**: "Highest reported application version (semantically sorted)"

### Features:
- Fully accessible with keyboard navigation
- Smooth animations
- Customizable positioning and styling
- Works well with all screen sizes
- Follows the project's dark mode theme

### Usage Example:
\`\`\`tsx
<KpiCard
  title="Unique Users"
  value={valueFormatter(data.kpis.unique_installs)}
  icon={UsersIcon}
  iconColor="blue"
  tooltip="Unique users (based on IP hash) from Jan 1 to Jan 31"
/>
\`\`\`

## Solution 2: Native HTML Title Attribute (Simple Alternative)

For a simpler approach without client-side JavaScript, we also created `KpiCardSimple` that uses the native HTML `title` attribute.

### Component Created:

**`/components/kpi-card-simple.tsx`** - A server component that uses the `title` attribute

### Features:
- No client-side JavaScript required
- Works everywhere
- Native browser behavior
- Simple implementation

### Limitations:
- Less control over styling
- Delay before tooltip appears is browser-dependent
- No animations
- Basic appearance

### Usage Example:
\`\`\`tsx
<KpiCardSimple
  title="Unique Users"
  value={valueFormatter(data.kpis.unique_installs)}
  icon={UsersIcon}
  iconColor="blue"
  tooltip="Unique users (based on IP hash) from Jan 1 to Jan 31"
/>
\`\`\`

## Current Implementation

The dashboard currently uses Solution 1 (Radix UI) as it provides a better user experience with:
- Immediate tooltip display on hover
- Consistent styling with the application theme
- Better accessibility features
- Professional appearance

## Switching Between Solutions

To switch to the simpler solution, replace the import in `app/page.tsx`:

\`\`\`tsx
// Replace this:
import { KpiCard } from "@/components/kpi-card"

// With this:
import { KpiCardSimple as KpiCard } from "@/components/kpi-card-simple"
\`\`\`

## Styling Customization

The Radix UI tooltip can be customized by modifying the styles in `/components/ui/tooltip.tsx`. The current implementation uses:
- Background: `bg-primary` (adapts to theme)
- Text: `text-primary-foreground`
- Padding: `px-3 py-1.5`
- Font size: `text-xs`
- Animations: Fade in/out with slight zoom

## Future Considerations

1. **Tremor Updates**: Keep an eye on Tremor's roadmap as they may add native tooltip support in future versions
2. **Mobile Support**: Consider adding touch-friendly alternatives for mobile devices
3. **Extended Information**: The tooltip component can be extended to show more complex content like charts or tables if needed
