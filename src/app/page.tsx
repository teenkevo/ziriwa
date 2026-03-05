'use client'

import { motion } from 'framer-motion'
import Logo from '@/components/logo'
import Link from 'next/link'
import { useState } from 'react'
import { Sixtyfour } from 'next/font/google'
import { ArrowRight, ArrowRightIcon, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'

const sixtyFour = Sixtyfour({ subsets: ['latin'] })

const Navbar = () => {
  const [openNavbar, setOpenNavbar] = useState(false)
  const toggleNavbar = () => {
    setOpenNavbar(openNavbar => !openNavbar)
  }

  return (
    <header className='absolute left-0 top-0 w-full flex items-center h-24 z-40'>
      <nav className='relative mx-auto lg:max-w-7xl w-full px-5 sm:px-10 md:px-12 lg:px-5 flex gap-x-5 justify-between items-center'>
        <Logo />
        <div
          className={`
                absolute top-full  left-0 bg-white dark:bg-gray-950 lg:!bg-transparent border-b border-gray-200 dark:border-gray-800 py-8 lg:py-0 px-5 sm:px-10 md:px-12 lg:px-0 lg:border-none lg:w-max lg:space-x-16 lg:top-0 lg:relative  lg:flex duration-300 lg:transition-none ease-linear
                ${
                  openNavbar
                    ? 'translate-y-0 opacity-0 visible'
                    : 'translate-y-10 opacity-0 invisible lg:visible  lg:translate-y-0 lg:opacity-100'
                }
            `}
        >
          <div className='flex flex-col sm:flex-row sm:items-center gap-4  lg:min-w-max mt-10 lg:mt-0'>
            <SignedOut>
              <SignInButton mode='modal' fallbackRedirectUrl='/dashboard'>
                <Button
                  variant='outline'
                  className='flex items-center justify-center w-full sm:w-auto h-10 px-6 rounded-md shadow-md border border-gray-200 dark:border-gray-800'
                >
                  Member Login
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href='/dashboard'
                className='flex items-center justify-center w-full sm:w-auto h-10 px-6 rounded-md shadow-md border border-gray-200 dark:border-gray-800'
              >
                Go to Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
        <div className='flex items-center lg:hidden'>
          <button
            onClick={() => {
              toggleNavbar()
            }}
            aria-label='Toggle navbar'
            className='outline-none border-l border-l-gray-100 dark:border-l-gray-800 pl-3 relative py-3 children:flex'
          >
            <span
              aria-hidden='true'
              className={`
                                    h-0.5 w-6 rounded bg-gray-800 dark:bg-gray-300 transition duration-300
                                    ${
                                      openNavbar
                                        ? 'rotate-45 translate-y-[0.33rem]'
                                        : ''
                                    }
                                `}
            />
            <span
              aria-hidden='true'
              className={`
                                    mt-2 h-0.5 w-6 rounded bg-gray-800 dark:bg-gray-300 transition duration-300
                                    ${
                                      openNavbar
                                        ? '-rotate-45 -translate-y-[0.33rem]'
                                        : ''
                                    }
                                `}
            />
          </button>
        </div>
      </nav>
    </header>
  )
}

function MemberLoginButton() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <SignedOut>
      <SignInButton mode='modal' fallbackRedirectUrl='/dashboard'>
        <Button
          className='group'
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <span className='flex items-center'>
            Member Login
            <span className='relative w-4 h-4 ml-2'>
              <ChevronRight
                className={`absolute inset-0 transition-opacity duration-200 ease-in-out ${
                  isHovered ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <ArrowRight
                className={`absolute inset-0 transition-all duration-200 ease-in-out ${
                  isHovered ? 'translate-x-1' : 'translate-x-0'
                } ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              />
            </span>
          </span>
        </Button>
      </SignInButton>
    </SignedOut>
  )
}

export default function HeroSection() {
  return (
    <>
      <Navbar />
      <section className='min-h-max bg-white dark:bg-gray-950'>
        <div className='relative mx-auto pt-32 pb-24 lg:max-w-7xl w-full px-5 sm:px-10 md:px-12 lg:px-5 text-center space-y-10'>
          {/* Animate the main heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <h1 className='text-gray-900 dark:text-white mx-auto max-w-5xl font-bold text-4xl/tight sm:text-5xl/tight lg:text-5xl/tight xl:text-6xl/tight'>
              Self Service Portal
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
          >
            <p className='text-gray-700 dark:text-gray-300 mx-auto max-w-2xl'>
              Simplify every step of managing your investment club online
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
          >
            <div className='flex justify-center items-center flex-wrap mx-auto gap-4'>
              <MemberLoginButton />
            </div>
          </motion.div>

          {/* Animate the section at the bottom */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1 }}
          >
            <div className='text-left grid lg:grid-cols-2 p-6 rounded-2xl bg-gradient-to-tr from-gray-50 to-gray-200 dark:from-gray-900 dark:to-gray-800 border border-gray-100 dark:border-gray-800 max-w-2xl lg:max-w-5xl mx-auto lg:divide-x divide-y lg:divide-y-0 divide-gray-300 dark:divide-gray-800'>
            <div className='flex items-start gap-6 lg:pr-6 pb-6 lg:pb-0'>
              <div className='w-10'>
                <span className='p-3 rounded-xl bg-gray-200 dark:bg-gray-800 flex w-max text-gray-800 dark:text-gray-200'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth='1.5'
                    stroke='currentColor'
                    className='w-6 h-6'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5H18V15H4.5v-4.5zM3.75 18h15A2.25 2.25 0 0021 15.75v-6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 9.75v6A2.25 2.25 0 003.75 18z'
                    />
                  </svg>
                </span>
              </div>
              <div className='flex-1 space-y-1'>
                <h2 className='text-gray-900 dark:text-white font-semibold text-lg'>
                  Less Hassle, More Investing
                </h2>
                <p className='text-gray-700 dark:text-gray-300 text-sm'>
                  Manage your investment portfolio with ease
                </p>
              </div>
            </div>
            <div className='flex items-start gap-6 lg:px-6 py-6 lg:py-0'>
              <div className='w-10'>
                <span className='p-3 rounded-xl bg-gray-200 dark:bg-gray-800 flex w-max text-gray-800 dark:text-gray-200'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth='1.5'
                    stroke='currentColor'
                    className='w-6 h-6'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z'
                    />
                  </svg>
                </span>
              </div>
              <div className='flex-1 space-y-1'>
                <h2 className='text-gray-900 dark:text-white font-semibold text-lg'>
                  Transparency Meets Simplicity
                </h2>
                <p className='text-gray-700 dark:text-gray-300 text-sm'>
                  Get real time updates on your investments.
                </p>
              </div>
            </div>
          </div>
          </motion.div>
        </div>
      </section>
    </>
  )
}
