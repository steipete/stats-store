import { format, subDays } from "date-fns"

export const mockApps = [
  { bundle_identifier: "com.test.app1", id: "1", name: "Test App 1" },
  { bundle_identifier: "com.test.app2", id: "2", name: "Test App 2" },
  { bundle_identifier: "com.test.app3", id: "3", name: "Test App 3" },
]

export const mockReports = [
  {
    app_id: "1",
    cpu_arch: "arm64",
    id: "1",
    ip_hash: "hash1",
    os_version: "14.0",
    received_at: new Date().toISOString(),
    version: "1.0.0",
  },
  {
    app_id: "1",
    cpu_arch: "x86_64",
    id: "2",
    ip_hash: "hash2",
    os_version: "13.0",
    received_at: new Date().toISOString(),
    version: "1.0.0",
  },
]

export const generateDailyCountsData = (days: number = 30) => {
  const data = []
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i)
    data.push({
      report_count: Math.floor(Math.random() * 100) + 50,
      report_day: format(date, "yyyy-MM-dd"),
    })
  }
  return data
}

export const mockOsDistribution = [
  { os_version_name: "14.0", user_count: 150 },
  { os_version_name: "13.0", user_count: 100 },
  { os_version_name: "12.0", user_count: 50 },
]

export const mockCpuDistribution = [
  { cpu_arch_name: "arm64", user_count: 200 },
  { cpu_arch_name: "x86_64", user_count: 100 },
]

export const mockTopModels = [
  { model_name: "MacBookPro18,1", report_count: 150 },
  { model_name: "MacBookAir10,1", report_count: 100 },
  { model_name: "Macmini9,1", report_count: 50 },
  { model_name: "iMac21,1", report_count: 30 },
  { model_name: "MacBookPro17,1", report_count: 20 },
]
