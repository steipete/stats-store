# KPI tooltips

`components/kpi-card.tsx` accepts an optional `tooltip` string and renders it through the Radix primitives in `components/ui/tooltip.tsx`. `RealtimeKpiCard` passes that string through unchanged.

```tsx
<KpiCard
  title="Unique Users"
  value="42"
  iconName="users"
  tooltip="Distinct users identified by daily IP hash"
/>
```

Tooltip colors use `--tooltip-bg` and `--tooltip-foreground` in `app/globals.css`. Shared spacing and positioning belong in `components/ui/tooltip.tsx`; metric explanations belong at the dashboard call sites.
