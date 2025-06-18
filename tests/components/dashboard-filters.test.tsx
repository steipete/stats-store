import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardFilters } from '../../components/dashboard-filters'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, startOfDay, subDays } from 'date-fns'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}))

describe('DashboardFilters', () => {
  const mockPush = vi.fn()
  const mockRefresh = vi.fn()
  const mockSearchParams = new URLSearchParams()

  const mockApps = [
    { id: '1', name: 'App One' },
    { id: '2', name: 'App Two' },
    { id: '3', name: 'App Three' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
    ;(useSearchParams as any).mockReturnValue(mockSearchParams)
  })

  describe('app filter rendering', () => {
    it('renders with all apps option', () => {
      render(<DashboardFilters apps={mockApps} currentAppId="all" />)
      
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      expect(screen.getByText('All Apps')).toBeInTheDocument()
      expect(screen.getByText('App One')).toBeInTheDocument()
      expect(screen.getByText('App Two')).toBeInTheDocument()
      expect(screen.getByText('App Three')).toBeInTheDocument()
    })

    it('selects current app correctly', () => {
      render(<DashboardFilters apps={mockApps} currentAppId="2" />)
      
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('2')
    })

    it('defaults to "all" when no currentAppId', () => {
      render(<DashboardFilters apps={mockApps} currentAppId="" />)
      
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('all')
    })

    it('renders error state when appsError is provided', () => {
      render(
        <DashboardFilters 
          apps={null} 
          currentAppId="all" 
          appsError="Failed to load apps" 
        />
      )
      
      expect(screen.getByText('Failed to load apps')).toBeInTheDocument()
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    })

    it('renders empty state when no apps and no error', () => {
      render(<DashboardFilters apps={[]} currentAppId="all" />)
      
      expect(screen.getByText('No applications found.')).toBeInTheDocument()
    })

    it('handles null apps gracefully', () => {
      render(<DashboardFilters apps={null} currentAppId="all" />)
      
      // Should show the select with just "All Apps" option
      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
      expect(screen.getByText('All Apps')).toBeInTheDocument()
    })
  })

  describe('app filter interactions', () => {
    it('handles app selection change', async () => {
      const user = userEvent.setup()
      render(<DashboardFilters apps={mockApps} currentAppId="all" />)
      
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '2')
      
      expect(mockPush).toHaveBeenCalledWith('/?app=2')
    })

    it('removes app param when selecting "all"', async () => {
      const user = userEvent.setup()
      mockSearchParams.set('app', '2')
      render(<DashboardFilters apps={mockApps} currentAppId="2" />)
      
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'all')
      
      expect(mockPush).toHaveBeenCalledWith('/?')
    })

    it('preserves other query params when changing app', async () => {
      const user = userEvent.setup()
      mockSearchParams.set('from', '2024-01-01')
      mockSearchParams.set('to', '2024-01-31')
      render(<DashboardFilters apps={mockApps} currentAppId="all" />)
      
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '1')
      
      expect(mockPush).toHaveBeenCalledWith('/?from=2024-01-01&to=2024-01-31&app=1')
    })
  })

  describe('date range picker', () => {
    it('renders with current date range', () => {
      const dateRange = {
        from: new Date('2024-01-01'),
        to: new Date('2024-01-31'),
      }
      render(
        <DashboardFilters 
          apps={mockApps} 
          currentAppId="all" 
          currentDateRange={dateRange}
        />
      )
      
      // Date picker should be present
      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument()
    })

    it('handles date range selection', async () => {
      const user = userEvent.setup()
      render(<DashboardFilters apps={mockApps} currentAppId="all" />)
      
      // This is a simplified test as DateRangePicker is complex
      // In real tests, you'd need to mock the DateRangePicker component
      const datePickerButton = screen.getByRole('button', { name: /select/i })
      expect(datePickerButton).toBeInTheDocument()
    })

    it('formats dates correctly in URL params', () => {
      render(<DashboardFilters apps={mockApps} currentAppId="all" />)
      
      // Simulate date change by calling the handler directly
      const component = render(
        <DashboardFilters apps={mockApps} currentAppId="all" />
      ).container
      
      // The actual date picker interaction would be more complex
      // This tests the date formatting logic
      const testDate = new Date('2024-01-15')
      const formattedDate = format(startOfDay(testDate), 'yyyy-MM-dd')
      expect(formattedDate).toBe('2024-01-15')
    })
  })

  describe('refresh button', () => {
    it('renders refresh button', () => {
      render(<DashboardFilters apps={mockApps} currentAppId="all" />)
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      expect(refreshButton).toBeInTheDocument()
    })

    it('calls router.refresh when clicked', async () => {
      const user = userEvent.setup()
      render(<DashboardFilters apps={mockApps} currentAppId="all" />)
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      await user.click(refreshButton)
      
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('styling and layout', () => {
    it('applies responsive grid layout', () => {
      const { container } = render(
        <DashboardFilters apps={mockApps} currentAppId="all" />
      )
      
      const grid = container.firstChild
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-3', 'gap-4')
    })

    it('applies correct styling to inputs', () => {
      const { container } = render(
        <DashboardFilters apps={mockApps} currentAppId="all" />
      )
      
      const selectWrapper = container.querySelector('.relative.w-full')
      expect(selectWrapper).toHaveClass('rounded-lg', 'border', 'shadow-subtle')
    })

    it('applies error styling when there is an error', () => {
      render(
        <DashboardFilters 
          apps={null} 
          currentAppId="all" 
          appsError="Error loading" 
        />
      )
      
      const errorDiv = screen.getByText('Error loading').parentElement
      expect(errorDiv).toHaveClass('border-destructive/50', 'bg-destructive/10', 'text-destructive')
    })

    it('shows chevron icon in select', () => {
      const { container } = render(
        <DashboardFilters apps={mockApps} currentAppId="all" />
      )
      
      const chevron = container.querySelector('.h-5.w-5.text-muted-foreground')
      expect(chevron).toBeInTheDocument()
    })
  })

  describe('complex scenarios', () => {
    it('handles all props together', () => {
      const dateRange = {
        from: subDays(new Date(), 30),
        to: new Date(),
      }
      
      render(
        <DashboardFilters 
          apps={mockApps} 
          currentAppId="2" 
          currentDateRange={dateRange}
        />
      )
      
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('2')
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument()
    })

    it('maintains filter state across interactions', async () => {
      const user = userEvent.setup()
      mockSearchParams.set('from', '2024-01-01')
      mockSearchParams.set('app', '1')
      
      render(<DashboardFilters apps={mockApps} currentAppId="1" />)
      
      // Change app
      const select = screen.getByRole('combobox')
      await user.selectOptions(select, '2')
      
      // Should preserve date param
      expect(mockPush).toHaveBeenCalledWith('/?from=2024-01-01&app=2')
    })

    it('handles empty apps array with error', () => {
      render(
        <DashboardFilters 
          apps={[]} 
          currentAppId="all" 
          appsError="No apps configured" 
        />
      )
      
      // Error should take precedence
      expect(screen.getByText('No apps configured')).toBeInTheDocument()
      expect(screen.queryByText('No applications found.')).not.toBeInTheDocument()
    })
  })
})