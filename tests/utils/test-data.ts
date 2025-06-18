import { subDays, format } from 'date-fns'

export const mockApps = [
  { id: '1', name: 'Test App 1', bundle_identifier: 'com.test.app1' },
  { id: '2', name: 'Test App 2', bundle_identifier: 'com.test.app2' },
  { id: '3', name: 'Test App 3', bundle_identifier: 'com.test.app3' },
]

export const mockReports = [
  {
    id: '1',
    app_id: '1',
    version: '1.0.0',
    os_version: '14.0',
    cpu_arch: 'arm64',
    ip_hash: 'hash1',
    received_at: new Date().toISOString(),
  },
  {
    id: '2',
    app_id: '1',
    version: '1.0.0',
    os_version: '13.0',
    cpu_arch: 'x86_64',
    ip_hash: 'hash2',
    received_at: new Date().toISOString(),
  },
]

export const generateDailyCountsData = (days: number = 30) => {
  const data = []
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i)
    data.push({
      report_day: format(date, 'yyyy-MM-dd'),
      report_count: Math.floor(Math.random() * 100) + 50,
    })
  }
  return data
}

export const mockOsDistribution = [
  { os_version_name: '14.0', user_count: 150 },
  { os_version_name: '13.0', user_count: 100 },
  { os_version_name: '12.0', user_count: 50 },
]

export const mockCpuDistribution = [
  { cpu_arch_name: 'arm64', user_count: 200 },
  { cpu_arch_name: 'x86_64', user_count: 100 },
]

export const mockTopModels = [
  { model_name: 'MacBookPro18,1', report_count: 150 },
  { model_name: 'MacBookAir10,1', report_count: 100 },
  { model_name: 'Macmini9,1', report_count: 50 },
  { model_name: 'iMac21,1', report_count: 30 },
  { model_name: 'MacBookPro17,1', report_count: 20 },
]