'use client'

import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import Loading from '@/components/ui/loading'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Logo from '@/components/Logo'
import { LogIn } from 'lucide-react'

const formSchema = z.object({
  username: z
    .string()
    .min(4)
    .max(50)
    .trim()
    .toLowerCase()
    .regex(/^[a-zA-Z0-9_]+$/, {
      message:
        'El usuario solo puede contener letras, numeros y guiones bajos.',
    }),
  password: z.string().min(8).max(50).trim(),
})

type SignInSchemaType = z.infer<typeof formSchema>

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const form = useForm<SignInSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true)
      console.log('Starting authentication...')

      const result = await signIn('credentials', {
        username: values.username,
        password: values.password,
        redirect: false,
      })

      console.log('SignIn result:', result)

      if (!result?.ok) {
        console.log('Authentication failed')
        toast.error('Credenciales inválidas.')
        return
      }
      toast.success('Autenticación exitosa')

      // Pequeño delay para asegurar que la sesión se establezca
      setTimeout(() => {
        console.log('Redirecting to /admin')
        router.push('/admin')
      }, 100)
    } catch (error: any) {
      console.log('Error in onSubmit:', error)
      toast.error('Credenciales inválidas.')
      console.error(`Error signing in: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="grid place-items-center h-screen">
      <Card>
        <CardHeader>
          <Logo className="justify-center" />
          <CardTitle>Iniciar sesión con cuenta asignada</CardTitle>
          <CardDescription>Ingresa las siguiente credenciales</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 w-full lg:w-[350px]"
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="Escriba su usuario" {...field} />
                    </FormControl>
                    <FormDescription>
                      Solo letras, numeros y guiones bajos.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Escriba la contraseña"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button className="w-full flex gap-2" type="submit">
                {loading ? <Loading /> : <LogIn />}
                Iniciar Sesión
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </section>
  )
}
