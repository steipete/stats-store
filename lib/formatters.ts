// This is a shared utility file, so it does not have 'use client' or 'use server'.
// It can be imported by both Server and Client Components.

export const valueFormatter = (number: number): string => {
  // Return "0" for non-numeric or NaN inputs to prevent runtime errors in charts.
  if (typeof number !== "number" || isNaN(number)) {
    return "0"
  }
  // Use Intl.NumberFormat for robust, locale-aware number formatting.
  return new Intl.NumberFormat("us").format(number).toString()
}
