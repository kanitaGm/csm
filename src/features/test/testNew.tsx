// 10. EXAMPLE USAGE IN APP
//npm install clsx tailwind-merge class-variance-authority

// Example: Using Design System in CSM List Component
import React from 'react'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Badge, 
  Input,
  Dropdown,
  useToast
} from '../../components/design'
import { Search, Plus } from 'lucide-react'

export const ExampleCSMListPage: React.FC = () => {
  const { addToast } = useToast()

  const handleAddVendor = () => {
    addToast({
      title: 'สำเร็จ',
      message: 'เพิ่มผู้ขายใหม่เรียบร้อยแล้ว',
      type: 'success'
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">รายการผู้ขาย CSM</h1>
          <p className="text-gray-600">จัดการและประเมินผู้ขายทั้งหมด</p>
        </div>
        <Button onClick={handleAddVendor} leftIcon={<Plus className="w-4 h-4" />}>
          เพิ่มผู้ขายใหม่
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              placeholder="ค้นหาผู้ขาย..."
              leftIcon={<Search className="w-4 h-4" />}
            />
            <Dropdown
              items={[
                { value: 'all', label: 'ทุกหมวดหมู่' },
                { value: 'it', label: 'เทคโนโลยี' },
                { value: 'finance', label: 'การเงิน' }
              ]}
              placeholder="เลือกหมวดหมู่"
              onChange={(value) => console.log(value)}
            />
            <Dropdown
              items={[
                { value: 'all', label: 'ทุกระดับความเสี่ยง' },
                { value: 'high', label: 'สูง' },
                { value: 'medium', label: 'กลาง' },
                { value: 'low', label: 'ต่ำ' }
              ]}
              placeholder="ระดับความเสี่ยง"
              onChange={(value) => console.log(value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Vendor Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Example cards */}
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="elevated" interactive>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>บริษัท ABC จำกัด</CardTitle>
                  <p className="text-sm text-gray-600">เทคโนโลยี</p>
                </div>
                <Badge variant={i === 1 ? 'error' : i === 2 ? 'warning' : 'success'}>
                  {i === 1 ? 'สูง' : i === 2 ? 'กลาง' : 'ต่ำ'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">คะแนนล่าสุด:</span>
                  <span className="font-medium">85/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ประเมินล่าสุด:</span>
                  <span>15 ม.ค. 2025</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  ดูรายละเอียด
                </Button>
                <Button size="sm" className="flex-1">
                  ประเมิน
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}