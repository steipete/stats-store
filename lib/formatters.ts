// This function contains no client-side specific APIs (like window or hooks)
// and can be safely used in both Server and Client Components.
export const valueFormatter = (number: number): string => {
  // Return a default string for non-numeric values to prevent errors
  if (typeof number !== "number" || isNaN(number)) {
    return "0"
  }
  return new Intl.NumberFormat("us").format(number).toString()
}
