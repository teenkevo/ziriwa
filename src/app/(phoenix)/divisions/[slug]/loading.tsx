import Logo from '@/components/logo'

export default function Loading() {
  return (
    <div className='flex min-h-[80vh] flex-col items-center justify-center'>
      <div
        className='h-14 w-14 animate-spin rounded-full border-8 border-primary border-t-transparent'
        role='status'
        aria-label='Loading'
      >
        <span className='sr-only'>Loading...</span>
      </div>
      <div className='fixed bottom-8'>
        <Logo />
      </div>
    </div>
  )
}
