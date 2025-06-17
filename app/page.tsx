import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function Page() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">App Stats Store</CardTitle>
          <CardDescription>
            The backend is up and running. The ingest endpoint is available at <code>/api/ingest</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Next steps would be to build out the authenticated dashboard to visualize the collected data.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
