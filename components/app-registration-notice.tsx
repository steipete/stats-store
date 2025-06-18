"use client"

import { useState } from "react"
import { Card, Title, Text, Button } from "@tremor/react"
import { InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline"

export function AppRegistrationNotice() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <Card className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <Title className="text-blue-900 dark:text-blue-100">App Registration Required</Title>
            <Text className="text-blue-800 dark:text-blue-200">
              To use the stats collection endpoint at <code className="text-sm bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">https://stats.store/api/v1/ingest</code>, 
              your app must be registered first.
            </Text>
            <div className="space-y-1 mt-3">
              <Text className="text-blue-800 dark:text-blue-200 font-medium">Quick Start:</Text>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li>Access your Supabase dashboard</li>
                <li>Navigate to the <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">apps</code> table</li>
                <li>Add a new row with your app&apos;s <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">name</code> and <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">bundle_identifier</code></li>
                <li>Configure your Sparkle-enabled app to send reports to the endpoint</li>
              </ol>
            </div>
            <div className="mt-3">
              <Text className="text-blue-700 dark:text-blue-300 text-sm">
                Example bundle identifier: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">com.yourcompany.yourapp</code>
              </Text>
            </div>
          </div>
        </div>
        <Button
          variant="light"
          size="xs"
          color="blue"
          icon={XMarkIcon}
          onClick={() => setIsVisible(false)}
          className="ml-4"
        />
      </div>
    </Card>
  )
}