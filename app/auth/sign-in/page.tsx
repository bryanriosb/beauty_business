'use client'

import * as React from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import Loading from '@/components/ui/loading'
import { LogIn } from 'lucide-react'
import Image from 'next/image'

const formSchema = z.object({
  username: z
    .string()
    .min(1, 'El correo electrónico es requerido')
    .email('Ingresa un correo electrónico válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(50),
})

type SignInSchemaType = z.infer<typeof formSchema>

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = React.useState(false)

  const form = useForm<SignInSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  async function onSubmit(values: SignInSchemaType) {
    try {
      setIsLoading(true)

      const result = await signIn('credentials', {
        username: values.username,
        password: values.password,
        redirect: false,
      })

      if (!result?.ok) {
        toast.error('Credenciales inválidas.')
        setIsLoading(false)
        return
      }

      toast.success('Auténticacion exitosa')
      setTimeout(() => {
        console.log('Redirecting to /admin')
        router.push('/admin')
      }, 2000)
    } catch (error) {
      toast.error('Ocurrió un error. Por favor, intenta de nuevo.')
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen grid md:grid-cols-2">
      {/* Columna izquierda - Formulario */}
      <div className="flex items-center justify-center p-6 md:p-8 bg-card">
        <div className="w-full max-w-md space-y-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Bienvenido de vuelta</h1>
            <p className="text-balance text-muted-foreground">
              Inicia sesión en tu cuenta
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo electrónico</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="nombre@ejemplo.com"
                        autoComplete="email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Contraseña</FormLabel>
                      <a
                        href="#"
                        className="text-sm underline-offset-2 hover:underline"
                      >
                        ¿Olvidaste tu contraseña?
                      </a>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading}
              >
                {isLoading ? <Loading /> : <LogIn />}
                {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </Button>
            </form>
          </Form>

          <FieldDescription className="text-center">
            Al continuar, aceptas nuestros{' '}
            <a href="#" className="underline underline-offset-4">
              Términos de Servicio
            </a>{' '}
            y{' '}
            <a href="#" className="underline underline-offset-4">
              Política de Privacidad
            </a>
            .
          </FieldDescription>
        </div>
      </div>

      {/* Columna derecha - Imagen */}
      <div className="relative hidden md:block">
        <Image
          src="/photo-login.png"
          alt="Beauty salon"
          className="absolute inset-0 h-full w-full object-cover"
          fill
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30" />
        <div className="relative flex h-full items-center justify-center p-8">
          <div className="space-y-4 text-center text-white">
            <h2 className="text-3xl font-bold tracking-tight drop-shadow-lg">
              Beauty Business
            </h2>
            <p className="text-lg drop-shadow-md">
              Gestiona tu negocio de belleza de manera eficiente
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
