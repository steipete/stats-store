# Tooltip Implementation for KPI Cards

## Overview

The dashboard uses KPI cells with optional hover info, implemented with `@radix-ui/react-tooltip`. It provides a fully accessible, customizable tooltip component.

### Components:

1. **`/components/ui/tooltip.tsx`** - A reusable tooltip component using Radix UI primitives
2. **`/components/kpi-card.tsx`** - The KPI cell component with tooltip support

### Implementation:

The KpiCard component is used (via `RealtimeKpiCard`) in the dashboard's KPI band with the following tooltip texts:

- **Unique Users**: "Distinct users identified by daily IP hash"
- **Total Reports**: "All telemetry reports received"
- **Latest Version**: "Most recent app version seen in reports"

### Features:

- Fully accessible with keyboard navigation
- Smooth animations
- Customizable positioning and styling
- Works well with all screen sizes
- Follows the project's dark mode theme

### Usage Example:

```tsx
<KpiCard
  title="Unique Users"
  value={valueFormatter(data.kpis.unique_installs)}
  iconName="users"
  tooltip="Distinct users identified by daily IP hash"
/>
```

## Simple Alternative: Native HTML Title Attribute

If you ever need a tooltip without client-side JavaScript, pass a `title` attribute on a plain wrapper element instead. The previous `KpiCardSimple` component that demonstrated this was unused and has been removed.

## Styling Customization

The Radix UI tooltip can be customized by modifying the styles in `/components/ui/tooltip.tsx`. The current implementation uses:

- Background: `bg-primary` (adapts to theme)
- Text: `text-primary-foreground`
- Padding: `px-3 py-1.5`
- Font size: `text-xs`
- Animations: Fade in/out with slight zoom

## Future Considerations

1. **Mobile Support**: Consider adding touch-friendly alternatives for mobile devices
2. **Extended Information**: The tooltip component can be extended to show more complex content like charts or tables if needed
