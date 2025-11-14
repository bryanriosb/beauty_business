'use client'

import { createBrowserClient } from '@supabase/ssr'

export class BusinessStorageService {
  private supabase

  constructor() {
    this.supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Sube una imagen de logo del negocio
   */
  async uploadLogo(
    file: File,
    businessId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this.uploadImage(file, businessId, 'logo')
  }

  /**
   * Sube una imagen de portada de galería
   */
  async uploadGalleryCover(
    file: File,
    businessId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this.uploadImage(file, businessId, 'gallery-cover')
  }

  /**
   * Sube una imagen para la galería del negocio
   */
  async uploadGalleryImage(
    file: File,
    businessId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    return this.uploadImage(file, businessId, 'gallery')
  }

  /**
   * Función genérica para subir imágenes
   */
  private async uploadImage(
    file: File,
    businessId: string,
    type: 'logo' | 'gallery-cover' | 'gallery'
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: 'El archivo debe ser una imagen',
        }
      }

      // Validar tamaño (máximo 5MB)
      const maxSize = 5 * 1024 * 1024
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'La imagen no debe superar los 5MB',
        }
      }

      const timestamp = Date.now()
      const fileExt = file.name.split('.').pop()
      const fileName = `${businessId}/${type}/${timestamp}.${fileExt}`

      // Subir al bucket 'business-media'
      const { data, error } = await this.supabase.storage
        .from('business-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        console.error('Error uploading image:', error)
        return {
          success: false,
          error: error.message,
        }
      }

      // Obtener URL pública
      const {
        data: { publicUrl },
      } = this.supabase.storage.from('business-media').getPublicUrl(data.path)

      return {
        success: true,
        url: publicUrl,
      }
    } catch (error) {
      console.error('Error in uploadImage:', error)
      return {
        success: false,
        error: 'Error al subir la imagen',
      }
    }
  }

  /**
   * Elimina una imagen del bucket
   */
  async deleteImage(
    imageUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const url = new URL(imageUrl)
      const pathParts = url.pathname.split('business-media/')
      if (pathParts.length < 2) {
        return {
          success: false,
          error: 'URL de imagen inválida',
        }
      }

      const filePath = pathParts[1]

      const { error } = await this.supabase.storage
        .from('business-media')
        .remove([filePath])

      if (error) {
        console.error('Error deleting image:', error)
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
      }
    } catch (error) {
      console.error('Error in deleteImage:', error)
      return {
        success: false,
        error: 'Error al eliminar la imagen',
      }
    }
  }
}

export default BusinessStorageService
