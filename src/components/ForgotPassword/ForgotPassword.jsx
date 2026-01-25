import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200'>
      <div className='text-center'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
          Reset Password
        </h2>
        <p className='mt-2 text-gray-600 dark:text-gray-400'>
          This is a placeholder for the password reset form.
        </p>
        <Link
          to='/login'
          className='mt-4 inline-block text-blue-600 hover:text-blue-500'
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
