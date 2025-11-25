// Minimal stubs for @tremor/react to keep data-fetching tests light
export const Flex = ({ children }: any) => ({ type: "div", props: { children } })
export const Title = ({ children }: any) => ({ type: "div", props: { children } })
export const Table = ({ children }: any) => ({ type: "table", props: { children } })
export const TableHead = ({ children }: any) => ({ type: "thead", props: { children } })
export const TableRow = ({ children }: any) => ({ type: "tr", props: { children } })
export const TableHeaderCell = ({ children }: any) => ({ type: "th", props: { children } })
export const TableBody = ({ children }: any) => ({ type: "tbody", props: { children } })
export const TableCell = ({ children }: any) => ({ type: "td", props: { children } })

// Export any types consumed in code; runtime tests don't need implementation
export type DateRangePickerValue = unknown
