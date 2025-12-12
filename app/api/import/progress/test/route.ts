export async function GET() {
  return Response.json({
    status: 'ok',
    message: 'Test route working',
    timestamp: new Date().toISOString()
  })
}