// ================================
// 16. MAIN EXPORT INDEX
// ================================

// src/components/design-system/index.ts
export * from './Button'
export * from './Input'
export * from './Card'
export * from './Badge'
export * from './Alert'
export * from './Skeleton'
export * from './Loading'
export * from './Modal'
export * from './Dropdown'
export * from './Tabs'
export * from './Toast'
export * from './Pagination'
export * from './Table'

// Export design tokens
export { designTokens } from '../../styles/designTokens'


/*
// ================================
// 17. EXAMPLE USAGE COMPONENTS
// ================================

// Example: CSM Card Component using Design System
export const CSMVendorCard: React.FC<{
  vendor: any
  onView: () => void
  onEdit: () => void
}> = ({ vendor, onView, onEdit }) => {
  return (
    <Card variant="elevated" interactive>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{vendor.name}</CardTitle>
            <CardDescription>{vendor.category}</CardDescription>
          </div>
          <Badge 
            variant={vendor.riskLevel === 'HIGH' ? 'error' : 
                   vendor.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
          >
            {vendor.riskLevel}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">คะแนนล่าสุด:</span>
            <span className="font-medium">{vendor.latestScore || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">ประเมินล่าสุด:</span>
            <span>{vendor.lastAssessment || 'ยังไม่เคยประเมิน'}</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="flex w-full gap-2">
          <Button variant="outline" size="sm" onClick={onView} className="flex-1">
            ดูรายละเอียด
          </Button>
          <Button variant="primary" size="sm" onClick={onEdit} className="flex-1">
            ประเมิน
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
  */