export interface WarehouseStock {
  id: string
  tenant_id: string
  product_id: string
  warehouse_id: string
  abc_classification: string
  total_stock: number
  available_stock: number
  reserved_stock: number
  minimum_stock: number
  maximum_stock: number
  safety_stock: number
  stock_to_maintain: number
  stock_days_coverage: number
  stock_date_coverage: number
  stock_status: string
  suggested_stock: number
  annual_turnover: number
  last_purchases_date: string | null
  next_suggested_purchases_date: string | null
  min_purchase: number
  max_purchase: number
  average_cost: number
  monthly_sales_average: number
  total_sales_units: number
  standard_deviation_sales: number
  minimum_monthly_sales: number
  maximum_monthly_sales: number
  entry_year: number
  entry_month: number
  last_entry_date: string
  january_sales: number
  february_sales: number
  march_sales: number
  april_sales: number
  may_sales: number
  june_sales: number
  july_sales: number
  august_sales: number
  september_sales: number
  october_sales: number
  november_sales: number
  december_sales: number
  total_sales: number
  location: string | null
  created_at: string
  updated_at: string
  // Objetos anidados que vienen del API
  product:
    | {
        id: string
        name: string
        sku: string
        reference: string
        category: {
          name: string
        }
      }
    | undefined
  warehouse:
    | {
        id: string
        name: string
      }
    | undefined
}

export class WarehouseStock implements WarehouseStock {
  id: string
  tenant_id: string
  product_id: string
  warehouse_id: string
  abc_classification: string
  total_stock: number
  available_stock: number
  reserved_stock: number
  minimum_stock: number
  maximum_stock: number
  safety_stock: number
  stock_to_maintain: number
  stock_days_coverage: number
  stock_date_coverage: number
  stock_status: string
  suggested_stock: number
  annual_turnover: number
  last_purchases_date: string | null
  next_suggested_purchases_date: string | null
  min_purchase: number
  max_purchase: number
  average_cost: number
  monthly_sales_average: number
  total_sales_units: number
  standard_deviation_sales: number
  minimum_monthly_sales: number
  maximum_monthly_sales: number
  entry_year: number
  entry_month: number
  last_entry_date: string
  january_sales: number
  february_sales: number
  march_sales: number
  april_sales: number
  may_sales: number
  june_sales: number
  july_sales: number
  august_sales: number
  september_sales: number
  october_sales: number
  november_sales: number
  december_sales: number
  total_sales: number
  location: string | null
  created_at: string
  updated_at: string

  constructor(data: WarehouseStock) {
    this.id = data.id
    this.tenant_id = data.tenant_id
    this.product_id = data.product_id
    this.warehouse_id = data.warehouse_id
    this.abc_classification = data.abc_classification
    this.total_stock = data.total_stock
    this.available_stock = data.available_stock
    this.reserved_stock = data.reserved_stock
    this.minimum_stock = data.minimum_stock
    this.maximum_stock = data.maximum_stock
    this.safety_stock = data.safety_stock
    this.stock_to_maintain = data.stock_to_maintain
    this.stock_days_coverage = data.stock_days_coverage
    this.stock_date_coverage = data.stock_date_coverage
    this.stock_status = data.stock_status
    this.suggested_stock = data.suggested_stock
    this.annual_turnover = data.annual_turnover
    this.last_purchases_date = data.last_purchases_date
    this.next_suggested_purchases_date = data.next_suggested_purchases_date
    this.min_purchase = data.min_purchase
    this.max_purchase = data.max_purchase
    this.average_cost = data.average_cost
    this.monthly_sales_average = data.monthly_sales_average
    this.total_sales_units = data.total_sales_units
    this.standard_deviation_sales = data.standard_deviation_sales
    this.minimum_monthly_sales = data.minimum_monthly_sales
    this.maximum_monthly_sales = data.maximum_monthly_sales
    this.entry_year = data.entry_year
    this.entry_month = data.entry_month
    this.last_entry_date = data.last_entry_date
    this.january_sales = data.january_sales
    this.february_sales = data.february_sales
    this.march_sales = data.march_sales
    this.april_sales = data.april_sales
    this.may_sales = data.may_sales
    this.june_sales = data.june_sales
    this.july_sales = data.july_sales
    this.august_sales = data.august_sales
    this.september_sales = data.september_sales
    this.october_sales = data.october_sales
    this.november_sales = data.november_sales
    this.december_sales = data.december_sales
    this.total_sales = data.total_sales
    this.location = data.location
    this.created_at = data.created_at
    this.updated_at = data.updated_at
    this.product = data.product
    this.warehouse = data.warehouse
  }
}

export interface WarehouseStockResultPagination {
  data: WarehouseStock[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
