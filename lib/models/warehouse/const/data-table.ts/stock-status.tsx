import { WarehouseStock } from '@/lib/models/warehouse/stock'
import { ColumnDef } from '@tanstack/react-table'

export const STOCK_STATUS_COLUMNS: ColumnDef<WarehouseStock>[] = [
  {
    accessorKey: 'product',
    header: 'PRODUCTO',
    cell: ({ row }) => {
      const product = row.getValue('product') as any
      const name = product ? product.name : 'N/A'
      const warehouse = row.original.warehouse?.name as string

      return (
        <div className="flex flex-col uppercase text-xs">
          <span className="font-bold">{name}</span>
          <span className="text-muted-foreground font-semibold">
            SKU: {product?.sku || 'Sin SKU'}
          </span>
          <span className="text-xs text-primary font-semibold">
            BOD: {warehouse}
          </span>
          <span className="text-muted-foreground">
            REF: {product.reference}
          </span>
        </div>
      )
    },
  },
  {
    id: 'product_name',
    accessorFn: (row) => row.product?.name || '',
    header: 'NOMBRE PRODUCTO',
    enableHiding: false,
    meta: {
      hidden: true,
    },
    filterFn: 'includesString',
  },
  {
    accessorKey: 'warehouse_id',
    header: 'BODEGA ID',
    enableHiding: false,
    meta: {
      hidden: true,
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'warehouse.name',
    header: 'BODEGA',
    filterFn: (row, id, value) => {
      const cellValue = row.getValue(id) as string
      return cellValue?.toLowerCase().includes(value.toLowerCase())
    },
  },
  {
    accessorKey: 'product.category.name',
    header: 'CATEGORÍA',
    filterFn: (row, id, value) => {
      const cellValue = row.getValue(id) as string
      return cellValue?.toLowerCase().includes(value.toLowerCase())
    },
  },
  {
    accessorKey: 'category_id',
    header: 'CATEGORÍA ID',
    enableHiding: false,
    meta: {
      hidden: true,
    },
    filterFn: 'includesString',
  },
  {
    accessorKey: 'stock_days_coverage',
    header: 'DÍAS INV.',
    cell: ({ row }) => {
      const days = row.getValue('stock_days_coverage') as number
      return <span>{days?.toFixed(1)} días</span>
    },
  },
  {
    accessorKey: 'abc_classification',
    header: 'ABC',
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    cell: ({ row }) => {
      const classification = row.getValue('abc_classification') as string
      let colorClass = 'bg-gray-500'

      if (classification === 'A')
        colorClass = 'bg-green-600/10 text-green-700 border border-green-600'
      else if (classification === 'B')
        colorClass = 'bg-[#F87315]/10 text-[#F87315] border border-[#F87315]'
      else if (classification === 'C')
        colorClass = 'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]'

      return (
        <span
          className={`px-1.5 py-1 rounded-full font-bold ${colorClass} text-xs`}
        >
          {classification}
        </span>
      )
    },
  },
  {
    accessorKey: 'available_stock',
    header: 'INVENTARIO',
    cell: ({ row }) => {
      const stockToMaintein = row.original.stock_to_maintain as number
      const availableStock = row.original.available_stock as number
      {
        /* <span>{stockToMaintein?.toFixed(2)}</span> */
      }

      return (
        <table>
          <tbody>
            <tr className="text-xs">
              <td className="pr-2 text-muted-foreground">Mantener:</td>
              <td className="font-bold">{stockToMaintein}</td>
            </tr>
            <tr className="text-xs">
              <td className="pr-2 text-muted-foreground">Real:</td>
              <td className="font-bold">{availableStock}</td>
            </tr>
          </tbody>
        </table>
      )
    },
  },
  {
    accessorKey: 'suggested_stock',
    header: 'SUGERIDO',
  },
  {
    accessorKey: 'stock_status',
    header: 'ESTADO',
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'average_cost',
    header: 'PRECIO',
    cell: ({ row }) => {
      const price = row.getValue('average_cost') as number
      return <span>${Math.round(price)}</span>
    },
  },
]
