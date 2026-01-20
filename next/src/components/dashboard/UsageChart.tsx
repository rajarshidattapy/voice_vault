import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UsageChart() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>Usage Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>Chart component placeholder</p>
            <p className="text-sm">Usage analytics will be displayed here</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}