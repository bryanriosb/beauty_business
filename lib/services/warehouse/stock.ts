import { create, destroy, query, update } from '@/lib/actions/crud'
import { APIService } from '@/lib/models/api/api-service'
import {
  WarehouseStock,
  WarehouseStockResultPagination,
} from '@/lib/models/warehouse/stock'

export default class WarehouseStockService implements APIService {
  API_PATH = '/warehouses/stock'

  async fetchItems(params?: any): Promise<WarehouseStockResultPagination> {
    try {
      const response = await query(this.API_PATH, params)
      return response
    } catch (error) {
      console.error(`Error fetching warehouse stock: ${error}`)
      throw error
    }
  }

  async createItem(data: any, config?: any): Promise<any> {
    try {
      const response = await create(this.API_PATH, data, config)
      return response
    } catch (error) {
      console.error(`Error creating warehouse stock: ${error}`)
      throw error
    }
  }

  async updateItem(
    data: WarehouseStock | Partial<WarehouseStock>,
    partial = true
  ): Promise<any> {
    try {
      const response = await update(
        `${this.API_PATH}${data.id}/`,
        data,
        partial
      )
      return response
    } catch (error) {
      console.error(`Error updating warehouse stock: ${error}`)
      throw error
    }
  }

  async destroyItem(id: string): Promise<void> {
    try {
      await destroy(`${this.API_PATH}${id}/`)
    } catch (err) {
      throw new Error(`Failed to destroy warehouse stock: ${err}`)
    }
  }
}
